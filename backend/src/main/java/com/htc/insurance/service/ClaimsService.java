
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dao.UserDao;

import com.htc.insurance.dto.ClaimDecisionDto;
import com.htc.insurance.dto.ClaimsDto;

import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.User;

import com.htc.insurance.mapper.ClaimsMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClaimsService {

    private final ClaimsDao claimsDao;

    private final PolicyDao policyDao;

    private final PolicyPurchaseDao policyPurchaseDao;

    private final UserDao userDao;

    private final ClaimsMapper claimsMapper;

    private final NotificationService notificationService;

    // =========================================================
    // USER + ADMIN - SUBMIT NEW CLAIM
    // =========================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ClaimsDto saveClaims(
            ClaimsDto claimsDto,
            Authentication authentication) {

        if (claimsDto == null) {
            throw new IllegalArgumentException(
                    "Claim data is required.");
        }

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new IllegalStateException(
                    "User authentication required.");
        }

        if (claimsDto.getPolicyNumber() == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        // =====================================================
        // GET LOGGED-IN USER
        // =====================================================

        String username = authentication.getName();

        User user = userDao.getUserByUsername(username);

        if (user == null || user.getUserId() == null) {
            throw new IllegalStateException(
                    "Logged-in user not found.");
        }

        // =====================================================
        // STEP 1 - LOCK POLICY ROW
        // =====================================================

        Policy policy = policyDao.getPolicyByIdForUpdate(
                claimsDto.getPolicyNumber());

        if (policy == null) {
            throw new IllegalArgumentException(
                    "Policy not found.");
        }

        // =====================================================
        // VERIFY POLICY OWNERSHIP
        // =====================================================

        PolicyHolder policyHolder =
                policy.getPolicyHolder();

        if (policyHolder == null
                || policyHolder.getUser() == null
                || policyHolder.getUser().getUserId() == null
                || !user.getUserId().equals(
                        policyHolder.getUser().getUserId())) {

            throw new IllegalStateException(
                    "You can only raise a claim against "
                            + "your own policy.");
        }

        // =====================================================
        // STEP 2 - LOCK ASSOCIATED PURCHASE ROW
        // =====================================================

        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByPolicyNumberForUpdate(
                        policy.getPolicyNumber())
                .orElse(null);

        // =====================================================
        // CHECK POLICY ACTIVE STATUS
        // =====================================================

        if (!Boolean.TRUE.equals(policy.getIsActive())) {
            throw new IllegalStateException(
                    "Claims cannot be submitted for an inactive policy.");
        }

        // =====================================================
        // CHECK POLICY LIFECYCLE
        // =====================================================

        PolicyLifecycleStatus lifecycle =
                policy.getLifecycleStatus();

        // Legacy policies may have a null lifecycle.
        // Preserve existing behavior only when isActive=true.
        if (lifecycle != null
                && lifecycle != PolicyLifecycleStatus.ACTIVE) {

            throw new IllegalStateException(
                    "Claims cannot be submitted. Policy status: "
                            + lifecycle);
        }

        // =====================================================
        // CHECK POLICY COVERAGE DATES
        // =====================================================

        LocalDate today = LocalDate.now();

        if (policy.getStartDate() == null
                || policy.getExpiryDate() == null) {

            throw new IllegalStateException(
                    "Policy coverage dates are not available.");
        }

        if (policy.getStartDate().isAfter(today)) {
            throw new IllegalStateException(
                    "Your policy coverage has not started yet.");
        }

        if (!policy.getExpiryDate().isAfter(today)) {
            throw new IllegalStateException(
                    "Your policy has expired. "
                            + "New claims cannot be submitted.");
        }

        // =====================================================
        // CHECK REFUND STATUS UNDER DATABASE LOCK
        // =====================================================

        if (hasBlockingRefund(purchase)) {
            throw new IllegalStateException(
                    "Claims cannot be submitted because "
                            + "a refund has been requested or "
                            + "processed for this policy.");
        }

        // =====================================================
        // CHECK EXISTING CLAIMS
        // =====================================================

        ensureClaimSlotAvailable(policy.getPolicyNumber());

        // =====================================================
        // CONVERT DTO TO ENTITY
        // =====================================================

        Claims claims =
                claimsMapper.convertClaimsDtoToEntity(
                        claimsDto);

        if (claims == null) {
            throw new IllegalStateException(
                    "Unable to create claim.");
        }

        // Always use the verified policy.
        claims.setPolicy(policy);

        // Do not trust claim date from frontend.
        claims.setClaimDate(today);

        // Every new claim starts as PENDING.
        claims.setStatus(ClaimStatus.PENDING);

        // Clear any client-supplied admin decision fields.
        claims.setApprovedAmount(null);
        claims.setAdminRemarks(null);
        claims.setRejectionReason(null);
        claims.setReviewedDate(null);

        // =====================================================
        // SAVE CLAIM
        // =====================================================

        Claims savedClaims =
                claimsDao.saveClaims(claims);

        // =====================================================
        // NOTIFY CUSTOMER
        // =====================================================

        createClaimNotification(
                user,
                "Claim Submitted",
                "Your claim #"
                        + savedClaims.getClaimNumber()
                        + " has been submitted successfully "
                        + "and is now under review.",
                "CLAIM");

        return claimsMapper.convertClaimsEntityToDto(
                savedClaims);
    }

    // =========================================================
    // CHECK REFUND STATUS
    // =========================================================

    private boolean hasBlockingRefund(
            PolicyPurchase purchase) {

        // Preserve legacy policies without purchase records.
        if (purchase == null) {
            return false;
        }

        String refundStatus = purchase.getRefundStatus();

        // Unknown refund state must not allow a claim.
        if (refundStatus == null
                || refundStatus.isBlank()) {
            return true;
        }

        return !"NOT_REFUNDED".equalsIgnoreCase(
                refundStatus.trim());
    }

    // =========================================================
    // ONE UNRESOLVED OR SUCCESSFUL CLAIM PER POLICY
    // =========================================================

    private void ensureClaimSlotAvailable(Long policyNumber) {

        // Query only this policy's claims rather than scanning
        // every claim belonging to every customer.
        for (Claims existing :
                claimsDao.getClaimsByPolicyNumber(policyNumber)) {

            // Historical rejected claims do not block retries.
            if (existing != null
                    && existing.getStatus() == ClaimStatus.REJECTED) {
                continue;
            }

            // PENDING, APPROVED, SETTLED and unknown/null
            // statuses all block another claim.
            throw new IllegalStateException(
                    "This policy already has an unresolved "
                            + "or successful claim. "
                            + "A new claim is allowed only when "
                            + "all previous claims are rejected.");
        }
    }

    // =========================================================
    // ADMIN - GET ALL CLAIMS
    // =========================================================

    @Transactional(readOnly = true)
    public List<ClaimsDto> getAllClaims() {

        return claimsDao.getAllClaims()
                .stream()
                .map(claimsMapper::convertClaimsEntityToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // USER - GET MY CLAIMS
    // =========================================================

    @Transactional(readOnly = true)
    public List<ClaimsDto> getMyClaims(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new IllegalStateException(
                    "User authentication required.");
        }

        User user = userDao.getUserByUsername(
                authentication.getName());

        if (user == null || user.getUserId() == null) {
            throw new IllegalStateException(
                    "Logged-in user not found.");
        }

        // Preserve all historical claims, even if the
        // policy is inactive, expired, or refunded.
        return claimsDao.getAllClaims()
                .stream()
                .filter(claim -> {

                    if (claim == null
                            || claim.getPolicy() == null) {
                        return false;
                    }

                    PolicyHolder holder =
                            claim.getPolicy().getPolicyHolder();

                    if (holder == null
                            || holder.getUser() == null
                            || holder.getUser().getUserId() == null) {
                        return false;
                    }

                    return user.getUserId().equals(
                            holder.getUser().getUserId());
                })
                .map(claimsMapper::convertClaimsEntityToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // USER + ADMIN - GET CLAIM BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public ClaimsDto getClaimsById(
            Long claimNumber,
            Authentication authentication) {

        if (claimNumber == null) {
            throw new IllegalArgumentException(
                    "Claim number is required.");
        }

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new IllegalStateException(
                    "User authentication required.");
        }

        Claims claim =
                claimsDao.getClaimsById(claimNumber);

        if (claim == null) {
            return null;
        }

        // =====================================================
        // ADMIN CAN VIEW ANY CLAIM
        // =====================================================

        boolean isAdmin =
                authentication.getAuthorities() != null
                && authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_ADMIN".equals(
                                        authority.getAuthority())
                                || "ADMIN".equals(
                                        authority.getAuthority()));

        if (isAdmin) {
            return claimsMapper.convertClaimsEntityToDto(
                    claim);
        }

        // =====================================================
        // USER CAN VIEW ONLY OWN CLAIM
        // =====================================================

        User user = userDao.getUserByUsername(
                authentication.getName());

        if (user == null || user.getUserId() == null) {
            throw new IllegalStateException(
                    "Logged-in user not found.");
        }

        Policy policy = claim.getPolicy();

        if (policy == null
                || policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null
                || policy.getPolicyHolder()
                        .getUser().getUserId() == null) {

            throw new IllegalStateException(
                    "Claim ownership could not be verified.");
        }

        Long ownerId = policy.getPolicyHolder()
                .getUser()
                .getUserId();

        if (!ownerId.equals(user.getUserId())) {
            throw new IllegalStateException(
                    "You are not authorized to view this claim.");
        }

        return claimsMapper.convertClaimsEntityToDto(
                claim);
    }

    // =========================================================
    // ADMIN - UPDATE PENDING CLAIM
    // =========================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ClaimsDto updateClaims(
            Long claimNumber,
            ClaimsDto claimsDto) {

        if (claimNumber == null) {
            throw new IllegalArgumentException(
                    "Claim number is required.");
        }

        if (claimsDto == null) {
            throw new IllegalArgumentException(
                    "Claim data is required.");
        }

        Claims existingClaims =
                claimsDao.getClaimsById(claimNumber);

        if (existingClaims == null) {
            return null;
        }

        if (claimsDto.getPolicyNumber() == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        if (existingClaims.getPolicy() == null
                || existingClaims.getPolicy()
                        .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Existing claim policy is unavailable.");
        }

        // Never move a claim to another policy.
        if (!existingClaims.getPolicy().getPolicyNumber()
                .equals(claimsDto.getPolicyNumber())) {

            throw new IllegalStateException(
                    "A claim cannot be transferred to another policy.");
        }

        Policy policy = policyDao.getPolicyByIdForUpdate(
                claimsDto.getPolicyNumber());

        if (policy == null) {
            throw new IllegalArgumentException(
                    "Policy not found.");
        }

        // Reload after acquiring the policy lock.
        existingClaims =
                claimsDao.getClaimsById(claimNumber);

        if (existingClaims == null
                || existingClaims.getPolicy() == null
                || !policy.getPolicyNumber().equals(
                        existingClaims.getPolicy()
                                .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Claim changed during update.");
        }

        if (existingClaims.getStatus()
                != ClaimStatus.PENDING) {

            throw new IllegalStateException(
                    "Reviewed claims cannot be edited. "
                            + "Preserve claim history.");
        }

        Claims claims =
                claimsMapper.convertClaimsDtoToEntity(
                        claimsDto);

        if (claims == null) {
            throw new IllegalStateException(
                    "Unable to update claim.");
        }

        claims.setClaimNumber(claimNumber);
        claims.setPolicy(policy);

        // Preserve claim history and admin fields.
        claims.setClaimDate(
                existingClaims.getClaimDate());

        claims.setStatus(
                existingClaims.getStatus());

        claims.setApprovedAmount(
                existingClaims.getApprovedAmount());

        claims.setAdminRemarks(
                existingClaims.getAdminRemarks());

        claims.setRejectionReason(
                existingClaims.getRejectionReason());

        claims.setReviewedDate(
                existingClaims.getReviewedDate());

        Claims updatedClaims =
                claimsDao.updateClaims(claims);

        notifyClaimOwner(
                updatedClaims,
                "Claim Updated",
                "Your claim #"
                        + updatedClaims.getClaimNumber()
                        + " has been updated successfully.",
                "CLAIM");

        return claimsMapper.convertClaimsEntityToDto(
                updatedClaims);
    }

    // =========================================================
    // ADMIN - APPROVE CLAIM
    // =========================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ClaimsDto approveClaim(
            Long claimNumber,
            ClaimDecisionDto decisionDto) {

        if (claimNumber == null) {
            throw new IllegalArgumentException(
                    "Claim number is required.");
        }

        if (decisionDto == null) {
            throw new IllegalArgumentException(
                    "Claim decision data is required.");
        }

        Claims claim =
                claimsDao.getClaimsById(claimNumber);

        if (claim == null) {
            return null;
        }

        Policy lockedPolicy = lockClaimPolicy(claim);

        // Reload after acquiring policy lock.
        claim = claimsDao.getClaimsById(claimNumber);

        if (claim == null
                || claim.getPolicy() == null
                || !lockedPolicy.getPolicyNumber().equals(
                        claim.getPolicy().getPolicyNumber())) {

            throw new IllegalStateException(
                    "Claim policy changed during review.");
        }

        if (claim.getStatus() != ClaimStatus.PENDING) {
            throw new IllegalStateException(
                    "Only pending claims can be approved.");
        }

        // =====================================================
        // VERIFY POLICY IS STILL ELIGIBLE FOR APPROVAL
        // =====================================================

        if (!Boolean.TRUE.equals(
                lockedPolicy.getIsActive())) {

            throw new IllegalStateException(
                    "The policy is inactive and cannot "
                            + "be used for a new approval.");
        }

        PolicyLifecycleStatus lifecycle =
                lockedPolicy.getLifecycleStatus();

        if (lifecycle != null
                && lifecycle != PolicyLifecycleStatus.ACTIVE) {

            throw new IllegalStateException(
                    "Policy cannot be approved in status: "
                            + lifecycle);
        }

        // =====================================================
        // VERIFY REFUND STATUS BEFORE APPROVAL
        // Lock order remains policy first, then purchase.
        // A refund in any state other than NOT_REFUNDED
        // must prevent approval, even if policy state lags.
        // =====================================================

        PolicyPurchase approvalPurchase = policyPurchaseDao
                .getPurchaseByPolicyNumberForUpdate(
                        lockedPolicy.getPolicyNumber())
                .orElse(null);

        if (hasBlockingRefund(approvalPurchase)) {
            throw new IllegalStateException(
                    "Claim cannot be approved because a refund "
                            + "has been requested or processed "
                            + "for this policy.");
        }

        // =====================================================
        // VALIDATE APPROVED AMOUNT
        // =====================================================

        if (decisionDto.getApprovedAmount() == null) {
            throw new IllegalArgumentException(
                    "Approved amount is required.");
        }

        if (decisionDto.getApprovedAmount()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Approved amount cannot be negative.");
        }

        if (claim.getAmount() == null) {
            throw new IllegalStateException(
                    "Claim amount is not available.");
        }

        if (decisionDto.getApprovedAmount()
                .compareTo(claim.getAmount()) > 0) {

            throw new IllegalArgumentException(
                    "Approved amount cannot be greater "
                            + "than the claimed amount.");
        }

        // =====================================================
        // APPROVE CLAIM AND LOCK POLICY
        // =====================================================

        claim.setStatus(ClaimStatus.APPROVED);

        claim.setApprovedAmount(
                decisionDto.getApprovedAmount());

        claim.setAdminRemarks(
                decisionDto.getAdminRemarks());

        claim.setRejectionReason(null);
        claim.setReviewedDate(LocalDate.now());

        // Record the reason for deactivation.
        // Settlement rejection can restore eligibility
        // only for a CLAIM_LOCKED policy.
        lockedPolicy.setIsActive(false);

        lockedPolicy.setLifecycleStatus(
                PolicyLifecycleStatus.CLAIM_LOCKED);

        policyDao.savePolicy(lockedPolicy);

        Claims updatedClaim =
                claimsDao.updateClaims(claim);

        notifyClaimOwner(
                updatedClaim,
                "Claim Approved",
                "Your claim #"
                        + updatedClaim.getClaimNumber()
                        + " has been approved for ₹"
                        + updatedClaim.getApprovedAmount()
                        + ".",
                "CLAIM");

        return claimsMapper.convertClaimsEntityToDto(
                updatedClaim);
    }

    // =========================================================
    // ADMIN - REJECT PENDING CLAIM
    // =========================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ClaimsDto rejectClaim(
            Long claimNumber,
            ClaimDecisionDto decisionDto) {

        if (claimNumber == null) {
            throw new IllegalArgumentException(
                    "Claim number is required.");
        }

        if (decisionDto == null) {
            throw new IllegalArgumentException(
                    "Claim decision data is required.");
        }

        Claims claim =
                claimsDao.getClaimsById(claimNumber);

        if (claim == null) {
            return null;
        }

        Policy lockedPolicy = lockClaimPolicy(claim);

        // Reload after acquiring policy lock.
        claim = claimsDao.getClaimsById(claimNumber);

        if (claim == null
                || claim.getPolicy() == null
                || !lockedPolicy.getPolicyNumber().equals(
                        claim.getPolicy().getPolicyNumber())) {

            throw new IllegalStateException(
                    "Claim policy changed during review.");
        }

        if (claim.getStatus() != ClaimStatus.PENDING) {
            throw new IllegalStateException(
                    "Only pending claims can be rejected.");
        }

        if (decisionDto.getRejectionReason() == null
                || decisionDto.getRejectionReason().isBlank()) {

            throw new IllegalArgumentException(
                    "Rejection reason is required.");
        }

        // =====================================================
        // SAVE REJECTION
        // =====================================================

        claim.setStatus(ClaimStatus.REJECTED);
        claim.setApprovedAmount(null);

        claim.setAdminRemarks(
                decisionDto.getAdminRemarks());

        claim.setRejectionReason(
                decisionDto.getRejectionReason().trim());

        claim.setReviewedDate(LocalDate.now());

        Claims updatedClaim =
                claimsDao.updateClaims(claim);

        notifyClaimOwner(
                updatedClaim,
                "Claim Rejected",
                "Your claim #"
                        + updatedClaim.getClaimNumber()
                        + " has been rejected. Reason: "
                        + updatedClaim.getRejectionReason(),
                "CLAIM");

        return claimsMapper.convertClaimsEntityToDto(
                updatedClaim);
    }

    // =========================================================
    // LOCK CLAIM POLICY
    // =========================================================

    private Policy lockClaimPolicy(Claims claim) {

        if (claim.getPolicy() == null
                || claim.getPolicy().getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Claim policy information is unavailable.");
        }

        Policy locked = policyDao.getPolicyByIdForUpdate(
                claim.getPolicy().getPolicyNumber());

        if (locked == null) {
            throw new IllegalStateException(
                    "Claim policy no longer exists.");
        }

        return locked;
    }

    // =========================================================
    // ADMIN - DELETE CLAIM
    // =========================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteClaims(Long claimNumber) {

        if (claimNumber == null) {
            throw new IllegalArgumentException(
                    "Claim number is required.");
        }

        Claims existingClaim =
                claimsDao.getClaimsById(claimNumber);

        if (existingClaim == null) {
            throw new IllegalArgumentException(
                    "Claim not found: " + claimNumber);
        }

        Policy policy = existingClaim.getPolicy();

        if (policy != null
                && policy.getPolicyNumber() != null) {

            Policy lockedPolicy =
                    policyDao.getPolicyByIdForUpdate(
                            policy.getPolicyNumber());

            if (lockedPolicy == null) {
                throw new IllegalStateException(
                        "Claim policy no longer exists.");
            }

            existingClaim =
                    claimsDao.getClaimsById(claimNumber);

            if (existingClaim == null
                    || existingClaim.getPolicy() == null
                    || !lockedPolicy.getPolicyNumber().equals(
                            existingClaim.getPolicy()
                                    .getPolicyNumber())) {

                throw new IllegalStateException(
                        "Claim changed during deletion.");
            }

            policy = lockedPolicy;

            // Purchased-policy claim history cannot be deleted.
            if (policyPurchaseDao
                    .getPurchaseByPolicyNumberForUpdate(
                            policy.getPolicyNumber())
                    .isPresent()) {

                throw new IllegalStateException(
                        "Purchased-policy claims cannot be deleted. "
                                + "Preserve claim and payment history.");
            }
        }

        User customer = null;

        if (policy != null
                && policy.getPolicyHolder() != null) {

            customer =
                    policy.getPolicyHolder().getUser();
        }

        claimsDao.deleteClaims(claimNumber);

        if (customer != null
                && customer.getUserId() != null) {

            createClaimNotification(
                    customer,
                    "Claim Deleted",
                    "Your claim #"
                            + claimNumber
                            + " has been deleted.",
                    "CLAIM");
        }
    }

    // =========================================================
    // COMMON - CREATE CLAIM NOTIFICATION
    // =========================================================

    private void createClaimNotification(
            User user,
            String title,
            String message,
            String type) {

        if (user == null || user.getUserId() == null) {
            return;
        }

        try {
            notificationService.createNotification(
                    user,
                    title,
                    message,
                    type);

        } catch (Exception e) {
            System.err.println(
                    "Claim notification failed: "
                            + e.getClass().getSimpleName()
                            + " - "
                            + e.getMessage());
        }
    }

    // =========================================================
    // COMMON - NOTIFY CLAIM OWNER
    // =========================================================

    private void notifyClaimOwner(
            Claims claim,
            String title,
            String message,
            String type) {

        if (claim == null
                || claim.getPolicy() == null
                || claim.getPolicy().getPolicyHolder() == null) {
            return;
        }

        User customer =
                claim.getPolicy()
                        .getPolicyHolder()
                        .getUser();

        if (customer == null) {
            return;
        }

        createClaimNotification(
                customer,
                title,
                message,
                type);
    }
}

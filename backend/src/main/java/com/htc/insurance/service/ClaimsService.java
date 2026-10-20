
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.User;

import com.htc.insurance.mapper.ClaimsMapper;

@Service
public class ClaimsService {

    @Autowired
    private ClaimsDao claimsDao;

    @Autowired
    private PolicyDao policyDao;

    @Autowired
    private PolicyPurchaseDao policyPurchaseDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private ClaimsMapper claimsMapper;

    @Autowired
    private NotificationService notificationService;

    // =========================================================
    // USER + ADMIN - SUBMIT NEW CLAIM
    // =========================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ClaimsDto saveClaims(
            ClaimsDto claimsDto,
            Authentication authentication) {

        if (claimsDto == null) {
            throw new RuntimeException(
                    "Claim data is required.");
        }

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication required.");
        }

        if (claimsDto.getPolicyNumber() == null) {
            throw new RuntimeException(
                    "Policy number is required.");
        }

        // =====================================================
        // GET LOGGED-IN USER
        // =====================================================

        String username = authentication.getName();

        User user = userDao.getUserByUsername(username);

        if (user == null || user.getUserId() == null) {
            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        // =====================================================
        // STEP 1 - LOCK POLICY ROW
        // =====================================================

        /*
         * Both claim submission and refund preparation
         * must lock the same policy before checking
         * whether the operation is allowed.
         *
         * The lock remains held until this transaction
         * commits or rolls back.
         */

        Policy policy = policyDao.getPolicyByIdForUpdate(
                claimsDto.getPolicyNumber());

        if (policy == null) {
            throw new RuntimeException(
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

            throw new RuntimeException(
                    "You can only raise a claim against "
                    + "your own policy.");
        }

        // =====================================================
        // STEP 2 - LOCK ASSOCIATED PURCHASE ROW
        // =====================================================

        /*
         * A legacy policy might not have a purchase
         * record. Preserve the previous behavior for
         * such policies.
         *
         * For purchased policies, read refund status
         * while holding the purchase write lock.
         */

        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByPolicyNumberForUpdate(
                        policy.getPolicyNumber())
                .orElse(null);

        // =====================================================
        // CHECK POLICY ACTIVE STATUS
        // =====================================================

        if (!Boolean.TRUE.equals(policy.getIsActive())) {

            throw new RuntimeException(
                    "Claims cannot be submitted "
                    + "for an inactive policy.");
        }

        // =====================================================
        // CHECK POLICY COVERAGE DATES
        // =====================================================

        LocalDate today = LocalDate.now();

        if (policy.getStartDate() == null
                || policy.getExpiryDate() == null) {

            throw new RuntimeException(
                    "Policy coverage dates are not available.");
        }

        if (policy.getStartDate().isAfter(today)) {

            throw new RuntimeException(
                    "Your policy coverage has not started yet.");
        }

        if (!policy.getExpiryDate().isAfter(today)) {

            throw new RuntimeException(
                    "Your policy has expired. "
                    + "New claims cannot be submitted.");
        }

        // =====================================================
        // CHECK REFUND STATUS UNDER DATABASE LOCK
        // =====================================================

        if (hasBlockingRefund(purchase)) {

            throw new RuntimeException(
                    "Claims cannot be submitted because "
                    + "a refund has been requested or "
                    + "processed for this policy.");
        }

        // =====================================================
        // CONVERT CLAIM DTO TO ENTITY
        // =====================================================

        Claims claims =
                claimsMapper.convertClaimsDtoToEntity(
                        claimsDto);

        if (claims == null) {
            throw new RuntimeException(
                    "Unable to create claim.");
        }

        // Always use the verified, locked policy.
        claims.setPolicy(policy);

        // Never trust claim date supplied by client.
        claims.setClaimDate(today);

        // New claims must start as pending.
        claims.setStatus(ClaimStatus.PENDING);

        // Clear client-supplied admin decision fields.
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
    // CHECK REFUND STATUS FOR LOCKED PURCHASE
    // =========================================================

    private boolean hasBlockingRefund(
            PolicyPurchase purchase) {

        // Preserve support for legacy policies
        // that have no purchase record.
        if (purchase == null) {
            return false;
        }

        String refundStatus = purchase.getRefundStatus();

        // Unknown status: block new claims.
        if (refundStatus == null
                || refundStatus.isBlank()) {
            return true;
        }

        // Only NOT_REFUNDED allows claim submission.
        return !"NOT_REFUNDED".equalsIgnoreCase(
                refundStatus.trim());
    }

    // =========================================================
    // ADMIN - GET ALL CLAIMS
    // =========================================================

    public List<ClaimsDto> getAllClaims() {

        List<Claims> claimsList =
                claimsDao.getAllClaims();

        return claimsList.stream()
                .map(claimsMapper::convertClaimsEntityToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // USER - GET MY CLAIMS
    // =========================================================

    public List<ClaimsDto> getMyClaims(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication required.");
        }

        User user = userDao.getUserByUsername(
                authentication.getName());

        if (user == null || user.getUserId() == null) {

            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        /*
         * Do not filter by policy active status or
         * refund status here.
         *
         * Historical claims must remain visible.
         */

        List<Claims> allClaims =
                claimsDao.getAllClaims();

        return allClaims.stream()
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

    public ClaimsDto getClaimsById(
            Long claimNumber,
            Authentication authentication) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new RuntimeException(
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
        // USER CAN ONLY VIEW OWN CLAIM
        // =====================================================

        User user = userDao.getUserByUsername(
                authentication.getName());

        if (user == null || user.getUserId() == null) {
            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        Policy policy = claim.getPolicy();

        if (policy == null
                || policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null
                || policy.getPolicyHolder()
                        .getUser().getUserId() == null) {

            throw new RuntimeException(
                    "Claim ownership could not be verified.");
        }

        Long ownerId = policy.getPolicyHolder()
                .getUser()
                .getUserId();

        if (!ownerId.equals(user.getUserId())) {

            throw new RuntimeException(
                    "You are not authorized to view this claim.");
        }

        return claimsMapper.convertClaimsEntityToDto(
                claim);
    }

    // =========================================================
    // ADMIN - UPDATE CLAIM
    // =========================================================

    public ClaimsDto updateClaims(
            Long claimNumber,
            ClaimsDto claimsDto) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (claimsDto == null) {
            throw new RuntimeException(
                    "Claim data is required.");
        }

        Claims existingClaims =
                claimsDao.getClaimsById(claimNumber);

        if (existingClaims == null) {
            return null;
        }

        if (claimsDto.getPolicyNumber() == null) {
            throw new RuntimeException(
                    "Policy number is required.");
        }

        Policy policy = policyDao.getPolicyById(
                claimsDto.getPolicyNumber());

        if (policy == null) {
            throw new RuntimeException(
                    "Policy not found.");
        }

        Claims claims =
                claimsMapper.convertClaimsDtoToEntity(
                        claimsDto);

        if (claims == null) {
            throw new RuntimeException(
                    "Unable to update claim.");
        }

        claims.setClaimNumber(claimNumber);
        claims.setPolicy(policy);

        // Preserve original claim date and review details.
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

    public ClaimsDto approveClaim(
            Long claimNumber,
            ClaimDecisionDto decisionDto) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (decisionDto == null) {
            throw new RuntimeException(
                    "Claim decision data is required.");
        }

        Claims claim =
                claimsDao.getClaimsById(claimNumber);

        if (claim == null) {
            return null;
        }

        if (claim.getStatus() != ClaimStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending claims can be approved.");
        }

        // =====================================================
        // VALIDATE APPROVED AMOUNT
        // =====================================================

        if (decisionDto.getApprovedAmount() == null) {

            throw new RuntimeException(
                    "Approved amount is required.");
        }

        if (decisionDto.getApprovedAmount()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Approved amount cannot be negative.");
        }

        if (claim.getAmount() == null) {

            throw new RuntimeException(
                    "Claim amount is not available.");
        }

        if (decisionDto.getApprovedAmount()
                .compareTo(claim.getAmount()) > 0) {

            throw new RuntimeException(
                    "Approved amount cannot be greater "
                    + "than the claimed amount.");
        }

        // =====================================================
        // SAVE APPROVAL
        // =====================================================

        claim.setStatus(ClaimStatus.APPROVED);

        claim.setApprovedAmount(
                decisionDto.getApprovedAmount());

        claim.setAdminRemarks(
                decisionDto.getAdminRemarks());

        claim.setRejectionReason(null);
        claim.setReviewedDate(LocalDate.now());

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
    // ADMIN - REJECT CLAIM
    // =========================================================

    public ClaimsDto rejectClaim(
            Long claimNumber,
            ClaimDecisionDto decisionDto) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (decisionDto == null) {
            throw new RuntimeException(
                    "Claim decision data is required.");
        }

        Claims claim =
                claimsDao.getClaimsById(claimNumber);

        if (claim == null) {
            return null;
        }

        if (claim.getStatus() != ClaimStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending claims can be rejected.");
        }

        // =====================================================
        // VALIDATE REJECTION REASON
        // =====================================================

        if (decisionDto.getRejectionReason() == null
                || decisionDto.getRejectionReason().isBlank()) {

            throw new RuntimeException(
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
    // ADMIN - DELETE CLAIM
    // =========================================================

    public void deleteClaims(Long claimNumber) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        Claims existingClaim =
                claimsDao.getClaimsById(claimNumber);

        if (existingClaim == null) {

            throw new RuntimeException(
                    "Claim not found: " + claimNumber);
        }

        Policy policy = existingClaim.getPolicy();

        User customer = null;

        if (policy != null
                && policy.getPolicyHolder() != null) {

            customer =
                    policy.getPolicyHolder().getUser();
        }

        claimsDao.deleteClaims(claimNumber);

        // =====================================================
        // NOTIFY CUSTOMER
        // =====================================================

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

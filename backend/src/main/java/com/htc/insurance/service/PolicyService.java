
package com.htc.insurance.service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dao.UserDao;

import com.htc.insurance.dto.PolicyDto;

import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.User;

import com.htc.insurance.mapper.PolicyMapper;

@Service
@Transactional
public class PolicyService {

    @Autowired
    private PolicyDao policyDao;

    @Autowired
    private PolicyHolderDao policyHolderDao;

    @Autowired
    private PolicyMapper policyMapper;

    @Autowired
    private UserDao userDao;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PolicyPurchaseDao policyPurchaseDao;

    @Autowired
    private ClaimsDao claimsDao;

    // =========================================================
    // VALIDATE POLICY
    // =========================================================

    private void validatePolicyDetails(PolicyDto dto) {

        if (dto == null) {
            throw new IllegalArgumentException(
                    "Policy details are required.");
        }

        if (dto.getCoveredTypes() == null
                || dto.getCoveredTypes().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Insurance cover type is required.");
        }

        if (dto.getStartDate() == null) {
            throw new IllegalArgumentException(
                    "Policy start date is required.");
        }

        Integer duration = dto.getDurationYears();

        if (duration == null || duration < 1 || duration > 5) {

            throw new IllegalArgumentException(
                    "Policy duration must be between 1 and 5 years.");
        }
    }

    // =========================================================
    // RESOLVE POLICY HOLDER
    // =========================================================

    private PolicyHolder resolvePolicyHolder(Long holderId) {

        if (holderId == null) {
            return null;
        }

        PolicyHolder holder =
                policyHolderDao.getPolicyHolderById(holderId);

        if (holder == null) {
            throw new IllegalArgumentException(
                    "Policy holder not found.");
        }

        return holder;
    }

    // =========================================================
    // CHECK POLICY EXPIRY
    // =========================================================

    private boolean hasExpired(Policy policy) {

        return policy != null
                && policy.getExpiryDate() != null
                && !policy.getExpiryDate().isAfter(
                        LocalDate.now());
    }

    // =========================================================
    // CHECK COVERAGE START
    // =========================================================

    private boolean coverageStarted(Policy policy) {

        return policy != null
                && policy.getStartDate() != null
                && !policy.getStartDate().isAfter(
                        LocalDate.now());
    }

    // =========================================================
    // AUTOMATICALLY EXPIRE POLICY WHEN PROCESSED
    // =========================================================

    private Policy expireIfNecessary(Policy policy) {

        if (policy == null || !hasExpired(policy)) {
            return policy;
        }

        boolean wasActive =
                Boolean.TRUE.equals(policy.getIsActive());

        boolean alreadyExpired =
                policy.getLifecycleStatus()
                        == PolicyLifecycleStatus.EXPIRED;

        if (!wasActive && alreadyExpired) {
            return policy;
        }

        // Never leave an expired policy active.
        policy.setIsActive(Boolean.FALSE);

        // Preserve claim/refund/administrative lock reasons.
        // Expiry still prevents activation through date checks.
        PolicyLifecycleStatus lifecycle =
                policy.getLifecycleStatus();

        if (lifecycle == null
                || lifecycle == PolicyLifecycleStatus.ACTIVE) {

            policy.setLifecycleStatus(
                    PolicyLifecycleStatus.EXPIRED);
        }

        Policy updated =
                policyDao.updatePolicy(policy);

        if (wasActive && !alreadyExpired) {

            createPolicyNotification(
                    updated.getPolicyHolder(),
                    "Policy Expired",
                    "Your insurance policy #"
                            + updated.getPolicyNumber()
                            + " expired on "
                            + updated.getExpiryDate()
                            + ". Please contact InsureX "
                            + "for renewal options.",
                    "POLICY");
        }

        return updated;
    }

    // =========================================================
    // CREATE POLICY
    // =========================================================

    public PolicyDto savePolicy(PolicyDto policyDto) {

        validatePolicyDetails(policyDto);

        PolicyHolder holder =
                resolvePolicyHolder(
                        policyDto.getPolicyHolderId());

        Policy policy =
                policyMapper.convertPolicyDtoToEntity(
                        policyDto);

        policy.setPolicyHolder(holder);

        policy.setCoveredTypes(
                policyDto.getCoveredTypes().trim());

        policy.setStartDate(
                policyDto.getStartDate());

        policy.setDurationYears(
                policyDto.getDurationYears());

        LocalDate expiryDate =
                policyDto.getStartDate()
                        .plusYears(
                                policyDto.getDurationYears());

        policy.setExpiryDate(expiryDate);

        boolean alreadyExpired =
                !expiryDate.isAfter(LocalDate.now());

        boolean requestedActive =
                policyDto.getIsActive() == null
                || Boolean.TRUE.equals(
                        policyDto.getIsActive());

        boolean active =
                !alreadyExpired && requestedActive;

        policy.setIsActive(active);

        if (alreadyExpired) {

            policy.setLifecycleStatus(
                    PolicyLifecycleStatus.EXPIRED);

        } else if (active) {

            policy.setLifecycleStatus(
                    PolicyLifecycleStatus.ACTIVE);

        } else {

            policy.setLifecycleStatus(
                    PolicyLifecycleStatus.ADMIN_DISABLED);
        }

        Policy savedPolicy =
                policyDao.savePolicy(policy);

        createPolicyNotification(
                holder,
                "Policy Created",
                "Your insurance policy #"
                        + savedPolicy.getPolicyNumber()
                        + " has been created successfully.",
                "POLICY");

        if (alreadyExpired) {

            createPolicyNotification(
                    holder,
                    "Policy Expired",
                    "Your insurance policy #"
                            + savedPolicy.getPolicyNumber()
                            + " has an expiry date of "
                            + savedPolicy.getExpiryDate()
                            + " and is already expired.",
                    "POLICY");
        }

        return policyMapper.convertPolicyEntityToDto(
                savedPolicy);
    }

    // =========================================================
    // GET ALL POLICIES - ADMIN
    // =========================================================

    public List<PolicyDto> getAllPolicies() {

        return policyDao.getAllPolicies()
                .stream()
                .map(this::expireIfNecessary)
                .map(policyMapper::convertPolicyEntityToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // GET POLICY BY NUMBER
    // =========================================================

    public PolicyDto getPolicyById(Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyById(policyNumber);

        if (policy == null) {
            return null;
        }

        policy = expireIfNecessary(policy);

        return policyMapper.convertPolicyEntityToDto(
                policy);
    }

    // =========================================================
    // UPDATE POLICY
    // =========================================================

    public PolicyDto updatePolicy(
            Long policyNumber,
            PolicyDto policyDto) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        validatePolicyDetails(policyDto);

        Policy existingPolicy =
                policyDao.getPolicyByIdForUpdate(
                        policyNumber);

        if (existingPolicy == null) {
            return null;
        }

        PolicyHolder holder =
                resolvePolicyHolder(
                        policyDto.getPolicyHolderId());

        // Preserve existing ownership for policies
        // with purchases or historical claims.
        if (hasPurchaseRecord(policyNumber)
                || hasAnyClaim(policyNumber)) {

            Long existingHolderId =
                    existingPolicy.getPolicyHolder() == null
                            ? null
                            : existingPolicy.getPolicyHolder()
                                    .getPolicyHolderId();

            Long requestedHolderId =
                    holder == null
                            ? null
                            : holder.getPolicyHolderId();

            if (existingHolderId == null
                    ? requestedHolderId != null
                    : !existingHolderId.equals(
                            requestedHolderId)) {

                throw new IllegalStateException(
                        "Policy ownership cannot be changed "
                                + "after purchase or claim activity.");
            }
        }

        existingPolicy.setCoveredTypes(
                policyDto.getCoveredTypes().trim());

        existingPolicy.setStartDate(
                policyDto.getStartDate());

        existingPolicy.setDurationYears(
                policyDto.getDurationYears());

        LocalDate expiryDate =
                policyDto.getStartDate()
                        .plusYears(
                                policyDto.getDurationYears());

        existingPolicy.setExpiryDate(expiryDate);
        existingPolicy.setPolicyHolder(holder);

        // Do not activate a policy simply because
        // an admin changes its dates or other details.
        if (hasExpired(existingPolicy)) {

            existingPolicy.setIsActive(Boolean.FALSE);

            PolicyLifecycleStatus lifecycle =
                    existingPolicy.getLifecycleStatus();

            if (lifecycle == null
                    || lifecycle == PolicyLifecycleStatus.ACTIVE) {

                existingPolicy.setLifecycleStatus(
                        PolicyLifecycleStatus.EXPIRED);
            }
        }

        Policy savedPolicy =
                policyDao.updatePolicy(existingPolicy);

        createPolicyNotification(
                holder,
                "Policy Updated",
                "Your insurance policy #"
                        + savedPolicy.getPolicyNumber()
                        + " has been updated successfully.",
                "POLICY");

        return policyMapper.convertPolicyEntityToDto(
                savedPolicy);
    }

    // =========================================================
    // DELETE POLICY
    // =========================================================

    public void deletePolicy(Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyByIdForUpdate(
                        policyNumber);

        if (policy == null) {
            throw new IllegalArgumentException(
                    "Policy not found.");
        }

        if (hasAnyClaim(policyNumber)) {

            throw new IllegalStateException(
                    "Policy cannot be deleted "
                            + "because it has claim history.");
        }

        if (hasPurchaseRecord(policyNumber)) {

            throw new IllegalStateException(
                    "Purchased policies cannot be deleted. "
                            + "Deactivate the policy instead.");
        }

        PolicyHolder holder =
                policy.getPolicyHolder();

        policyDao.deletePolicy(policyNumber);

        createPolicyNotification(
                holder,
                "Policy Deleted",
                "Your insurance policy #"
                        + policyNumber
                        + " has been deleted successfully.",
                "POLICY");
    }

    // =========================================================
    // ACTIVATE POLICY
    // =========================================================

    public PolicyDto activatePolicy(Long policyNumber) {

        Policy policy =
                requireLockedPolicy(policyNumber);

        // Lock purchase after policy to match
        // claim and refund transaction ordering.
        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByPolicyNumberForUpdate(
                        policyNumber)
                .orElse(null);

        if (hasBlockingRefund(purchase)) {

            throw new IllegalStateException(
                    "This policy has a refund in progress "
                            + "or has already been refunded. "
                            + "It cannot be activated.");
        }

        if (hasExpired(policy)) {

            throw new IllegalStateException(
                    "Expired policies cannot be activated. "
                            + "Renew the policy first.");
        }

        if (!coverageStarted(policy)) {

            throw new IllegalStateException(
                    "Policy coverage has not started yet.");
        }

        if (hasBlockingClaim(policyNumber)) {

            throw new IllegalStateException(
                    "This policy already has a pending, "
                            + "approved or settled claim. "
                            + "It cannot be activated.");
        }

        PolicyLifecycleStatus lifecycle =
                policy.getLifecycleStatus();

        if (lifecycle == PolicyLifecycleStatus.CLAIM_LOCKED) {

            throw new IllegalStateException(
                    "This policy is locked due to claim approval. "
                            + "It cannot be manually activated.");
        }

        if (lifecycle == PolicyLifecycleStatus.REFUNDED) {

            throw new IllegalStateException(
                    "Refunded policies cannot be activated.");
        }

        // An expired policy requires a separate
        // verified renewal process.
        if (lifecycle == PolicyLifecycleStatus.EXPIRED) {

            throw new IllegalStateException(
                    "This policy is marked expired. "
                            + "Complete the renewal process first.");
        }

        policy.setIsActive(Boolean.TRUE);

        policy.setLifecycleStatus(
                PolicyLifecycleStatus.ACTIVE);

        Policy updated =
                policyDao.updatePolicy(policy);

        createPolicyNotification(
                updated.getPolicyHolder(),
                "Policy Activated",
                "Your insurance policy #"
                        + updated.getPolicyNumber()
                        + " has been activated.",
                "POLICY");

        return policyMapper.convertPolicyEntityToDto(
                updated);
    }

    // =========================================================
    // DEACTIVATE POLICY
    // =========================================================

    public PolicyDto deactivatePolicy(Long policyNumber) {

        Policy policy =
                requireLockedPolicy(policyNumber);

        policy.setIsActive(Boolean.FALSE);

        // Preserve claim/refund/expiry lifecycle reasons.
        // Admin deactivation should not erase a claim lock.
        PolicyLifecycleStatus lifecycle =
                policy.getLifecycleStatus();

        if (lifecycle == null
                || lifecycle == PolicyLifecycleStatus.ACTIVE
                || lifecycle == PolicyLifecycleStatus.ADMIN_DISABLED) {

            policy.setLifecycleStatus(
                    PolicyLifecycleStatus.ADMIN_DISABLED);
        }

        Policy updated =
                policyDao.updatePolicy(policy);

        createPolicyNotification(
                updated.getPolicyHolder(),
                "Policy Deactivated",
                "Your insurance policy #"
                        + updated.getPolicyNumber()
                        + " has been deactivated.",
                "POLICY");

        return policyMapper.convertPolicyEntityToDto(
                updated);
    }

    // =========================================================
    // REQUIRE LOCKED POLICY
    // =========================================================

    private Policy requireLockedPolicy(Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyByIdForUpdate(
                        policyNumber);

        if (policy == null) {
            throw new IllegalArgumentException(
                    "Policy not found.");
        }

        return policy;
    }

    // =========================================================
    // GET CUSTOMER'S ACTIVE POLICIES
    // =========================================================

    public List<PolicyDto> getPoliciesByUsername(
            String username) {

        if (username == null
                || username.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Username is required.");
        }

        User user =
                userDao.getUserByUsername(
                        username.trim());

        if (user == null) {
            throw new IllegalArgumentException(
                    "User not found.");
        }

        LocalDate today = LocalDate.now();

        return policyDao.getAllPolicies()
                .stream()

                .filter(policy -> policy != null)

                .filter(policy ->
                        policy.getPolicyHolder() != null
                        && policy.getPolicyHolder()
                                .getUser() != null
                        && user.getUserId() != null
                        && user.getUserId().equals(
                                policy.getPolicyHolder()
                                        .getUser()
                                        .getUserId()))

                .map(this::expireIfNecessary)

                .filter(policy ->
                        Boolean.TRUE.equals(
                                policy.getIsActive()))

                .filter(policy ->
                        policy.getLifecycleStatus() == null
                        || policy.getLifecycleStatus()
                                == PolicyLifecycleStatus.ACTIVE)

                .filter(policy ->
                        policy.getStartDate() != null
                        && !policy.getStartDate()
                                .isAfter(today))

                .filter(policy ->
                        policy.getExpiryDate() != null
                        && policy.getExpiryDate()
                                .isAfter(today))

                .filter(policy ->
                        !hasBlockingRefund(
                                policy.getPolicyNumber()))

                .map(policyMapper::convertPolicyEntityToDto)

                .collect(Collectors.toList());
    }

    // =========================================================
    // CHECK POLICY HAS ANY CLAIM
    // =========================================================

    private boolean hasAnyClaim(Long policyNumber) {

        if (policyNumber == null) {
            return false;
        }

        return claimsDao.getAllClaims()
                .stream()
                .anyMatch(claim ->
                        claim != null
                        && claim.getPolicy() != null
                        && policyNumber.equals(
                                claim.getPolicy()
                                        .getPolicyNumber()));
    }

    // =========================================================
    // CHECK FOR BLOCKING CLAIMS
    // =========================================================

    private boolean hasBlockingClaim(Long policyNumber) {

        if (policyNumber == null) {
            return false;
        }

        for (Claims claim : claimsDao.getAllClaims()) {

            if (claim == null
                    || claim.getPolicy() == null
                    || !policyNumber.equals(
                            claim.getPolicy()
                                    .getPolicyNumber())) {
                continue;
            }

            ClaimStatus status = claim.getStatus();

            // Historical rejected claims allow retry.
            if (status == ClaimStatus.REJECTED) {
                continue;
            }

            // PENDING, APPROVED, SETTLED and null block.
            return true;
        }

        return false;
    }

    // =========================================================
    // CHECK POLICY HAS A PURCHASE RECORD
    // =========================================================

    private boolean hasPurchaseRecord(Long policyNumber) {

        if (policyNumber == null) {
            return false;
        }

        return policyPurchaseDao.getAllPurchases()
                .stream()
                .anyMatch(purchase ->
                        purchase != null
                        && purchase.getPolicy() != null
                        && policyNumber.equals(
                                purchase.getPolicy()
                                        .getPolicyNumber()));
    }

    // =========================================================
    // CHECK BLOCKING REFUND FOR POLICY
    // =========================================================

    private boolean hasBlockingRefund(Long policyNumber) {

        if (policyNumber == null) {
            return false;
        }

        return policyPurchaseDao.getAllPurchases()
                .stream()
                .filter(purchase ->
                        purchase != null
                        && purchase.getPolicy() != null
                        && policyNumber.equals(
                                purchase.getPolicy()
                                        .getPolicyNumber()))
                .anyMatch(purchase ->
                        isRefundBlocking(
                                purchase.getRefundStatus()));
    }

    // =========================================================
    // CHECK BLOCKING REFUND FOR LOCKED PURCHASE
    // =========================================================

    private boolean hasBlockingRefund(
            PolicyPurchase purchase) {

        if (purchase == null) {
            return false;
        }

        return isRefundBlocking(
                purchase.getRefundStatus());
    }

    private boolean isRefundBlocking(String refundStatus) {

        if (refundStatus == null
                || refundStatus.isBlank()) {
            return true;
        }

        return !"NOT_REFUNDED".equalsIgnoreCase(
                refundStatus.trim());
    }

    // =========================================================
    // NORMALIZE COVER TYPE
    // =========================================================

    private String normalizeCoverType(
            String coveredTypes) {

        if (coveredTypes == null) {
            return "";
        }

        return coveredTypes.trim()
                .replaceAll(
                        "(?i)\\s+insurance\\s*$", "")
                .trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    // =========================================================
    // AVAILABLE POLICIES - BUY INSURANCE PAGE
    // =========================================================

    @Transactional(readOnly = true)
    public List<PolicyDto> getAvailablePolicies() {

        LocalDate today = LocalDate.now();

        Map<String, Policy> uniquePolicies =
                new LinkedHashMap<>();

        for (Policy policy :
                policyDao.getAllPolicies()) {

            if (policy == null) {
                continue;
            }

            if (!Boolean.TRUE.equals(
                    policy.getIsActive())) {
                continue;
            }

            PolicyLifecycleStatus lifecycle =
                    policy.getLifecycleStatus();

            if (lifecycle != null
                    && lifecycle != PolicyLifecycleStatus.ACTIVE) {
                continue;
            }

            if (policy.getStartDate() == null
                    || policy.getStartDate()
                            .isAfter(today)) {
                continue;
            }

            if (policy.getExpiryDate() == null
                    || !policy.getExpiryDate()
                            .isAfter(today)) {
                continue;
            }

            // Exclude refunded customer policies.
            if (hasBlockingRefund(
                    policy.getPolicyNumber())) {
                continue;
            }

            String key =
                    normalizeCoverType(
                            policy.getCoveredTypes());

            if (key.isEmpty()) {
                continue;
            }

            uniquePolicies.putIfAbsent(
                    key, policy);
        }

        return uniquePolicies.values()
                .stream()
                .map(policyMapper::convertPolicyEntityToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // NOTIFICATIONS
    // =========================================================

    private void createPolicyNotification(
            PolicyHolder policyHolder,
            String title,
            String message,
            String type) {

        try {

            if (policyHolder == null) {
                return;
            }

            User user =
                    policyHolder.getUser();

            if (user == null
                    || user.getUserId() == null) {
                return;
            }

            notificationService.createNotification(
                    user,
                    title,
                    message,
                    type);

        } catch (Exception e) {

            System.err.println(
                    "Policy notification failed: "
                            + e.getClass()
                                    .getSimpleName()
                            + " - "
                            + e.getMessage());
        }
    }
}

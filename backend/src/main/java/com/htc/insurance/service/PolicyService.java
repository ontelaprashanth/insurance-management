
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

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.PolicyDto;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
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

    // =========================================================
    // VALIDATE POLICY
    // =========================================================

    private void validatePolicyDetails(PolicyDto dto) {

        if (dto == null) {
            throw new RuntimeException(
                    "Policy details are required.");
        }

        if (dto.getCoveredTypes() == null
                || dto.getCoveredTypes().trim().isEmpty()) {

            throw new RuntimeException(
                    "Insurance cover type is required.");
        }

        if (dto.getStartDate() == null) {
            throw new RuntimeException(
                    "Policy start date is required.");
        }

        Integer duration = dto.getDurationYears();

        if (duration == null || duration < 1 || duration > 5) {

            throw new RuntimeException(
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
            throw new RuntimeException(
                    "Policy holder not found.");
        }

        return holder;
    }

    // =========================================================
    // CHECK POLICY EXPIRY
    // Expiry date itself is treated as expired.
    // =========================================================

    private boolean hasExpired(Policy policy) {

        return policy != null
                && policy.getExpiryDate() != null
                && !policy.getExpiryDate().isAfter(
                        LocalDate.now());
    }

    // =========================================================
    // AUTOMATICALLY EXPIRE POLICY WHEN PROCESSED
    // =========================================================

    private Policy expireIfNecessary(Policy policy) {

        if (policy == null || !hasExpired(policy)) {
            return policy;
        }

        // Do not send repeated expiry notifications.
        if (Boolean.FALSE.equals(policy.getIsActive())) {
            return policy;
        }

        policy.setIsActive(Boolean.FALSE);

        Policy updated = policyDao.updatePolicy(policy);

        createPolicyNotification(
                updated.getPolicyHolder(),
                "Policy Expired",
                "Your insurance policy #"
                        + updated.getPolicyNumber()
                        + " expired on "
                        + updated.getExpiryDate()
                        + ". Please contact InsureX for renewal options.",
                "POLICY");

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
        policy.setStartDate(policyDto.getStartDate());
        policy.setDurationYears(
                policyDto.getDurationYears());

        LocalDate expiryDate = policyDto.getStartDate()
                .plusYears(policyDto.getDurationYears());

        policy.setExpiryDate(expiryDate);

        boolean alreadyExpired =
                !expiryDate.isAfter(LocalDate.now());

        boolean requestedActive =
                policyDto.getIsActive() == null
                        || Boolean.TRUE.equals(
                                policyDto.getIsActive());

        policy.setIsActive(
                alreadyExpired
                        ? Boolean.FALSE
                        : requestedActive);

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
            throw new RuntimeException(
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
            throw new RuntimeException(
                    "Policy number is required.");
        }

        validatePolicyDetails(policyDto);

        Policy existingPolicy =
                policyDao.getPolicyById(policyNumber);

        if (existingPolicy == null) {
            return null;
        }

        existingPolicy =
                expireIfNecessary(existingPolicy);

        PolicyHolder holder =
                resolvePolicyHolder(
                        policyDto.getPolicyHolderId());

        existingPolicy.setCoveredTypes(
                policyDto.getCoveredTypes().trim());

        existingPolicy.setStartDate(
                policyDto.getStartDate());

        existingPolicy.setDurationYears(
                policyDto.getDurationYears());

        LocalDate expiryDate = policyDto.getStartDate()
                .plusYears(policyDto.getDurationYears());

        existingPolicy.setExpiryDate(expiryDate);
        existingPolicy.setPolicyHolder(holder);

        // Preserve existing active/inactive state.
        if (hasExpired(existingPolicy)) {
            existingPolicy.setIsActive(Boolean.FALSE);
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
            throw new RuntimeException(
                    "Policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyById(policyNumber);

        if (policy == null) {
            throw new RuntimeException(
                    "Policy not found.");
        }

        if (policy.getClaims() != null
                && !policy.getClaims().isEmpty()) {

            throw new RuntimeException(
                    "Policy cannot be deleted because it has claims.");
        }

        // Preserve the purchase/payment audit trail.
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

        Policy policy = requirePolicy(policyNumber);

        // A refunding or refunded policy must not be activated.
        if (hasBlockingRefund(policyNumber)) {

            throw new IllegalStateException(
                    "This policy has a refund in progress "
                    + "or has already been refunded. "
                    + "It cannot be activated.");
        }

        if (hasExpired(policy)) {

            throw new RuntimeException(
                    "Expired policies cannot be activated. "
                            + "Renew the policy before activating it.");
        }

        policy.setIsActive(Boolean.TRUE);

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

        Policy policy = requirePolicy(policyNumber);

        policy.setIsActive(Boolean.FALSE);

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
    // FIND POLICY
    // =========================================================

    private Policy requirePolicy(Long policyNumber) {

        if (policyNumber == null) {
            throw new RuntimeException(
                    "Policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyById(policyNumber);

        if (policy == null) {
            throw new RuntimeException(
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

            throw new RuntimeException(
                    "Username is required.");
        }

        User user =
                userDao.getUserByUsername(
                        username.trim());

        if (user == null) {
            throw new RuntimeException(
                    "User not found.");
        }

        LocalDate today = LocalDate.now();

        return policyDao.getAllPolicies()
                .stream()

                .filter(policy -> policy != null)

                // Only policies belonging to this customer
                .filter(policy ->
                        policy.getPolicyHolder() != null
                        && policy.getPolicyHolder()
                                .getUser() != null
                        && user.getUserId() != null
                        && user.getUserId().equals(
                                policy.getPolicyHolder()
                                        .getUser()
                                        .getUserId()))

                // Process expiry using existing logic
                .map(this::expireIfNecessary)

                // Only active policies
                .filter(policy ->
                        Boolean.TRUE.equals(
                                policy.getIsActive()))

                // Coverage must have started
                .filter(policy ->
                        policy.getStartDate() != null
                        && !policy.getStartDate()
                                .isAfter(today))

                // Coverage must not have expired
                .filter(policy ->
                        policy.getExpiryDate() != null
                        && policy.getExpiryDate()
                                .isAfter(today))

                // Exclude policies with refund activity
                .filter(policy ->
                        !hasBlockingRefund(
                                policy.getPolicyNumber()))

                .map(
                        policyMapper::convertPolicyEntityToDto)

                .collect(Collectors.toList());
    }

    // =========================================================
    // CHECK IF POLICY HAS A PURCHASE RECORD
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
    // PREVENT REFUNDED POLICY REACTIVATION
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

    private boolean isRefundBlocking(String refundStatus) {

        if (refundStatus == null
                || refundStatus.isBlank()) {
            return true;
        }

        return !"NOT_REFUNDED".equalsIgnoreCase(
                refundStatus.trim());
    }

    // =========================================================
    // NORMALIZE COVER TYPE FOR DUPLICATE DETECTION
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
    // AVAILABLE POLICIES - CUSTOMER BUY INSURANCE PAGE
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
                .map(
                        policyMapper::convertPolicyEntityToDto)
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

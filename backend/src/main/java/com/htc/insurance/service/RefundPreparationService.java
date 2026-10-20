
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.dto.RefundRequestDto;

import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyPurchase;

@Service
public class RefundPreparationService {

    private static final long REFUND_WINDOW_HOURS = 24;

    private final PolicyPurchaseDao policyPurchaseDao;
    private final PolicyDao policyDao;
    private final ClaimsDao claimsDao;

    public RefundPreparationService(
            PolicyPurchaseDao policyPurchaseDao,
            PolicyDao policyDao,
            ClaimsDao claimsDao) {

        this.policyPurchaseDao = policyPurchaseDao;
        this.policyDao = policyDao;
        this.claimsDao = claimsDao;
    }

    // =========================================================
    // PREPARE REFUND
    // =========================================================

    /**
     * Validates refund eligibility and prepares a refund.
     *
     * Database locking order:
     *
     * 1. Read purchase to identify policy.
     * 2. Lock policy row.
     * 3. Lock purchase row.
     * 4. Revalidate purchase and refund eligibility.
     * 5. Check whether claims exist.
     * 6. Mark refund pending and deactivate policy.
     *
     * All database changes are committed atomically.
     *
     * Razorpay refund creation must happen only after
     * this transaction successfully commits.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase prepareRefund(
            RefundRequestDto request,
            String authenticatedUsername) {

        // =====================================================
        // VALIDATE REQUEST
        // =====================================================

        if (request == null) {
            throw new IllegalArgumentException(
                    "Refund request is required.");
        }

        Long purchaseId = request.getPurchaseId();

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        if (authenticatedUsername == null
                || authenticatedUsername.isBlank()) {

            throw new IllegalArgumentException(
                    "Authenticated user is required.");
        }

        String username = authenticatedUsername.trim();

        String reason = request.getRefundReason() == null
                ? ""
                : request.getRefundReason().trim();

        if (reason.isBlank()) {
            throw new IllegalArgumentException(
                    "Refund reason is required.");
        }

        if (reason.length() > 500) {
            throw new IllegalArgumentException(
                    "Refund reason cannot exceed 500 characters.");
        }

        // =====================================================
        // STEP 1 - READ PURCHASE WITHOUT LOCK
        // =====================================================

        /*
         * This first read is used only to identify
         * the policy that needs to be locked.
         *
         * Do not trust payment or refund status from
         * this preliminary purchase lookup.
         */

        PolicyPurchase initialPurchase =
                policyPurchaseDao.getPurchaseById(purchaseId);

        if (initialPurchase == null) {
            throw new IllegalArgumentException(
                    "Purchase not found.");
        }

        if (initialPurchase.getPolicy() == null
                || initialPurchase.getPolicy()
                        .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Purchase policy information is unavailable.");
        }

        Long policyNumber = initialPurchase
                .getPolicy()
                .getPolicyNumber();

        // =====================================================
        // STEP 2 - LOCK POLICY ROW FIRST
        // =====================================================

        /*
         * ClaimsService.saveClaims() obtains this same
         * policy lock before checking eligibility.
         *
         * If a claim is being submitted, this refund
         * operation waits until that transaction ends.
         */

        Policy policy = policyDao.getPolicyByIdForUpdate(
                policyNumber);

        if (policy == null) {
            throw new IllegalStateException(
                    "The purchased policy no longer exists.");
        }

        // =====================================================
        // STEP 3 - LOCK PURCHASE ROW SECOND
        // =====================================================

        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByIdForUpdate(purchaseId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Purchase not found."));

        // =====================================================
        // REVALIDATE PURCHASE-POLICY ASSOCIATION
        // =====================================================

        if (purchase.getPolicy() == null
                || purchase.getPolicy()
                        .getPolicyNumber() == null
                || !policyNumber.equals(
                        purchase.getPolicy()
                                .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Purchase policy information changed. "
                    + "Please retry your refund request.");
        }

        // =====================================================
        // VALIDATE OWNERSHIP
        // =====================================================

        if (policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null) {

            throw new IllegalStateException(
                    "Purchase ownership information "
                    + "is unavailable.");
        }

        String ownerUsername = policy
                .getPolicyHolder()
                .getUser()
                .getUsername();

        if (ownerUsername == null
                || !ownerUsername.equalsIgnoreCase(username)) {

            throw new AccessDeniedException(
                    "You are not authorized to refund "
                    + "this purchase.");
        }

        // =====================================================
        // VALIDATE PAYMENT STATUS
        // =====================================================

        String paymentStatus = purchase.getPaymentStatus();

        if (paymentStatus == null
                || !"PAID".equalsIgnoreCase(
                        paymentStatus.trim())) {

            throw new IllegalStateException(
                    "Only paid purchases can be refunded.");
        }

        // =====================================================
        // VALIDATE RAZORPAY PAYMENT ID
        // =====================================================

        if (purchase.getRazorpayPaymentId() == null
                || purchase.getRazorpayPaymentId().isBlank()) {

            throw new IllegalStateException(
                    "The Razorpay payment ID is missing.");
        }

        // =====================================================
        // PREVENT DUPLICATE REFUNDS
        // =====================================================

        String refundStatus = purchase.getRefundStatus();

        /*
         * Allow NOT_REFUNDED and legacy null values.
         * Any other status blocks another refund.
         */

        if (refundStatus != null
                && !"NOT_REFUNDED".equalsIgnoreCase(
                        refundStatus.trim())) {

            throw new IllegalStateException(
                    "This purchase already has a refund "
                    + "in progress or has been refunded. "
                    + "Current status: " + refundStatus);
        }

        // =====================================================
        // VALIDATE REFUND AMOUNT
        // =====================================================

        BigDecimal refundAmount = purchase.getTotalPremium();

        if (refundAmount == null
                || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalStateException(
                    "The purchase has no valid "
                    + "refundable amount.");
        }

        // =====================================================
        // ENFORCE 24-HOUR REFUND WINDOW
        // =====================================================

        LocalDateTime paymentDateTime =
                purchase.getPaymentDateTime();

        if (paymentDateTime == null) {
            throw new IllegalStateException(
                    "Payment timestamp is unavailable. "
                    + "Refund eligibility cannot be verified.");
        }

        LocalDateTime now = LocalDateTime.now();

        if (paymentDateTime.isAfter(now)) {
            throw new IllegalStateException(
                    "The payment timestamp is invalid.");
        }

        LocalDateTime deadline =
                paymentDateTime.plusHours(REFUND_WINDOW_HOURS);

        if (!now.isBefore(deadline)) {
            throw new IllegalStateException(
                    "The 24-hour refund window has expired.");
        }

        // =====================================================
        // BLOCK REFUND IF ANY CLAIM EXISTS
        // =====================================================

        /*
         * All claim statuses count:
         *
         * PENDING
         * APPROVED
         * REJECTED
         * SETTLED
         *
         * Even a rejected claim makes the policy
         * ineligible for automatic refund.
         */

        if (hasExistingClaims(policyNumber)) {

            throw new IllegalStateException(
                    "Refund cannot be requested because "
                    + "a claim has already been submitted "
                    + "against this policy. "
                    + "Please contact support for review.");
        }

        // =====================================================
        // MARK REFUND PENDING
        // =====================================================

        purchase.setRefundStatus("REFUND_PENDING");

        purchase.setRefundAmount(refundAmount);

        purchase.setRefundReason(reason);

        purchase.setRefundId(null);

        purchase.setRefundDateTime(null);

        // =====================================================
        // DEACTIVATE POLICY
        // =====================================================

        /*
         * Once a refund is prepared, the policy is
         * deactivated to prevent new claims.
         *
         * Keep the policy and purchase records
         * for payment and refund history.
         */

        policy.setIsActive(false);

        // =====================================================
        // SAVE BOTH RECORDS IN ONE TRANSACTION
        // =====================================================

        policyDao.savePolicy(policy);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // CHECK EXISTING CLAIMS
    // =========================================================

    private boolean hasExistingClaims(Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalStateException(
                    "Policy number is required.");
        }

        return claimsDao.existsClaimsByPolicyNumber(
                policyNumber);
    }
}


package com.htc.insurance.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.entity.RefundAttemptStatus;

import com.htc.insurance.repository.RefundAttemptRepository;

@Service
@RequiredArgsConstructor
public class RefundPersistenceService {

    // =========================================================
    // REFUND STATUS CONSTANTS
    // =========================================================

    private static final String REFUND_PENDING =
            "REFUND_PENDING";

    private static final String REFUND_PROCESSING =
            "REFUND_PROCESSING";

    private static final String REFUNDED =
            "REFUNDED";

    private static final String REFUND_FAILED =
            "REFUND_FAILED";

    private static final String RECONCILIATION =
            "REFUND_REQUIRES_RECONCILIATION";

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final PolicyPurchaseDao policyPurchaseDao;
    private final PolicyDao policyDao;
    private final RefundAttemptRepository refundAttemptRepository;

    // =========================================================
    // REFUND ACCEPTED BY RAZORPAY
    // =========================================================

    /**
     * Called after Razorpay returns a refund ID.
     *
     * This does not mean the refund has completed.
     *
     * Lock order:
     * 1. Policy
     * 2. Purchase
     * 3. RefundAttempt
     *
     * Never downgrades a completed refund.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase markRefundProcessing(
            Long purchaseId,
            String razorpayRefundId) {

        validatePurchaseId(purchaseId);
        validateRefundId(razorpayRefundId);

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        RefundAttempt attempt =
                requireAttemptForUpdate(purchaseId);

        validateAttemptPurchase(attempt, purchase);

        // =====================================================
        // VALIDATE EXISTING REFUND IDS
        // =====================================================

        validateExistingRefundId(
                purchase.getRefundId(),
                razorpayRefundId);

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                razorpayRefundId);

        // =====================================================
        // PRESERVE COMPLETED REFUNDS
        // =====================================================

        boolean purchaseRefunded =
                REFUNDED.equalsIgnoreCase(
                        purchase.getRefundStatus());

        boolean attemptRefunded =
                attempt.getStatus()
                        == RefundAttemptStatus.REFUNDED;

        if (purchaseRefunded || attemptRefunded) {

            if (!purchaseRefunded || !attemptRefunded) {

                throw new IllegalStateException(
                        "Refund records are inconsistent. "
                        + "Reconciliation is required.");
            }

            validateCompletedRefundIds(
                    purchase,
                    attempt,
                    razorpayRefundId);

            markPolicyRefunded(policy);

            return purchase;
        }

        // =====================================================
        // PRESERVE CONFIRMED FAILED REFUNDS
        // =====================================================

        if (REFUND_FAILED.equalsIgnoreCase(
                purchase.getRefundStatus())
                || attempt.getStatus()
                    == RefundAttemptStatus.FAILED) {

            throw new IllegalStateException(
                    "Refund has already failed. "
                    + "Do not return it to processing.");
        }

        // =====================================================
        // VALIDATE PURCHASE STATUS
        // =====================================================

        String currentStatus =
                purchase.getRefundStatus();

        if (!REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not awaiting refund processing.");
        }

        // =====================================================
        // SAVE RAZORPAY REFUND ID
        // =====================================================

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUND_PROCESSING);

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.PROCESSING);
        attempt.setFailureReason(null);

        markPolicyRefundPending(policy);

        refundAttemptRepository.saveAndFlush(attempt);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // VERIFIED REFUND COMPLETED
    // =========================================================

    /**
     * Called only after Razorpay has independently confirmed:
     *
     * - Refund status = processed
     * - Correct refund ID
     * - Correct original payment ID
     * - Correct refund amount
     *
     * The caller is responsible for those external checks.
     *
     * This method updates:
     * RefundAttempt -> REFUNDED
     * PolicyPurchase -> REFUNDED
     * Policy -> REFUNDED
     *
     * All updates occur in one database transaction.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase markRefunded(
            Long purchaseId,
            String razorpayRefundId) {

        validatePurchaseId(purchaseId);
        validateRefundId(razorpayRefundId);

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        RefundAttempt attempt =
                requireAttemptForUpdate(purchaseId);

        validateAttemptPurchase(attempt, purchase);

        // =====================================================
        // VALIDATE REFUND IDENTIFIERS
        // =====================================================

        validateExistingRefundId(
                purchase.getRefundId(),
                razorpayRefundId);

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                razorpayRefundId);

        // =====================================================
        // HANDLE COMPLETED REFUND IDEMPOTENTLY
        // =====================================================

        boolean purchaseRefunded =
                REFUNDED.equalsIgnoreCase(
                        purchase.getRefundStatus());

        boolean attemptRefunded =
                attempt.getStatus()
                        == RefundAttemptStatus.REFUNDED;

        if (purchaseRefunded || attemptRefunded) {

            if (!purchaseRefunded || !attemptRefunded) {

                throw new IllegalStateException(
                        "Refund records are inconsistent. "
                        + "Reconciliation is required.");
            }

            validateCompletedRefundIds(
                    purchase,
                    attempt,
                    razorpayRefundId);

            if (purchase.getRefundDateTime() == null) {

                purchase.setRefundDateTime(
                        LocalDateTime.now());
            }

            markPolicyRefunded(policy);

            return policyPurchaseDao.savePurchase(purchase);
        }

        // =====================================================
        // VALIDATE CURRENT REFUND STATUS
        // =====================================================

        String currentStatus =
                purchase.getRefundStatus();

        if (!REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUND_FAILED.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not eligible for refund completion.");
        }

        // A verified processed event may supersede
        // an earlier failed state for the same refund ID.
        // The caller must have verified the processed result.

        // =====================================================
        // MARK PURCHASE REFUNDED
        // =====================================================

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUNDED);

        if (purchase.getRefundDateTime() == null) {

            purchase.setRefundDateTime(
                    LocalDateTime.now());
        }

        // =====================================================
        // MARK ATTEMPT REFUNDED
        // =====================================================

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.REFUNDED);
        attempt.setFailureReason(null);

        // =====================================================
        // MARK POLICY REFUNDED
        // =====================================================

        markPolicyRefunded(policy);

        refundAttemptRepository.saveAndFlush(attempt);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // RECOVER PROCESSED REFUND WITHOUT ATTEMPT
    // =========================================================

    /**
     * Recovers a purchase when Razorpay has confirmed
     * that its refund was processed but the corresponding
     * RefundAttempt record is missing.
     *
     * Does not create a new Razorpay refund.
     *
     * Caller must independently verify:
     * - Refund status = processed
     * - Refund ID
     * - Original payment ID
     * - Exact amount in paise
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase recoverProcessedRefundWithoutAttempt(
            Long purchaseId,
            String razorpayRefundId,
            String verifiedPaymentId,
            long verifiedAmountInPaise) {

        validatePurchaseId(purchaseId);
        validateRefundId(razorpayRefundId);

        if (verifiedPaymentId == null
                || verifiedPaymentId.isBlank()) {

            throw new IllegalArgumentException(
                    "Verified payment ID is required.");
        }

        if (verifiedAmountInPaise <= 0) {

            throw new IllegalArgumentException(
                    "Verified refund amount must be positive.");
        }

        // =====================================================
        // LOCK POLICY AND PURCHASE
        // =====================================================

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        // =====================================================
        // VERIFY REFUND ID
        // =====================================================

        if (!razorpayRefundId.equals(
                purchase.getRefundId())) {

            throw new IllegalStateException(
                    "Purchase refund ID does not match "
                    + "the verified Razorpay refund.");
        }

        // =====================================================
        // VERIFY ORIGINAL PAYMENT
        // =====================================================

        if (!verifiedPaymentId.equals(
                purchase.getRazorpayPaymentId())) {

            throw new IllegalStateException(
                    "Original Razorpay payment ID mismatch.");
        }

        // =====================================================
        // VERIFY EXACT REFUND AMOUNT
        // =====================================================

        if (purchase.getRefundAmount() == null) {

            throw new IllegalStateException(
                    "Purchase refund amount is missing.");
        }

        long expectedAmountInPaise;

        try {

            expectedAmountInPaise =
                    purchase.getRefundAmount()
                            .movePointRight(2)
                            .longValueExact();

        } catch (ArithmeticException ex) {

            throw new IllegalStateException(
                    "Invalid purchase refund amount.",
                    ex);
        }

        if (expectedAmountInPaise
                != verifiedAmountInPaise) {

            throw new IllegalStateException(
                    "Refund amount does not match Razorpay.");
        }

        // =====================================================
        // PREVENT CONFLICT WITH EXISTING ATTEMPT
        // =====================================================

        if (refundAttemptRepository
                .findByPurchaseIdForUpdate(purchaseId)
                .isPresent()) {

            throw new IllegalStateException(
                    "Refund attempt now exists. "
                    + "Use normal refund reconciliation.");
        }

        // =====================================================
        // IDEMPOTENT COMPLETION
        // =====================================================

        String currentStatus =
                purchase.getRefundStatus();

        if (REFUNDED.equalsIgnoreCase(currentStatus)) {

            if (purchase.getRefundDateTime() == null) {

                purchase.setRefundDateTime(
                        LocalDateTime.now());
            }

            markPolicyRefunded(policy);

            return policyPurchaseDao.savePurchase(purchase);
        }

        // =====================================================
        // VERIFY RECOVERY ELIGIBILITY
        // =====================================================

        if (!REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase status is not eligible "
                    + "for verified refund recovery.");
        }

        // =====================================================
        // COMPLETE VERIFIED REFUND
        // =====================================================

        purchase.setRefundStatus(REFUNDED);

        if (purchase.getRefundDateTime() == null) {

            purchase.setRefundDateTime(
                    LocalDateTime.now());
        }

        markPolicyRefunded(policy);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // MARK RECONCILIATION REQUIRED
    // =========================================================

    /**
     * Marks an uncertain refund outcome.
     *
     * Does not create a new refund.
     *
     * Preserves known Razorpay refund IDs.
     *
     * Does not downgrade completed or failed refunds.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void markReconciliationRequired(
            Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            return;
        }

        // =====================================================
        // OPTIONAL LOCKING
        // =====================================================

        LockedRefundContext context =
                lockPolicyAndPurchaseIfPresent(purchaseId);

        if (context == null) {
            return;
        }

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        // =====================================================
        // LOCK EXISTING REFUND ATTEMPT
        // =====================================================

        RefundAttempt attempt =
                refundAttemptRepository
                        .findByPurchaseIdForUpdate(purchaseId)
                        .orElse(null);

        // =====================================================
        // PRESERVE COMPLETED REFUNDS
        // =====================================================

        boolean purchaseRefunded =
                REFUNDED.equalsIgnoreCase(
                        purchase.getRefundStatus());

        boolean attemptRefunded =
                attempt != null
                && attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED;

        if (purchaseRefunded || attemptRefunded) {

            if (purchaseRefunded
                    && (attempt == null || attemptRefunded)) {

                markPolicyRefunded(policy);
            }

            return;
        }

        // =====================================================
        // PRESERVE FAILED REFUNDS
        // =====================================================

        if (REFUND_FAILED.equalsIgnoreCase(
                purchase.getRefundStatus())
                || (attempt != null
                    && attempt.getStatus()
                        == RefundAttemptStatus.FAILED)) {

            return;
        }

        // =====================================================
        // VALIDATE KNOWN REFUND IDS
        // =====================================================

        if (attempt != null) {

            validateKnownRefundIds(
                    purchase.getRefundId(),
                    attempt.getRazorpayRefundId());
        }

        // =====================================================
        // VALIDATE CURRENT STATUS
        // =====================================================

        String currentStatus =
                purchase.getRefundStatus();

        if (!REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)) {

            return;
        }

        // =====================================================
        // MARK RECONCILIATION REQUIRED
        // =====================================================

        purchase.setRefundStatus(RECONCILIATION);

        if (attempt != null) {

            attempt.setStatus(
                    RefundAttemptStatus.REQUIRES_RECONCILIATION);

            // Preserve the existing refund ID.
            refundAttemptRepository.saveAndFlush(attempt);
        }

        markPolicyRefundPending(policy);

        policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // POLICY REFUND PENDING
    // =========================================================

    private void markPolicyRefundPending(
            Policy policy) {

        if (policy == null) {

            throw new IllegalStateException(
                    "Refund policy is unavailable.");
        }

        if (policy.getLifecycleStatus()
                == PolicyLifecycleStatus.REFUNDED) {

            throw new IllegalStateException(
                    "A refunded policy cannot return "
                    + "to refund pending.");
        }

        policy.setIsActive(Boolean.FALSE);

        policy.setLifecycleStatus(
                PolicyLifecycleStatus.REFUND_PENDING);

        policyDao.savePolicy(policy);
    }

    // =========================================================
    // POLICY REFUNDED
    // =========================================================

    private void markPolicyRefunded(
            Policy policy) {

        if (policy == null) {

            throw new IllegalStateException(
                    "Refund policy is unavailable.");
        }

        policy.setIsActive(Boolean.FALSE);

        policy.setLifecycleStatus(
                PolicyLifecycleStatus.REFUNDED);

        policyDao.savePolicy(policy);
    }

    // =========================================================
    // LOCK POLICY FIRST, PURCHASE SECOND
    // =========================================================

    private LockedRefundContext lockPolicyAndPurchase(
            Long purchaseId) {

        validatePurchaseId(purchaseId);

        // =====================================================
        // INITIAL READ IDENTIFIES POLICY
        // =====================================================

        PolicyPurchase initialPurchase =
                policyPurchaseDao.getPurchaseById(purchaseId);

        if (initialPurchase == null
                || initialPurchase.getPolicy() == null
                || initialPurchase.getPolicy()
                    .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Purchase or linked policy not found.");
        }

        Long policyNumber =
                initialPurchase.getPolicy()
                        .getPolicyNumber();

        // =====================================================
        // LOCK POLICY
        // =====================================================

        Policy policy =
                policyDao.getPolicyByIdForUpdate(policyNumber);

        if (policy == null) {

            throw new IllegalStateException(
                    "Linked policy not found.");
        }

        // =====================================================
        // LOCK PURCHASE
        // =====================================================

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Purchase not found."));

        // =====================================================
        // VERIFY POLICY RELATIONSHIP
        // =====================================================

        if (purchase.getPolicy() == null
                || purchase.getPolicy()
                    .getPolicyNumber() == null
                || !policyNumber.equals(
                        purchase.getPolicy()
                            .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Purchase policy changed during processing.");
        }

        return new LockedRefundContext(
                policy,
                purchase);
    }

    // =========================================================
    // OPTIONAL LOCK FOR RECONCILIATION
    // =========================================================

    private LockedRefundContext lockPolicyAndPurchaseIfPresent(
            Long purchaseId) {

        PolicyPurchase initialPurchase =
                policyPurchaseDao.getPurchaseById(purchaseId);

        if (initialPurchase == null) {
            return null;
        }

        return lockPolicyAndPurchase(purchaseId);
    }

    // =========================================================
    // LOCK REFUND ATTEMPT BY PURCHASE ID
    // =========================================================

    private RefundAttempt requireAttemptForUpdate(
            Long purchaseId) {

        return refundAttemptRepository
                .findByPurchaseIdForUpdate(purchaseId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Refund attempt not found."));
    }

    // =========================================================
    // VALIDATE ATTEMPT PURCHASE
    // =========================================================

    private void validateAttemptPurchase(
            RefundAttempt attempt,
            PolicyPurchase purchase) {

        if (attempt == null
                || purchase == null
                || attempt.getPurchaseId() == null
                || !attempt.getPurchaseId().equals(
                        purchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "Refund attempt purchase mismatch.");
        }
    }

    // =========================================================
    // VALIDATE COMPLETED REFUND IDS
    // =========================================================

    private void validateCompletedRefundIds(
            PolicyPurchase purchase,
            RefundAttempt attempt,
            String refundId) {

        if (!refundId.equals(purchase.getRefundId())
                || !refundId.equals(
                        attempt.getRazorpayRefundId())) {

            throw new IllegalStateException(
                    "Completed refund ID mismatch.");
        }
    }

    // =========================================================
    // VALIDATE KNOWN REFUND IDS
    // =========================================================

    private void validateKnownRefundIds(
            String purchaseRefundId,
            String attemptRefundId) {

        if (hasValue(purchaseRefundId)
                && hasValue(attemptRefundId)
                && !purchaseRefundId.equals(
                        attemptRefundId)) {

            throw new IllegalStateException(
                    "Conflicting refund IDs require "
                    + "manual reconciliation.");
        }
    }

    // =========================================================
    // VALIDATE EXISTING REFUND ID
    // =========================================================

    private void validateExistingRefundId(
            String existingRefundId,
            String incomingRefundId) {

        if (hasValue(existingRefundId)
                && !existingRefundId.equals(
                        incomingRefundId)) {

            throw new IllegalStateException(
                    "Existing Razorpay refund ID mismatch.");
        }
    }

    // =========================================================
    // VALIDATION HELPERS
    // =========================================================

    private void validatePurchaseId(
            Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {

            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }
    }

    private void validateRefundId(
            String refundId) {

        if (!hasValue(refundId)) {

            throw new IllegalArgumentException(
                    "A valid Razorpay refund ID is required.");
        }
    }

    private boolean hasValue(
            String value) {

        return value != null
                && !value.isBlank();
    }

    // =========================================================
    // LOCKED REFUND CONTEXT
    // =========================================================

    private static final class LockedRefundContext {

        private final Policy policy;
        private final PolicyPurchase purchase;

        private LockedRefundContext(
                Policy policy,
                PolicyPurchase purchase) {

            this.policy = policy;
            this.purchase = purchase;
        }
    }
}

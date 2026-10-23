
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

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
public class RefundAttemptPersistenceService {

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

    private final RefundAttemptRepository refundRepository;
    private final PolicyPurchaseDao purchaseDao;
    private final PolicyDao policyDao;


    // =========================================================
    // BEGIN REFUND
    // =========================================================

    /**
     * Creates one persistent refund attempt before
     * contacting Razorpay.
     *
     * Lock order:
     * 1. Policy
     * 2. Purchase
     * 3. Refund attempt (when one exists)
     *
     * REQUIRES_NEW ensures the attempt is committed
     * independently of the external Razorpay request.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public RefundAttempt beginRefund(
            Long purchaseId,
            String paymentId,
            BigDecimal amount,
            String reason,
            String username) {

        requirePositiveId(
                purchaseId,
                "A valid purchase ID is required.");

        requireText(
                paymentId,
                "A valid Razorpay payment ID is required.");

        requirePositiveAmount(amount);

        requireText(
                reason,
                "Refund reason is required.");

        requireText(
                username,
                "Authenticated username is required.");

        // =====================================================
        // LOCK POLICY AND PURCHASE
        // =====================================================

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        // =====================================================
        // VERIFY REFUND ELIGIBILITY
        // =====================================================

        // A new refund starts from NOT_REFUNDED. This check runs
        // while the policy and purchase are locked, so only one
        // request can transition the purchase to REFUND_PROCESSING.
        if (!REFUND_PENDING.equalsIgnoreCase(
                purchase.getRefundStatus())) {

            throw new IllegalStateException(
                    "Purchase is not awaiting a refund.");
        }

        if (refundRepository.existsByPurchaseId(purchaseId)) {

            throw new IllegalStateException(
                    "A refund attempt already exists "
                    + "for this purchase.");
        }

        if (!paymentId.equals(
                purchase.getRazorpayPaymentId())) {

            throw new IllegalStateException(
                    "The payment ID does not match "
                    + "the purchase.");
        }

        if (purchase.getRefundAmount() == null
                || amount.compareTo(
                        purchase.getRefundAmount()) != 0) {

            throw new IllegalStateException(
                    "Refund amount does not match "
                    + "the purchase.");
        }

        if (purchase.getRefundReason() != null
                && !reason.equals(
                        purchase.getRefundReason())) {

            throw new IllegalStateException(
                    "Refund reason does not match "
                    + "the purchase.");
        }

        if (policy.getLifecycleStatus()
                == PolicyLifecycleStatus.REFUNDED) {

            throw new IllegalStateException(
                    "A refunded policy cannot "
                    + "start another refund.");
        }

        // =====================================================
        // CREATE REFUND ATTEMPT
        // =====================================================

        RefundAttempt attempt = new RefundAttempt();

        attempt.setPurchaseId(purchaseId);
        attempt.setRazorpayPaymentId(paymentId);
        attempt.setRefundAmount(amount);
        attempt.setRefundReason(reason);
        attempt.setRequestedBy(username);

        attempt.setStatus(
                RefundAttemptStatus.PROCESSING);

        RefundAttempt saved =
                refundRepository.saveAndFlush(attempt);

        // =====================================================
        // UPDATE PURCHASE
        // =====================================================

        purchase.setRefundStatus(
                REFUND_PROCESSING);

        purchase.setRefundReason(reason);
        purchase.setRefundAmount(amount);

        markPolicyRefundPending(policy);

        purchaseDao.savePurchase(purchase);

        return saved;
    }

    // =========================================================
    // RECORD VERIFIED RAZORPAY REFUND RESULT
    // =========================================================

    /**
     * Updates refund attempt, purchase and policy
     * in one database transaction.
     *
     * Must be called only with a status obtained from:
     * - A signature-verified Razorpay webhook, or
     * - A trusted server-side Razorpay API lookup.
     *
     * Lock order:
     * Policy -> Purchase -> RefundAttempt.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void recordRefundResult(
            Long attemptId,
            String refundId,
            String razorpayStatus) {

        requirePositiveId(
                attemptId,
                "A valid refund attempt ID is required.");

        requireText(
                refundId,
                "A valid Razorpay refund ID is required.");

        requireText(
                razorpayStatus,
                "A Razorpay refund status is required.");

        // Initial read is used only to locate the purchase.
        RefundAttempt initialAttempt =
                refundRepository.findById(attemptId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Refund attempt was not found."));

        // =====================================================
        // LOCK POLICY AND PURCHASE FIRST
        // =====================================================

        LockedRefundContext context =
                lockPolicyAndPurchase(
                        initialAttempt.getPurchaseId());

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        // =====================================================
        // LOCK REFUND ATTEMPT
        // =====================================================

        RefundAttempt attempt =
                refundRepository.findByIdForUpdate(attemptId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Refund attempt was not found."));

        validateAttemptPurchase(
                attempt,
                purchase);

        // =====================================================
        // VERIFY EXISTING REFUND IDENTIFIERS
        // =====================================================

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                refundId);

        validateExistingRefundId(
                purchase.getRefundId(),
                refundId);

        String status =
                normalizeStatus(razorpayStatus);

        // =====================================================
        // PROTECT COMPLETED REFUNDS
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

            if (!refundId.equals(
                    purchase.getRefundId())
                    || !refundId.equals(
                            attempt.getRazorpayRefundId())) {

                throw new IllegalStateException(
                        "Completed refund ID mismatch.");
            }

            // A stale pending or failed webhook
            // must never downgrade a completed refund.
            markPolicyRefunded(policy);

            return;
        }

        // =====================================================
        // PRESERVE FAILED REFUND AGAINST STALE EVENTS
        // =====================================================

        boolean attemptFailed =
                attempt.getStatus()
                        == RefundAttemptStatus.FAILED;

        boolean purchaseFailed =
                REFUND_FAILED.equalsIgnoreCase(
                        purchase.getRefundStatus());

        if ((attemptFailed || purchaseFailed)
                && isProcessingStatus(status)) {

            // Do not revive a confirmed failed refund
            // from a stale created/pending/queued event.
            return;
        }

        // =====================================================
        // SAVE RAZORPAY REFUND IDENTIFIERS
        // =====================================================

        attempt.setRazorpayRefundId(refundId);
        purchase.setRefundId(refundId);

        // =====================================================
        // APPLY VERIFIED RAZORPAY STATUS
        // =====================================================

        switch (status) {

            case "processed":

                attempt.setStatus(
                        RefundAttemptStatus.REFUNDED);

                attempt.setFailureReason(null);

                purchase.setRefundStatus(REFUNDED);

                if (purchase.getRefundDateTime() == null) {

                    purchase.setRefundDateTime(
                            LocalDateTime.now());
                }

                markPolicyRefunded(policy);

                break;

            case "created":
            case "pending":
            case "queued":

                attempt.setStatus(
                        RefundAttemptStatus.PROCESSING);

                attempt.setFailureReason(null);

                purchase.setRefundStatus(
                        REFUND_PROCESSING);

                markPolicyRefundPending(policy);

                break;

            case "failed":

                attempt.setStatus(
                        RefundAttemptStatus.FAILED);

                attempt.setFailureReason(
                        "Razorpay reported that "
                        + "the refund failed.");

                purchase.setRefundStatus(
                        REFUND_FAILED);

                // Do not automatically reactivate
                // a policy after a failed refund.
                markPolicyRefundPending(policy);

                break;

            default:

                attempt.setStatus(
                        RefundAttemptStatus.REQUIRES_RECONCILIATION);

                attempt.setFailureReason(
                        "Unrecognized Razorpay refund status: "
                        + limit(status, 350));

                purchase.setRefundStatus(
                        RECONCILIATION);

                markPolicyRefundPending(policy);

                break;
        }

        // =====================================================
        // ATOMIC DATABASE PERSISTENCE
        // =====================================================

        refundRepository.saveAndFlush(attempt);

        purchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // REQUIRE RECONCILIATION
    // =========================================================

    /**
     * Marks an uncertain refund for reconciliation.
     *
     * Preserves known Razorpay refund IDs.
     *
     * Does not overwrite completed or confirmed
     * failed refunds.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void requireReconciliation(
            Long attemptId,
            String reason) {

        requirePositiveId(
                attemptId,
                "A valid refund attempt ID is required.");

        RefundAttempt initialAttempt =
                refundRepository.findById(attemptId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Refund attempt was not found."));

        // =====================================================
        // LOCK POLICY AND PURCHASE
        // =====================================================

        LockedRefundContext context =
                lockPolicyAndPurchase(
                        initialAttempt.getPurchaseId());

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        // =====================================================
        // LOCK REFUND ATTEMPT
        // =====================================================

        RefundAttempt attempt =
                refundRepository.findByIdForUpdate(attemptId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Refund attempt was not found."));

        validateAttemptPurchase(
                attempt,
                purchase);

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

            if (purchaseRefunded && attemptRefunded) {

                markPolicyRefunded(policy);
            }

            return;
        }

        // =====================================================
        // PRESERVE CONFIRMED FAILED REFUNDS
        // =====================================================

        if (attempt.getStatus()
                    == RefundAttemptStatus.FAILED
                || REFUND_FAILED.equalsIgnoreCase(
                        purchase.getRefundStatus())) {

            return;
        }

        // =====================================================
        // PRESERVE EXISTING REFUND IDS
        // =====================================================

        String attemptRefundId =
                attempt.getRazorpayRefundId();

        String purchaseRefundId =
                purchase.getRefundId();

        if (hasValue(attemptRefundId)
                && hasValue(purchaseRefundId)
                && !attemptRefundId.equals(
                        purchaseRefundId)) {

            throw new IllegalStateException(
                    "Conflicting refund IDs require "
                    + "manual investigation.");
        }

        // Do not erase either known refund ID.
        // An uncertain refund can still require
        // reconciliation even when its ID is known.

        attempt.setStatus(
                RefundAttemptStatus.REQUIRES_RECONCILIATION);

        attempt.setFailureReason(
                limit(reason, 500));

        purchase.setRefundStatus(
                RECONCILIATION);

        markPolicyRefundPending(policy);

        refundRepository.saveAndFlush(attempt);

        purchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // MARK POLICY REFUND PENDING
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
    // MARK POLICY REFUNDED
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

        requirePositiveId(
                purchaseId,
                "A valid purchase ID is required.");

        // =====================================================
        // INITIAL READ TO IDENTIFY POLICY
        // =====================================================

        PolicyPurchase initialPurchase =
                purchaseDao.getPurchaseById(
                        purchaseId);

        if (initialPurchase == null
                || initialPurchase.getPolicy() == null
                || initialPurchase.getPolicy()
                    .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Purchase or linked policy "
                    + "was not found.");
        }

        Long policyNumber =
                initialPurchase.getPolicy()
                        .getPolicyNumber();

        // =====================================================
        // LOCK POLICY
        // =====================================================

        Policy policy =
                policyDao.getPolicyByIdForUpdate(
                        policyNumber);

        if (policy == null) {

            throw new IllegalStateException(
                    "Linked policy was not found.");
        }

        // =====================================================
        // LOCK PURCHASE
        // =====================================================

        PolicyPurchase purchase =
                purchaseDao
                        .getPurchaseByIdForUpdate(
                                purchaseId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Purchase was not found."));

        // =====================================================
        // VERIFY RELATIONSHIP
        // =====================================================

        if (purchase.getPolicy() == null
                || purchase.getPolicy()
                    .getPolicyNumber() == null
                || !policyNumber.equals(
                        purchase.getPolicy()
                            .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Purchase policy changed "
                    + "during processing.");
        }

        return new LockedRefundContext(
                policy,
                purchase);
    }

    // =========================================================
    // VALIDATE REFUND ATTEMPT PURCHASE
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
    // VALIDATE EXISTING REFUND ID
    // =========================================================

    private void validateExistingRefundId(
            String existingRefundId,
            String incomingRefundId) {

        if (hasValue(existingRefundId)
                && !existingRefundId.equals(
                        incomingRefundId)) {

            throw new IllegalStateException(
                    "Razorpay refund ID does not match "
                    + "the existing refund record.");
        }
    }

    // =========================================================
    // VALIDATION HELPERS
    // =========================================================

    private void requirePositiveId(
            Long id,
            String message) {

        if (id == null || id <= 0) {
            throw new IllegalArgumentException(message);
        }
    }

    private void requireText(
            String value,
            String message) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private void requirePositiveAmount(
            BigDecimal amount) {

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Refund amount must be positive.");
        }
    }

    private boolean isProcessingStatus(
            String status) {

        return "created".equals(status)
                || "pending".equals(status)
                || "queued".equals(status);
    }

    private String normalizeStatus(
            String status) {

        return status.trim()
                .toLowerCase(Locale.ROOT);
    }

    private boolean hasValue(
            String value) {

        return value != null
                && !value.isBlank();
    }

    // =========================================================
    // LIMIT ERROR MESSAGE
    // =========================================================

    private String limit(
            String value,
            int maxLength) {

        if (value == null || value.isBlank()) {
            return "Refund outcome requires reconciliation.";
        }

        String cleaned =
                value.replaceAll(
                        "[\\r\\n\\t]",
                        " ");

        return cleaned.length() <= maxLength
                ? cleaned
                : cleaned.substring(0, maxLength);
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

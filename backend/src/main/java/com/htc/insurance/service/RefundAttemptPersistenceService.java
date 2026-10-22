
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.stereotype.Service;
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

    private final RefundAttemptRepository refundRepository;
    private final PolicyPurchaseDao purchaseDao;
    private final PolicyDao policyDao;

    public RefundAttemptPersistenceService(
            RefundAttemptRepository refundRepository,
            PolicyPurchaseDao purchaseDao,
            PolicyDao policyDao) {

        this.refundRepository = refundRepository;
        this.purchaseDao = purchaseDao;
        this.policyDao = policyDao;
    }

    // =========================================================
    // CREATE REFUND ATTEMPT
    // =========================================================

    /**
     * Creates one persistent refund attempt before
     * contacting Razorpay.
     *
     * Database locking order:
     * 1. Policy
     * 2. Purchase
     *
     * The attempt is committed before the external
     * Razorpay refund request begins.
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

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        if (paymentId == null || paymentId.isBlank()) {
            throw new IllegalArgumentException(
                    "A valid Razorpay payment ID is required.");
        }

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Refund amount must be positive.");
        }

        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException(
                    "Refund reason is required.");
        }

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated username is required.");
        }

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        if (!REFUND_PENDING.equalsIgnoreCase(
                purchase.getRefundStatus())) {

            throw new IllegalStateException(
                    "Purchase is not awaiting a refund.");
        }

        if (refundRepository.existsByPurchaseId(purchaseId)) {

            throw new IllegalStateException(
                    "A refund attempt already exists for this purchase. "
                    + "Check its status before taking further action.");
        }

        if (!paymentId.equals(
                purchase.getRazorpayPaymentId())) {

            throw new IllegalStateException(
                    "The payment ID does not match the purchase.");
        }

        if (purchase.getRefundAmount() == null
                || amount.compareTo(
                        purchase.getRefundAmount()) != 0) {

            throw new IllegalStateException(
                    "The refund amount does not match the purchase.");
        }

        if (purchase.getRefundReason() != null
                && !reason.equals(purchase.getRefundReason())) {

            throw new IllegalStateException(
                    "The refund reason does not match the purchase.");
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
        attempt.setStatus(RefundAttemptStatus.PROCESSING);

        RefundAttempt saved =
                refundRepository.saveAndFlush(attempt);

        purchase.setRefundStatus(REFUND_PROCESSING);
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
     * Called by the signature-verified Razorpay webhook.
     *
     * The controller must independently verify:
     * - Refund attempt ID
     * - Purchase ID, if provided
     * - Original payment ID
     * - Exact refund amount
     * - Existing refund ID
     *
     * This method makes the status changes atomic.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void recordRefundResult(
            Long attemptId,
            String refundId,
            String razorpayStatus) {

        if (attemptId == null || attemptId <= 0) {
            throw new IllegalArgumentException(
                    "A valid refund attempt ID is required.");
        }

        validateRefundId(refundId);

        if (razorpayStatus == null
                || razorpayStatus.isBlank()) {

            throw new IllegalArgumentException(
                    "A Razorpay refund status is required.");
        }

        // Read attempt only to identify the purchase.
        RefundAttempt initialAttempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        LockedRefundContext context =
                lockPolicyAndPurchase(
                        initialAttempt.getPurchaseId());

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        RefundAttempt attempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        if (attempt.getPurchaseId() == null
                || !attempt.getPurchaseId().equals(
                        purchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "Refund attempt purchase mismatch.");
        }

        // =====================================================
        // VALIDATE REFUND IDENTIFIERS
        // =====================================================

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                refundId);

        validateExistingRefundId(
                purchase.getRefundId(),
                refundId);

        String status = razorpayStatus
                .trim()
                .toLowerCase(Locale.ROOT);

        // =====================================================
        // PREVENT COMPLETED REFUND DOWNGRADES
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

            if (!refundId.equals(purchase.getRefundId())
                    || !refundId.equals(
                            attempt.getRazorpayRefundId())) {

                throw new IllegalStateException(
                        "Completed refund ID mismatch.");
            }

            // Repair legacy policy state if the purchase
            // and attempt are already confirmed refunded.
            markPolicyRefunded(policy);

            return;
        }

        // =====================================================
        // PRESERVE CONFIRMED FAILURE
        // =====================================================

        boolean failed =
                attempt.getStatus()
                        == RefundAttemptStatus.FAILED
                || REFUND_FAILED.equalsIgnoreCase(
                        purchase.getRefundStatus());

        if (failed
                && ("created".equals(status)
                || "pending".equals(status)
                || "queued".equals(status))) {

            return;
        }

        // =====================================================
        // SAVE RAZORPAY REFUND ID
        // =====================================================

        attempt.setRazorpayRefundId(refundId);
        purchase.setRefundId(refundId);

        // =====================================================
        // HANDLE RAZORPAY STATUS
        // =====================================================

        switch (status) {

            case "processed":

                /*
                 * Razorpay confirms refund processing.
                 *
                 * Do not treat this as independent proof
                 * of a bank account credit.
                 */

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
                        "Razorpay reported that the refund failed.");

                purchase.setRefundStatus(
                        REFUND_FAILED);

                // A failed refund does not automatically
                // restore policy eligibility.
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

        // Commit attempt, purchase and policy together.
        refundRepository.saveAndFlush(attempt);
        purchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // MARK UNCERTAIN REFUND FOR RECONCILIATION
    // =========================================================

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void requireReconciliation(
            Long attemptId,
            String reason) {

        if (attemptId == null || attemptId <= 0) {
            throw new IllegalArgumentException(
                    "A valid refund attempt ID is required.");
        }

        RefundAttempt initialAttempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        LockedRefundContext context =
                lockPolicyAndPurchase(
                        initialAttempt.getPurchaseId());

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        RefundAttempt attempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        if (attempt.getPurchaseId() == null
                || !attempt.getPurchaseId().equals(
                        purchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "Refund attempt purchase mismatch.");
        }

        // =====================================================
        // PRESERVE COMPLETED REFUNDS
        // =====================================================

        if (attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED
                || REFUNDED.equalsIgnoreCase(
                        purchase.getRefundStatus())) {

            if (attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED
                    && REFUNDED.equalsIgnoreCase(
                            purchase.getRefundStatus())) {

                markPolicyRefunded(policy);
            }

            return;
        }

        // =====================================================
        // PRESERVE FAILED REFUNDS
        // =====================================================

        if (attempt.getStatus()
                    == RefundAttemptStatus.FAILED
                || REFUND_FAILED.equalsIgnoreCase(
                        purchase.getRefundStatus())) {

            return;
        }

        // =====================================================
        // PRESERVE KNOWN REFUND IDS
        // =====================================================

        boolean knownRefundId =
                (attempt.getRazorpayRefundId() != null
                && !attempt.getRazorpayRefundId().isBlank())
                || (purchase.getRefundId() != null
                && !purchase.getRefundId().isBlank());

        if (knownRefundId) {
            return;
        }

        attempt.setStatus(
                RefundAttemptStatus.REQUIRES_RECONCILIATION);

        attempt.setFailureReason(
                limit(reason, 500));

        purchase.setRefundStatus(RECONCILIATION);

        markPolicyRefundPending(policy);

        refundRepository.saveAndFlush(attempt);
        purchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // MARK POLICY REFUND PENDING
    // =========================================================

    private void markPolicyRefundPending(Policy policy) {

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

    private void markPolicyRefunded(Policy policy) {

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

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        // Initial read identifies the linked policy.
        PolicyPurchase initialPurchase =
                purchaseDao.getPurchaseById(purchaseId);

        if (initialPurchase == null
                || initialPurchase.getPolicy() == null
                || initialPurchase.getPolicy()
                    .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Purchase or linked policy was not found.");
        }

        Long policyNumber =
                initialPurchase.getPolicy().getPolicyNumber();

        Policy policy =
                policyDao.getPolicyByIdForUpdate(policyNumber);

        if (policy == null) {
            throw new IllegalStateException(
                    "Linked policy was not found.");
        }

        PolicyPurchase purchase = purchaseDao
                .getPurchaseByIdForUpdate(purchaseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Purchase was not found."));

        if (purchase.getPolicy() == null
                || purchase.getPolicy()
                    .getPolicyNumber() == null
                || !policyNumber.equals(
                        purchase.getPolicy()
                            .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Purchase policy changed during processing.");
        }

        return new LockedRefundContext(policy, purchase);
    }

    // =========================================================
    // VALIDATE REFUND ID
    // =========================================================

    private void validateRefundId(String refundId) {

        if (refundId == null || refundId.isBlank()) {
            throw new IllegalArgumentException(
                    "A valid Razorpay refund ID is required.");
        }
    }

    // =========================================================
    // VALIDATE EXISTING REFUND ID
    // =========================================================

    private void validateExistingRefundId(
            String existingRefundId,
            String incomingRefundId) {

        if (existingRefundId != null
                && !existingRefundId.isBlank()
                && !existingRefundId.equals(incomingRefundId)) {

            throw new IllegalStateException(
                    "The Razorpay refund ID does not match "
                    + "the existing refund record.");
        }
    }

    // =========================================================
    // LIMIT ERROR TEXT
    // =========================================================

    private String limit(
            String value,
            int maxLength) {

        if (value == null || value.isBlank()) {
            return "Refund outcome requires reconciliation.";
        }

        String cleaned = value.replaceAll(
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

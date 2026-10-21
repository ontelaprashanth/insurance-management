
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyPurchaseDao;
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

    public RefundAttemptPersistenceService(
            RefundAttemptRepository refundRepository,
            PolicyPurchaseDao purchaseDao) {

        this.refundRepository = refundRepository;
        this.purchaseDao = purchaseDao;
    }

    // =========================================================
    // CREATE REFUND ATTEMPT BEFORE CONTACTING RAZORPAY
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        // Lock purchase before checking and creating an attempt.
        PolicyPurchase purchase =
                getPurchaseForUpdate(purchaseId);

        if (!REFUND_PENDING.equalsIgnoreCase(
                purchase.getRefundStatus())) {

            throw new IllegalStateException(
                    "Purchase is not awaiting a refund.");
        }

        // Preserve original duplicate prevention.
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

        // =====================================================
        // CREATE ATTEMPT
        // =====================================================

        RefundAttempt attempt = new RefundAttempt();

        attempt.setPurchaseId(purchaseId);
        attempt.setRazorpayPaymentId(paymentId);
        attempt.setRefundAmount(amount);
        attempt.setRefundReason(reason);
        attempt.setRequestedBy(username);
        attempt.setStatus(RefundAttemptStatus.PROCESSING);

        // Save before contacting Razorpay to prevent duplicates.
        RefundAttempt saved =
                refundRepository.saveAndFlush(attempt);

        // Keep both records synchronized.
        purchase.setRefundStatus(REFUND_PROCESSING);
        purchase.setRefundReason(reason);
        purchase.setRefundAmount(amount);

        purchaseDao.savePurchase(purchase);

        return saved;
    }

    // =========================================================
    // RECORD VERIFIED RAZORPAY REFUND RESULT
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        /*
         * Read attempt to identify the purchase.
         *
         * The purchase is locked first, so both
         * persistence services follow the same
         * lock ordering.
         */
        RefundAttempt initialAttempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        PolicyPurchase purchase =
                getPurchaseForUpdate(
                        initialAttempt.getPurchaseId());

        RefundAttempt attempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        if (!attempt.getPurchaseId().equals(
                purchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "Refund attempt purchase mismatch.");
        }

        // =====================================================
        // VALIDATE EXISTING REFUND IDENTIFIERS
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
        // NEVER DOWNGRADE A COMPLETED REFUND
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

            // An already-completed refund must have the
            // same refund ID in both records.
            if (!refundId.equals(purchase.getRefundId())
                    || !refundId.equals(
                            attempt.getRazorpayRefundId())) {

                throw new IllegalStateException(
                        "Completed refund ID mismatch.");
            }

            return;
        }

        // =====================================================
        // VALIDATE TERMINAL FAILURE
        // =====================================================

        boolean failed =
                attempt.getStatus()
                        == RefundAttemptStatus.FAILED
                || REFUND_FAILED.equalsIgnoreCase(
                        purchase.getRefundStatus());

        /*
         * Ignore delayed created/pending/queued events
         * after a confirmed failure.
         *
         * A later verified processed event is allowed
         * to correct a previously recorded failure.
         */
        if (failed
                && ("created".equals(status)
                || "pending".equals(status)
                || "queued".equals(status))) {

            return;
        }

        // =====================================================
        // RECORD RAZORPAY REFUND ID
        // =====================================================

        attempt.setRazorpayRefundId(refundId);
        purchase.setRefundId(refundId);

        // =====================================================
        // HANDLE RAZORPAY REFUND STATUS
        // =====================================================

        switch (status) {

            case "processed":

                /*
                 * Razorpay confirmed the refund was processed.
                 *
                 * Do not interpret this as independent proof
                 * that the customer's bank has credited it.
                 */
                attempt.setStatus(
                        RefundAttemptStatus.REFUNDED);

                attempt.setFailureReason(null);

                purchase.setRefundStatus(REFUNDED);

                if (purchase.getRefundDateTime() == null) {
                    purchase.setRefundDateTime(
                            LocalDateTime.now());
                }

                break;

            case "created":
            case "pending":
            case "queued":

                attempt.setStatus(
                        RefundAttemptStatus.PROCESSING);

                attempt.setFailureReason(null);

                purchase.setRefundStatus(
                        REFUND_PROCESSING);

                break;

            case "failed":

                attempt.setStatus(
                        RefundAttemptStatus.FAILED);

                attempt.setFailureReason(
                        "Razorpay reported that the refund failed.");

                purchase.setRefundStatus(
                        REFUND_FAILED);

                break;

            default:

                /*
                 * Unknown statuses must not be treated
                 * as successful or failed refunds.
                 */
                attempt.setStatus(
                        RefundAttemptStatus.REQUIRES_RECONCILIATION);

                attempt.setFailureReason(
                        "Unrecognized Razorpay refund status: "
                        + limit(status, 350));

                purchase.setRefundStatus(
                        RECONCILIATION);

                break;
        }

        // Both updates commit in the same transaction.
        refundRepository.saveAndFlush(attempt);
        purchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // MARK UNCERTAIN REFUND FOR RECONCILIATION
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        PolicyPurchase purchase =
                getPurchaseForUpdate(
                        initialAttempt.getPurchaseId());

        RefundAttempt attempt = refundRepository
                .findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        // Never overwrite a confirmed completed refund.
        if (attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED
                || REFUNDED.equalsIgnoreCase(
                        purchase.getRefundStatus())) {

            return;
        }

        // Preserve confirmed failure.
        if (attempt.getStatus()
                    == RefundAttemptStatus.FAILED
                || REFUND_FAILED.equalsIgnoreCase(
                        purchase.getRefundStatus())) {

            return;
        }

        /*
         * If a refund ID is already known, preserve
         * its processing state.
         *
         * It can be checked against Razorpay using
         * that refund ID.
         */
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

        refundRepository.saveAndFlush(attempt);
        purchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private PolicyPurchase getPurchaseForUpdate(
            Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        return purchaseDao
                .getPurchaseByIdForUpdate(purchaseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Purchase was not found."));
    }

    private void validateRefundId(String refundId) {

        if (refundId == null || refundId.isBlank()) {
            throw new IllegalArgumentException(
                    "A valid Razorpay refund ID is required.");
        }
    }

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
}

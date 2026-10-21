
package com.htc.insurance.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.entity.RefundAttemptStatus;
import com.htc.insurance.repository.RefundAttemptRepository;

@Service
public class RefundPersistenceService {

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

    private final PolicyPurchaseDao policyPurchaseDao;
    private final RefundAttemptRepository refundAttemptRepository;

    public RefundPersistenceService(
            PolicyPurchaseDao policyPurchaseDao,
            RefundAttemptRepository refundAttemptRepository) {

        this.policyPurchaseDao = policyPurchaseDao;
        this.refundAttemptRepository = refundAttemptRepository;
    }

    // =========================================================
    // REFUND ACCEPTED BY RAZORPAY
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PolicyPurchase markRefundProcessing(
            Long purchaseId,
            String razorpayRefundId) {

        validateRefundId(razorpayRefundId);

        PolicyPurchase purchase =
                getPurchaseForUpdate(purchaseId);

        RefundAttempt attempt = refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt not found."));

        // Never associate two different Razorpay refunds.
        validateExistingRefundId(
                purchase.getRefundId(),
                razorpayRefundId);

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                razorpayRefundId);

        // =====================================================
        // ALREADY COMPLETED
        // =====================================================

        if (REFUNDED.equalsIgnoreCase(
                purchase.getRefundStatus())
                || attempt.getStatus()
                        == RefundAttemptStatus.REFUNDED) {

            if (!REFUNDED.equalsIgnoreCase(
                    purchase.getRefundStatus())
                    || attempt.getStatus()
                            != RefundAttemptStatus.REFUNDED) {

                throw new IllegalStateException(
                        "Refund records are inconsistent. "
                        + "Reconciliation is required.");
            }

            return purchase;
        }

        // =====================================================
        // ALREADY FAILED
        // =====================================================

        if (REFUND_FAILED.equalsIgnoreCase(
                purchase.getRefundStatus())
                || attempt.getStatus()
                        == RefundAttemptStatus.FAILED) {

            throw new IllegalStateException(
                    "Razorpay reported a failed refund. "
                    + "Do not reset it to PROCESSING.");
        }

        String currentStatus = purchase.getRefundStatus();

        if (!REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUND_PROCESSING.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not awaiting refund processing.");
        }

        // =====================================================
        // UPDATE BOTH RECORDS
        // =====================================================

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUND_PROCESSING);

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.PROCESSING);
        attempt.setFailureReason(null);

        refundAttemptRepository.save(attempt);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // REFUND COMPLETED AND VERIFIED WITH RAZORPAY
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PolicyPurchase markRefunded(
            Long purchaseId,
            String razorpayRefundId) {

        validateRefundId(razorpayRefundId);

        PolicyPurchase purchase =
                getPurchaseForUpdate(purchaseId);

        RefundAttempt attempt = refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt not found."));

        validateExistingRefundId(
                purchase.getRefundId(),
                razorpayRefundId);

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                razorpayRefundId);

        // =====================================================
        // IDEMPOTENT COMPLETION
        // =====================================================

        if (REFUNDED.equalsIgnoreCase(
                purchase.getRefundStatus())
                && attempt.getStatus()
                        == RefundAttemptStatus.REFUNDED) {

            return purchase;
        }

        String currentStatus = purchase.getRefundStatus();

        if (!REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUNDED.equalsIgnoreCase(currentStatus)
                && !REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !REFUND_FAILED.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not ready for refund completion.");
        }

        // Only call this method after verifying that Razorpay
        // confirms this refund as processed.
        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUNDED);

        if (purchase.getRefundDateTime() == null) {
            purchase.setRefundDateTime(LocalDateTime.now());
        }

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.REFUNDED);
        attempt.setFailureReason(null);

        refundAttemptRepository.save(attempt);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // UNCERTAIN REFUND OUTCOME
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReconciliationRequired(Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            return;
        }

        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByIdForUpdate(purchaseId)
                .orElse(null);

        if (purchase == null) {
            return;
        }

        String status = purchase.getRefundStatus();

        if (REFUNDED.equalsIgnoreCase(status)
                || REFUND_FAILED.equalsIgnoreCase(status)) {
            return;
        }

        RefundAttempt attempt = refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .orElse(null);

        if (attempt != null) {

            if (attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED
                    || attempt.getStatus()
                            == RefundAttemptStatus.FAILED) {
                return;
            }

            // A known refund ID can be reconciled directly
            // against Razorpay. Preserve its processing state.
            if (attempt.getRazorpayRefundId() != null
                    && !attempt.getRazorpayRefundId().isBlank()) {
                return;
            }
        }

        if (REFUND_PROCESSING.equalsIgnoreCase(status)
                && purchase.getRefundId() != null
                && !purchase.getRefundId().isBlank()) {
            return;
        }

        if (RECONCILIATION.equalsIgnoreCase(status)) {
            return;
        }

        if (!REFUND_PENDING.equalsIgnoreCase(status)
                && !REFUND_PROCESSING.equalsIgnoreCase(status)) {
            return;
        }

        purchase.setRefundStatus(RECONCILIATION);

        if (attempt != null) {
            attempt.setStatus(
                    RefundAttemptStatus.REQUIRES_RECONCILIATION);

            refundAttemptRepository.save(attempt);
        }

        policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private PolicyPurchase getPurchaseForUpdate(Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "Valid purchase ID is required.");
        }

        return policyPurchaseDao
                .getPurchaseByIdForUpdate(purchaseId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Purchase not found."));
    }

    private void validateRefundId(String refundId) {

        if (refundId == null || refundId.isBlank()) {
            throw new IllegalArgumentException(
                    "Razorpay refund ID is required.");
        }
    }

    private void validateExistingRefundId(
            String existingRefundId,
            String incomingRefundId) {

        if (existingRefundId != null
                && !existingRefundId.isBlank()
                && !existingRefundId.equals(incomingRefundId)) {

            throw new IllegalStateException(
                    "Existing Razorpay refund ID does not match.");
        }
    }
}

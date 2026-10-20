
package com.htc.insurance.service;

import java.math.BigDecimal;

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

    private final RefundAttemptRepository refundRepository;
    private final PolicyPurchaseDao purchaseDao;

    public RefundAttemptPersistenceService(
            RefundAttemptRepository refundRepository,
            PolicyPurchaseDao purchaseDao) {
        this.refundRepository = refundRepository;
        this.purchaseDao = purchaseDao;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public RefundAttempt beginRefund(
            Long purchaseId,
            String paymentId,
            BigDecimal amount,
            String reason,
            String username) {

        if (refundRepository.existsByPurchaseId(purchaseId)) {
            throw new IllegalStateException(
                    "A refund attempt already exists for this purchase. "
                    + "Check its status before taking further action.");
        }

        PolicyPurchase purchase =
                purchaseDao.getPurchaseById(purchaseId);

        if (purchase == null) {
            throw new IllegalArgumentException(
                    "Purchase was not found.");
        }

        if (paymentId == null
                || !paymentId.equals(purchase.getRazorpayPaymentId())) {
            throw new IllegalStateException(
                    "The payment ID does not match the purchase.");
        }

        RefundAttempt attempt = new RefundAttempt();
        attempt.setPurchaseId(purchaseId);
        attempt.setRazorpayPaymentId(paymentId);
        attempt.setRefundAmount(amount);
        attempt.setRefundReason(reason);
        attempt.setRequestedBy(username);
        attempt.setStatus(RefundAttemptStatus.PROCESSING);

        // Save before contacting Razorpay to prevent duplicate attempts.
        RefundAttempt saved = refundRepository.saveAndFlush(attempt);

        purchase.setRefundStatus("PROCESSING");
        purchase.setRefundReason(reason);
        purchase.setRefundAmount(amount);

        purchaseDao.savePurchase(purchase);

        return saved;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRefundResult(
            Long attemptId,
            String refundId,
            String razorpayStatus) {

        RefundAttempt attempt = refundRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        PolicyPurchase purchase =
                purchaseDao.getPurchaseById(attempt.getPurchaseId());

        if (purchase == null) {
            throw new IllegalStateException(
                    "Purchase was not found while recording the refund.");
        }

        if (refundId == null || refundId.isBlank()) {
            throw new IllegalArgumentException(
                    "A valid Razorpay refund ID is required.");
        }

        if (razorpayStatus == null || razorpayStatus.isBlank()) {
            throw new IllegalArgumentException(
                    "A Razorpay refund status is required.");
        }

        String existingRefundId = attempt.getRazorpayRefundId();

        if (existingRefundId != null
                && !existingRefundId.isBlank()
                && !existingRefundId.equals(refundId)) {
            throw new IllegalStateException(
                    "The Razorpay refund ID does not match this attempt.");
        }

        String status = razorpayStatus.trim().toLowerCase();

        /*
         * A delayed created/pending/failed event must never downgrade
         * a refund already confirmed as successful.
         */
        if (attempt.getStatus() == RefundAttemptStatus.REFUNDED) {
            if (!refundId.equals(purchase.getRefundId())) {
                attempt.setRazorpayRefundId(refundId);
                purchase.setRefundId(refundId);
                refundRepository.saveAndFlush(attempt);
                purchaseDao.savePurchase(purchase);
            }
            return;
        }

        attempt.setRazorpayRefundId(refundId);
        purchase.setRefundId(refundId);

        switch (status) {
            case "processed":
                attempt.setStatus(RefundAttemptStatus.REFUNDED);
                attempt.setFailureReason(null);
                purchase.setRefundStatus("REFUNDED");
                break;

            case "created":
            case "pending":
            case "queued":
                // Do not downgrade a previously confirmed failure.
                if (attempt.getStatus()
                        != RefundAttemptStatus.FAILED) {
                    attempt.setStatus(RefundAttemptStatus.PROCESSING);
                    attempt.setFailureReason(null);
                    purchase.setRefundStatus("PROCESSING");
                }
                break;

            case "failed":
                attempt.setStatus(RefundAttemptStatus.FAILED);
                attempt.setFailureReason(
                        "Razorpay reported that the refund failed.");
                purchase.setRefundStatus("FAILED");
                break;

            default:
                attempt.setStatus(
                        RefundAttemptStatus.REQUIRES_RECONCILIATION);
                attempt.setFailureReason(
                        "Unrecognized Razorpay refund status: "
                        + limit(status, 350));
                purchase.setRefundStatus("REQUIRES_RECONCILIATION");
                break;
        }

        refundRepository.saveAndFlush(attempt);
        purchaseDao.savePurchase(purchase);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void requireReconciliation(
            Long attemptId,
            String reason) {

        RefundAttempt attempt = refundRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt was not found."));

        // Never overwrite a confirmed successful refund.
        if (attempt.getStatus() == RefundAttemptStatus.REFUNDED) {
            return;
        }

        attempt.setStatus(
                RefundAttemptStatus.REQUIRES_RECONCILIATION);

        attempt.setFailureReason(limit(reason, 500));

        refundRepository.saveAndFlush(attempt);

        PolicyPurchase purchase =
                purchaseDao.getPurchaseById(attempt.getPurchaseId());

        if (purchase != null) {
            purchase.setRefundStatus("REQUIRES_RECONCILIATION");
            purchaseDao.savePurchase(purchase);
        }
    }

    private String limit(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "Refund outcome requires reconciliation.";
        }

        String cleaned = value.replaceAll("[\\r\\n\\t]", " ");

        return cleaned.length() <= maxLength
                ? cleaned
                : cleaned.substring(0, maxLength);
    }
}

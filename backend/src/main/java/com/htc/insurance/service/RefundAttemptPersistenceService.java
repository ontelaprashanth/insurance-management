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

        PolicyPurchase purchase = purchaseDao.getPurchaseById(purchaseId);

        if (purchase == null) {
            throw new IllegalArgumentException(
                    "Purchase was not found.");
        }

        if (!paymentId.equals(purchase.getRazorpayPaymentId())) {
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

        /*
         * Commit the attempt before calling Razorpay.
         * A unique database constraint is also required to protect
         * against concurrent requests.
         */
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

        PolicyPurchase purchase = purchaseDao.getPurchaseById(
                attempt.getPurchaseId());

        if (purchase == null) {
            throw new IllegalStateException(
                    "Purchase was not found while recording the refund.");
        }

        attempt.setRazorpayRefundId(refundId);

        if ("processed".equalsIgnoreCase(razorpayStatus)) {
            attempt.setStatus(RefundAttemptStatus.REFUNDED);
            purchase.setRefundStatus("REFUNDED");

        } else if ("pending".equalsIgnoreCase(razorpayStatus)
                || "queued".equalsIgnoreCase(razorpayStatus)) {
            attempt.setStatus(RefundAttemptStatus.PROCESSING);
            purchase.setRefundStatus("PROCESSING");

        } else {
            attempt.setStatus(
                    RefundAttemptStatus.REQUIRES_RECONCILIATION);
            attempt.setFailureReason(
                    "Razorpay returned a refund status requiring review.");
            purchase.setRefundStatus("REQUIRES_RECONCILIATION");
        }

        attempt.setRazorpayRefundId(refundId);
        purchase.setRefundId(refundId);

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

        attempt.setStatus(
                RefundAttemptStatus.REQUIRES_RECONCILIATION);

        attempt.setFailureReason(limit(reason, 500));

        refundRepository.saveAndFlush(attempt);

        PolicyPurchase purchase = purchaseDao.getPurchaseById(
                attempt.getPurchaseId());

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

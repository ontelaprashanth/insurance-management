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

        String currentStatus = purchase.getRefundStatus();

        if (REFUNDED.equalsIgnoreCase(currentStatus)) {

            if (razorpayRefundId.equals(purchase.getRefundId())) {
                return purchase;
            }

            throw new IllegalStateException(
                    "Purchase already refunded with another refund ID.");
        }

        if (!REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUND_PROCESSING.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not awaiting refund processing.");
        }

        if (purchase.getRefundId() != null
                && !purchase.getRefundId().isBlank()
                && !razorpayRefundId.equals(purchase.getRefundId())) {

            throw new IllegalStateException(
                    "Existing refund ID does not match.");
        }

        RefundAttempt attempt = refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund attempt not found."));

        if (attempt.getRazorpayRefundId() != null
                && !razorpayRefundId.equals(
                        attempt.getRazorpayRefundId())) {

            throw new IllegalStateException(
                    "Refund attempt ID mismatch.");
        }

        if (attempt.getStatus() == RefundAttemptStatus.REFUNDED) {
            throw new IllegalStateException(
                    "Refund attempt is already completed "
                    + "but purchase is not synchronized.");
        }

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUND_PROCESSING);

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.PROCESSING);

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

        if (!razorpayRefundId.equals(purchase.getRefundId())
                || !razorpayRefundId.equals(
                        attempt.getRazorpayRefundId())) {

            throw new IllegalStateException(
                    "Razorpay refund IDs do not match.");
        }

        if (REFUNDED.equalsIgnoreCase(purchase.getRefundStatus())
                && attempt.getStatus() == RefundAttemptStatus.REFUNDED) {

            return purchase;
        }

        String currentStatus = purchase.getRefundStatus();

        if (!REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUNDED.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not ready for refund completion.");
        }

        purchase.setRefundStatus(REFUNDED);

        if (purchase.getRefundDateTime() == null) {
            purchase.setRefundDateTime(LocalDateTime.now());
        }

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

        if (REFUNDED.equalsIgnoreCase(status)) {
            return;
        }

        if (REFUND_PROCESSING.equalsIgnoreCase(status)
                && purchase.getRefundId() != null
                && !purchase.getRefundId().isBlank()) {
            return;
        }

        if (RECONCILIATION.equalsIgnoreCase(status)) {
            return;
        }

        if (!REFUND_PENDING.equalsIgnoreCase(status)) {
            return;
        }

        purchase.setRefundStatus(RECONCILIATION);

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
}

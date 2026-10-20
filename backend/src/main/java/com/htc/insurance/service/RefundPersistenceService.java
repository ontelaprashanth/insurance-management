package com.htc.insurance.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.entity.PolicyPurchase;

@Service
public class RefundPersistenceService {

    private final PolicyPurchaseDao policyPurchaseDao;

    public RefundPersistenceService(
            PolicyPurchaseDao policyPurchaseDao) {
        this.policyPurchaseDao = policyPurchaseDao;
    }

    /**
     * Persist a confirmed Razorpay refund ID.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PolicyPurchase markRefunded(
            Long purchaseId,
            String razorpayRefundId) {

        if (razorpayRefundId == null
                || razorpayRefundId.isBlank()) {
            throw new IllegalArgumentException(
                    "Razorpay refund ID is required.");
        }

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Purchase not found."));

        if (!"REFUND_PENDING".equalsIgnoreCase(
                purchase.getRefundStatus())) {
            throw new IllegalStateException(
                    "Purchase is not awaiting refund confirmation.");
        }

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus("REFUNDED");
        purchase.setRefundDateTime(LocalDateTime.now());

        return policyPurchaseDao.savePurchase(purchase);
    }

    /**
     * Mark uncertain external outcomes for manual reconciliation.
     * Never automatically resubmit the Razorpay refund.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReconciliationRequired(Long purchaseId) {

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElse(null);

        if (purchase == null) {
            return;
        }

        if ("REFUNDED".equalsIgnoreCase(
                purchase.getRefundStatus())) {
            return;
        }

        purchase.setRefundStatus(
                "REFUND_REQUIRES_RECONCILIATION");

        policyPurchaseDao.savePurchase(purchase);
    }
}

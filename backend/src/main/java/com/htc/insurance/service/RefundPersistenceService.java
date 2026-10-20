
package com.htc.insurance.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.entity.PolicyPurchase;

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

    public RefundPersistenceService(
            PolicyPurchaseDao policyPurchaseDao) {

        this.policyPurchaseDao = policyPurchaseDao;
    }

    /**
     * Razorpay has accepted the refund request and
     * returned a refund ID.
     *
     * This does not confirm that the money has reached
     * the customer's account.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PolicyPurchase markRefundProcessing(
            Long purchaseId,
            String razorpayRefundId) {

        validateRefundId(razorpayRefundId);

        PolicyPurchase purchase =
                getPurchaseForUpdate(purchaseId);

        String currentStatus =
                purchase.getRefundStatus();

        if (REFUND_PROCESSING.equalsIgnoreCase(
                currentStatus)) {

            if (razorpayRefundId.equals(
                    purchase.getRefundId())) {

                return purchase;
            }

            throw new IllegalStateException(
                    "This purchase already has a different refund ID.");
        }

        if (!REFUND_PENDING.equalsIgnoreCase(
                currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(
                        currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not awaiting refund processing.");
        }

        if (purchase.getRefundId() != null
                && !purchase.getRefundId().isBlank()
                && !razorpayRefundId.equals(
                        purchase.getRefundId())) {

            throw new IllegalStateException(
                    "The existing refund ID does not match.");
        }

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUND_PROCESSING);

        return policyPurchaseDao.savePurchase(purchase);
    }

    /**
     * Mark the refund completed only after its
     * completed/processed status has been independently
     * verified with Razorpay.
     *
     * Do not call this immediately after creating
     * a refund.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PolicyPurchase markRefunded(
            Long purchaseId,
            String razorpayRefundId) {

        validateRefundId(razorpayRefundId);

        PolicyPurchase purchase =
                getPurchaseForUpdate(purchaseId);

        String currentStatus =
                purchase.getRefundStatus();

        if (REFUNDED.equalsIgnoreCase(currentStatus)) {

            if (razorpayRefundId.equals(
                    purchase.getRefundId())) {

                return purchase;
            }

            throw new IllegalStateException(
                    "This purchase was refunded with another refund ID.");
        }

        if (!REFUND_PROCESSING.equalsIgnoreCase(
                currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(
                        currentStatus)) {

            throw new IllegalStateException(
                    "Refund is not ready for completion.");
        }

        if (purchase.getRefundId() == null
                || !razorpayRefundId.equals(
                        purchase.getRefundId())) {

            throw new IllegalStateException(
                    "Refund ID does not match the purchase record.");
        }

        purchase.setRefundStatus(REFUNDED);
        purchase.setRefundDateTime(LocalDateTime.now());

        return policyPurchaseDao.savePurchase(purchase);
    }

    /**
     * Mark an uncertain external outcome for
     * manual reconciliation.
     *
     * Never automatically resubmit a refund.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReconciliationRequired(
            Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            return;
        }

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElse(null);

        if (purchase == null) {
            return;
        }

        String status = purchase.getRefundStatus();

        // Never downgrade an already completed refund.
        if (REFUNDED.equalsIgnoreCase(status)) {
            return;
        }

        // Do not overwrite a known processing refund
        // simply because a later local operation failed.
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

    /**
     * Load and lock purchase for consistent
     * refund state transitions.
     */
    private PolicyPurchase getPurchaseForUpdate(
            Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        return policyPurchaseDao
                .getPurchaseByIdForUpdate(purchaseId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Purchase not found."));
    }

    /**
     * Validate Razorpay refund ID.
     */
    private void validateRefundId(
            String razorpayRefundId) {

        if (razorpayRefundId == null
                || razorpayRefundId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay refund ID is required.");
        }
    }
}

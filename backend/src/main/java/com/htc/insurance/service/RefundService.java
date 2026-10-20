package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.Locale;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.entity.PolicyPurchase;
import com.razorpay.RazorpayClient;
import com.razorpay.Refund;

@Service
public class RefundService {

    private final RefundPreparationService refundPreparationService;
    private final PolicyPurchaseDao policyPurchaseDao;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    public RefundService(
            RefundPreparationService refundPreparationService,
            PolicyPurchaseDao policyPurchaseDao) {

        this.refundPreparationService = refundPreparationService;
        this.policyPurchaseDao = policyPurchaseDao;
    }

    /**
     * Initiates one full refund for a purchase.
     *
     * Important: a network/API failure may happen after Razorpay
     * has accepted a refund. Such cases must be reconciled before
     * another refund is attempted.
     */
    public PolicyPurchase refundPurchase(
            RefundRequestDto request,
            String authenticatedUsername) throws Exception {

        // This separate Spring service call commits REFUND_PENDING
        // before the external Razorpay request begins.
        PolicyPurchase purchase =
                refundPreparationService.prepareRefund(
                        request, authenticatedUsername);

        try {
            RazorpayClient client =
                    new RazorpayClient(
                            razorpayKeyId,
                            razorpayKeySecret);

            long amountInPaise = purchase.getRefundAmount()
                    .multiply(new BigDecimal("100"))
                    .longValueExact();

            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amountInPaise);
            refundRequest.put("speed", "normal");

            JSONObject notes = new JSONObject();
            notes.put("purchase_id",
                    String.valueOf(purchase.getPurchaseId()));
            notes.put("reason",
                    purchase.getRefundReason());

            refundRequest.put("notes", notes);

            Refund razorpayRefund = client.payments.refund(
                    purchase.getRazorpayPaymentId(),
                    refundRequest);

            String razorpayRefundId =
                    razorpayRefund.get("id");

            if (razorpayRefundId == null
                    || razorpayRefundId.isBlank()) {

                // Do not clear pending or automatically retry.
                markReconciliationRequired(
                        purchase.getPurchaseId());

                throw new IllegalStateException(
                        "Razorpay did not return a refund ID. "
                        + "Reconciliation is required.");
            }

            saveRefundSuccess(
                    purchase.getPurchaseId(),
                    razorpayRefundId);

            return policyPurchaseDao.getPurchaseById(
                    purchase.getPurchaseId());

        } catch (Exception ex) {

            /*
             * The request may have reached Razorpay even if the
             * client received an exception. Never automatically
             * send another refund request.
             */
            markReconciliationRequired(
                    purchase.getPurchaseId());

            throw new IllegalStateException(
                    "Refund outcome could not be confirmed. "
                    + "The purchase has been flagged for reconciliation. "
                    + "Do not retry the refund until its Razorpay status "
                    + "has been checked.",
                    ex);
        }
    }

    @Transactional
    protected void saveRefundSuccess(
            Long purchaseId,
            String razorpayRefundId) {

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Purchase not found while saving refund."));

        if (!"REFUND_PENDING".equalsIgnoreCase(
                purchase.getRefundStatus())) {

            throw new IllegalStateException(
                    "Purchase is not in REFUND_PENDING state.");
        }

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus("REFUNDED");
        purchase.setRefundDateTime(
                java.time.LocalDateTime.now());

        policyPurchaseDao.savePurchase(purchase);
    }

    @Transactional
    protected void markReconciliationRequired(
            Long purchaseId) {

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElse(null);

        if (purchase == null) {
            return;
        }

        String currentStatus = purchase.getRefundStatus();

        if ("REFUNDED".equalsIgnoreCase(currentStatus)) {
            return;
        }

        purchase.setRefundStatus(
                "REFUND_REQUIRES_RECONCILIATION");

        policyPurchaseDao.savePurchase(purchase);
    }
}

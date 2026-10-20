package com.htc.insurance.service;

import java.math.BigDecimal;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.entity.PolicyPurchase;
import com.razorpay.RazorpayClient;
import com.razorpay.Refund;

@Service
public class RefundService {

    private final RefundPreparationService refundPreparationService;
    private final RefundPersistenceService refundPersistenceService;
    private final PolicyPurchaseDao policyPurchaseDao;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    public RefundService(
            RefundPreparationService refundPreparationService,
            RefundPersistenceService refundPersistenceService,
            PolicyPurchaseDao policyPurchaseDao) {

        this.refundPreparationService = refundPreparationService;
        this.refundPersistenceService = refundPersistenceService;
        this.policyPurchaseDao = policyPurchaseDao;
    }

    /**
     * Initiates one full refund for an eligible purchase.
     *
     * The pending state must be committed before Razorpay is called.
     * An uncertain outcome must never trigger an automatic retry.
     */
    public PolicyPurchase refundPurchase(
            RefundRequestDto request,
            String authenticatedUsername) throws Exception {

        // Validate eligibility and commit REFUND_PENDING first.
        PolicyPurchase purchase =
                refundPreparationService.prepareRefund(
                        request,
                        authenticatedUsername);

        try {
            RazorpayClient client = new RazorpayClient(
                    razorpayKeyId,
                    razorpayKeySecret);

            BigDecimal amount = purchase.getRefundAmount();

            if (amount == null
                    || amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalStateException(
                        "Refund amount must be positive.");
            }

            // Razorpay expects the amount in paise.
            long amountInPaise = amount
                    .multiply(new BigDecimal("100"))
                    .longValueExact();

            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amountInPaise);
            refundRequest.put("speed", "normal");

            JSONObject notes = new JSONObject();
            notes.put(
                    "purchase_id",
                    String.valueOf(purchase.getPurchaseId()));
            notes.put("reason", purchase.getRefundReason());

            refundRequest.put("notes", notes);

            Refund razorpayRefund = client.payments.refund(
                    purchase.getRazorpayPaymentId(),
                    refundRequest);

            String razorpayRefundId =
                    razorpayRefund.get("id");

            if (razorpayRefundId == null
                    || razorpayRefundId.isBlank()) {

                refundPersistenceService
                        .markReconciliationRequired(
                                purchase.getPurchaseId());

                throw new IllegalStateException(
                        "Razorpay returned no refund ID. "
                        + "Manual reconciliation is required.");
            }

            // Separate Spring-managed transactional service.
            refundPersistenceService.markRefunded(
                    purchase.getPurchaseId(),
                    razorpayRefundId);

            return policyPurchaseDao.getPurchaseById(
                    purchase.getPurchaseId());

        } catch (Exception ex) {

            /*
             * The exception may have occurred after Razorpay
             * accepted the refund. Do not resubmit automatically.
             */
            try {
                refundPersistenceService
                        .markReconciliationRequired(
                                purchase.getPurchaseId());
            } catch (Exception persistenceException) {
                ex.addSuppressed(persistenceException);
            }

            throw new IllegalStateException(
                    "The refund outcome could not be confirmed. "
                    + "Check the Razorpay dashboard and reconcile "
                    + "the refund before attempting any further action.",
                    ex);
        }
    }
}


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
     * Flow:
     * 1. Validate ownership and eligibility.
     * 2. Commit REFUND_PENDING and deactivate the policy.
     * 3. Submit the refund request to Razorpay.
     * 4. Persist REFUND_PROCESSING and the Razorpay refund ID.
     * 5. Return the updated purchase.
     *
     * IMPORTANT:
     * A refund ID does not guarantee that the refund has
     * reached the customer's bank account.
     *
     * Never automatically retry an uncertain refund.
     */
    public PolicyPurchase refundPurchase(
            RefundRequestDto request,
            String authenticatedUsername) throws Exception {

        // =====================================================
        // STEP 1: VALIDATE AND PREPARE REFUND
        // =====================================================

        /*
         * This method is transactional.
         *
         * It validates the customer and purchase,
         * commits REFUND_PENDING, and deactivates
         * the linked policy.
         *
         * The transaction completes before the
         * Razorpay request begins.
         */

        PolicyPurchase purchase =
                refundPreparationService.prepareRefund(
                        request,
                        authenticatedUsername);

        Long purchaseId = purchase.getPurchaseId();

        // =====================================================
        // STEP 2: REQUEST FULL REFUND FROM RAZORPAY
        // =====================================================

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

            refundRequest.put(
                    "amount",
                    amountInPaise);

            refundRequest.put(
                    "speed",
                    "normal");

            // =================================================
            // RAZORPAY REFUND NOTES
            // =================================================

            JSONObject notes = new JSONObject();

            notes.put(
                    "purchase_id",
                    String.valueOf(purchaseId));

            notes.put(
                    "reason",
                    purchase.getRefundReason());

            refundRequest.put("notes", notes);

            // =================================================
            // SUBMIT REFUND
            // =================================================

            Refund razorpayRefund =
                    client.payments.refund(
                            purchase.getRazorpayPaymentId(),
                            refundRequest);

            // =================================================
            // READ RAZORPAY REFUND ID
            // =================================================

            String razorpayRefundId =
                    razorpayRefund.get("id");

            if (razorpayRefundId == null
                    || razorpayRefundId.isBlank()) {

                throw new IllegalStateException(
                        "Razorpay returned no refund ID. "
                        + "Manual reconciliation is required.");
            }

            // =================================================
            // STEP 3: SAVE PROCESSING STATUS
            // =================================================

            /*
             * Razorpay accepted the refund request.
             *
             * Do not mark REFUNDED yet.
             * Actual completion must be confirmed later
             * through a verified webhook or reconciliation.
             */

            refundPersistenceService.markRefundProcessing(
                    purchaseId,
                    razorpayRefundId);

            // =================================================
            // STEP 4: RETURN UPDATED PURCHASE
            // =================================================

            PolicyPurchase updatedPurchase =
                    policyPurchaseDao.getPurchaseById(
                            purchaseId);

            if (updatedPurchase == null) {

                throw new IllegalStateException(
                        "Refund was submitted, but the updated "
                        + "purchase could not be loaded. "
                        + "Manual reconciliation is required.");
            }

            return updatedPurchase;

        } catch (Exception exception) {

            // =================================================
            // STEP 5: HANDLE UNCERTAIN OUTCOMES
            // =================================================

            /*
             * The exception may occur:
             *
             * - Before Razorpay receives the request.
             * - While Razorpay processes the request.
             * - After Razorpay accepts the refund.
             * - While persisting the refund ID.
             *
             * We cannot safely assume the refund failed.
             *
             * Do not automatically resubmit.
             */

            try {

                refundPersistenceService
                        .markReconciliationRequired(
                                purchaseId);

            } catch (Exception persistenceException) {

                exception.addSuppressed(
                        persistenceException);
            }

            throw new IllegalStateException(
                    "The refund outcome could not be confirmed. "
                    + "Check Razorpay and reconcile the refund "
                    + "before attempting any further action.",
                    exception);
        }
    }
}

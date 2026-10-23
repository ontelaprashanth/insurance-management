package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.Locale;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.RefundAttempt;
import com.razorpay.RazorpayClient;
import com.razorpay.Refund;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RefundService {

    private static final Logger log =
            LoggerFactory.getLogger(RefundService.class);

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final RefundPreparationService refundPreparationService;

    private final RefundPersistenceService refundPersistenceService;

    private final RefundAttemptPersistenceService
            refundAttemptPersistenceService;

    private final PolicyPurchaseDao policyPurchaseDao;

    // =========================================================
    // RAZORPAY CONFIGURATION
    // =========================================================

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    // =========================================================
    // REFUND PURCHASE
    // =========================================================

    /**
     * Initiates one full refund for an eligible purchase.
     *
     * Flow:
     *
     * 1. Validate ownership and refund eligibility.
     * 2. Commit REFUND_PENDING and deactivate policy.
     * 3. Create and commit a refund attempt.
     * 4. Submit the refund to Razorpay exactly once.
     * 5. Validate the Razorpay response.
     * 6. Save refund ID and current processing state.
     * 7. Return the updated purchase.
     *
     * IMPORTANT:
     *
     * A refund ID does not prove that the refund
     * has been credited to the customer's account.
     *
     * Uncertain refund submissions must never
     * be retried automatically.
     */
    public PolicyPurchase refundPurchase(
            RefundRequestDto request,
            String authenticatedUsername) throws Exception {

        // =====================================================
        // STEP 1: VALIDATE AND PREPARE REFUND
        // =====================================================

        PolicyPurchase purchase =
                refundPreparationService.prepareRefund(
                        request,
                        authenticatedUsername);

        if (purchase == null
                || purchase.getPurchaseId() == null) {

            throw new IllegalStateException(
                    "Refund preparation did not return "
                    + "a valid purchase.");
        }

        Long purchaseId = purchase.getPurchaseId();

        // =====================================================
        // STEP 2: CREATE REFUND ATTEMPT
        // =====================================================

        RefundAttempt refundAttempt;

        try {

            refundAttempt =
                    refundAttemptPersistenceService.beginRefund(
                            purchaseId,
                            purchase.getRazorpayPaymentId(),
                            purchase.getRefundAmount(),
                            purchase.getRefundReason(),
                            authenticatedUsername);

        } catch (Exception ex) {

            // Razorpay has NOT been called yet.
            //
            // Do not mark an existing refund attempt
            // as failed or automatically retry.
            //
            // The prepared purchase may remain
            // REFUND_PENDING and require investigation.

            log.error(
                    "Unable to create refund attempt "
                    + "for purchase {}",
                    purchaseId,
                    ex);

            throw new IllegalStateException(
                    "Unable to initialize the refund. "
                    + "Check the purchase refund status "
                    + "before trying again.",
                    ex);
        }

        if (refundAttempt == null
                || refundAttempt.getRefundAttemptId() == null) {

            throw new IllegalStateException(
                    "Refund attempt was not persisted.");
        }

        Long attemptId =
                refundAttempt.getRefundAttemptId();

        // =====================================================
        // STEP 3: VALIDATE REFUND AMOUNT
        // =====================================================

        long amountInPaise;

        try {

            amountInPaise =
                    toPaise(purchase.getRefundAmount());

        } catch (Exception ex) {

            markUncertain(
                    attemptId,
                    purchaseId,
                    "Refund amount validation failed.",
                    ex);

            throw new IllegalStateException(
                    "Refund amount is invalid. "
                    + "The refund was not submitted.",
                    ex);
        }

        // =====================================================
        // STEP 4: SUBMIT REFUND TO RAZORPAY
        // =====================================================

        String razorpayRefundId = null;

        String razorpayStatus = null;

        PolicyPurchase persistedPurchase = null;

        try {

            RazorpayClient client =
                    new RazorpayClient(
                            razorpayKeyId,
                            razorpayKeySecret);

            JSONObject refundRequest =
                    new JSONObject();

            refundRequest.put(
                    "amount",
                    amountInPaise);

            refundRequest.put(
                    "speed",
                    "normal");

            // =================================================
            // REFUND NOTES
            // =================================================

            JSONObject notes = new JSONObject();

            notes.put(
                    "purchase_id",
                    String.valueOf(purchaseId));

            notes.put(
                    "refund_attempt_id",
                    String.valueOf(attemptId));

            notes.put(
                    "reason",
                    purchase.getRefundReason());

            refundRequest.put(
                    "notes",
                    notes);

            // =================================================
            // CREATE RAZORPAY REFUND
            // =================================================

            Refund razorpayRefund =
                    client.payments.refund(
                            purchase.getRazorpayPaymentId(),
                            refundRequest);

            if (razorpayRefund == null) {

                throw new IllegalStateException(
                        "Razorpay returned no refund response.");
            }

            // =================================================
            // READ REFUND ID AND STATUS
            // =================================================

            razorpayRefundId =
                    razorpayRefund.get("id");

            razorpayStatus =
                    normalizeStatus(
                            razorpayRefund.get("status"));

            if (!hasValue(razorpayRefundId)) {

                throw new IllegalStateException(
                        "Razorpay returned no refund ID.");
            }

            log.info(
                    "Razorpay refund response received. "
                    + "Purchase={}, attempt={}, refund={}, status={}",
                    purchaseId,
                    attemptId,
                    razorpayRefundId,
                    razorpayStatus);

            // =================================================
            // STEP 5: PERSIST REFUND ID
            // =================================================

            /*
             * First record the refund ID.
             *
             * This allows reconciliation to find the
             * exact refund even if later processing fails.
             *
             * The persistence service protects an
             * already completed refund from downgrades.
             */

            persistedPurchase =
                    refundPersistenceService
                            .markRefundProcessing(
                                    purchaseId,
                                    razorpayRefundId);

        } catch (Exception ex) {

            // =================================================
            // UNCERTAIN REFUND OUTCOME
            // =================================================

            /*
             * The refund may already exist in Razorpay.
             *
             * Never submit another refund automatically.
             *
             * Preserve any known refund ID through
             * persistence and reconciliation services.
             */

            log.error(
                    "Refund submission or persistence "
                    + "failed for purchase {}, attempt {}",
                    purchaseId,
                    attemptId,
                    ex);

            // Best-effort recovery if Razorpay returned
            // an ID but the initial persistence failed.
            if (hasValue(razorpayRefundId)) {

                try {

                    persistedPurchase =
                            refundPersistenceService
                                    .markRefundProcessing(
                                            purchaseId,
                                            razorpayRefundId);

                    log.info(
                            "Recovered Razorpay refund ID {} "
                            + "for purchase {}",
                            razorpayRefundId,
                            purchaseId);

                } catch (Exception recoveryException) {

                    ex.addSuppressed(recoveryException);
                }
            }

            markUncertain(
                    attemptId,
                    purchaseId,
                    "Refund submission or persistence "
                    + "outcome could not be confirmed.",
                    ex);

            throw new IllegalStateException(
                    "The refund outcome could not be confirmed. "
                    + "Do not retry the refund until "
                    + "reconciliation is completed.",
                    ex);
        }

        // =====================================================
        // STEP 6: HANDLE IMMEDIATE RAZORPAY STATUS
        // =====================================================

        /*
         * Do not mark REFUNDED from the refund creation
         * response alone.
         *
         * The scheduled reconciliation service or
         * verified Razorpay webhook must confirm
         * the refund's status, payment ID and amount.
         */

        if ("processed".equals(razorpayStatus)) {

            log.info(
                    "Razorpay returned processed status "
                    + "for refund {}. Awaiting verified "
                    + "reconciliation or webhook update.",
                    razorpayRefundId);

        } else if ("failed".equals(razorpayStatus)) {

            log.warn(
                    "Razorpay returned failed status "
                    + "for refund {}. Awaiting verified "
                    + "reconciliation or webhook update.",
                    razorpayRefundId);

        } else if (!isProcessingStatus(razorpayStatus)) {

            log.warn(
                    "Unexpected Razorpay refund status '{}' "
                    + "for refund {}. Reconciliation required.",
                    razorpayStatus,
                    razorpayRefundId);

            // Unknown states should remain visible
            // for investigation.
            try {

                refundAttemptPersistenceService
                        .requireReconciliation(
                                attemptId,
                                "Unexpected Razorpay refund status: "
                                + razorpayStatus);

            } catch (Exception ex) {

                log.error(
                        "Unable to flag refund {} "
                        + "for reconciliation",
                        razorpayRefundId,
                        ex);
            }
        }

        // =====================================================
        // STEP 7: RETURN UPDATED PURCHASE
        // =====================================================

        /*
         * Avoid a redundant database read.
         *
         * markRefundProcessing() already returns
         * the updated PolicyPurchase.
         */

        return persistedPurchase;
    }

    // =========================================================
    // MARK UNCERTAIN REFUND
    // =========================================================

    /**
     * Best-effort reconciliation marking.
     *
     * Does not create or retry a Razorpay refund.
     *
     * Never replaces the original exception.
     */
    private void markUncertain(
            Long attemptId,
            Long purchaseId,
            String reason,
            Exception originalException) {

        try {

            refundAttemptPersistenceService
                    .requireReconciliation(
                            attemptId,
                            reason);

        } catch (Exception ex) {

            originalException.addSuppressed(ex);

            log.error(
                    "Unable to mark refund attempt {} "
                    + "for reconciliation",
                    attemptId,
                    ex);
        }

        try {

            refundPersistenceService
                    .markReconciliationRequired(
                            purchaseId);

        } catch (Exception ex) {

            originalException.addSuppressed(ex);

            log.error(
                    "Unable to mark purchase {} "
                    + "for refund reconciliation",
                    purchaseId,
                    ex);
        }
    }

    // =========================================================
    // CONVERT REFUND AMOUNT TO PAISE
    // =========================================================

    private long toPaise(BigDecimal amount) {

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Refund amount must be positive.");
        }

        long paise =
                amount.movePointRight(2)
                        .longValueExact();

        if (paise <= 0) {

            throw new IllegalArgumentException(
                    "Refund amount must be positive.");
        }

        return paise;
    }

    // =========================================================
    // RAZORPAY STATUS HELPERS
    // =========================================================

    private String normalizeStatus(String status) {

        return status == null
                ? ""
                : status.trim()
                        .toLowerCase(Locale.ROOT);
    }

    private boolean isProcessingStatus(String status) {

        return "created".equals(status)
                || "pending".equals(status)
                || "queued".equals(status);
    }

    private boolean hasValue(String value) {

        return value != null
                && !value.isBlank();
    }
}

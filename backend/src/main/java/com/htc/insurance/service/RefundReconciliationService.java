
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.entity.RefundAttemptStatus;

import com.htc.insurance.repository.RefundAttemptRepository;

import com.razorpay.RazorpayClient;
import com.razorpay.Refund;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RefundReconciliationService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    RefundReconciliationService.class);

    // =========================================================
    // REFUND STATUSES
    // =========================================================

    private static final String REFUNDED = "REFUNDED";

    private static final String REFUND_PROCESSING =
            "REFUND_PROCESSING";

    private static final String RAZORPAY_PROCESSED =
            "processed";

    private static final String RAZORPAY_FAILED =
            "failed";

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final RefundAttemptRepository attemptRepository;

    private final RefundAttemptPersistenceService persistenceService;

    private final RefundPersistenceService refundPersistenceService;

    private final PolicyPurchaseDao policyPurchaseDao;

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    // =========================================================
    // AUTOMATIC REFUND RECONCILIATION
    // =========================================================

    /**
     * Reconciles unfinished refunds with Razorpay.
     *
     * Never creates or retries a refund.
     *
     * Default:
     * Initial delay: 1 minute
     * Subsequent delay: 5 minutes after completion
     */
    @Scheduled(
            fixedDelayString =
                    "${insurex.refunds.sync-delay-ms:300000}",
            initialDelayString =
                    "${insurex.refunds.sync-initial-delay-ms:60000}"
    )
    public void reconcileUnfinishedRefunds() {

        log.info("Starting refund reconciliation");

        List<RefundAttempt> attempts;
        List<PolicyPurchase> unfinishedPurchases;

        // =====================================================
        // LOAD UNFINISHED RECORDS
        // =====================================================

        try {

            attempts = attemptRepository
                    .findByStatusInOrderByCreatedAtAsc(
                            List.of(
                                    RefundAttemptStatus.PROCESSING,
                                    RefundAttemptStatus.REQUIRES_RECONCILIATION
                            )
                    );

            unfinishedPurchases = policyPurchaseDao
                    .getPurchasesWithUnfinishedRefunds();

        } catch (Exception ex) {

            log.error(
                    "Unable to load refund reconciliation records",
                    ex);

            return;
        }

        log.info(
                "Found {} unfinished refund attempts",
                attempts.size());

        log.info(
                "Found {} unfinished purchases",
                unfinishedPurchases.size());

        if (attempts.isEmpty()
                && unfinishedPurchases.isEmpty()) {

            log.info("No unfinished refunds found");
            return;
        }

        // =====================================================
        // INITIALIZE RAZORPAY
        // =====================================================

        RazorpayClient client;

        try {

            client = new RazorpayClient(
                    keyId,
                    keySecret);

        } catch (Exception ex) {

            log.error(
                    "Unable to initialize Razorpay client",
                    ex);

            return;
        }

        // Prevent duplicate checks within this execution.
        Set<Long> checkedAttemptIds = new HashSet<>();

        // =====================================================
        // RECONCILE EXISTING ATTEMPTS
        // =====================================================

        for (RefundAttempt attempt : attempts) {

            if (attempt == null) {
                continue;
            }

            Long attemptId =
                    attempt.getRefundAttemptId();

            if (attemptId != null
                    && !checkedAttemptIds.add(attemptId)) {
                continue;
            }

            reconcileAttempt(client, attempt);
        }

        // =====================================================
        // RECONCILE UNFINISHED PURCHASES
        // =====================================================

        for (PolicyPurchase purchase : unfinishedPurchases) {

            if (purchase == null
                    || purchase.getPurchaseId() == null) {
                continue;
            }

            Long purchaseId =
                    purchase.getPurchaseId();

            try {

                Optional<RefundAttempt> optionalAttempt =
                        attemptRepository.findByPurchaseId(
                                purchaseId);

                if (optionalAttempt.isEmpty()) {

                    reconcilePurchaseWithoutAttempt(
                            client,
                            purchase);

                    continue;
                }

                RefundAttempt attempt =
                        optionalAttempt.get();

                Long attemptId =
                        attempt.getRefundAttemptId();

                if (attemptId != null
                        && !checkedAttemptIds.add(attemptId)) {
                    continue;
                }

                reconcileAttempt(
                        client,
                        attempt);

            } catch (Exception ex) {

                log.error(
                        "Unable to reconcile purchase {}",
                        purchaseId,
                        ex);
            }
        }

        log.info("Refund reconciliation completed");
    }

    // =========================================================
    // RECONCILE PURCHASE WITHOUT REFUND ATTEMPT
    // =========================================================

    /**
     * Recovers an already processed Razorpay refund
     * when its refund attempt record is missing.
     *
     * Never submits a new refund.
     */
    private void reconcilePurchaseWithoutAttempt(
            RazorpayClient client,
            PolicyPurchase purchase) {

        Long purchaseId =
                purchase.getPurchaseId();

        String refundId =
                purchase.getRefundId();

        if (!hasValue(refundId)) {

            log.warn(
                    "Purchase {} has no refund attempt "
                    + "and no Razorpay refund ID. "
                    + "Manual investigation is required.",
                    purchaseId);

            return;
        }

        try {

            Refund razorpayRefund =
                    client.refunds.fetch(refundId);

            if (razorpayRefund == null) {

                log.warn(
                        "Razorpay returned no refund for purchase {}",
                        purchaseId);

                return;
            }

            String returnedRefundId =
                    razorpayRefund.get("id");

            String returnedPaymentId =
                    razorpayRefund.get("payment_id");

            String razorpayStatus =
                    razorpayRefund.get("status");

            Long amountInPaise =
                    exactPaise(
                            razorpayRefund.get("amount"));

            // =================================================
            // VERIFY REFUND ID
            // =================================================

            if (!refundId.equals(returnedRefundId)) {

                log.error(
                        "Razorpay refund ID mismatch "
                        + "for purchase {}",
                        purchaseId);

                return;
            }

            // =================================================
            // VERIFY PAYMENT AND REFUND AMOUNT
            // =================================================

            if (!matchesPurchase(
                    purchase,
                    returnedPaymentId,
                    amountInPaise)) {

                log.error(
                        "Payment ID or refund amount mismatch "
                        + "for purchase {}",
                        purchaseId);

                return;
            }

            String status =
                    normalizeStatus(razorpayStatus);

            // =================================================
            // PROCESSED REFUND
            // =================================================

            if (RAZORPAY_PROCESSED.equals(status)) {

                refundPersistenceService
                        .recoverProcessedRefundWithoutAttempt(
                                purchaseId,
                                refundId,
                                returnedPaymentId,
                                amountInPaise);

                log.info(
                        "Processed refund recovered "
                        + "for purchase {}",
                        purchaseId);

                return;
            }

            // =================================================
            // FAILED REFUND
            // =================================================

            if (RAZORPAY_FAILED.equals(status)) {

                log.warn(
                        "Razorpay refund {} failed "
                        + "for purchase {}. "
                        + "No automatic retry will be attempted.",
                        refundId,
                        purchaseId);

                return;
            }

            // =================================================
            // STILL PROCESSING
            // =================================================

            if (isRazorpayProcessing(status)) {

                log.debug(
                        "Refund {} for purchase {} "
                        + "is still processing: {}",
                        refundId,
                        purchaseId,
                        status);

                return;
            }

            log.warn(
                    "Unknown Razorpay refund status '{}' "
                    + "for purchase {}",
                    status,
                    purchaseId);

        } catch (Exception ex) {

            log.error(
                    "Missing-attempt refund recovery failed "
                    + "for purchase {}",
                    purchaseId,
                    ex);
        }
    }

    // =========================================================
    // RECONCILE EXISTING REFUND ATTEMPT
    // =========================================================

    private void reconcileAttempt(
            RazorpayClient client,
            RefundAttempt attempt) {

        Long attemptId =
                attempt.getRefundAttemptId();

        Long purchaseId =
                attempt.getPurchaseId();

        if (attemptId == null
                || purchaseId == null) {

            log.warn(
                    "Refund attempt is missing "
                    + "an attempt ID or purchase ID.");

            return;
        }

        try {

            // =================================================
            // LOAD PURCHASE
            // =================================================

            PolicyPurchase purchase =
                    policyPurchaseDao.getPurchaseById(
                            purchaseId);

            if (purchase == null) {

                log.error(
                        "Purchase {} not found "
                        + "for refund attempt {}",
                        purchaseId,
                        attemptId);

                return;
            }

            // =================================================
            // RESOLVE REFUND ID
            // =================================================

            String attemptRefundId =
                    attempt.getRazorpayRefundId();

            String purchaseRefundId =
                    purchase.getRefundId();

            if (hasValue(attemptRefundId)
                    && hasValue(purchaseRefundId)
                    && !attemptRefundId.equals(
                            purchaseRefundId)) {

                log.error(
                        "Conflicting Razorpay refund IDs "
                        + "for purchase {}",
                        purchaseId);

                return;
            }

            String refundId =
                    hasValue(attemptRefundId)
                            ? attemptRefundId
                            : purchaseRefundId;

            if (!hasValue(refundId)) {

                log.warn(
                        "Purchase {} / attempt {} "
                        + "has no Razorpay refund ID. "
                        + "Manual investigation required.",
                        purchaseId,
                        attemptId);

                return;
            }

            // =================================================
            // FETCH RAZORPAY REFUND
            // =================================================

            Refund razorpayRefund =
                    client.refunds.fetch(refundId);

            if (razorpayRefund == null) {

                log.warn(
                        "Razorpay returned no refund "
                        + "for attempt {}",
                        attemptId);

                return;
            }

            String returnedRefundId =
                    razorpayRefund.get("id");

            String returnedPaymentId =
                    razorpayRefund.get("payment_id");

            String razorpayStatus =
                    razorpayRefund.get("status");

            Long amountInPaise =
                    exactPaise(
                            razorpayRefund.get("amount"));

            // =================================================
            // VERIFY REFUND ID
            // =================================================

            if (!refundId.equals(returnedRefundId)) {

                log.error(
                        "Razorpay refund ID mismatch "
                        + "for purchase {}",
                        purchaseId);

                return;
            }

            // =================================================
            // VERIFY PURCHASE AND ATTEMPT DETAILS
            // =================================================

            if (!matchesPurchase(
                    purchase,
                    returnedPaymentId,
                    amountInPaise)
                    || !matchesAttempt(
                            attempt,
                            returnedPaymentId,
                            amountInPaise)) {

                log.error(
                        "Razorpay payment ID or refund amount "
                        + "mismatch for purchase {}",
                        purchaseId);

                return;
            }

            String status =
                    normalizeStatus(razorpayStatus);

            // =================================================
            // VALIDATE RAZORPAY STATUS
            // =================================================

            if (!isRazorpayProcessing(status)
                    && !RAZORPAY_PROCESSED.equals(status)
                    && !RAZORPAY_FAILED.equals(status)) {

                log.warn(
                        "Unknown Razorpay refund status '{}' "
                        + "for purchase {}",
                        status,
                        purchaseId);

                return;
            }

            // =================================================
            // AVOID UNNECESSARY WRITES
            // =================================================

            boolean attemptProcessing =
                    attempt.getStatus()
                            == RefundAttemptStatus.PROCESSING;

            boolean purchaseProcessing =
                    REFUND_PROCESSING.equalsIgnoreCase(
                            purchase.getRefundStatus());

            boolean refundIdsSaved =
                    refundId.equals(
                            attempt.getRazorpayRefundId())
                    && refundId.equals(
                            purchase.getRefundId());

            if (attemptProcessing
                    && purchaseProcessing
                    && refundIdsSaved
                    && isRazorpayProcessing(status)) {

                return;
            }

            // =================================================
            // PERSIST REFUND STATUS
            // =================================================

            persistenceService.recordRefundResult(
                    attemptId,
                    refundId,
                    status);

            log.info(
                    "Refund attempt {} for purchase {} "
                    + "synchronized with Razorpay status {}",
                    attemptId,
                    purchaseId,
                    status);

        } catch (Exception ex) {

            log.error(
                    "Refund reconciliation failed "
                    + "for purchase {}, attempt {}",
                    purchaseId,
                    attemptId,
                    ex);
        }
    }

    // =========================================================
    // VERIFY PURCHASE PAYMENT AND AMOUNT
    // =========================================================

    private boolean matchesPurchase(
            PolicyPurchase purchase,
            String paymentId,
            Long amountInPaise) {

        if (purchase == null
                || !hasValue(paymentId)
                || amountInPaise == null
                || !hasValue(
                        purchase.getRazorpayPaymentId())
                || purchase.getRefundAmount() == null) {

            return false;
        }

        try {

            long expectedPaise =
                    purchase.getRefundAmount()
                            .movePointRight(2)
                            .longValueExact();

            return paymentId.equals(
                    purchase.getRazorpayPaymentId())
                    && expectedPaise == amountInPaise;

        } catch (ArithmeticException ex) {

            return false;
        }
    }

    // =========================================================
    // VERIFY ATTEMPT PAYMENT AND AMOUNT
    // =========================================================

    private boolean matchesAttempt(
            RefundAttempt attempt,
            String paymentId,
            Long amountInPaise) {

        if (attempt == null
                || !hasValue(paymentId)
                || amountInPaise == null
                || !hasValue(
                        attempt.getRazorpayPaymentId())
                || attempt.getRefundAmount() == null) {

            return false;
        }

        try {

            long expectedPaise =
                    attempt.getRefundAmount()
                            .movePointRight(2)
                            .longValueExact();

            return paymentId.equals(
                    attempt.getRazorpayPaymentId())
                    && expectedPaise == amountInPaise;

        } catch (ArithmeticException ex) {

            return false;
        }
    }

    // =========================================================
    // EXACT RAZORPAY AMOUNT CONVERSION
    // =========================================================

    /**
     * Razorpay returns refund amounts in paise.
     *
     * Rejects fractional, invalid, negative, or
     * out-of-range values.
     */
    private Long exactPaise(
            Object amountObject) {

        if (amountObject == null) {
            return null;
        }

        try {

            long amount =
                    new BigDecimal(
                            String.valueOf(amountObject))
                            .longValueExact();

            return amount > 0
                    ? amount
                    : null;

        } catch (NumberFormatException
                | ArithmeticException ex) {

            return null;
        }
    }

    // =========================================================
    // RAZORPAY STATUS HELPERS
    // =========================================================

    private boolean isRazorpayProcessing(
            String status) {

        return "created".equals(status)
                || "pending".equals(status)
                || "queued".equals(status);
    }

    private String normalizeStatus(
            String status) {

        return status == null
                ? ""
                : status.trim().toLowerCase(
                        Locale.ROOT);
    }

    private boolean hasValue(
            String value) {

        return value != null
                && !value.isBlank();
    }
}

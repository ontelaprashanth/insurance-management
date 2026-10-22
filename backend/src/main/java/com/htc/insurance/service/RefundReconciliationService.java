
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

@Service
public class RefundReconciliationService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    RefundReconciliationService.class);

    private static final String REFUNDED = "REFUNDED";
    private static final String REFUND_PROCESSING =
            "REFUND_PROCESSING";

    private final RefundAttemptRepository attemptRepository;
    private final RefundAttemptPersistenceService persistenceService;
    private final RefundPersistenceService refundPersistenceService;
    private final PolicyPurchaseDao policyPurchaseDao;

    private final String keyId;
    private final String keySecret;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public RefundReconciliationService(
            RefundAttemptRepository attemptRepository,
            RefundAttemptPersistenceService persistenceService,
            RefundPersistenceService refundPersistenceService,
            PolicyPurchaseDao policyPurchaseDao,
            @Value("${razorpay.key.id}") String keyId,
            @Value("${razorpay.key.secret}") String keySecret) {

        this.attemptRepository = attemptRepository;
        this.persistenceService = persistenceService;
        this.refundPersistenceService = refundPersistenceService;
        this.policyPurchaseDao = policyPurchaseDao;
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    // =========================================================
    // AUTOMATIC REFUND RECONCILIATION
    // =========================================================

    /**
     * Reconciles unfinished refunds with Razorpay.
     *
     * Does not create any new refund.
     *
     * Runs every 5 minutes by default.
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

        RazorpayClient client;

        try {

            client = new RazorpayClient(keyId, keySecret);

        } catch (Exception ex) {

            log.error(
                    "Unable to initialize Razorpay client",
                    ex);

            return;
        }

        Set<Long> checkedAttemptIds = new HashSet<>();

        // =====================================================
        // RECONCILE REFUND ATTEMPTS
        // =====================================================

        for (RefundAttempt attempt : attempts) {

            Long attemptId = attempt.getRefundAttemptId();

            if (attemptId != null) {
                checkedAttemptIds.add(attemptId);
            }

            reconcileAttempt(client, attempt);
        }

        // =====================================================
        // RECONCILE UNFINISHED PURCHASES
        // =====================================================

        for (PolicyPurchase purchase : unfinishedPurchases) {

            Long purchaseId = purchase.getPurchaseId();

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

                RefundAttempt attempt = optionalAttempt.get();

                Long attemptId = attempt.getRefundAttemptId();

                if (attemptId != null
                        && checkedAttemptIds.contains(attemptId)) {
                    continue;
                }

                if (attemptId != null) {
                    checkedAttemptIds.add(attemptId);
                }

                reconcileAttempt(client, attempt);

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
    // RECONCILE PURCHASE WITHOUT ATTEMPT
    // =========================================================

    private void reconcilePurchaseWithoutAttempt(
            RazorpayClient client,
            PolicyPurchase purchase) {

        Long purchaseId = purchase.getPurchaseId();

        String refundId = purchase.getRefundId();

        if (refundId == null || refundId.isBlank()) {

            log.warn(
                    "Purchase {} has no attempt or refund ID. "
                    + "Manual investigation required.",
                    purchaseId);

            return;
        }

        try {

            Refund razorpayRefund =
                    client.refunds.fetch(refundId);

            String returnedRefundId =
                    razorpayRefund.get("id");

            String returnedPaymentId =
                    razorpayRefund.get("payment_id");

            String razorpayStatus =
                    razorpayRefund.get("status");

            Number amountInPaise =
                    razorpayRefund.get("amount");

            if (!refundId.equals(returnedRefundId)) {

                log.error(
                        "Refund ID mismatch for purchase {}",
                        purchaseId);

                return;
            }

            if (!matchesPurchase(
                    purchase,
                    returnedPaymentId,
                    amountInPaise)) {

                log.error(
                        "Payment or amount mismatch for purchase {}",
                        purchaseId);

                return;
            }

            String status = normalizeStatus(razorpayStatus);

            if ("processed".equals(status)) {

                refundPersistenceService
                        .recoverProcessedRefundWithoutAttempt(
                                purchaseId,
                                refundId,
                                returnedPaymentId,
                                amountInPaise.longValue());

                log.info(
                        "Purchase {} recovered as REFUNDED",
                        purchaseId);

                return;
            }

            log.info(
                    "Purchase {} remains at Razorpay status {}",
                    purchaseId,
                    status);

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

        Long attemptId = attempt.getRefundAttemptId();
        Long purchaseId = attempt.getPurchaseId();

        try {

            PolicyPurchase purchase =
                    policyPurchaseDao.getPurchaseById(
                            purchaseId);

            if (purchase == null) {

                log.error(
                        "Purchase {} not found for refund attempt {}",
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
                    && !attemptRefundId.equals(purchaseRefundId)) {

                log.error(
                        "Conflicting refund IDs for purchase {}",
                        purchaseId);

                return;
            }

            String refundId = hasValue(attemptRefundId)
                    ? attemptRefundId
                    : purchaseRefundId;

            if (!hasValue(refundId)) {

                log.warn(
                        "Purchase {} / attempt {} has no "
                        + "Razorpay refund ID. "
                        + "Manual reconciliation required.",
                        purchaseId,
                        attemptId);

                return;
            }

            // =================================================
            // FETCH RAZORPAY REFUND
            // =================================================

            Refund razorpayRefund =
                    client.refunds.fetch(refundId);

            String returnedRefundId =
                    razorpayRefund.get("id");

            String returnedPaymentId =
                    razorpayRefund.get("payment_id");

            String razorpayStatus =
                    razorpayRefund.get("status");

            Number amountInPaise =
                    razorpayRefund.get("amount");

            if (!refundId.equals(returnedRefundId)) {

                log.error(
                        "Razorpay refund ID mismatch for purchase {}",
                        purchaseId);

                return;
            }

            // =================================================
            // VALIDATE BOTH PURCHASE AND ATTEMPT
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
                        "Razorpay payment or refund amount "
                        + "mismatch for purchase {}",
                        purchaseId);

                return;
            }

            String status = normalizeStatus(razorpayStatus);

            if (!List.of(
                    "created",
                    "pending",
                    "queued",
                    "processed",
                    "failed"
            ).contains(status)) {

                log.warn(
                        "Unknown Razorpay refund status '{}' "
                        + "for purchase {}",
                        status,
                        purchaseId);

                return;
            }

            // =================================================
            // PREVENT UNNECESSARY WRITES
            // =================================================

            boolean bothProcessing =
                    attempt.getStatus()
                            == RefundAttemptStatus.PROCESSING
                    && REFUND_PROCESSING.equalsIgnoreCase(
                            purchase.getRefundStatus());

            boolean razorpayProcessing =
                    "created".equals(status)
                    || "pending".equals(status)
                    || "queued".equals(status);

            boolean refundIdsSaved =
                    refundId.equals(attempt.getRazorpayRefundId())
                    && refundId.equals(purchase.getRefundId());

            if (bothProcessing
                    && razorpayProcessing
                    && refundIdsSaved) {

                return;
            }

            // =================================================
            // SYNCHRONIZE DATABASE
            // =================================================

            persistenceService.recordRefundResult(
                    attemptId,
                    refundId,
                    status);

            log.info(
                    "Purchase {} synchronized with Razorpay: {}",
                    purchaseId,
                    status);

        } catch (Exception ex) {

            log.error(
                    "Refund reconciliation failed for purchase {}, "
                    + "attempt {}",
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
            Number amountInPaise) {

        if (purchase == null
                || paymentId == null
                || amountInPaise == null
                || purchase.getRazorpayPaymentId() == null
                || purchase.getRefundAmount() == null) {

            return false;
        }

        try {

            long expectedPaise = purchase
                    .getRefundAmount()
                    .movePointRight(2)
                    .longValueExact();

            return paymentId.equals(
                    purchase.getRazorpayPaymentId())
                    && expectedPaise == amountInPaise.longValue();

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
            Number amountInPaise) {

        if (attempt == null
                || paymentId == null
                || amountInPaise == null
                || attempt.getRazorpayPaymentId() == null
                || attempt.getRefundAmount() == null) {

            return false;
        }

        try {

            long expectedPaise = attempt
                    .getRefundAmount()
                    .movePointRight(2)
                    .longValueExact();

            return paymentId.equals(
                    attempt.getRazorpayPaymentId())
                    && expectedPaise == amountInPaise.longValue();

        } catch (ArithmeticException ex) {

            return false;
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private String normalizeStatus(String status) {

        return status == null
                ? ""
                : status.trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasValue(String value) {

        return value != null && !value.isBlank();
    }
}

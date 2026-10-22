
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

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

    private final RefundAttemptRepository attemptRepository;

    private final RefundAttemptPersistenceService persistenceService;

    private final String keyId;
    private final String keySecret;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public RefundReconciliationService(
            RefundAttemptRepository attemptRepository,
            RefundAttemptPersistenceService persistenceService,
            @Value("${razorpay.key.id}") String keyId,
            @Value("${razorpay.key.secret}") String keySecret) {

        this.attemptRepository = attemptRepository;
        this.persistenceService = persistenceService;
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    // =========================================================
    // AUTOMATIC REFUND RECONCILIATION
    // =========================================================

    /**
     * Reads existing Razorpay refunds and synchronizes statuses.
     *
     * Never creates another refund.
     *
     * Initial delay: 1 minute
     * Fixed delay: 5 minutes
     *
     * Requires @EnableScheduling.
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

        // =====================================================
        // LOAD UNFINISHED REFUND ATTEMPTS
        // =====================================================

        try {

            attempts =
                    attemptRepository
                        .findByStatusInOrderByCreatedAtAsc(
                            List.of(
                                RefundAttemptStatus.PROCESSING,
                                RefundAttemptStatus.REQUIRES_RECONCILIATION
                            )
                        );

        } catch (Exception ex) {

            log.error(
                "Unable to load unfinished refund attempts",
                ex
            );

            return;
        }

        log.info(
            "Found {} unfinished refund attempts",
            attempts.size()
        );

        if (attempts.isEmpty()) {

            log.info("No unfinished refunds found");
            log.info("Refund reconciliation completed");

            return;
        }

        // =====================================================
        // INITIALIZE RAZORPAY CLIENT
        // =====================================================

        RazorpayClient client;

        try {

            client = new RazorpayClient(
                keyId,
                keySecret
            );

        } catch (Exception ex) {

            log.error(
                "Unable to initialize Razorpay client "
                    + "for refund reconciliation",
                ex
            );

            return;
        }

        // =====================================================
        // PROCESS EACH REFUND INDEPENDENTLY
        // =====================================================

        for (RefundAttempt attempt : attempts) {

            Long attemptId =
                    attempt.getRefundAttemptId();

            Long purchaseId =
                    attempt.getPurchaseId();

            String refundId =
                    attempt.getRazorpayRefundId();

            log.info(
                "Checking refund: purchaseId={}, attemptId={}, "
                    + "localStatus={}",
                purchaseId,
                attemptId,
                attempt.getStatus()
            );

            // =================================================
            // CHECK REFUND ID
            // =================================================

            if (refundId == null || refundId.isBlank()) {

                log.warn(
                    "Purchase {} / attempt {} has no Razorpay "
                        + "refund ID; manual reconciliation required",
                    purchaseId,
                    attemptId
                );

                continue;
            }

            try {

                // =================================================
                // FETCH EXISTING RAZORPAY REFUND
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

                // =================================================
                // VERIFY REFUND ID
                // =================================================

                if (!refundId.equals(returnedRefundId)) {

                    log.error(
                        "Refund ID mismatch for purchase {}, attempt {}",
                        purchaseId,
                        attemptId
                    );

                    continue;
                }

                // =================================================
                // VERIFY ORIGINAL PAYMENT
                // =================================================

                if (attempt.getRazorpayPaymentId() == null
                        || !attempt.getRazorpayPaymentId()
                            .equals(returnedPaymentId)) {

                    log.error(
                        "Payment ID mismatch for purchase {}, attempt {}",
                        purchaseId,
                        attemptId
                    );

                    continue;
                }

                // =================================================
                // VERIFY REFUND AMOUNT
                // =================================================

                BigDecimal expectedAmount =
                        attempt.getRefundAmount();

                if (expectedAmount == null
                        || amountInPaise == null) {

                    log.error(
                        "Missing refund amount for purchase {}, attempt {}",
                        purchaseId,
                        attemptId
                    );

                    continue;
                }

                long expectedPaise =
                        expectedAmount
                            .movePointRight(2)
                            .longValueExact();

                if (expectedPaise != amountInPaise.longValue()) {

                    log.error(
                        "Refund amount mismatch for purchase {}, attempt {}",
                        purchaseId,
                        attemptId
                    );

                    continue;
                }

                // =================================================
                // NORMALIZE RAZORPAY STATUS
                // =================================================

                if (razorpayStatus == null
                        || razorpayStatus.isBlank()) {

                    log.warn(
                        "Empty Razorpay status for purchase {}",
                        purchaseId
                    );

                    continue;
                }

                String status =
                        razorpayStatus
                            .trim()
                            .toLowerCase(Locale.ROOT);

                // =================================================
                // VERIFY SUPPORTED STATUS
                // =================================================

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
                        purchaseId
                    );

                    continue;
                }

                // =================================================
                // LOG CURRENT STATUS
                // =================================================

                log.info(
                    "Refund reconciliation: purchaseId={}, "
                        + "attemptId={}, razorpayStatus={}, "
                        + "localStatus={}",
                    purchaseId,
                    attemptId,
                    status,
                    attempt.getStatus()
                );

                // =================================================
                // AVOID UNNECESSARY DATABASE UPDATES
                // =================================================

                RefundAttemptStatus currentStatus =
                        attempt.getStatus();

                boolean alreadyProcessing =
                        currentStatus == RefundAttemptStatus.PROCESSING;

                boolean razorpayStillProcessing =
                        status.equals("created")
                        || status.equals("pending")
                        || status.equals("queued");

                if (alreadyProcessing && razorpayStillProcessing) {

                    log.info(
                        "Purchase {} remains Processing; "
                            + "Razorpay status={}",
                        purchaseId,
                        status
                    );

                    continue;
                }

                // =================================================
                // SYNCHRONIZE DATABASE STATUS
                // =================================================

                persistenceService.recordRefundResult(
                    attemptId,
                    refundId,
                    status
                );

                log.info(
                    "Purchase {} synchronized successfully; "
                        + "Razorpay status={}",
                    purchaseId,
                    status
                );

            } catch (Exception ex) {

                log.error(
                    "Refund reconciliation failed for purchase {}, "
                        + "attempt {}",
                    purchaseId,
                    attemptId,
                    ex
                );
            }
        }

        log.info("Refund reconciliation completed");
    }
}

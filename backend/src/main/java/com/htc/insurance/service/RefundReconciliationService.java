
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

    private final RefundAttemptPersistenceService
            persistenceService;

    private final String keyId;
    private final String keySecret;

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
     * Checks existing Razorpay refunds.
     *
     * Never creates another refund.
     *
     * Default:
     * Initial delay: 1 minute
     * Repeat delay: 5 minutes
     *
     * Only runs while the Spring Boot application is active.
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

        try {

            attempts =
                attemptRepository
                    .findByStatusInOrderByCreatedAtAsc(
                        List.of(
                            RefundAttemptStatus.PROCESSING,
                            RefundAttemptStatus
                                .REQUIRES_RECONCILIATION
                        )
                    );

        } catch (Exception ex) {

            log.error(
                "Unable to load unfinished refunds",
                ex
            );

            return;
        }

        if (attempts.isEmpty()) {

            log.debug("No unfinished refunds found");
            return;
        }

        RazorpayClient client;

        try {

            client = new RazorpayClient(
                keyId,
                keySecret
            );

        } catch (Exception ex) {

            log.error(
                "Unable to initialize Razorpay client",
                ex
            );

            return;
        }

        // =====================================================
        // CHECK EACH REFUND INDEPENDENTLY
        // =====================================================

        for (RefundAttempt attempt : attempts) {

            Long attemptId =
                    attempt.getRefundAttemptId();

            String refundId =
                    attempt.getRazorpayRefundId();

            if (refundId == null
                    || refundId.isBlank()) {

                log.warn(
                    "Refund attempt {} has no Razorpay refund ID. "
                    + "Manual reconciliation is required.",
                    attemptId
                );

                continue;
            }

            try {

                // =================================================
                // FETCH EXISTING REFUND
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
                // VALIDATE REFUND ID
                // =================================================

                if (!refundId.equals(
                        returnedRefundId)) {

                    log.error(
                        "Refund ID mismatch for attempt {}",
                        attemptId
                    );

                    continue;
                }

                // =================================================
                // VALIDATE PAYMENT ID
                // =================================================

                if (attempt.getRazorpayPaymentId() == null
                        || !attempt.getRazorpayPaymentId()
                            .equals(returnedPaymentId)) {

                    log.error(
                        "Payment ID mismatch for attempt {}",
                        attemptId
                    );

                    continue;
                }

                // =================================================
                // VALIDATE REFUND AMOUNT
                // =================================================

                BigDecimal expectedAmount =
                        attempt.getRefundAmount();

                if (expectedAmount == null
                        || amountInPaise == null) {

                    log.error(
                        "Missing refund amount for attempt {}",
                        attemptId
                    );

                    continue;
                }

                long expectedPaise =
                        expectedAmount
                            .movePointRight(2)
                            .longValueExact();

                if (expectedPaise
                        != amountInPaise.longValue()) {

                    log.error(
                        "Refund amount mismatch for attempt {}",
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
                        "Empty Razorpay refund status for {}",
                        refundId
                    );

                    continue;
                }

                String status =
                        razorpayStatus
                            .trim()
                            .toLowerCase(Locale.ROOT);

                // =================================================
                // VALIDATE SUPPORTED STATUS
                // =================================================

                if (!List.of(
                        "created",
                        "pending",
                        "queued",
                        "processed",
                        "failed"
                    ).contains(status)) {

                    log.warn(
                        "Unknown Razorpay refund status {} for {}",
                        status,
                        refundId
                    );

                    continue;
                }

                // =================================================
                // AVOID UNNECESSARY DATABASE UPDATES
                // =================================================

                RefundAttemptStatus currentStatus =
                        attempt.getStatus();

                boolean alreadyProcessing =
                        currentStatus
                            == RefundAttemptStatus.PROCESSING;

                boolean razorpayStillProcessing =
                        status.equals("created")
                        || status.equals("pending")
                        || status.equals("queued");

                if (alreadyProcessing
                        && razorpayStillProcessing) {

                    log.debug(
                        "Refund {} is still processing",
                        refundId
                    );

                    continue;
                }

                // =================================================
                // UPDATE BOTH REFUND RECORDS
                // =================================================

                persistenceService.recordRefundResult(
                    attemptId,
                    refundId,
                    status
                );

                log.info(
                    "Refund {} synchronized with Razorpay: {}",
                    refundId,
                    status
                );

            } catch (Exception ex) {

                log.error(
                    "Refund reconciliation failed for attempt {}",
                    attemptId,
                    ex
                );
            }
        }

        log.info("Refund reconciliation completed");
    }
}

package com.htc.insurance.service;

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
            LoggerFactory.getLogger(RefundReconciliationService.class);

    private final RefundAttemptRepository attemptRepository;
    private final RefundAttemptPersistenceService persistenceService;
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

    /**
     * Only READS existing Razorpay refunds. Never issues a new refund.
     * Each attempt is independently handled so one failure cannot block others.
     * Enable scheduling with @EnableScheduling in your Spring Boot application.
     */
    @Scheduled(
            fixedDelayString = "${insurex.refunds.sync-delay-ms:300000}",
            initialDelayString = "${insurex.refunds.sync-initial-delay-ms:60000}")
    public void reconcileUnfinishedRefunds() {
        List<RefundAttempt> attempts;
        try {
            attempts = attemptRepository.findByStatusInOrderByCreatedAtAsc(
                    List.of(
                            RefundAttemptStatus.PROCESSING,
                            RefundAttemptStatus.REQUIRES_RECONCILIATION));
        } catch (Exception ex) {
            log.error("Unable to load unfinished refund attempts", ex);
            return;
        }

        RazorpayClient client;
        try {
            client = new RazorpayClient(keyId, keySecret);
        } catch (Exception ex) {
            log.error("Unable to initialize Razorpay client for refund reconciliation", ex);
            return;
        }

        for (RefundAttempt attempt : attempts) {
            Long attemptId = attempt.getRefundAttemptId();
            String refundId = attempt.getRazorpayRefundId();

            // An attempt without a refund ID cannot safely be fetched by ID.
            // It requires investigation using the original payment and Razorpay records.
            if (refundId == null || refundId.isBlank()) {
                log.warn("Refund attempt {} has no Razorpay refund ID; manual reconciliation needed", attemptId);
                continue;
            }

            try {
                Refund refund = client.refunds.fetch(refundId);
                String returnedId = refund.get("id");
                String returnedPaymentId = refund.get("payment_id");
                String status = refund.get("status");
                Number amountInPaise = refund.get("amount");

                if (!refundId.equals(returnedId)
                        || !attempt.getRazorpayPaymentId().equals(returnedPaymentId)
                        || amountInPaise == null
                        || attempt.getRefundAmount() == null
                        || attempt.getRefundAmount().movePointRight(2).longValueExact()
                                != amountInPaise.longValue()) {
                    log.error("Razorpay refund data mismatch for attempt {}; refusing to update", attemptId);
                    continue;
                }

                if (status == null || status.isBlank()) {
                    log.warn("Razorpay returned empty status for refund {}", refundId);
                    continue;
                }

                String normalized = status.trim().toLowerCase(Locale.ROOT);
                if (!List.of("created", "pending", "queued", "processed", "failed")
                        .contains(normalized)) {
                    log.warn("Unknown Razorpay refund status '{}' for {}", normalized, refundId);
                    continue;
                }

                persistenceService.recordRefundResult(attemptId, refundId, normalized);
                log.info("Reconciled refund {} with Razorpay status {}", refundId, normalized);

            } catch (Exception ex) {
                log.error("Refund reconciliation failed for attempt {}", attemptId, ex);
            }
        }
    }
}

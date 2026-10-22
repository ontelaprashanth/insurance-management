
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

    private final RefundAttemptRepository attemptRepository;
    private final RefundAttemptPersistenceService persistenceService;
    private final PolicyPurchaseDao policyPurchaseDao;

    private final String keyId;
    private final String keySecret;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public RefundReconciliationService(
            RefundAttemptRepository attemptRepository,
            RefundAttemptPersistenceService persistenceService,
            PolicyPurchaseDao policyPurchaseDao,
            @Value("${razorpay.key.id}") String keyId,
            @Value("${razorpay.key.secret}") String keySecret) {

        this.attemptRepository = attemptRepository;
        this.persistenceService = persistenceService;
        this.policyPurchaseDao = policyPurchaseDao;
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    // =========================================================
    // AUTOMATIC REFUND RECONCILIATION
    // =========================================================

    /**
     * Synchronizes existing refund records with Razorpay.
     *
     * Never creates a new refund.
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

            attempts =
                    attemptRepository
                        .findByStatusInOrderByCreatedAtAsc(
                            List.of(
                                RefundAttemptStatus.PROCESSING,
                                RefundAttemptStatus.REQUIRES_RECONCILIATION
                            )
                        );

            unfinishedPurchases =
                    policyPurchaseDao
                        .getPurchasesWithUnfinishedRefunds();

        } catch (Exception ex) {

            log.error(
                "Unable to load refund reconciliation records",
                ex
            );

            return;
        }

        log.info(
            "Found {} unfinished refund attempts",
            attempts.size()
        );

        log.info(
            "Found {} purchases with unfinished refund status",
            unfinishedPurchases.size()
        );

        if (attempts.isEmpty()
                && unfinishedPurchases.isEmpty()) {

            log.info("No unfinished refunds found");
            log.info("Refund reconciliation completed");

            return;
        }

        RazorpayClient client;

        try {

            client = new RazorpayClient(keyId, keySecret);

        } catch (Exception ex) {

            log.error(
                "Unable to initialize Razorpay client",
                ex
            );

            return;
        }

        Set<Long> checkedAttemptIds = new HashSet<>();

        // =====================================================
        // RECONCILE UNFINISHED ATTEMPTS
        // =====================================================

        for (RefundAttempt attempt : attempts) {

            if (attempt.getRefundAttemptId() != null) {

                checkedAttemptIds.add(
                    attempt.getRefundAttemptId()
                );
            }

            reconcileAttempt(client, attempt);
        }

        // =====================================================
        // INVESTIGATE UNFINISHED PURCHASES
        // =====================================================

        for (PolicyPurchase purchase : unfinishedPurchases) {

            Long purchaseId = purchase.getPurchaseId();

            try {

                Optional<RefundAttempt> optionalAttempt =
                        attemptRepository.findByPurchaseId(
                            purchaseId
                        );

                if (optionalAttempt.isEmpty()) {

                    log.warn(
                        "Purchase {} is still {}, but no "
                            + "RefundAttempt record exists. "
                            + "Stored refund ID present: {}. "
                            + "Manual investigation required.",
                        purchaseId,
                        purchase.getRefundStatus(),
                        purchase.getRefundId() != null
                            && !purchase.getRefundId().isBlank()
                    );

                    continue;
                }

                RefundAttempt attempt = optionalAttempt.get();

                log.info(
                    "Purchase {} status={}, attempt status={}",
                    purchaseId,
                    purchase.getRefundStatus(),
                    attempt.getStatus()
                );

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
                    ex
                );
            }
        }

        log.info("Refund reconciliation completed");
    }

    // =========================================================
    // VERIFY AN EXISTING RAZORPAY REFUND
    // =========================================================

    private void reconcileAttempt(
            RazorpayClient client,
            RefundAttempt attempt) {

        Long attemptId = attempt.getRefundAttemptId();
        Long purchaseId = attempt.getPurchaseId();

        String refundId = attempt.getRazorpayRefundId();

        log.info(
            "Checking refund: purchaseId={}, attemptId={}, "
                + "localStatus={}",
            purchaseId,
            attemptId,
            attempt.getStatus()
        );

        if (refundId == null || refundId.isBlank()) {

            log.warn(
                "Purchase {} / attempt {} has no Razorpay "
                    + "refund ID. Manual reconciliation required.",
                purchaseId,
                attemptId
            );

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

            // =================================================
            // VERIFY REFUND ID
            // =================================================

            if (!refundId.equals(returnedRefundId)) {

                log.error(
                    "Refund ID mismatch for purchase {}",
                    purchaseId
                );

                return;
            }

            // =================================================
            // VERIFY PAYMENT ID
            // =================================================

            if (attempt.getRazorpayPaymentId() == null
                    || !attempt.getRazorpayPaymentId()
                        .equals(returnedPaymentId)) {

                log.error(
                    "Payment ID mismatch for purchase {}",
                    purchaseId
                );

                return;
            }

            // =================================================
            // VERIFY AMOUNT
            // =================================================

            BigDecimal expectedAmount =
                    attempt.getRefundAmount();

            if (expectedAmount == null
                    || amountInPaise == null) {

                log.error(
                    "Missing refund amount for purchase {}",
                    purchaseId
                );

                return;
            }

            long expectedPaise =
                    expectedAmount
                        .movePointRight(2)
                        .longValueExact();

            if (expectedPaise != amountInPaise.longValue()) {

                log.error(
                    "Refund amount mismatch for purchase {}",
                    purchaseId
                );

                return;
            }

            // =================================================
            // NORMALIZE STATUS
            // =================================================

            if (razorpayStatus == null
                    || razorpayStatus.isBlank()) {

                log.warn(
                    "Empty Razorpay status for purchase {}",
                    purchaseId
                );

                return;
            }

            String status =
                    razorpayStatus
                        .trim()
                        .toLowerCase(Locale.ROOT);

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

                return;
            }

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
            // AVOID UNNECESSARY UPDATES
            // =================================================

            boolean alreadyProcessing =
                    attempt.getStatus()
                        == RefundAttemptStatus.PROCESSING;

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

                return;
            }

            // =================================================
            // SYNCHRONIZE EXISTING REFUND RECORD
            // =================================================

            persistenceService.recordRefundResult(
                attemptId,
                refundId,
                status
            );

            log.info(
                "Purchase {} reconciliation applied; "
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
}

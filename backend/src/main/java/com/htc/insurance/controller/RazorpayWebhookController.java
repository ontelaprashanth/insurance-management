
package com.htc.insurance.controller;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.repository.RefundAttemptRepository;
import com.htc.insurance.service.RefundAttemptPersistenceService;

@RestController
@RequestMapping("/webhooks")
public class RazorpayWebhookController {

    private static final Logger log =
            LoggerFactory.getLogger(RazorpayWebhookController.class);

    private final RefundAttemptRepository refundRepository;
    private final RefundAttemptPersistenceService persistenceService;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    public RazorpayWebhookController(
            RefundAttemptRepository refundRepository,
            RefundAttemptPersistenceService persistenceService) {

        this.refundRepository = refundRepository;
        this.persistenceService = persistenceService;
    }

    // =========================================================
    // RAZORPAY WEBHOOK ENDPOINT
    // =========================================================

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader(
                    value = "X-Razorpay-Signature",
                    required = false) String signature) {

        // =====================================================
        // STEP 1: VERIFY WEBHOOK CONFIGURATION
        // =====================================================

        if (webhookSecret == null || webhookSecret.isBlank()) {

            log.error("Razorpay webhook secret is not configured.");

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Webhook configuration error");
        }

        // =====================================================
        // STEP 2: VERIFY RAZORPAY SIGNATURE
        // =====================================================

        if (!isValidSignature(rawBody, signature)) {

            log.warn("Rejected Razorpay webhook: invalid signature.");

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid webhook signature");
        }

        try {

            JSONObject event = new JSONObject(rawBody);

            String eventName = event.optString("event", "");

            // =================================================
            // STEP 3: ACCEPT SUPPORTED REFUND EVENTS
            // =================================================

            if (!"refund.created".equals(eventName)
                    && !"refund.processed".equals(eventName)
                    && !"refund.failed".equals(eventName)) {

                return ResponseEntity.ok("Event ignored");
            }

            // =================================================
            // STEP 4: READ REFUND DETAILS
            // =================================================

            JSONObject refundEntity = event
                    .getJSONObject("payload")
                    .getJSONObject("refund")
                    .getJSONObject("entity");

            String refundId =
                    refundEntity.optString("id", "");

            String paymentId =
                    refundEntity.optString("payment_id", "");

            String status =
                    refundEntity.optString("status", "");

            if (refundId.isBlank()
                    || paymentId.isBlank()
                    || status.isBlank()) {

                log.warn(
                        "Incomplete Razorpay refund webhook: {}",
                        eventName);

                return ResponseEntity.badRequest()
                        .body("Missing refund details");
            }

            // =================================================
            // STEP 5: VALIDATE REFUND AMOUNT
            // =================================================

            if (!refundEntity.has("amount")
                    || refundEntity.isNull("amount")) {

                return ResponseEntity.badRequest()
                        .body("Missing refund amount");
            }

            long amountInPaise =
                    refundEntity.getLong("amount");

            if (amountInPaise <= 0) {

                return ResponseEntity.badRequest()
                        .body("Invalid refund amount");
            }

            BigDecimal refundAmount =
                    BigDecimal.valueOf(amountInPaise, 2);

            // =================================================
            // STEP 6: READ REFUND NOTES
            // =================================================

            JSONObject notes =
                    refundEntity.optJSONObject("notes");

            Long attemptId = null;
            Long purchaseId = null;

            if (notes != null) {

                attemptId = parsePositiveId(
                        notes.optString(
                                "refund_attempt_id", ""));

                purchaseId = parsePositiveId(
                        notes.optString(
                                "purchase_id", ""));
            }

            // =================================================
            // STEP 7: FIND THE EXISTING REFUND ATTEMPT
            // =================================================

            RefundAttempt attempt = null;

            /*
             * Preferred: attempt ID included in Razorpay notes.
             */
            if (attemptId != null) {

                Optional<RefundAttempt> byId =
                        refundRepository.findById(attemptId);

                attempt = byId.orElse(null);
            }

            /*
             * Compatibility with older RefundService versions
             * that included purchase_id but not attempt_id.
             */
            if (attempt == null && purchaseId != null) {

                attempt = refundRepository
                        .findByPurchaseId(purchaseId)
                        .orElse(null);
            }

            /*
             * Compatibility with existing refunds whose
             * Razorpay refund ID was already persisted.
             */
            if (attempt == null) {

                attempt = refundRepository
                        .findByRazorpayRefundId(refundId)
                        .orElse(null);
            }

            if (attempt == null) {

                /*
                 * Never create another refund here.
                 *
                 * Returning a server error allows Razorpay
                 * to retry the webhook delivery.
                 */
                log.warn(
                        "No attempt found for Razorpay refund {}",
                        refundId);

                return ResponseEntity
                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Refund attempt not found");
            }

            // =================================================
            // STEP 8: VALIDATE NOTES AGAINST STORED ATTEMPT
            // =================================================

            if (attemptId != null
                    && !attemptId.equals(
                            attempt.getRefundAttemptId())) {

                log.error(
                        "Attempt ID mismatch for refund {}",
                        refundId);

                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Refund attempt ID mismatch");
            }

            if (purchaseId != null
                    && !purchaseId.equals(
                            attempt.getPurchaseId())) {

                log.error(
                        "Purchase ID mismatch for refund {}",
                        refundId);

                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Refund purchase ID mismatch");
            }

            // =================================================
            // STEP 9: VERIFY ORIGINAL RAZORPAY PAYMENT
            // =================================================

            if (attempt.getRazorpayPaymentId() == null
                    || !paymentId.equals(
                            attempt.getRazorpayPaymentId())) {

                log.error(
                        "Payment ID mismatch for refund {}",
                        refundId);

                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Refund payment ID mismatch");
            }

            // =================================================
            // STEP 10: VERIFY REFUND AMOUNT
            // =================================================

            if (attempt.getRefundAmount() == null
                    || refundAmount.compareTo(
                            attempt.getRefundAmount()) != 0) {

                log.error(
                        "Refund amount mismatch for {}",
                        refundId);

                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Refund amount mismatch");
            }

            // =================================================
            // STEP 11: VALIDATE EXISTING REFUND ID
            // =================================================

            String storedRefundId =
                    attempt.getRazorpayRefundId();

            if (storedRefundId != null
                    && !storedRefundId.isBlank()
                    && !storedRefundId.equals(refundId)) {

                log.error(
                        "Refund ID mismatch for attempt {}",
                        attempt.getRefundAttemptId());

                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Refund ID mismatch");
            }

            // =================================================
            // STEP 12: SYNCHRONIZE REFUND STATUS
            // =================================================

            /*
             * This service updates:
             *
             * - RefundAttempt.status
             * - PolicyPurchase.refundStatus
             * - PolicyPurchase.refundId
             * - PolicyPurchase.refundDateTime
             *
             * The updates occur within one transaction.
             *
             * It also prevents older events from
             * downgrading an already completed refund.
             */

            persistenceService.recordRefundResult(
                    attempt.getRefundAttemptId(),
                    refundId,
                    status);

            log.info(
                    "Processed Razorpay event {} for refund {} with status {}",
                    eventName,
                    refundId,
                    status);

            return ResponseEntity.ok("Webhook processed");

        } catch (Exception ex) {

            log.error(
                    "Unable to process Razorpay webhook.",
                    ex);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Webhook processing failed");
        }
    }

    // =========================================================
    // VERIFY HMAC SHA256 SIGNATURE
    // =========================================================

    private boolean isValidSignature(
            String rawBody,
            String receivedSignature) {

        if (rawBody == null
                || receivedSignature == null
                || receivedSignature.isBlank()) {

            return false;
        }

        try {

            Mac mac = Mac.getInstance("HmacSHA256");

            mac.init(new SecretKeySpec(
                    webhookSecret.getBytes(
                            StandardCharsets.UTF_8),
                    "HmacSHA256"));

            byte[] digest = mac.doFinal(
                    rawBody.getBytes(
                            StandardCharsets.UTF_8));

            StringBuilder calculated =
                    new StringBuilder();

            for (byte b : digest) {

                calculated.append(
                        String.format("%02x", b & 0xff));
            }

            return MessageDigest.isEqual(
                    calculated.toString().getBytes(
                            StandardCharsets.UTF_8),
                    receivedSignature.trim()
                            .toLowerCase()
                            .getBytes(
                                    StandardCharsets.UTF_8));

        } catch (Exception ex) {

            log.error(
                    "Razorpay signature verification failed.",
                    ex);

            return false;
        }
    }

    // =========================================================
    // SAFE ID PARSING
    // =========================================================

    private Long parsePositiveId(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        try {

            long parsed = Long.parseLong(value.trim());

            return parsed > 0 ? parsed : null;

        } catch (NumberFormatException ex) {

            return null;
        }
    }
}

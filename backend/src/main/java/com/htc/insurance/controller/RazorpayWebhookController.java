
package com.htc.insurance.controller;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.repository.RefundAttemptRepository;
import com.htc.insurance.service.RefundAttemptPersistenceService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/webhooks")
public class RazorpayWebhookController {

    private final RefundAttemptRepository refundRepository;
    private final RefundAttemptPersistenceService persistenceService;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    // =========================================================
    // RAZORPAY WEBHOOK
    // =========================================================

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader(
                    value = "X-Razorpay-Signature",
                    required = false
            ) String signature) {

        // =====================================================
        // 1. VERIFY WEBHOOK CONFIGURATION
        // =====================================================

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("Razorpay webhook secret is not configured.");
            return error(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Webhook configuration error"
            );
        }

        // =====================================================
        // 2. VERIFY SIGNATURE
        // =====================================================

        if (!isValidSignature(rawBody, signature)) {
            log.warn("Rejected Razorpay webhook: invalid signature.");
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid webhook signature"
            );
        }

        try {
            JSONObject event = new JSONObject(rawBody);
            String eventName = event.optString("event", "");

            // =================================================
            // 3. FILTER SUPPORTED EVENTS
            // =================================================

            if (!isRefundEvent(eventName)) {
                return ResponseEntity.ok("Event ignored");
            }

            // =================================================
            // 4. EXTRACT REFUND INFORMATION
            // =================================================

            JSONObject refund = event
                    .getJSONObject("payload")
                    .getJSONObject("refund")
                    .getJSONObject("entity");

            String refundId = refund.optString("id", "");
            String paymentId = refund.optString("payment_id", "");
            String status = refund.optString("status", "");

            if (refundId.isBlank()
                    || paymentId.isBlank()
                    || status.isBlank()) {

                log.warn("Incomplete refund webhook: {}", eventName);

                return ResponseEntity.badRequest()
                        .body("Missing refund details");
            }

            // =================================================
            // 5. VALIDATE REFUND AMOUNT
            // =================================================

            if (!refund.has("amount")
                    || refund.isNull("amount")) {

                return ResponseEntity.badRequest()
                        .body("Missing refund amount");
            }

            long amountInPaise = refund.getLong("amount");

            if (amountInPaise <= 0) {
                return ResponseEntity.badRequest()
                        .body("Invalid refund amount");
            }

            BigDecimal refundAmount =
                    BigDecimal.valueOf(amountInPaise, 2);

            // =================================================
            // 6. EXTRACT REFUND NOTES
            // =================================================

            JSONObject notes = refund.optJSONObject("notes");

            Long attemptId = notes == null
                    ? null
                    : parsePositiveId(
                            notes.optString("refund_attempt_id", "")
                    );

            Long purchaseId = notes == null
                    ? null
                    : parsePositiveId(
                            notes.optString("purchase_id", "")
                    );

            // =================================================
            // 7. FIND EXISTING REFUND ATTEMPT
            // =================================================

            RefundAttempt attempt = findRefundAttempt(
                    attemptId,
                    purchaseId,
                    refundId
            );

            if (attempt == null) {
                log.warn(
                        "No refund attempt found for refund {}",
                        refundId
                );

                // Allow Razorpay to retry the webhook.
                return error(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Refund attempt not found"
                );
            }

            // =================================================
            // 8. VALIDATE ATTEMPT AND PURCHASE IDS
            // =================================================

            if (attemptId != null
                    && !attemptId.equals(
                            attempt.getRefundAttemptId())) {

                log.error("Refund attempt ID mismatch: {}", refundId);

                return error(
                        HttpStatus.CONFLICT,
                        "Refund attempt ID mismatch"
                );
            }

            if (purchaseId != null
                    && !purchaseId.equals(attempt.getPurchaseId())) {

                log.error("Refund purchase ID mismatch: {}", refundId);

                return error(
                        HttpStatus.CONFLICT,
                        "Refund purchase ID mismatch"
                );
            }

            // =================================================
            // 9. VALIDATE ORIGINAL PAYMENT
            // =================================================

            if (!paymentId.equals(attempt.getRazorpayPaymentId())) {

                log.error("Refund payment ID mismatch: {}", refundId);

                return error(
                        HttpStatus.CONFLICT,
                        "Refund payment ID mismatch"
                );
            }

            // =================================================
            // 10. VALIDATE REFUND AMOUNT
            // =================================================

            if (attempt.getRefundAmount() == null
                    || refundAmount.compareTo(
                            attempt.getRefundAmount()) != 0) {

                log.error("Refund amount mismatch: {}", refundId);

                return error(
                        HttpStatus.CONFLICT,
                        "Refund amount mismatch"
                );
            }

            // =================================================
            // 11. VALIDATE EXISTING REFUND ID
            // =================================================

            String storedRefundId = attempt.getRazorpayRefundId();

            if (storedRefundId != null
                    && !storedRefundId.isBlank()
                    && !storedRefundId.equals(refundId)) {

                log.error(
                        "Refund ID mismatch for attempt {}",
                        attempt.getRefundAttemptId()
                );

                return error(
                        HttpStatus.CONFLICT,
                        "Refund ID mismatch"
                );
            }

            // =================================================
            // 12. SYNCHRONIZE REFUND STATUS
            // =================================================

            persistenceService.recordRefundResult(
                    attempt.getRefundAttemptId(),
                    refundId,
                    status
            );

            log.info(
                    "Processed Razorpay event {} for refund {} with status {}",
                    eventName,
                    refundId,
                    status
            );

            return ResponseEntity.ok("Webhook processed");

        } catch (Exception ex) {
            log.error("Unable to process Razorpay webhook", ex);

            return error(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Webhook processing failed"
            );
        }
    }

    // =========================================================
    // SUPPORTED REFUND EVENTS
    // =========================================================

    private boolean isRefundEvent(String eventName) {
        return "refund.created".equals(eventName)
                || "refund.processed".equals(eventName)
                || "refund.failed".equals(eventName);
    }

    // =========================================================
    // FIND REFUND ATTEMPT
    // =========================================================

    private RefundAttempt findRefundAttempt(
            Long attemptId,
            Long purchaseId,
            String refundId) {

        if (attemptId != null) {
            RefundAttempt attempt = refundRepository
                    .findById(attemptId)
                    .orElse(null);

            if (attempt != null) {
                return attempt;
            }
        }

        if (purchaseId != null) {
            RefundAttempt attempt = refundRepository
                    .findByPurchaseId(purchaseId)
                    .orElse(null);

            if (attempt != null) {
                return attempt;
            }
        }

        return refundRepository
                .findByRazorpayRefundId(refundId)
                .orElse(null);
    }

    // =========================================================
    // VERIFY HMAC SHA256 SIGNATURE
    // =========================================================

    private boolean isValidSignature(
            String rawBody,
            String receivedSignature) {

        if (rawBody == null
                || receivedSignature == null
                || !receivedSignature.trim()
                        .matches("(?i)[0-9a-f]{64}")) {

            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");

            mac.init(new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            ));

            byte[] expected = mac.doFinal(
                    rawBody.getBytes(StandardCharsets.UTF_8)
            );

            byte[] received = HexFormat.of().parseHex(
                    receivedSignature.trim()
            );

            return MessageDigest.isEqual(expected, received);

        } catch (Exception ex) {
            log.error("Razorpay signature verification failed", ex);
            return false;
        }
    }

    // =========================================================
    // SAFE POSITIVE ID PARSING
    // =========================================================

    private Long parsePositiveId(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            long id = Long.parseLong(value.trim());
            return id > 0 ? id : null;

        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // =========================================================
    // ERROR RESPONSE
    // =========================================================

    private ResponseEntity<String> error(
            HttpStatus status,
            String message) {

        return ResponseEntity.status(status).body(message);
    }
}

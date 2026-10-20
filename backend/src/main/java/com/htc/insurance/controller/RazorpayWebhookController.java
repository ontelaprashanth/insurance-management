
package com.htc.insurance.controller;

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

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader(
                    value = "X-Razorpay-Signature",
                    required = false) String signature) {

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("Razorpay webhook secret is not configured.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Webhook configuration error");
        }

        if (!isValidSignature(rawBody, signature)) {
            log.warn("Rejected Razorpay webhook: invalid signature.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid webhook signature");
        }

        try {
            JSONObject event = new JSONObject(rawBody);
            String eventName = event.optString("event", "");

            if (!"refund.created".equals(eventName)
                    && !"refund.processed".equals(eventName)
                    && !"refund.failed".equals(eventName)) {
                return ResponseEntity.ok("Event ignored");
            }

            JSONObject refundEntity = event
                    .getJSONObject("payload")
                    .getJSONObject("refund")
                    .getJSONObject("entity");

            String refundId = refundEntity.optString("id", "");
            String status = refundEntity.optString("status", "");

            if (refundId.isBlank() || status.isBlank()) {
                return ResponseEntity.badRequest()
                        .body("Missing refund ID or status");
            }

            // Find the original attempt from our Razorpay refund notes.
            Long attemptId = null;
            JSONObject notes = refundEntity.optJSONObject("notes");

            if (notes != null) {
                String value = notes.optString("refund_attempt_id", "");

                if (!value.isBlank()) {
                    try {
                        attemptId = Long.valueOf(value);
                    } catch (NumberFormatException ex) {
                        log.warn("Invalid refund_attempt_id in Razorpay notes.");
                    }
                }
            }

            RefundAttempt attempt = null;

            if (attemptId != null) {
                Optional<RefundAttempt> byId =
                        refundRepository.findById(attemptId);
                attempt = byId.orElse(null);
            }

            if (attempt == null) {
                attempt = refundRepository
                        .findByRazorpayRefundId(refundId)
                        .orElse(null);
            }

            if (attempt == null) {
                /*
                 * Do not create an attempt or issue a new refund here.
                 * A retry may succeed after the original attempt is
                 * reconciled.
                 */
                log.warn("No attempt found for Razorpay refund {}", refundId);
                return ResponseEntity.status(
                        HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Refund attempt not found");
            }

            String storedRefundId = attempt.getRazorpayRefundId();

            if (storedRefundId != null
                    && !storedRefundId.isBlank()
                    && !storedRefundId.equals(refundId)) {
                log.error(
                        "Refund ID mismatch for attempt {}",
                        attempt.getRefundAttemptId());

                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("Refund ID mismatch");
            }

            /*
             * The persistence service handles processed, created,
             * pending, queued, failed and unknown statuses.
             * Repeated delivery of the same event is safe.
             */
            persistenceService.recordRefundResult(
                    attempt.getRefundAttemptId(),
                    refundId,
                    status);

            log.info(
                    "Processed Razorpay event {} for refund {} with status {}",
                    eventName, refundId, status);

            return ResponseEntity.ok("Webhook processed");

        } catch (Exception ex) {
            log.error("Unable to process Razorpay webhook.", ex);

            return ResponseEntity.status(
                    HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Webhook processing failed");
        }
    }

    private boolean isValidSignature(
            String rawBody,
            String receivedSignature) {

        if (rawBody == null || receivedSignature == null
                || receivedSignature.isBlank()) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");

            mac.init(new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"));

            byte[] digest = mac.doFinal(
                    rawBody.getBytes(StandardCharsets.UTF_8));

            StringBuilder calculated = new StringBuilder();

            for (byte b : digest) {
                calculated.append(String.format("%02x", b & 0xff));
            }

            return MessageDigest.isEqual(
                    calculated.toString().getBytes(StandardCharsets.UTF_8),
                    receivedSignature.trim().toLowerCase()
                            .getBytes(StandardCharsets.UTF_8));

        } catch (Exception ex) {
            log.error("Razorpay signature verification failed.", ex);
            return false;
        }
    }
}

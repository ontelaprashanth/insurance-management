package com.htc.insurance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.RefundAttempt;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.Refund;

@Service
public class RazorpayRefundService {

    private final PolicyPurchaseDao purchaseDao;
    private final RefundAttemptPersistenceService persistenceService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    public RazorpayRefundService(
            PolicyPurchaseDao purchaseDao,
            RefundAttemptPersistenceService persistenceService) {
        this.purchaseDao = purchaseDao;
        this.persistenceService = persistenceService;
    }

    public PolicyPurchase requestFullRefund(
            Long purchaseId,
            String username,
            String reason) throws Exception {

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated user is required.");
        }

        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException(
                    "A refund reason is required.");
        }

        reason = reason.trim();

        if (reason.length() > 500) {
            throw new IllegalArgumentException(
                    "Refund reason must not exceed 500 characters.");
        }

        PolicyPurchase purchase = purchaseDao.getPurchaseById(purchaseId);

        if (purchase == null) {
            throw new IllegalArgumentException(
                    "Purchase was not found.");
        }

        // Customer may refund only their own purchase.
        String owner = null;

        if (purchase.getPolicy() != null
                && purchase.getPolicy().getPolicyHolder() != null
                && purchase.getPolicy().getPolicyHolder().getUser() != null) {

            owner = purchase.getPolicy()
                    .getPolicyHolder()
                    .getUser()
                    .getUsername();
        }

        if (owner == null || !owner.equals(username)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You are not authorized to refund this purchase.");
        }

        if (!"PAID".equalsIgnoreCase(purchase.getPaymentStatus())) {
            throw new IllegalStateException(
                    "Only paid purchases can be refunded.");
        }

        if (purchase.getPaymentDateTime() == null
                || !LocalDateTime.now().isBefore(
                        purchase.getPaymentDateTime().plusHours(24))) {
            throw new IllegalStateException(
                    "The 24-hour refund eligibility window has expired.");
        }

        if (purchase.getTotalPremium() == null
                || purchase.getTotalPremium().compareTo(
                        BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "The purchase has an invalid refundable amount.");
        }

        if (purchase.getRazorpayPaymentId() == null
                || purchase.getRazorpayPaymentId().isBlank()) {
            throw new IllegalStateException(
                    "The purchase has no Razorpay payment ID.");
        }

        if (!"NOT_REFUNDED".equalsIgnoreCase(
                purchase.getRefundStatus())) {
            throw new IllegalStateException(
                    "This purchase is not available for a new refund. "
                    + "Check its existing refund status.");
        }

        String paymentId = purchase.getRazorpayPaymentId();

        BigDecimal amount = purchase.getTotalPremium()
                .setScale(2, RoundingMode.HALF_UP);

        long amountInPaise = amount
                .multiply(new BigDecimal("100"))
                .longValueExact();

        /*
         * Verify current payment details with Razorpay before creating
         * a refund attempt.
         */
        RazorpayClient client = new RazorpayClient(
                razorpayKeyId, razorpayKeySecret);

        Payment payment = client.payments.fetch(paymentId);

        if (payment == null
                || !"captured".equalsIgnoreCase(
                        String.valueOf(payment.get("status")))) {
            throw new IllegalStateException(
                    "Razorpay does not report this payment as captured.");
        }

        String fetchedOrderId = payment.get("order_id");

        if (purchase.getRazorpayOrderId() == null
                || !purchase.getRazorpayOrderId().equals(fetchedOrderId)) {
            throw new IllegalStateException(
                    "Razorpay payment and purchase order IDs do not match.");
        }

        String fetchedCurrency = payment.get("currency");

        if (fetchedCurrency == null
                || !currency.equalsIgnoreCase(fetchedCurrency)) {
            throw new IllegalStateException(
                    "Payment currency does not match the configured currency.");
        }

        long paidAmount = new BigDecimal(
                String.valueOf(payment.get("amount")))
                .longValueExact();

        if (paidAmount != amountInPaise) {
            throw new IllegalStateException(
                    "Payment amount does not match the purchase amount.");
        }

        long alreadyRefunded = 0L;
        Object refundedObject = payment.get("amount_refunded");

        if (refundedObject != null) {
            alreadyRefunded = new BigDecimal(
                    String.valueOf(refundedObject))
                    .longValueExact();
        }

        if (alreadyRefunded != 0L) {
            throw new IllegalStateException(
                    "Razorpay reports an existing refund. "
                    + "Manual reconciliation is required.");
        }

        /*
         * Persist the unique refund attempt before making the external
         * request. Never blindly repeat the request after an exception.
         */
        RefundAttempt attempt = persistenceService.beginRefund(
                purchaseId,
                paymentId,
                amount,
                reason,
                username);

        try {
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amountInPaise);
            refundRequest.put(
                    "receipt",
                    "INSXREF" + attempt.getRefundAttemptId());

            JSONObject notes = new JSONObject();
            notes.put("purchase_id", String.valueOf(purchaseId));
            notes.put(
                    "refund_attempt_id",
                    String.valueOf(attempt.getRefundAttemptId()));

            refundRequest.put("notes", notes);

            Refund refund = client.payments.refund(
                    paymentId, refundRequest);

            if (refund == null
                    || refund.get("id") == null
                    || String.valueOf(refund.get("id")).isBlank()) {

                persistenceService.requireReconciliation(
                        attempt.getRefundAttemptId(),
                        "Razorpay response did not include a refund ID.");

                throw new IllegalStateException(
                        "Razorpay returned an incomplete refund response. "
                        + "The refund requires reconciliation; do not retry it.");
            }

            String refundId = String.valueOf(refund.get("id"));
            String refundStatus = String.valueOf(refund.get("status"));

            persistenceService.recordRefundResult(
                    attempt.getRefundAttemptId(),
                    refundId,
                    refundStatus);

            PolicyPurchase updated = purchaseDao.getPurchaseById(
                    purchaseId);

            if (updated == null) {
                throw new IllegalStateException(
                        "Refund was submitted, but the purchase could not be reloaded.");
            }

            return updated;

        } catch (Exception exception) {

            /*
             * The API request may have reached Razorpay even when the
             * client received an exception. Do not send a second refund.
             */
            try {
                persistenceService.requireReconciliation(
                        attempt.getRefundAttemptId(),
                        "Refund outcome is uncertain. Check Razorpay "
                        + "before taking further action.");
            } catch (Exception persistenceException) {
                exception.addSuppressed(persistenceException);
            }

            throw new IllegalStateException(
                    "The refund outcome could not be confirmed. "
                    + "Do not retry the refund. Check Razorpay and the "
                    + "refund attempt record first.",
                    exception);
        }
    }
}


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
    private final RefundPreparationService preparationService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    public RazorpayRefundService(
            PolicyPurchaseDao purchaseDao,
            RefundAttemptPersistenceService persistenceService,
            RefundPreparationService preparationService) {
        this.purchaseDao = purchaseDao;
        this.persistenceService = persistenceService;
        this.preparationService = preparationService;
    }

    /*
     * IMPORTANT:
     * Razorpay's get() method is generic. Passing payment.get("status")
     * directly to String.valueOf(...) can cause Java to infer char[]
     * and throw a ClassCastException at runtime.
     *
     * Accept the value as Object first, then convert it safely.
     */
    private static String sdkValueToString(Object value) {
        return value == null ? null : value.toString();
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

        PolicyPurchase purchase =
                purchaseDao.getPurchaseById(purchaseId);

        if (purchase == null) {
            throw new IllegalArgumentException(
                    "Purchase was not found.");
        }

        // A customer can refund only their own purchase.
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
         * Verify payment with Razorpay before creating an attempt.
         */
        RazorpayClient client = new RazorpayClient(
                razorpayKeyId,
                razorpayKeySecret);

        Payment payment = client.payments.fetch(paymentId);

        if (payment == null) {
            throw new IllegalStateException(
                    "Razorpay did not return the payment details.");
        }

        // Avoid String.valueOf(payment.get(...)) generic overload inference.
        Object paymentStatusObject = payment.get("status");
        String paymentStatus = sdkValueToString(paymentStatusObject);

        if (!"captured".equalsIgnoreCase(paymentStatus)) {
            throw new IllegalStateException(
                    "Razorpay does not report this payment as captured.");
        }

        Object orderIdObject = payment.get("order_id");
        String fetchedOrderId = sdkValueToString(orderIdObject);

        if (purchase.getRazorpayOrderId() == null
                || !purchase.getRazorpayOrderId().equals(fetchedOrderId)) {
            throw new IllegalStateException(
                    "Razorpay payment and purchase order IDs do not match.");
        }

        Object currencyObject = payment.get("currency");
        String fetchedCurrency = sdkValueToString(currencyObject);

        if (fetchedCurrency == null
                || currency == null
                || !currency.equalsIgnoreCase(fetchedCurrency)) {
            throw new IllegalStateException(
                    "Payment currency does not match the configured currency.");
        }

        Object paidAmountObject = payment.get("amount");
        String paidAmountText = sdkValueToString(paidAmountObject);

        if (paidAmountText == null) {
            throw new IllegalStateException(
                    "Razorpay did not return the captured payment amount.");
        }

        long paidAmount = new BigDecimal(paidAmountText)
                .longValueExact();

        if (paidAmount != amountInPaise) {
            throw new IllegalStateException(
                    "Payment amount does not match the purchase amount.");
        }

        long alreadyRefunded = 0L;

        Object refundedObject = payment.get("amount_refunded");

        if (refundedObject != null) {
            String refundedText = sdkValueToString(refundedObject);

            alreadyRefunded = new BigDecimal(refundedText)
                    .longValueExact();
        }

        if (alreadyRefunded != 0L) {
            throw new IllegalStateException(
                    "Razorpay reports an existing refund. "
                    + "Manual reconciliation is required.");
        }

        /*
         * Prepare under the policy/purchase locks AFTER checking Razorpay,
         * but BEFORE creating the persistent refund attempt.
         * This enforces ownership, 24-hour eligibility, claim exclusion,
         * and policy lifecycle rules without bypassing preparation.
         *
         * Both preparation and beginRefund commit independently before
         * the external refund request. If the process stops between them,
         * REFUND_PENDING needs operational recovery; never blindly retry.
         */
        preparationService.prepareRefund(
                purchaseId,
                reason,
                username);

        /*
         * Persist the unique attempt before calling Razorpay.
         * Do not automatically repeat a refund after an uncertain result.
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
                    paymentId,
                    refundRequest);

            if (refund == null) {
                persistenceService.requireReconciliation(
                        attempt.getRefundAttemptId(),
                        "Razorpay returned no refund response.");

                throw new IllegalStateException(
                        "Razorpay returned no refund response. "
                        + "Reconciliation is required; do not retry.");
            }

            Object refundIdObject = refund.get("id");
            String refundId = sdkValueToString(refundIdObject);

            if (refundId == null || refundId.isBlank()) {
                persistenceService.requireReconciliation(
                        attempt.getRefundAttemptId(),
                        "Razorpay response did not include a refund ID.");

                throw new IllegalStateException(
                        "Razorpay returned an incomplete refund response. "
                        + "Reconciliation is required; do not retry.");
            }

            Object refundStatusObject = refund.get("status");
            String refundStatus = sdkValueToString(refundStatusObject);

            if (refundStatus == null || refundStatus.isBlank()) {
                persistenceService.requireReconciliation(
                        attempt.getRefundAttemptId(),
                        "Razorpay response did not include a refund status.");

                throw new IllegalStateException(
                        "Razorpay did not return a refund status. "
                        + "Reconciliation is required; do not retry.");
            }

            persistenceService.recordRefundResult(
                    attempt.getRefundAttemptId(),
                    refundId,
                    refundStatus);

            PolicyPurchase updated =
                    purchaseDao.getPurchaseById(purchaseId);

            if (updated == null) {
                throw new IllegalStateException(
                        "Refund was submitted, but the purchase "
                        + "could not be reloaded.");
            }

            return updated;

        } catch (Exception exception) {

            /*
             * The request may have reached Razorpay even if the client
             * received an exception. Preserve reconciliation safeguards.
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

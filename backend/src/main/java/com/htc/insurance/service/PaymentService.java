package com.htc.insurance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.htc.insurance.dto.PaymentOrderRequest;
import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;

@Service
public class PaymentService {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    // =========================================================
    // CREATE RAZORPAY ORDER
    // =========================================================

    public PaymentOrderResponse createOrder(
            PaymentOrderRequest request) throws Exception {

        if (request == null) {
            throw new RuntimeException(
                    "Payment request is required."
            );
        }

        if (request.getAmount() == null
                || request.getAmount()
                        .compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Valid payment amount is required."
            );
        }

        BigDecimal amount =
                request.getAmount()
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );

        /*
         * InsureX currently supports INR payments only.
         */
        if (request.getCurrency() != null
                && !request.getCurrency().isBlank()
                && !currency.equalsIgnoreCase(
                        request.getCurrency().trim()
                )) {

            throw new RuntimeException(
                    "Unsupported payment currency. "
                    + "Only " + currency + " is supported."
            );
        }

        /*
         * Razorpay client.
         */
        RazorpayClient razorpayClient =
                new RazorpayClient(
                        razorpayKeyId,
                        razorpayKeySecret
                );

        /*
         * Razorpay expects the amount in paise.
         *
         * Example:
         *
         * ₹8,999.00
         * =
         * 899900 paise
         */
        long amountInPaise =
                amount
                        .multiply(
                                BigDecimal.valueOf(100)
                        )
                        .longValueExact();

        /*
         * Receipt.
         */
        String receipt =
                request.getReceipt();

        if (receipt == null
                || receipt.trim().isEmpty()) {

            receipt =
                    "INSX_"
                    + UUID.randomUUID()
                            .toString()
                            .replace("-", "")
                            .substring(0, 12)
                            .toUpperCase();
        } else {

            receipt =
                    receipt.trim();
        }

        /*
         * Create Razorpay order request.
         */
        JSONObject orderRequest =
                new JSONObject();

        orderRequest.put(
                "amount",
                amountInPaise
        );

        orderRequest.put(
                "currency",
                currency
        );

        orderRequest.put(
                "receipt",
                receipt
        );

        /*
         * Create Razorpay order.
         */
        Order order =
                razorpayClient.orders.create(
                        orderRequest
                );

        if (order == null) {
            throw new RuntimeException(
                    "Unable to create Razorpay order."
            );
        }

        String orderId =
                order.get("id");

        if (orderId == null
                || orderId.isBlank()) {

            throw new RuntimeException(
                    "Razorpay did not return an order ID."
            );
        }

        /*
         * Return order details to frontend.
         *
         * Secret key is NEVER returned.
         */
        return new PaymentOrderResponse(
                orderId,
                razorpayKeyId,
                amount,
                currency,
                receipt
        );
    }

    // =========================================================
    // VERIFY RAZORPAY PAYMENT + AMOUNT
    // =========================================================

    public boolean verifyPayment(
            PaymentVerificationRequest request,
            BigDecimal expectedAmount)
            throws Exception {

        /*
         * Validate request.
         */
        if (request == null) {
            return false;
        }

        if (request.getRazorpayOrderId() == null
                || request.getRazorpayOrderId()
                        .trim()
                        .isEmpty()) {

            return false;
        }

        if (request.getRazorpayPaymentId() == null
                || request.getRazorpayPaymentId()
                        .trim()
                        .isEmpty()) {

            return false;
        }

        if (request.getRazorpaySignature() == null
                || request.getRazorpaySignature()
                        .trim()
                        .isEmpty()) {

            return false;
        }

        /*
         * Expected amount comes from the backend
         * premium calculation.
         */
        if (expectedAmount == null
                || expectedAmount.compareTo(
                        BigDecimal.ZERO
                ) <= 0) {

            return false;
        }

        BigDecimal normalizedExpectedAmount =
                expectedAmount.setScale(
                        2,
                        RoundingMode.HALF_UP
                );

        // =====================================================
        // VERIFY RAZORPAY SIGNATURE
        // =====================================================

        String orderId =
                request.getRazorpayOrderId()
                        .trim();

        String paymentId =
                request.getRazorpayPaymentId()
                        .trim();

        String signature =
                request.getRazorpaySignature()
                        .trim();

        /*
         * Razorpay signature data:
         *
         * razorpay_order_id + "|" + razorpay_payment_id
         */
        String data =
                orderId
                + "|"
                + paymentId;

        String generatedSignature =
                generateHmacSha256(
                        data,
                        razorpayKeySecret
                );

        /*
         * Constant-time comparison.
         */
        boolean signatureValid =
                MessageDigest.isEqual(
                        generatedSignature.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        signature.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        if (!signatureValid) {
            return false;
        }

        // =====================================================
        // FETCH RAZORPAY ORDER
        // =====================================================

        RazorpayClient razorpayClient =
                new RazorpayClient(
                        razorpayKeyId,
                        razorpayKeySecret
                );

        Order order =
                razorpayClient.orders.fetch(
                        orderId
                );

        if (order == null) {
            return false;
        }

        // =====================================================
        // VERIFY ORDER ID
        // =====================================================

        String razorpayOrderId =
                order.get("id");

        if (razorpayOrderId == null
                || !orderId.equals(
                        razorpayOrderId
                )) {

            return false;
        }

        // =====================================================
        // VERIFY CURRENCY
        // =====================================================

        String orderCurrency =
                order.get("currency");

        if (orderCurrency == null
                || !currency.equalsIgnoreCase(
                        orderCurrency
                )) {

            return false;
        }

        // =====================================================
        // VERIFY ORDER AMOUNT
        // =====================================================

        Object amountObject =
                order.get("amount");

        if (amountObject == null) {
            return false;
        }

        long razorpayAmountInPaise;

        try {

            razorpayAmountInPaise =
                    Long.parseLong(
                            String.valueOf(
                                    amountObject
                            )
                    );

        } catch (NumberFormatException e) {

            return false;
        }

        long expectedAmountInPaise =
                normalizedExpectedAmount
                        .multiply(
                                BigDecimal.valueOf(100)
                        )
                        .longValueExact();

        /*
         * The amount stored in Razorpay must exactly
         * match the premium calculated by InsureX.
         */
        if (razorpayAmountInPaise
                != expectedAmountInPaise) {

            return false;
        }

        return true;
    }

    // =========================================================
    // SIMPLE SIGNATURE VERIFICATION
    // =========================================================
    /*
     * Kept for compatibility with PaymentController
     * /payment/verify.
     *
     * The insurance purchase flow should use:
     *
     * verifyPayment(request, expectedAmount)
     *
     * because that version also verifies the amount.
     */

    public boolean verifyPayment(
            PaymentVerificationRequest request)
            throws Exception {

        if (request == null) {
            return false;
        }

        if (request.getRazorpayOrderId() == null
                || request.getRazorpayOrderId()
                        .trim()
                        .isEmpty()) {

            return false;
        }

        if (request.getRazorpayPaymentId() == null
                || request.getRazorpayPaymentId()
                        .trim()
                        .isEmpty()) {

            return false;
        }

        if (request.getRazorpaySignature() == null
                || request.getRazorpaySignature()
                        .trim()
                        .isEmpty()) {

            return false;
        }

        String data =
                request.getRazorpayOrderId().trim()
                + "|"
                + request.getRazorpayPaymentId().trim();

        String generatedSignature =
                generateHmacSha256(
                        data,
                        razorpayKeySecret
                );

        return MessageDigest.isEqual(
                generatedSignature.getBytes(
                        StandardCharsets.UTF_8
                ),
                request.getRazorpaySignature()
                        .trim()
                        .getBytes(
                                StandardCharsets.UTF_8
                        )
        );
    }

    // =========================================================
    // GENERATE HMAC SHA256
    // =========================================================

    private String generateHmacSha256(
            String data,
            String secret) throws Exception {

        Mac mac =
                Mac.getInstance(
                        "HmacSHA256"
                );

        SecretKeySpec secretKey =
                new SecretKeySpec(
                        secret.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        "HmacSHA256"
                );

        mac.init(secretKey);

        byte[] hash =
                mac.doFinal(
                        data.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        StringBuilder result =
                new StringBuilder();

        for (byte b : hash) {

            result.append(
                    String.format(
                            "%02x",
                            b
                    )
            );
        }

        return result.toString();
    }
}
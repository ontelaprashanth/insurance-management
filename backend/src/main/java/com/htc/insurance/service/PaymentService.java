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
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dto.PaymentOrderRequest;
import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.repository.InsurancePlanRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;

@Service
public class PaymentService {

    private static final BigDecimal MIN_COVERAGE =
            new BigDecimal("1000000");

    private static final BigDecimal MAX_COVERAGE =
            new BigDecimal("10000000");

    private static final int MIN_DURATION_YEARS = 1;
    private static final int MAX_DURATION_YEARS = 5;

    private static final BigDecimal LONG_TERM_DISCOUNT =
            new BigDecimal("0.05");

    private static final BigDecimal ZERO =
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final InsurancePlanRepository insurancePlanRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    public PaymentService(
            InsurancePlanRepository insurancePlanRepository) {
        this.insurancePlanRepository = insurancePlanRepository;
    }

    // =========================================================
    // CREATE RAZORPAY ORDER USING BACKEND-CALCULATED PREMIUM
    // =========================================================

    @Transactional(readOnly = true)
    public PaymentOrderResponse createOrder(
            PaymentOrderRequest request) throws Exception {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payment request is required.");
        }

        if (request.getPlanId() == null
                || request.getPlanId() <= 0) {
            throw new IllegalArgumentException(
                    "A valid insurance plan is required.");
        }

        if (request.getCoverageAmount() == null
                || request.getCoverageAmount()
                        .compareTo(MIN_COVERAGE) < 0
                || request.getCoverageAmount()
                        .compareTo(MAX_COVERAGE) > 0) {
            throw new IllegalArgumentException(
                    "Coverage must be between ₹10,00,000 and ₹1,00,00,000.");
        }

        if (request.getDurationYears() == null
                || request.getDurationYears() < MIN_DURATION_YEARS
                || request.getDurationYears() > MAX_DURATION_YEARS) {
            throw new IllegalArgumentException(
                    "Policy duration must be between 1 and 5 years.");
        }

        if (request.getCurrency() != null
                && !request.getCurrency().isBlank()
                && !currency.equalsIgnoreCase(
                        request.getCurrency().trim())) {
            throw new IllegalArgumentException(
                    "Unsupported payment currency. Only "
                    + currency + " is supported.");
        }

        InsurancePlan plan = insurancePlanRepository
                .findById(request.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "The selected insurance plan was not found."));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalArgumentException(
                    "The selected insurance plan is not available.");
        }

        BigDecimal basePremium = plan.getBasePremium();
        BigDecimal baseCoverage = plan.getBaseCoverage();

        if (basePremium == null
                || basePremium.compareTo(BigDecimal.ZERO) <= 0
                || baseCoverage == null
                || baseCoverage.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "The selected insurance plan has invalid pricing.");
        }

        BigDecimal coverageFactor = request.getCoverageAmount()
                .divide(baseCoverage, 10, RoundingMode.HALF_UP);

        BigDecimal calculatedBasePremium = basePremium
                .multiply(coverageFactor)
                .multiply(BigDecimal.valueOf(
                        request.getDurationYears()))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal discount = ZERO;

        if (request.getDurationYears() >= 2) {
            discount = calculatedBasePremium
                    .multiply(LONG_TERM_DISCOUNT)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal taxableAmount = calculatedBasePremium
                .subtract(discount)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal gstAmount = ZERO;

        BigDecimal totalPremium = taxableAmount
                .add(gstAmount)
                .setScale(2, RoundingMode.HALF_UP);

        if (totalPremium.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "The calculated premium must be greater than zero.");
        }

        // Never trust the amount submitted by the frontend.
        return createRazorpayOrder(totalPremium, request.getReceipt());
    }

    // =========================================================
    // CREATE RAZORPAY ORDER
    // =========================================================

    private PaymentOrderResponse createRazorpayOrder(
            BigDecimal amount,
            String requestedReceipt) throws Exception {

        BigDecimal normalizedAmount = amount.setScale(
                2, RoundingMode.HALF_UP);

        long amountInPaise = normalizedAmount
                .multiply(BigDecimal.valueOf(100))
                .longValueExact();

        String receipt = requestedReceipt;

        if (receipt == null || receipt.isBlank()) {
            receipt = "INSX_" + UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, 12)
                    .toUpperCase();
        } else {
            receipt = receipt.trim();

            if (receipt.length() > 40) {
                throw new IllegalArgumentException(
                        "Payment receipt must not exceed 40 characters.");
            }
        }

        RazorpayClient razorpayClient = new RazorpayClient(
                razorpayKeyId,
                razorpayKeySecret);

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receipt);

        Order order = razorpayClient.orders.create(orderRequest);

        if (order == null) {
            throw new IllegalStateException(
                    "Unable to create Razorpay order.");
        }

        String orderId = order.get("id");

        if (orderId == null || orderId.isBlank()) {
            throw new IllegalStateException(
                    "Razorpay did not return an order ID.");
        }

        return new PaymentOrderResponse(
                orderId,
                razorpayKeyId,
                normalizedAmount,
                currency,
                receipt);
    }

    // =========================================================
    // VERIFY PAYMENT SIGNATURE AND EXPECTED AMOUNT
    // =========================================================

    public boolean verifyPayment(
            PaymentVerificationRequest request,
            BigDecimal expectedAmount) throws Exception {

        if (!hasVerificationFields(request)) {
            return false;
        }

        if (expectedAmount == null
                || expectedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        BigDecimal normalizedExpectedAmount = expectedAmount
                .setScale(2, RoundingMode.HALF_UP);

        String orderId = request.getRazorpayOrderId().trim();
        String paymentId = request.getRazorpayPaymentId().trim();
        String signature = request.getRazorpaySignature().trim();

        String data = orderId + "|" + paymentId;

        String generatedSignature = generateHmacSha256(
                data, razorpayKeySecret);

        boolean signatureValid = MessageDigest.isEqual(
                generatedSignature.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8));

        if (!signatureValid) {
            return false;
        }

        RazorpayClient razorpayClient = new RazorpayClient(
                razorpayKeyId,
                razorpayKeySecret);

        Order order = razorpayClient.orders.fetch(orderId);

        if (order == null) {
            return false;
        }

        String fetchedOrderId = order.get("id");

        if (fetchedOrderId == null
                || !orderId.equals(fetchedOrderId)) {
            return false;
        }

        String orderCurrency = order.get("currency");

        if (orderCurrency == null
                || !currency.equalsIgnoreCase(orderCurrency)) {
            return false;
        }

        Object amountObject = order.get("amount");

        if (amountObject == null) {
            return false;
        }

        long razorpayAmountInPaise;

        try {
            razorpayAmountInPaise = Long.parseLong(
                    String.valueOf(amountObject));
        } catch (NumberFormatException exception) {
            return false;
        }

        long expectedAmountInPaise = normalizedExpectedAmount
                .multiply(BigDecimal.valueOf(100))
                .longValueExact();

        return razorpayAmountInPaise == expectedAmountInPaise;
    }

    // =========================================================
    // SIGNATURE-ONLY VERIFICATION - LEGACY COMPATIBILITY
    // =========================================================

    public boolean verifyPayment(
            PaymentVerificationRequest request) throws Exception {

        if (!hasVerificationFields(request)) {
            return false;
        }

        String data = request.getRazorpayOrderId().trim()
                + "|"
                + request.getRazorpayPaymentId().trim();

        String generatedSignature = generateHmacSha256(
                data, razorpayKeySecret);

        return MessageDigest.isEqual(
                generatedSignature.getBytes(StandardCharsets.UTF_8),
                request.getRazorpaySignature()
                        .trim()
                        .getBytes(StandardCharsets.UTF_8));
    }

    // =========================================================
    // COMMON VALIDATION
    // =========================================================

    private boolean hasVerificationFields(
            PaymentVerificationRequest request) {

        return request != null
                && request.getRazorpayOrderId() != null
                && !request.getRazorpayOrderId().isBlank()
                && request.getRazorpayPaymentId() != null
                && !request.getRazorpayPaymentId().isBlank()
                && request.getRazorpaySignature() != null
                && !request.getRazorpaySignature().isBlank();
    }

    // =========================================================
    // GENERATE HMAC SHA256
    // =========================================================

    private String generateHmacSha256(
            String data,
            String secret) throws Exception {

        Mac mac = Mac.getInstance("HmacSHA256");

        SecretKeySpec secretKey = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");

        mac.init(secretKey);

        byte[] hash = mac.doFinal(
                data.getBytes(StandardCharsets.UTF_8));

        StringBuilder result = new StringBuilder();

        for (byte b : hash) {
            result.append(String.format("%02x", b));
        }

        return result.toString();
    }
}

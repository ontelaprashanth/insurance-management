
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dto.PaymentOrderRequest;
import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.repository.InsurancePlanRepository;
import com.htc.insurance.repository.PolicyPurchaseRepository;
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
    private final PaymentAttemptService paymentAttemptService;

    // New dependencies for renewal validation.
    private final PolicyDao policyDao;
    private final PolicyPurchaseDao policyPurchaseDao;
    private final PolicyPurchaseRepository policyPurchaseRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    public PaymentService(
            InsurancePlanRepository insurancePlanRepository,
            PaymentAttemptService paymentAttemptService,
            PolicyDao policyDao,
            PolicyPurchaseDao policyPurchaseDao,
            PolicyPurchaseRepository policyPurchaseRepository) {

        this.insurancePlanRepository = insurancePlanRepository;
        this.paymentAttemptService = paymentAttemptService;
        this.policyDao = policyDao;
        this.policyPurchaseDao = policyPurchaseDao;
        this.policyPurchaseRepository = policyPurchaseRepository;
    }

    // =========================================================
    // CREATE ORDER USING BACKEND-CALCULATED PREMIUM
    // EXISTING NORMAL PURCHASE FLOW
    // =========================================================

    public PaymentOrderResponse createOrder(
            PaymentOrderRequest request,
            String authenticatedUsername) throws Exception {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payment request is required.");
        }

        if (authenticatedUsername == null
                || authenticatedUsername.isBlank()) {
            throw new IllegalArgumentException(
                    "An authenticated user is required.");
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

        // -----------------------------------------------------
        // 1. Load and validate the insurance plan
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 2. Calculate the premium on the backend
        // -----------------------------------------------------

        BigDecimal coverageAmount = request.getCoverageAmount()
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal coverageFactor = coverageAmount.divide(
                baseCoverage, 10, RoundingMode.HALF_UP);

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

        // Preserve the existing GST behavior.
        BigDecimal totalPremium = taxableAmount
                .add(ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        if (totalPremium.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "The calculated premium must be greater than zero.");
        }

        // -----------------------------------------------------
        // 3. Persist the attempt BEFORE contacting Razorpay
        // -----------------------------------------------------

        String attemptReference =
                paymentAttemptService.createAttempt(
                        authenticatedUsername,
                        request.getPlanId(),
                        coverageAmount,
                        request.getDurationYears(),
                        totalPremium,
                        currency);

        String receipt = request.getReceipt();

        if (receipt == null || receipt.isBlank()) {
            receipt = attemptReference;
        }

        // -----------------------------------------------------
        // 4. Create Razorpay order and persist its ID
        // -----------------------------------------------------

        return createAndRecordOrder(
                attemptReference,
                totalPremium,
                receipt);
    }

    // =========================================================
    // NEW - CREATE SAME-PRICE RENEWAL ORDER
    // =========================================================

    /**
     * Creates a renewal payment order for an original policy.
     *
     * The original purchase is the trusted source of:
     * - Coverage amount
     * - Duration
     * - Total premium
     *
     * Claim approval eligibility is additionally checked
     * by the renewal service before exposing this method.
     *
     * This method verifies ownership and purchase/payment
     * details but must not be exposed directly as a public
     * controller endpoint without claim eligibility checks.
     */
    public PaymentOrderResponse createRenewalOrder(
            Long originalPolicyNumber,
            Long originalPlanId,
            String authenticatedUsername) throws Exception {

        if (originalPolicyNumber == null
                || originalPolicyNumber <= 0) {
            throw new IllegalArgumentException(
                    "A valid original policy number is required.");
        }

        if (originalPlanId == null
                || originalPlanId <= 0) {
            throw new IllegalArgumentException(
                    "A valid original plan ID is required.");
        }

        if (authenticatedUsername == null
                || authenticatedUsername.isBlank()) {
            throw new IllegalArgumentException(
                    "An authenticated user is required.");
        }

        Policy policy = policyDao.getPolicyById(
                originalPolicyNumber);

        if (policy == null
                || policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null) {
            throw new IllegalArgumentException(
                    "Original policy was not found.");
        }

        String owner = policy.getPolicyHolder()
                .getUser()
                .getUsername();

        if (!authenticatedUsername.equals(owner)) {
            throw new AccessDeniedException(
                    "This policy belongs to another customer.");
        }

        PolicyPurchase originalPurchase =
                policyPurchaseDao.getPurchaseByPolicyNumber(
                        originalPolicyNumber);

        if (originalPurchase == null) {
            throw new IllegalStateException(
                    "Original policy purchase was not found.");
        }

        if (!"PAID".equalsIgnoreCase(
                originalPurchase.getPaymentStatus())) {
            throw new IllegalStateException(
                    "Only paid policies can be renewed.");
        }

        if (!"NOT_REFUNDED".equalsIgnoreCase(
                originalPurchase.getRefundStatus())) {
            throw new IllegalStateException(
                    "Refunded or refund-processing policies "
                    + "cannot be renewed.");
        }

        if (policyPurchaseRepository
                .existsByRenewedFromPurchasePurchaseId(
                        originalPurchase.getPurchaseId())) {
            throw new IllegalStateException(
                    "This policy has already been renewed.");
        }

        if (policy.getDurationYears() == null
                || policy.getDurationYears() < MIN_DURATION_YEARS
                || policy.getDurationYears() > MAX_DURATION_YEARS) {
            throw new IllegalStateException(
                    "Original policy duration is invalid.");
        }

        BigDecimal originalPremium =
                originalPurchase.getTotalPremium();

        if (originalPremium == null
                || originalPremium.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "Original paid premium is invalid.");
        }

        BigDecimal coverage =
                originalPurchase.getCoverageAmount();

        if (coverage == null
                || coverage.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "Original policy coverage is invalid.");
        }

        /*
         * The original plan ID must be recovered and validated
         * by the trusted renewal service from the original
         * payment attempt. Do not accept it from the browser.
         */

        String attemptReference =
                paymentAttemptService.createRenewalAttempt(
                        authenticatedUsername,
                        originalPolicyNumber,
                        originalPlanId,
                        coverage,
                        policy.getDurationYears(),
                        originalPremium,
                        currency);

        return createAndRecordOrder(
                attemptReference,
                originalPremium,
                attemptReference);
    }

    // =========================================================
    // SHARED RAZORPAY ORDER / RECONCILIATION FLOW
    // =========================================================

    private PaymentOrderResponse createAndRecordOrder(
            String attemptReference,
            BigDecimal totalPremium,
            String receipt) throws Exception {

        try {
            PaymentOrderResponse response =
                    createRazorpayOrder(
                            totalPremium,
                            receipt);

            try {
                paymentAttemptService.markOrderCreated(
                        attemptReference,
                        response.getOrderId());

            } catch (Exception persistenceException) {

                try {
                    paymentAttemptService.markReconciliationRequired(
                            attemptReference,
                            "Razorpay order was created, but its ID "
                            + "could not be saved.");
                } catch (Exception ignored) {
                    // Original attempt remains for reconciliation.
                }

                throw new IllegalStateException(
                        "The payment order could not be fully recorded. "
                        + "Do not start another payment. Contact support "
                        + "for payment reconciliation.",
                        persistenceException);
            }

            return response;

        } catch (Exception orderException) {

            try {
                paymentAttemptService.markReconciliationRequired(
                        attemptReference,
                        "Order creation outcome is uncertain; "
                        + "reconciliation is required.");
            } catch (Exception ignored) {
                // Keep original exception.
            }

            throw orderException;
        }
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
                razorpayKeyId, razorpayKeySecret);

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
    // SECURE VERIFICATION
    // =========================================================

    public boolean verifyPayment(
            PaymentVerificationRequest request,
            BigDecimal expectedAmount) throws Exception {

        if (expectedAmount == null
                || expectedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        BigDecimal normalizedExpectedAmount = expectedAmount
                .setScale(2, RoundingMode.HALF_UP);

        long expectedAmountInPaise = normalizedExpectedAmount
                .multiply(BigDecimal.valueOf(100))
                .longValueExact();

        return verifyPaymentInternally(
                request, expectedAmountInPaise);
    }

    // =========================================================
    // LEGACY VERIFICATION - PRESERVED
    // =========================================================

    public boolean verifyPayment(
            PaymentVerificationRequest request) throws Exception {

        return verifyPaymentInternally(request, null);
    }

    // =========================================================
    // VERIFY RAZORPAY ORDER AND PAYMENT
    // =========================================================

    private boolean verifyPaymentInternally(
            PaymentVerificationRequest request,
            Long expectedAmountInPaise) throws Exception {

        if (!hasVerificationFields(request)) {
            return false;
        }

        String orderId = request.getRazorpayOrderId().trim();
        String paymentId = request.getRazorpayPaymentId().trim();
        String signature = request.getRazorpaySignature().trim();

        String signatureData = orderId + "|" + paymentId;

        String generatedSignature = generateHmacSha256(
                signatureData, razorpayKeySecret);

        boolean signatureValid = MessageDigest.isEqual(
                generatedSignature.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8));

        if (!signatureValid) {
            return false;
        }

        RazorpayClient razorpayClient = new RazorpayClient(
                razorpayKeyId, razorpayKeySecret);

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

        Long orderAmountInPaise = readAmountInPaise(
                order.get("amount"));

        if (orderAmountInPaise == null
                || orderAmountInPaise <= 0) {
            return false;
        }

        if (expectedAmountInPaise != null
                && !expectedAmountInPaise.equals(orderAmountInPaise)) {
            return false;
        }

        var payment = razorpayClient.payments.fetch(paymentId);

        if (payment == null) {
            return false;
        }

        String paymentOrderId = payment.get("order_id");

        if (paymentOrderId == null
                || !orderId.equals(paymentOrderId)) {
            return false;
        }

        String paymentStatus = payment.get("status");

        if (paymentStatus == null
                || !"captured".equalsIgnoreCase(paymentStatus)) {
            return false;
        }

        Long paymentAmountInPaise = readAmountInPaise(
                payment.get("amount"));

        if (paymentAmountInPaise == null
                || !orderAmountInPaise.equals(paymentAmountInPaise)) {
            return false;
        }

        String paymentCurrency = payment.get("currency");

        if (paymentCurrency == null
                || !currency.equalsIgnoreCase(paymentCurrency)
                || !orderCurrency.equalsIgnoreCase(paymentCurrency)) {
            return false;
        }

        return true;
    }

    // =========================================================
    // PARSE RAZORPAY AMOUNT
    // =========================================================

    private Long readAmountInPaise(Object amountObject) {

        if (amountObject == null) {
            return null;
        }

        try {
            return new BigDecimal(String.valueOf(amountObject))
                    .longValueExact();

        } catch (NumberFormatException
                | ArithmeticException exception) {
            return null;
        }
    }

    // =========================================================
    // COMMON REQUEST VALIDATION
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
            result.append(String.format("%02x", b & 0xff));
        }

        return result.toString();
    }
}

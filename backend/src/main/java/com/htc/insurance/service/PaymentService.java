
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
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;

import com.htc.insurance.repository.InsurancePlanRepository;
import com.htc.insurance.repository.PolicyPurchaseRepository;

import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;

@Service
public class PaymentService {

    // =========================================================
    // PAYMENT CONFIGURATION
    // =========================================================

    private static final BigDecimal MAX_COVERAGE =
            new BigDecimal("10000000");

    private static final int MIN_DURATION_YEARS = 1;
    private static final int MAX_DURATION_YEARS = 5;

    private static final BigDecimal ZERO =
            BigDecimal.ZERO.setScale(
                    2,
                    RoundingMode.HALF_UP);

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final InsurancePlanRepository insurancePlanRepository;

    private final PaymentAttemptService paymentAttemptService;

    private final PolicyDao policyDao;

    private final PolicyPurchaseDao policyPurchaseDao;

    private final PolicyPurchaseRepository policyPurchaseRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

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
    // CREATE NORMAL PURCHASE ORDER
    // =========================================================

    /**
     * Creates a Razorpay order using a premium calculated
     * entirely by the backend.
     *
     * Never trust a premium supplied by the frontend.
     */
    public PaymentOrderResponse createOrder(
            PaymentOrderRequest request,
            String authenticatedUsername) throws Exception {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Payment request is required.");
        }

        requireUsername(authenticatedUsername);

        if (request.getPlanId() == null
                || request.getPlanId() <= 0) {

            throw new IllegalArgumentException(
                    "A valid insurance plan is required.");
        }

        // =====================================================
        // VALIDATE DURATION
        // =====================================================

        if (request.getDurationYears() == null
                || request.getDurationYears() < MIN_DURATION_YEARS
                || request.getDurationYears() > MAX_DURATION_YEARS) {

            throw new IllegalArgumentException(
                    "Policy duration must be between "
                    + "1 and 5 years.");
        }

        // =====================================================
        // VALIDATE CURRENCY
        // =====================================================

        if (request.getCurrency() != null
                && !request.getCurrency().isBlank()
                && !currency.equalsIgnoreCase(
                        request.getCurrency().trim())) {

            throw new IllegalArgumentException(
                    "Unsupported payment currency. "
                    + "Only " + currency + " is supported.");
        }

        // =====================================================
        // LOAD INSURANCE PLAN
        // =====================================================

        InsurancePlan plan = insurancePlanRepository
                .findById(request.getPlanId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "The selected insurance plan "
                                + "was not found."));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {

            throw new IllegalArgumentException(
                    "The selected insurance plan "
                    + "is not available.");
        }

        BigDecimal basePremium =
                plan.getBasePremium();

        BigDecimal baseCoverage =
                plan.getBaseCoverage();

        if (basePremium == null
                || basePremium.compareTo(BigDecimal.ZERO) <= 0
                || baseCoverage == null
                || baseCoverage.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalStateException(
                    "The selected insurance plan "
                    + "has invalid pricing.");
        }

        // =====================================================
        // VALIDATE SELECTED PLAN COVERAGE
        // =====================================================

        // Each plan has its own minimum coverage. Do not use
        // the old fixed ₹10 lakh minimum for all plan types.
        BigDecimal requestedCoverage = request.getCoverageAmount();

        if (requestedCoverage == null
                || requestedCoverage.compareTo(baseCoverage) < 0
                || requestedCoverage.compareTo(MAX_COVERAGE) > 0) {

            throw new IllegalArgumentException(
                    "Coverage for the selected plan must be between ₹"
                    + formatIndianAmount(baseCoverage)
                    + " and ₹"
                    + formatIndianAmount(MAX_COVERAGE) + ".");
        }

        // =====================================================
        // CALCULATE PREMIUM
        // =====================================================

        BigDecimal coverageAmount =
                request.getCoverageAmount()
                        .setScale(
                                2,
                                RoundingMode.HALF_UP);

        BigDecimal coverageFactor =
                coverageAmount.divide(
                        baseCoverage,
                        10,
                        RoundingMode.HALF_UP);

        BigDecimal calculatedBasePremium =
                basePremium
                        .multiply(coverageFactor)
                        .multiply(
                                BigDecimal.valueOf(
                                        request.getDurationYears()))
                        .setScale(
                                2,
                                RoundingMode.HALF_UP);

        // =====================================================
        // STRAIGHT YEARLY PRICING (NO MULTI-YEAR DISCOUNT)
        // =====================================================

        // Two years = two times the selected plan's yearly price.
        // Match the BuyPolicy.jsx premium estimate.
        BigDecimal taxableAmount = calculatedBasePremium;

        // Preserve existing GST calculation behavior.
        BigDecimal totalPremium =
                taxableAmount
                        .add(ZERO)
                        .setScale(
                                2,
                                RoundingMode.HALF_UP);

        if (totalPremium.compareTo(
                BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Calculated premium must be greater than zero.");
        }

        // =====================================================
        // CREATE PAYMENT ATTEMPT
        // =====================================================

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

        // =====================================================
        // CREATE RAZORPAY ORDER
        // =====================================================

        return createAndRecordOrder(
                attemptReference,
                totalPremium,
                receipt);
    }

    // =========================================================
    // CREATE RENEWAL ORDER
    // =========================================================

    /**
     * Creates a renewal order using the original
     * paid purchase amount.
     *
     * Important:
     * PolicyRenewalService must enforce successful-claim
     * eligibility before calling this method.
     *
     * Do not expose this method directly to a controller.
     */
    public PaymentOrderResponse createRenewalOrder(
            Long originalPolicyNumber,
            Long originalPlanId,
            String authenticatedUsername) throws Exception {

        requireUsername(authenticatedUsername);

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

        // =====================================================
        // LOAD ORIGINAL POLICY
        // =====================================================

        Policy policy =
                policyDao.getPolicyById(
                        originalPolicyNumber);

        if (policy == null
                || policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null) {

            throw new IllegalArgumentException(
                    "Original policy was not found.");
        }

        // =====================================================
        // VERIFY OWNERSHIP
        // =====================================================

        String owner =
                policy.getPolicyHolder()
                        .getUser()
                        .getUsername();

        if (!authenticatedUsername.equals(owner)) {

            throw new AccessDeniedException(
                    "This policy belongs to another customer.");
        }

        // =====================================================
        // VERIFY POLICY LIFECYCLE
        // =====================================================

        PolicyLifecycleStatus lifecycle =
                policy.getLifecycleStatus();

        if (lifecycle == PolicyLifecycleStatus.REFUND_PENDING
                || lifecycle == PolicyLifecycleStatus.REFUNDED) {

            throw new IllegalStateException(
                    "Policies with pending or completed refunds "
                    + "cannot be renewed.");
        }

        if (lifecycle == PolicyLifecycleStatus.ADMIN_DISABLED) {

            throw new IllegalStateException(
                    "Administratively disabled policies "
                    + "cannot be renewed.");
        }

        // CLAIM_LOCKED is allowed because successful
        // claim eligibility is checked by renewal service.
        //
        // EXPIRED is also allowed when all other
        // renewal conditions are satisfied.

        // =====================================================
        // LOAD ORIGINAL PURCHASE
        // =====================================================

        PolicyPurchase originalPurchase =
                policyPurchaseDao
                        .getPurchaseByPolicyNumber(
                                originalPolicyNumber);

        if (originalPurchase == null) {

            throw new IllegalStateException(
                    "Original policy purchase was not found.");
        }

        // =====================================================
        // VERIFY STORED ORIGINAL PLAN ID
        // =====================================================

        // The renewal service resolves the plan ID from the
        // original purchase or verified historical payment record.
        // Recheck it here when a stored plan ID is available.
        // Never infer a plan from current premium or coverage.
        if (originalPurchase.getPlanId() != null
                && !originalPurchase.getPlanId().equals(originalPlanId)) {

            throw new IllegalStateException(
                    "Renewal plan does not match the original purchase.");
        }

        // =====================================================
        // VERIFY ORIGINAL PAYMENT
        // =====================================================

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

        // =====================================================
        // PREVENT DUPLICATE RENEWAL
        // =====================================================

        if (policyPurchaseRepository
                .existsByRenewedFromPurchasePurchaseId(
                        originalPurchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "This policy has already been renewed.");
        }

        // =====================================================
        // VALIDATE ORIGINAL DURATION
        // =====================================================

        if (policy.getDurationYears() == null
                || policy.getDurationYears() < MIN_DURATION_YEARS
                || policy.getDurationYears() > MAX_DURATION_YEARS) {

            throw new IllegalStateException(
                    "Original policy duration is invalid.");
        }

        // =====================================================
        // VALIDATE ORIGINAL PREMIUM
        // =====================================================

        BigDecimal originalPremium =
                originalPurchase.getTotalPremium();

        if (originalPremium == null
                || originalPremium.compareTo(
                        BigDecimal.ZERO) <= 0) {

            throw new IllegalStateException(
                    "Original paid premium is invalid.");
        }

        // =====================================================
        // VALIDATE ORIGINAL COVERAGE
        // =====================================================

        BigDecimal coverage =
                originalPurchase.getCoverageAmount();

        if (coverage == null
                || coverage.compareTo(
                        BigDecimal.ZERO) <= 0) {

            throw new IllegalStateException(
                    "Original policy coverage is invalid.");
        }

        // =====================================================
        // CREATE RENEWAL PAYMENT ATTEMPT
        // =====================================================

        String attemptReference =
                paymentAttemptService.createRenewalAttempt(
                        authenticatedUsername,
                        originalPolicyNumber,
                        originalPlanId,
                        coverage,
                        policy.getDurationYears(),
                        originalPremium,
                        currency);

        // =====================================================
        // CREATE RENEWAL RAZORPAY ORDER
        // =====================================================

        return createAndRecordOrder(
                attemptReference,
                originalPremium,
                attemptReference);
    }

    // =========================================================
    // SHARED RAZORPAY ORDER CREATION
    // =========================================================

    /**
     * Creates an external Razorpay order and records
     * the returned order ID.
     *
     * Does not automatically retry order creation.
     */
    private PaymentOrderResponse createAndRecordOrder(
            String attemptReference,
            BigDecimal totalPremium,
            String receipt) throws Exception {

        PaymentOrderResponse response;

        // =====================================================
        // CREATE REMOTE ORDER
        // =====================================================

        try {

            response = createRazorpayOrder(
                    totalPremium,
                    receipt);

        } catch (Exception exception) {

            markReconciliationSafely(
                    attemptReference,
                    "Razorpay order creation outcome "
                    + "could not be confirmed.");

            throw exception;
        }

        // =====================================================
        // RECORD ORDER ID
        // =====================================================

        try {

            paymentAttemptService.markOrderCreated(
                    attemptReference,
                    response.getOrderId());

        } catch (Exception persistenceException) {

            markReconciliationSafely(
                    attemptReference,
                    "Razorpay order was created, but "
                    + "its order ID could not be saved.");

            throw new IllegalStateException(
                    "The payment order could not be fully recorded. "
                    + "Do not start another payment. "
                    + "Contact support for reconciliation.",
                    persistenceException);
        }

        return response;
    }

    // =========================================================
    // MARK RECONCILIATION SAFELY
    // =========================================================

    private void markReconciliationSafely(
            String attemptReference,
            String reason) {

        try {

            paymentAttemptService.markReconciliationRequired(
                    attemptReference,
                    reason);

        } catch (Exception exception) {

            // Preserve the original payment exception.
        }
    }

    // =========================================================
    // CREATE RAZORPAY ORDER
    // =========================================================

    private PaymentOrderResponse createRazorpayOrder(
            BigDecimal amount,
            String requestedReceipt) throws Exception {

        if (amount == null
                || amount.compareTo(
                        BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Payment amount must be positive.");
        }

        BigDecimal normalizedAmount =
                amount.setScale(
                        2,
                        RoundingMode.HALF_UP);

        long amountInPaise =
                normalizedAmount
                        .movePointRight(2)
                        .longValueExact();

        // =====================================================
        // PREPARE RECEIPT
        // =====================================================

        String receipt = requestedReceipt;

        if (receipt == null || receipt.isBlank()) {

            receipt = "INSX_"
                    + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 12)
                        .toUpperCase();

        } else {

            receipt = receipt.trim();

            if (receipt.length() > 40) {

                throw new IllegalArgumentException(
                        "Payment receipt must not exceed "
                        + "40 characters.");
            }
        }

        // =====================================================
        // CREATE RAZORPAY CLIENT
        // =====================================================

        RazorpayClient razorpayClient =
                new RazorpayClient(
                        razorpayKeyId,
                        razorpayKeySecret);

        JSONObject orderRequest =
                new JSONObject();

        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receipt);

        Order order =
                razorpayClient.orders.create(
                        orderRequest);

        if (order == null) {

            throw new IllegalStateException(
                    "Unable to create Razorpay order.");
        }

        String orderId =
                order.get("id");

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
    // VERIFY PAYMENT WITH EXPECTED AMOUNT
    // =========================================================

    /**
     * Preferred verification method.
     *
     * Validates the exact expected premium in paise.
     */
    public boolean verifyPayment(
            PaymentVerificationRequest request,
            BigDecimal expectedAmount) throws Exception {

        if (expectedAmount == null
                || expectedAmount.compareTo(
                        BigDecimal.ZERO) <= 0) {

            return false;
        }

        final long expectedAmountInPaise;

        try {

            expectedAmountInPaise =
                    expectedAmount
                            .movePointRight(2)
                            .longValueExact();

        } catch (ArithmeticException exception) {

            return false;
        }

        return verifyPaymentInternally(
                request,
                expectedAmountInPaise);
    }

    // =========================================================
    // LEGACY VERIFICATION
    // =========================================================

    /**
     * Preserved for existing callers.
     *
     * Prefer verifyPayment(request, expectedAmount)
     * when the trusted purchase amount is available.
     */
    public boolean verifyPayment(
            PaymentVerificationRequest request) throws Exception {

        return verifyPaymentInternally(
                request,
                null);
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

        String orderId =
                request.getRazorpayOrderId().trim();

        String paymentId =
                request.getRazorpayPaymentId().trim();

        String signature =
                request.getRazorpaySignature().trim();

        // =====================================================
        // VERIFY HMAC SIGNATURE
        // =====================================================

        String signatureData =
                orderId + "|" + paymentId;

        String generatedSignature =
                generateHmacSha256(
                        signatureData,
                        razorpayKeySecret);

        boolean signatureValid =
                MessageDigest.isEqual(
                        generatedSignature.getBytes(
                                StandardCharsets.UTF_8),
                        signature.toLowerCase(java.util.Locale.ROOT)
                                .getBytes(
                                        StandardCharsets.UTF_8));

        if (!signatureValid) {
            return false;
        }

        // =====================================================
        // FETCH RAZORPAY ORDER
        // =====================================================

        RazorpayClient razorpayClient =
                new RazorpayClient(
                        razorpayKeyId,
                        razorpayKeySecret);

        Order order =
                razorpayClient.orders.fetch(orderId);

        if (order == null) {
            return false;
        }

        String fetchedOrderId =
                order.get("id");

        if (!orderId.equals(fetchedOrderId)) {
            return false;
        }

        String orderCurrency =
                order.get("currency");

        if (orderCurrency == null
                || !currency.equalsIgnoreCase(
                        orderCurrency)) {

            return false;
        }

        // =====================================================
        // VALIDATE ORDER STATUS
        // =====================================================

        String orderStatus =
                order.get("status");

        if (!"paid".equalsIgnoreCase(orderStatus)) {
            return false;
        }

        // =====================================================
        // VALIDATE ORDER AMOUNT
        // =====================================================

        Long orderAmountInPaise =
                readAmountInPaise(
                        order.get("amount"));

        if (orderAmountInPaise == null
                || orderAmountInPaise <= 0) {

            return false;
        }

        if (expectedAmountInPaise != null
                && !expectedAmountInPaise.equals(
                        orderAmountInPaise)) {

            return false;
        }

        // =====================================================
        // FETCH RAZORPAY PAYMENT
        // =====================================================

        Payment payment =
                razorpayClient.payments.fetch(
                        paymentId);

        if (payment == null) {
            return false;
        }

        // =====================================================
        // VERIFY PAYMENT ORDER
        // =====================================================

        String paymentOrderId =
                payment.get("order_id");

        if (!orderId.equals(paymentOrderId)) {
            return false;
        }

        // =====================================================
        // VERIFY PAYMENT CAPTURE
        // =====================================================

        String paymentStatus =
                payment.get("status");

        if (!"captured".equalsIgnoreCase(
                paymentStatus)) {

            return false;
        }

        // =====================================================
        // VERIFY PAYMENT AMOUNT
        // =====================================================

        Long paymentAmountInPaise =
                readAmountInPaise(
                        payment.get("amount"));

        if (paymentAmountInPaise == null
                || !orderAmountInPaise.equals(
                        paymentAmountInPaise)) {

            return false;
        }

        // =====================================================
        // VERIFY PAYMENT CURRENCY
        // =====================================================

        String paymentCurrency =
                payment.get("currency");

        if (paymentCurrency == null
                || !currency.equalsIgnoreCase(
                        paymentCurrency)
                || !orderCurrency.equalsIgnoreCase(
                        paymentCurrency)) {

            return false;
        }

        return true;
    }

    // =========================================================
    // PARSE RAZORPAY AMOUNT
    // =========================================================

    private Long readAmountInPaise(
            Object amountObject) {

        if (amountObject == null) {
            return null;
        }

        try {

            return new BigDecimal(
                    String.valueOf(amountObject))
                            .longValueExact();

        } catch (NumberFormatException
                | ArithmeticException exception) {

            return null;
        }
    }

    // =========================================================
    // VALIDATE VERIFICATION REQUEST
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

    // Format coverage limits in Indian currency grouping.
    private String formatIndianAmount(BigDecimal amount) {
        java.text.NumberFormat formatter = java.text.NumberFormat
                .getNumberInstance(new java.util.Locale("en", "IN"));
        formatter.setMaximumFractionDigits(0);
        return formatter.format(amount);
    }

    // =========================================================
    // VALIDATE AUTHENTICATED USER
    // =========================================================

    private void requireUsername(
            String username) {

        if (username == null || username.isBlank()) {

            throw new IllegalArgumentException(
                    "An authenticated user is required.");
        }
    }

    // =========================================================
    // GENERATE HMAC SHA256
    // =========================================================

    private String generateHmacSha256(
            String data,
            String secret) throws Exception {

        Mac mac =
                Mac.getInstance("HmacSHA256");

        SecretKeySpec secretKey =
                new SecretKeySpec(
                        secret.getBytes(
                                StandardCharsets.UTF_8),
                        "HmacSHA256");

        mac.init(secretKey);

        byte[] hash =
                mac.doFinal(
                        data.getBytes(
                                StandardCharsets.UTF_8));

        StringBuilder result =
                new StringBuilder();

        for (byte b : hash) {

            result.append(
                    String.format(
                            "%02x",
                            b & 0xff));
        }

        return result.toString();
    }
}

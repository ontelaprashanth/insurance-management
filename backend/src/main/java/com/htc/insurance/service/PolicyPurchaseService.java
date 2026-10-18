package com.htc.insurance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.dto.PurchasePolicyDto;
import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.User;
import com.htc.insurance.repository.InsurancePlanRepository;

@Service
public class PolicyPurchaseService {

    private static final BigDecimal MINIMUM_COVERAGE =
            new BigDecimal("1000000.00");

    private static final BigDecimal MAXIMUM_COVERAGE =
            new BigDecimal("10000000.00");

    private static final BigDecimal GST_RATE =
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private static final BigDecimal MULTI_YEAR_DISCOUNT_RATE =
            new BigDecimal("5.00");

    private final PolicyDao policyDao;
    private final PolicyHolderDao policyHolderDao;
    private final UserDao userDao;
    private final PolicyPurchaseDao policyPurchaseDao;
    private final PaymentService paymentService;
    private final InsurancePlanRepository insurancePlanRepository;

    public PolicyPurchaseService(
            PolicyDao policyDao,
            PolicyHolderDao policyHolderDao,
            UserDao userDao,
            PolicyPurchaseDao policyPurchaseDao,
            PaymentService paymentService,
            InsurancePlanRepository insurancePlanRepository) {

        this.policyDao = policyDao;
        this.policyHolderDao = policyHolderDao;
        this.userDao = userDao;
        this.policyPurchaseDao = policyPurchaseDao;
        this.paymentService = paymentService;
        this.insurancePlanRepository = insurancePlanRepository;
    }

    // =====================================================
    // PURCHASE POLICY
    // =====================================================

    @Transactional
    public PurchasePolicyDto purchasePolicy(
            PurchasePolicyDto purchaseDto,
            Authentication authentication) {

        validateAuthentication(authentication);

        if (purchaseDto == null) {
            throw new IllegalArgumentException(
                    "Purchase details are required.");
        }

        // -------------------------------------------------
        // RESOLVE PERMANENT CATALOGUE PLAN
        // -------------------------------------------------

        Long planId = purchaseDto.getPlanId();

        if (planId == null || planId <= 0) {
            throw new IllegalArgumentException(
                    "A valid insurance plan ID is required.");
        }

        InsurancePlan selectedPlan =
                insurancePlanRepository.findById(planId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "The selected insurance plan was not found."));

        if (!Boolean.TRUE.equals(selectedPlan.getIsActive())) {
            throw new IllegalArgumentException(
                    "This insurance plan is currently unavailable.");
        }

        String coveredType = selectedPlan.getCoveredType();

        if (coveredType == null || coveredType.isBlank()) {
            throw new IllegalStateException(
                    "The selected insurance plan has no coverage type configured.");
        }

        // -------------------------------------------------
        // VALIDATE DURATION
        // -------------------------------------------------

        Integer durationYears = purchaseDto.getDurationYears();

        if (durationYears == null
                || durationYears < 1
                || durationYears > 5) {

            throw new IllegalArgumentException(
                    "Policy duration must be between 1 and 5 years.");
        }

        // -------------------------------------------------
        // VALIDATE COVERAGE
        // -------------------------------------------------

        BigDecimal coverageAmount = purchaseDto.getCoverageAmount();

        if (coverageAmount == null
                || coverageAmount.compareTo(MINIMUM_COVERAGE) < 0
                || coverageAmount.compareTo(MAXIMUM_COVERAGE) > 0) {

            throw new IllegalArgumentException(
                    "Coverage amount must be between ₹10,00,000 and ₹1,00,00,000.");
        }

        // -------------------------------------------------
        // VALIDATE NOMINEE
        // -------------------------------------------------

        String nomineeName = requireText(
                purchaseDto.getNomineeName(),
                "Nominee name is required.");

        String nomineeRelation = requireText(
                purchaseDto.getNomineeRelation(),
                "Nominee relationship is required.");

        String nomineeContact = requireText(
                purchaseDto.getNomineeContact(),
                "Nominee contact is required.");

        if (!nomineeContact.matches("[6-9][0-9]{9}")) {
            throw new IllegalArgumentException(
                    "Nominee contact must be a valid 10-digit Indian mobile number.");
        }

        // -------------------------------------------------
        // VALIDATE PAYMENT DETAILS
        // -------------------------------------------------

        String paymentMethod = requireText(
                purchaseDto.getPaymentMethod(),
                "Payment method is required.");

        if (!"RAZORPAY".equalsIgnoreCase(paymentMethod)) {
            throw new IllegalArgumentException(
                    "Unsupported payment method.");
        }

        String razorpayOrderId = requireText(
                purchaseDto.getRazorpayOrderId(),
                "Razorpay order ID is required.");

        String razorpayPaymentId = requireText(
                purchaseDto.getRazorpayPaymentId(),
                "Razorpay payment ID is required.");

        String razorpaySignature = requireText(
                purchaseDto.getRazorpaySignature(),
                "Razorpay payment signature is required.");

        // -------------------------------------------------
        // FIND AUTHENTICATED USER
        // -------------------------------------------------

        String username = authentication.getName();

        User user = userDao.getUserByUsername(username);

        if (user == null) {
            throw new IllegalArgumentException(
                    "Logged-in user was not found.");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException(
                    "Your account is inactive.");
        }

        // -------------------------------------------------
        // FIND POLICY HOLDER
        // -------------------------------------------------

        PolicyHolder policyHolder =
                policyHolderDao.getPolicyHolderByUsername(username);

        if (policyHolder == null) {
            throw new IllegalArgumentException(
                    "Policy holder profile not found. Please contact support.");
        }

        // -------------------------------------------------
        // PREVENT DUPLICATE PAYMENT / ORDER
        // -------------------------------------------------

        PolicyPurchase existingPayment =
                policyPurchaseDao.getPurchaseByTransactionId(
                        razorpayPaymentId);

        if (existingPayment != null) {
            throw new IllegalArgumentException(
                    "This Razorpay payment has already been processed.");
        }

        PolicyPurchase existingOrder =
                policyPurchaseDao.getPurchaseByRazorpayOrderId(
                        razorpayOrderId);

        if (existingOrder != null) {
            throw new IllegalArgumentException(
                    "This Razorpay order has already been processed.");
        }

        // -------------------------------------------------
        // CALCULATE PREMIUM FROM DATABASE PLAN
        // -------------------------------------------------

        BigDecimal basePremium = calculateBasePremium(
                selectedPlan,
                durationYears,
                coverageAmount);

        BigDecimal discountAmount = calculateDiscount(
                basePremium,
                durationYears);

        BigDecimal taxableAmount = basePremium
                .subtract(discountAmount)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal gstAmount = taxableAmount
                .multiply(GST_RATE)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        BigDecimal totalPremium = taxableAmount
                .add(gstAmount)
                .setScale(2, RoundingMode.HALF_UP);

        if (totalPremium.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "The calculated premium must be greater than zero.");
        }

        // -------------------------------------------------
        // VERIFY RAZORPAY SIGNATURE AND EXPECTED AMOUNT
        // -------------------------------------------------

        PaymentVerificationRequest verificationRequest =
                new PaymentVerificationRequest();

        verificationRequest.setRazorpayOrderId(razorpayOrderId);
        verificationRequest.setRazorpayPaymentId(razorpayPaymentId);
        verificationRequest.setRazorpaySignature(razorpaySignature);

        final boolean paymentVerified;

        try {
            paymentVerified = paymentService.verifyPayment(
                    verificationRequest,
                    totalPremium);
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Unable to verify Razorpay payment. No policy was created.",
                    exception);
        }

        if (!paymentVerified) {
            throw new IllegalArgumentException(
                    "Razorpay payment verification failed. No policy was created.");
        }

        // -------------------------------------------------
        // CREATE CUSTOMER-OWNED POLICY AFTER VERIFICATION
        // -------------------------------------------------

        LocalDate startDate = LocalDate.now();

        LocalDate expiryDate = startDate
                .plusYears(durationYears)
                .minusDays(1);

        Policy policy = new Policy();

        // Always use the canonical coverage type from the database.
        policy.setCoveredTypes(coveredType.trim());
        policy.setIsActive(true);
        policy.setStartDate(startDate);
        policy.setDurationYears(durationYears);
        policy.setExpiryDate(expiryDate);
        policy.setPolicyHolder(policyHolder);

        Policy savedPolicy = policyDao.savePolicy(policy);

        // -------------------------------------------------
        // CREATE PURCHASE RECORD
        // -------------------------------------------------

        PolicyPurchase purchase = new PolicyPurchase();

        purchase.setPolicy(savedPolicy);

        purchase.setCoverageAmount(
                coverageAmount.setScale(2, RoundingMode.HALF_UP));

        purchase.setBasePremium(basePremium);
        purchase.setDiscountAmount(discountAmount);
        purchase.setTaxableAmount(taxableAmount);
        purchase.setGstRate(GST_RATE);
        purchase.setGstAmount(gstAmount);
        purchase.setTotalPremium(totalPremium);

        purchase.setNomineeName(nomineeName);
        purchase.setNomineeRelation(nomineeRelation);
        purchase.setNomineeContact(nomineeContact);

        purchase.setPaymentMethod("RAZORPAY");
        purchase.setPaymentStatus("PAID");
        purchase.setRazorpayOrderId(razorpayOrderId);
        purchase.setRazorpayPaymentId(razorpayPaymentId);
        purchase.setTransactionId(razorpayPaymentId);

        LocalDateTime now = LocalDateTime.now();

        purchase.setPaymentDateTime(now);
        purchase.setPaymentDate(now.toLocalDate());
        purchase.setPurchaseDate(startDate);
        purchase.setCreatedAt(now);

        purchase.setRefundStatus("NOT_REFUNDED");
        purchase.setRefundAmount(
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        PolicyPurchase savedPurchase =
                policyPurchaseDao.savePurchase(purchase);

        return buildPurchaseResponse(savedPurchase);
    }

    // =====================================================
    // ADMIN - GET ALL PURCHASES
    // =====================================================

    @Transactional(readOnly = true)
    public List<PurchasePolicyDto> getAllPurchases() {

        return policyPurchaseDao.getAllPurchases()
                .stream()
                .map(this::buildPurchaseResponse)
                .toList();
    }

    // =====================================================
    // USER - GET MY PURCHASES
    // =====================================================

    @Transactional(readOnly = true)
    public List<PurchasePolicyDto> getMyPurchases(
            Authentication authentication) {

        validateAuthentication(authentication);

        return policyPurchaseDao
                .getPurchasesByUsername(authentication.getName())
                .stream()
                .map(this::buildPurchaseResponse)
                .toList();
    }

    // =====================================================
    // BUILD PURCHASE RESPONSE
    // =====================================================

    private PurchasePolicyDto buildPurchaseResponse(
            PolicyPurchase purchase) {

        PurchasePolicyDto response = new PurchasePolicyDto();

        response.setPurchaseId(purchase.getPurchaseId());

        if (purchase.getPolicy() != null) {
            Policy policy = purchase.getPolicy();

            response.setPolicyNumber(policy.getPolicyNumber());
            response.setCoveredTypes(policy.getCoveredTypes());
            response.setDurationYears(policy.getDurationYears());

            if (policy.getPolicyHolder() != null
                    && policy.getPolicyHolder().getUser() != null) {

                response.setUsername(
                        policy.getPolicyHolder()
                                .getUser()
                                .getUsername());
            }
        }

        response.setCoverageAmount(purchase.getCoverageAmount());

        response.setBasePremium(purchase.getBasePremium());
        response.setDiscountAmount(purchase.getDiscountAmount());
        response.setTaxableAmount(purchase.getTaxableAmount());
        response.setGstRate(purchase.getGstRate());
        response.setGstAmount(purchase.getGstAmount());
        response.setTotalPremium(purchase.getTotalPremium());

        response.setNomineeName(purchase.getNomineeName());
        response.setNomineeRelation(purchase.getNomineeRelation());
        response.setNomineeContact(purchase.getNomineeContact());

        response.setPaymentMethod(purchase.getPaymentMethod());
        response.setPaymentStatus(purchase.getPaymentStatus());
        response.setTransactionId(purchase.getTransactionId());
        response.setRazorpayOrderId(purchase.getRazorpayOrderId());
        response.setRazorpayPaymentId(purchase.getRazorpayPaymentId());

        response.setPaymentDate(purchase.getPaymentDate());
        response.setPaymentDateTime(purchase.getPaymentDateTime());

        response.setPurchaseDate(purchase.getPurchaseDate());
        response.setCreatedAt(purchase.getCreatedAt());

        response.setRefundStatus(purchase.getRefundStatus());
        response.setRefundId(purchase.getRefundId());
        response.setRefundAmount(purchase.getRefundAmount());
        response.setRefundReason(purchase.getRefundReason());
        response.setRefundDateTime(purchase.getRefundDateTime());

        LocalDateTime paymentTime = purchase.getPaymentDateTime();

        if (paymentTime != null) {
            LocalDateTime deadline = paymentTime.plusHours(24);

            response.setRefundDeadline(deadline);

            boolean alreadyRefunded =
                    "REFUNDED".equalsIgnoreCase(
                            purchase.getRefundStatus());

            response.setRefundEligible(
                    !alreadyRefunded
                            && LocalDateTime.now().isBefore(deadline));
        } else {
            response.setRefundDeadline(null);
            response.setRefundEligible(false);
        }

        return response;
    }

    // =====================================================
    // SERVER-SIDE PREMIUM CALCULATION
    // =====================================================

    private BigDecimal calculateBasePremium(
            InsurancePlan plan,
            Integer durationYears,
            BigDecimal coverageAmount) {

        BigDecimal basePremium = plan.getBasePremium();
        BigDecimal baseCoverage = plan.getBaseCoverage();

        if (basePremium == null
                || basePremium.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "The selected plan has an invalid base premium.");
        }

        if (baseCoverage == null
                || baseCoverage.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "The selected plan has an invalid base coverage amount.");
        }

        /*
         * Keep this precision aligned with PaymentService.
         * Round the final premium to two decimal places only
         * after multiplying by the base premium and duration.
         */
        BigDecimal coverageMultiplier = coverageAmount.divide(
                baseCoverage,
                10,
                RoundingMode.HALF_UP);

        return basePremium
                .multiply(coverageMultiplier)
                .multiply(BigDecimal.valueOf(durationYears))
                .setScale(2, RoundingMode.HALF_UP);
    }

    // =====================================================
    // DISCOUNT CALCULATION
    // =====================================================

    private BigDecimal calculateDiscount(
            BigDecimal basePremium,
            Integer durationYears) {

        if (durationYears >= 2) {
            return basePremium
                    .multiply(MULTI_YEAR_DISCOUNT_RATE)
                    .divide(
                            new BigDecimal("100"),
                            2,
                            RoundingMode.HALF_UP);
        }

        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    // =====================================================
    // VALIDATION HELPERS
    // =====================================================

    private void validateAuthentication(
            Authentication authentication) {

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new IllegalArgumentException(
                    "User authentication is required.");
        }
    }

    private String requireText(String value, String message) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }

        return value.trim();
    }
}

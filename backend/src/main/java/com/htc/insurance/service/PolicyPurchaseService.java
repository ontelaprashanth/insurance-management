package com.htc.insurance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.dto.PurchasePolicyDto;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.User;

@Service
public class PolicyPurchaseService {

    @Autowired
    private PolicyDao policyDao;

    @Autowired
    private PolicyHolderDao policyHolderDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private PolicyPurchaseDao policyPurchaseDao;

    @Autowired
    private PaymentService paymentService;

    // =========================================================
    // PURCHASE POLICY
    // =========================================================

    @Transactional
    public PurchasePolicyDto purchasePolicy(
            PurchasePolicyDto purchaseDto,
            Authentication authentication) {

        // =====================================================
        // VALIDATE AUTHENTICATION
        // =====================================================

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication is required."
            );
        }

        // =====================================================
        // VALIDATE REQUEST
        // =====================================================

        if (purchaseDto == null) {

            throw new RuntimeException(
                    "Purchase details are required."
            );
        }

        // =====================================================
        // VALIDATE INSURANCE PLAN
        // =====================================================

        if (purchaseDto.getCoveredTypes() == null
                || purchaseDto.getCoveredTypes().isBlank()) {

            throw new RuntimeException(
                    "Insurance plan is required."
            );
        }

        // =====================================================
        // VALIDATE DURATION
        // =====================================================

        if (purchaseDto.getDurationYears() == null
                || purchaseDto.getDurationYears() <= 0) {

            throw new RuntimeException(
                    "Valid policy duration is required."
            );
        }

        if (purchaseDto.getDurationYears() > 5) {

            throw new RuntimeException(
                    "Maximum policy duration is 5 years."
            );
        }

        // =====================================================
        // VALIDATE COVERAGE
        // =====================================================

        if (purchaseDto.getCoverageAmount() == null
                || purchaseDto.getCoverageAmount()
                        .compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Valid coverage amount is required."
            );
        }

        BigDecimal minimumCoverage =
                BigDecimal.valueOf(1_000_000);

        BigDecimal maximumCoverage =
                BigDecimal.valueOf(10_000_000);

        if (purchaseDto.getCoverageAmount()
                .compareTo(minimumCoverage) < 0) {

            throw new RuntimeException(
                    "Minimum coverage amount is ₹10,00,000."
            );
        }

        if (purchaseDto.getCoverageAmount()
                .compareTo(maximumCoverage) > 0) {

            throw new RuntimeException(
                    "Maximum coverage amount is ₹1,00,00,000."
            );
        }

        // =====================================================
        // VALIDATE NOMINEE
        // =====================================================

        if (purchaseDto.getNomineeName() == null
                || purchaseDto.getNomineeName().isBlank()) {

            throw new RuntimeException(
                    "Nominee name is required."
            );
        }

        if (purchaseDto.getNomineeRelation() == null
                || purchaseDto.getNomineeRelation().isBlank()) {

            throw new RuntimeException(
                    "Nominee relationship is required."
            );
        }

        if (purchaseDto.getNomineeContact() == null
                || purchaseDto.getNomineeContact().isBlank()) {

            throw new RuntimeException(
                    "Nominee contact is required."
            );
        }

        // =====================================================
        // VALIDATE PAYMENT METHOD
        // =====================================================

        if (purchaseDto.getPaymentMethod() == null
                || purchaseDto.getPaymentMethod().isBlank()) {

            throw new RuntimeException(
                    "Payment method is required."
            );
        }

        // =====================================================
        // VALIDATE RAZORPAY ORDER
        // =====================================================

        if (purchaseDto.getRazorpayOrderId() == null
                || purchaseDto.getRazorpayOrderId().isBlank()) {

            throw new RuntimeException(
                    "Razorpay order ID is required."
            );
        }

        if (purchaseDto.getRazorpayPaymentId() == null
                || purchaseDto.getRazorpayPaymentId().isBlank()) {

            throw new RuntimeException(
                    "Razorpay payment ID is required."
            );
        }

        if (purchaseDto.getRazorpaySignature() == null
                || purchaseDto.getRazorpaySignature().isBlank()) {

            throw new RuntimeException(
                    "Razorpay payment signature is required."
            );
        }

        // =====================================================
        // FIND LOGGED-IN USER
        // =====================================================

        String username =
                authentication.getName();

        User user =
                userDao.getUserByUsername(
                        username
                );

        if (user == null) {

            throw new RuntimeException(
                    "Logged-in user not found."
            );
        }

        if (!Boolean.TRUE.equals(
                user.getIsActive()
        )) {

            throw new RuntimeException(
                    "Your account is inactive."
            );
        }

        // =====================================================
        // FIND POLICY HOLDER
        // =====================================================

        PolicyHolder policyHolder =
                policyHolderDao.getPolicyHolderByUsername(
                        username
                );

        if (policyHolder == null) {

            throw new RuntimeException(
                    "Policy holder profile not found. "
                    + "Please contact the administrator."
            );
        }

        // =====================================================
        // CALCULATE PREMIUM SERVER-SIDE
        // =====================================================

        BigDecimal basePremium =
                calculateBasePremium(
                        purchaseDto.getCoveredTypes(),
                        purchaseDto.getDurationYears(),
                        purchaseDto.getCoverageAmount()
                );

        // =====================================================
        // CALCULATE DISCOUNT
        // =====================================================

        BigDecimal discountAmount =
                calculateDiscount(
                        basePremium,
                        purchaseDto.getDurationYears()
                );

        // =====================================================
        // TAXABLE AMOUNT
        // =====================================================

        BigDecimal taxableAmount =
                basePremium
                        .subtract(discountAmount)
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );

        // =====================================================
        // GST
        // =====================================================

        BigDecimal gstRate =
                BigDecimal.ZERO.setScale(
                        2,
                        RoundingMode.HALF_UP
                );

        BigDecimal gstAmount =
                taxableAmount
                        .multiply(gstRate)
                        .divide(
                                BigDecimal.valueOf(100),
                                2,
                                RoundingMode.HALF_UP
                        );

        // =====================================================
        // FINAL PREMIUM
        // =====================================================

        BigDecimal totalPremium =
                taxableAmount
                        .add(gstAmount)
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );

        // =====================================================
        // PREVENT DUPLICATE PAYMENT
        // =====================================================

        PolicyPurchase existingPayment =
                policyPurchaseDao.getPurchaseByTransactionId(
                        purchaseDto.getRazorpayPaymentId()
                );

        if (existingPayment != null) {

            throw new RuntimeException(
                    "This Razorpay payment has already been processed."
            );
        }

        // =====================================================
        // PREVENT DUPLICATE RAZORPAY ORDER
        // =====================================================

        PolicyPurchase existingOrder =
                policyPurchaseDao.getPurchaseByRazorpayOrderId(
                        purchaseDto.getRazorpayOrderId()
                );

        if (existingOrder != null) {

            throw new RuntimeException(
                    "This Razorpay order has already been processed."
            );
        }

        // =====================================================
        // BUILD PAYMENT VERIFICATION REQUEST
        // =====================================================

        PaymentVerificationRequest verificationRequest =
                new PaymentVerificationRequest();

        verificationRequest.setRazorpayOrderId(
                purchaseDto.getRazorpayOrderId().trim()
        );

        verificationRequest.setRazorpayPaymentId(
                purchaseDto.getRazorpayPaymentId().trim()
        );

        verificationRequest.setRazorpaySignature(
                purchaseDto.getRazorpaySignature().trim()
        );

        // =====================================================
        // VERIFY RAZORPAY PAYMENT + AMOUNT
        // =====================================================

        boolean paymentVerified;

        try {

            paymentVerified =
                    paymentService.verifyPayment(
                            verificationRequest,
                            totalPremium
                    );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to verify Razorpay payment.",
                    e
            );
        }

        if (!paymentVerified) {

            throw new RuntimeException(
                    "Razorpay payment verification failed."
            );
        }

        // =====================================================
        // CREATE POLICY
        // =====================================================

        LocalDate startDate =
                LocalDate.now();

        LocalDate expiryDate =
                startDate
                        .plusYears(
                                purchaseDto.getDurationYears()
                        )
                        .minusDays(1);

        Policy policy =
                new Policy();

        policy.setCoveredTypes(
                purchaseDto.getCoveredTypes().trim()
        );

        policy.setIsActive(true);

        policy.setStartDate(
                startDate
        );

        policy.setDurationYears(
                purchaseDto.getDurationYears()
        );

        policy.setExpiryDate(
                expiryDate
        );

        policy.setPolicyHolder(
                policyHolder
        );

        Policy savedPolicy =
                policyDao.savePolicy(
                        policy
                );

        // =====================================================
        // CREATE PURCHASE RECORD
        // =====================================================

        PolicyPurchase purchase =
                new PolicyPurchase();

        purchase.setPolicy(
                savedPolicy
        );

        // =====================================================
        // COVERAGE
        // =====================================================

        purchase.setCoverageAmount(
                purchaseDto.getCoverageAmount()
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        )
        );

        // =====================================================
        // PREMIUM
        // =====================================================

        purchase.setBasePremium(
                basePremium
        );

        purchase.setDiscountAmount(
                discountAmount
        );

        purchase.setTaxableAmount(
                taxableAmount
        );

        purchase.setGstRate(
                gstRate
        );

        purchase.setGstAmount(
                gstAmount
        );

        purchase.setTotalPremium(
                totalPremium
        );

        // =====================================================
        // NOMINEE
        // =====================================================

        purchase.setNomineeName(
                purchaseDto.getNomineeName().trim()
        );

        purchase.setNomineeRelation(
                purchaseDto.getNomineeRelation().trim()
        );

        purchase.setNomineeContact(
                purchaseDto.getNomineeContact().trim()
        );

        // =====================================================
        // PAYMENT
        // =====================================================

        purchase.setPaymentMethod(
                purchaseDto.getPaymentMethod().trim()
        );

        purchase.setPaymentStatus(
                "PAID"
        );

        purchase.setRazorpayOrderId(
                purchaseDto.getRazorpayOrderId().trim()
        );

        purchase.setRazorpayPaymentId(
                purchaseDto.getRazorpayPaymentId().trim()
        );

        purchase.setTransactionId(
                purchaseDto.getRazorpayPaymentId().trim()
        );

        // =====================================================
        // PAYMENT DATE
        // =====================================================

        LocalDateTime paymentDateTime =
                LocalDateTime.now();

        purchase.setPaymentDateTime(
                paymentDateTime
        );

        purchase.setPaymentDate(
                paymentDateTime.toLocalDate()
        );

        // =====================================================
        // PURCHASE DATE
        // =====================================================

        purchase.setPurchaseDate(
                startDate
        );

        // =====================================================
        // CREATED DATE
        // =====================================================

        purchase.setCreatedAt(
                LocalDateTime.now()
        );

        // =====================================================
        // REFUND INITIAL STATUS
        // =====================================================

        purchase.setRefundStatus(
                "NOT_REFUNDED"
        );

        purchase.setRefundAmount(
                BigDecimal.ZERO.setScale(
                        2,
                        RoundingMode.HALF_UP
                )
        );

        // =====================================================
        // SAVE PURCHASE
        // =====================================================

        PolicyPurchase savedPurchase =
                policyPurchaseDao.savePurchase(
                        purchase
                );

        // =====================================================
        // RETURN PURCHASE RESPONSE
        // =====================================================

        return buildPurchaseResponse(
                savedPurchase
        );
    }

    // =========================================================
    // ADMIN - GET ALL PURCHASES
    // =========================================================

    @Transactional(readOnly = true)
    public List<PurchasePolicyDto> getAllPurchases() {

        List<PolicyPurchase> purchases =
                policyPurchaseDao.getAllPurchases();

        return purchases.stream()
                .map(this::buildPurchaseResponse)
                .toList();
    }

    // =========================================================
    // USER - GET MY PURCHASES
    // =========================================================

    @Transactional(readOnly = true)
    public List<PurchasePolicyDto> getMyPurchases(
            Authentication authentication) {

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication is required."
            );
        }

        String username =
                authentication.getName();

        List<PolicyPurchase> purchases =
                policyPurchaseDao
                        .getPurchasesByUsername(
                                username
                        );

        return purchases.stream()
                .map(this::buildPurchaseResponse)
                .toList();
    }

    // =========================================================
    // BUILD PURCHASE RESPONSE
    // =========================================================

    private PurchasePolicyDto buildPurchaseResponse(
            PolicyPurchase purchase) {

        PurchasePolicyDto response =
                new PurchasePolicyDto();

        // =====================================================
        // PURCHASE ID
        // =====================================================

        response.setPurchaseId(
                purchase.getPurchaseId()
        );

        // =====================================================
        // POLICY DETAILS
        // =====================================================

        if (purchase.getPolicy() != null) {

            Policy policy =
                    purchase.getPolicy();

            response.setPolicyNumber(
                    policy.getPolicyNumber()
            );

            response.setCoveredTypes(
                    policy.getCoveredTypes()
            );

            response.setDurationYears(
                    policy.getDurationYears()
            );

            if (policy.getPolicyHolder() != null
                    && policy.getPolicyHolder()
                            .getUser() != null) {

                response.setUsername(
                        policy.getPolicyHolder()
                                .getUser()
                                .getUsername()
                );
            }
        }

        // =====================================================
        // COVERAGE
        // =====================================================

        response.setCoverageAmount(
                purchase.getCoverageAmount()
        );

        // =====================================================
        // PREMIUM
        // =====================================================

        response.setBasePremium(
                purchase.getBasePremium()
        );

        response.setDiscountAmount(
                purchase.getDiscountAmount()
        );

        response.setTaxableAmount(
                purchase.getTaxableAmount()
        );

        response.setGstRate(
                purchase.getGstRate()
        );

        response.setGstAmount(
                purchase.getGstAmount()
        );

        response.setTotalPremium(
                purchase.getTotalPremium()
        );

        // =====================================================
        // NOMINEE
        // =====================================================

        response.setNomineeName(
                purchase.getNomineeName()
        );

        response.setNomineeRelation(
                purchase.getNomineeRelation()
        );

        response.setNomineeContact(
                purchase.getNomineeContact()
        );

        // =====================================================
        // PAYMENT
        // =====================================================

        response.setPaymentMethod(
                purchase.getPaymentMethod()
        );

        response.setPaymentStatus(
                purchase.getPaymentStatus()
        );

        response.setTransactionId(
                purchase.getTransactionId()
        );

        response.setRazorpayOrderId(
                purchase.getRazorpayOrderId()
        );

        response.setRazorpayPaymentId(
                purchase.getRazorpayPaymentId()
        );

        response.setPaymentDate(
                purchase.getPaymentDate()
        );

        response.setPaymentDateTime(
                purchase.getPaymentDateTime()
        );

        // =====================================================
        // PURCHASE DATES
        // =====================================================

        response.setPurchaseDate(
                purchase.getPurchaseDate()
        );

        response.setCreatedAt(
                purchase.getCreatedAt()
        );

        // =====================================================
        // REFUND DETAILS
        // =====================================================

        response.setRefundStatus(
                purchase.getRefundStatus()
        );

        response.setRefundId(
                purchase.getRefundId()
        );

        response.setRefundAmount(
                purchase.getRefundAmount()
        );

        response.setRefundReason(
                purchase.getRefundReason()
        );

        response.setRefundDateTime(
                purchase.getRefundDateTime()
        );

        // =====================================================
        // REFUND ELIGIBILITY
        // =====================================================

        LocalDateTime paymentTime =
                purchase.getPaymentDateTime();

        if (paymentTime != null) {

            LocalDateTime refundDeadline =
                    paymentTime.plusHours(24);

            response.setRefundDeadline(
                    refundDeadline
            );

            boolean alreadyRefunded =
                    "REFUNDED".equalsIgnoreCase(
                            purchase.getRefundStatus()
                    );

            boolean eligible =
                    !alreadyRefunded
                    && LocalDateTime.now()
                            .isBefore(
                                    refundDeadline
                            );

            response.setRefundEligible(
                    eligible
            );

        } else {

            response.setRefundDeadline(null);

            response.setRefundEligible(false);
        }

        return response;
    }

    // =========================================================
    // PREMIUM CALCULATION
    // =========================================================

    private BigDecimal calculateBasePremium(
            String coveredTypes,
            Integer durationYears,
            BigDecimal coverageAmount) {

        BigDecimal yearlyBasePremium;

        String plan =
                coveredTypes
                        .trim()
                        .toLowerCase();

        // =====================================================
        // YEARLY BASE PREMIUM AT ₹10 LAKH COVERAGE
        // =====================================================

        if (plan.contains("health")) {

            yearlyBasePremium =
                    BigDecimal.valueOf(8999);

        } else if (plan.contains("motor")) {

            yearlyBasePremium =
                    BigDecimal.valueOf(2499);

        } else if (plan.contains("life")) {

            yearlyBasePremium =
                    BigDecimal.valueOf(6999);

        } else if (plan.contains("travel")) {

            yearlyBasePremium =
                    BigDecimal.valueOf(799);

        } else if (plan.contains("home")) {

            yearlyBasePremium =
                    BigDecimal.valueOf(2999);

        } else if (plan.contains("accident")) {

            yearlyBasePremium =
                    BigDecimal.valueOf(1499);

        } else {

            throw new RuntimeException(
                    "Unsupported insurance plan: "
                    + coveredTypes
            );
        }

        // =====================================================
        // MINIMUM COVERAGE
        // =====================================================

        BigDecimal minimumCoverage =
                BigDecimal.valueOf(1_000_000);

        // =====================================================
        // COVERAGE MULTIPLIER
        // =====================================================

        BigDecimal coverageMultiplier =
                coverageAmount.divide(
                        minimumCoverage,
                        4,
                        RoundingMode.HALF_UP
                );

        // =====================================================
        // YEARLY PREMIUM
        // =====================================================

        BigDecimal coverageBasedYearlyPremium =
                yearlyBasePremium.multiply(
                        coverageMultiplier
                );

        // =====================================================
        // TOTAL BASE PREMIUM
        // =====================================================

        BigDecimal totalBasePremium =
                coverageBasedYearlyPremium.multiply(
                        BigDecimal.valueOf(
                                durationYears
                        )
                );

        return totalBasePremium.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    // =========================================================
    // DISCOUNT CALCULATION
    // =========================================================

    private BigDecimal calculateDiscount(
            BigDecimal basePremium,
            Integer durationYears) {

        if (durationYears >= 2) {

            return basePremium
                    .multiply(
                            BigDecimal.valueOf(5)
                    )
                    .divide(
                            BigDecimal.valueOf(100),
                            2,
                            RoundingMode.HALF_UP
                    );
        }

        return BigDecimal.ZERO.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }
}

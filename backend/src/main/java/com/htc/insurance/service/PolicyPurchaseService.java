
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.dto.PurchasePolicyDto;
import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;
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
    private final PaymentAttemptService paymentAttemptService;
    private final InsurancePlanRepository insurancePlanRepository;

    public PolicyPurchaseService(
            PolicyDao policyDao,
            PolicyHolderDao policyHolderDao,
            UserDao userDao,
            PolicyPurchaseDao policyPurchaseDao,
            PaymentService paymentService,
            PaymentAttemptService paymentAttemptService,
            InsurancePlanRepository insurancePlanRepository) {

        this.policyDao = policyDao;
        this.policyHolderDao = policyHolderDao;
        this.userDao = userDao;
        this.policyPurchaseDao = policyPurchaseDao;
        this.paymentService = paymentService;
        this.paymentAttemptService = paymentAttemptService;
        this.insurancePlanRepository = insurancePlanRepository;
    }

    // =====================================================
    // PURCHASE POLICY WITH PAYMENT RECOVERY
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

        String username = authentication.getName();

        // -------------------------------------------------
        // LOAD AND VALIDATE USER
        // -------------------------------------------------

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
        // VALIDATE PLAN
        // -------------------------------------------------

        Long planId = purchaseDto.getPlanId();

        if (planId == null || planId <= 0) {
            throw new IllegalArgumentException(
                    "A valid insurance plan ID is required.");
        }

        InsurancePlan selectedPlan = insurancePlanRepository
                .findById(planId)
                .orElseThrow(() -> new IllegalArgumentException(
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

        coverageAmount = coverageAmount.setScale(
                2, RoundingMode.HALF_UP);

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
        // LOAD POLICY HOLDER
        // -------------------------------------------------

        PolicyHolder policyHolder =
                policyHolderDao.getPolicyHolderByUsername(username);

        if (policyHolder == null) {
            throw new IllegalArgumentException(
                    "Policy holder profile not found. Please contact support.");
        }

        // -------------------------------------------------
        // IDEMPOTENT RETRY: CHECK EXISTING PURCHASE
        // -------------------------------------------------

        PolicyPurchase existingPayment =
                policyPurchaseDao.getPurchaseByTransactionId(
                        razorpayPaymentId);

        PolicyPurchase existingOrder =
                policyPurchaseDao.getPurchaseByRazorpayOrderId(
                        razorpayOrderId);

        if (existingPayment != null || existingOrder != null) {

            if (existingPayment == null
                    || existingOrder == null
                    || existingPayment.getPurchaseId() == null
                    || !existingPayment.getPurchaseId().equals(
                            existingOrder.getPurchaseId())) {

                throw new IllegalArgumentException(
                        "This payment or order is already associated with another purchase.");
            }

            PolicyPurchase existing = existingPayment;

            boolean samePayment =
                    razorpayPaymentId.equals(
                            existing.getRazorpayPaymentId())
                    && razorpayPaymentId.equals(
                            existing.getTransactionId());

            boolean sameOrder =
                    razorpayOrderId.equals(
                            existing.getRazorpayOrderId());

            boolean sameUser =
                    existing.getPolicy() != null
                    && existing.getPolicy().getPolicyHolder() != null
                    && existing.getPolicy()
                            .getPolicyHolder().getUser() != null
                    && username.equals(
                            existing.getPolicy()
                                    .getPolicyHolder()
                                    .getUser()
                                    .getUsername());

            boolean sameCoverage =
                    existing.getCoverageAmount() != null
                    && existing.getCoverageAmount()
                            .compareTo(coverageAmount) == 0;

            boolean sameDuration =
                    existing.getPolicy() != null
                    && existing.getPolicy().getDurationYears() != null
                    && existing.getPolicy().getDurationYears()
                            .equals(durationYears);

            boolean samePlanCoverageType =
                    existing.getPolicy() != null
                    && existing.getPolicy().getCoveredTypes() != null
                    && coveredType.trim().equalsIgnoreCase(
                            existing.getPolicy().getCoveredTypes().trim());

            if (samePayment
                    && sameOrder
                    && sameUser
                    && sameCoverage
                    && sameDuration
                    && samePlanCoverageType) {

                return buildPurchaseResponse(existing);
            }

            throw new IllegalArgumentException(
                    "This payment or order cannot be reused for different purchase details.");
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
                .divide(
                        new BigDecimal("100"),
                        2,
                        RoundingMode.HALF_UP);

        BigDecimal totalPremium = taxableAmount
                .add(gstAmount)
                .setScale(2, RoundingMode.HALF_UP);

        if (totalPremium.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "The calculated premium must be greater than zero.");
        }

        // -------------------------------------------------
        // LOAD AND VALIDATE THE PERSISTED PAYMENT ATTEMPT
        // -------------------------------------------------

        PaymentAttempt attempt =
                paymentAttemptService.getAttemptByOrderId(
                        razorpayOrderId);

        if (!username.equals(attempt.getUsername())) {
            throw new IllegalArgumentException(
                    "This payment order does not belong to the logged-in user.");
        }

        if (!planId.equals(attempt.getPlanId())) {
            throw new IllegalArgumentException(
                    "The payment order was created for a different insurance plan.");
        }

        if (attempt.getCoverageAmount() == null
                || attempt.getCoverageAmount()
                        .compareTo(coverageAmount) != 0) {
            throw new IllegalArgumentException(
                    "Coverage does not match the original payment order.");
        }

        if (!durationYears.equals(attempt.getDurationYears())) {
            throw new IllegalArgumentException(
                    "Policy duration does not match the original payment order.");
        }

        if (attempt.getCalculatedPremium() == null
                || attempt.getCalculatedPremium()
                        .compareTo(totalPremium) != 0) {
            throw new IllegalArgumentException(
                    "Premium does not match the original payment order.");
        }

        PaymentAttemptStatus attemptStatus = attempt.getStatus();

        if (attemptStatus == PaymentAttemptStatus.REQUIRES_RECONCILIATION
                || attemptStatus == PaymentAttemptStatus.FAILED
                || attemptStatus == PaymentAttemptStatus.ORDER_CREATING) {
            throw new IllegalStateException(
                    "This payment attempt requires reconciliation before it can be confirmed.");
        }

        if (attemptStatus != PaymentAttemptStatus.ORDER_CREATED
                && attemptStatus != PaymentAttemptStatus.PAYMENT_VERIFIED
                && attemptStatus != PaymentAttemptStatus.PURCHASE_COMPLETED) {
            throw new IllegalStateException(
                    "The payment attempt is not in a confirmable state.");
        }

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId()
                        .equals(razorpayPaymentId)) {
            throw new IllegalArgumentException(
                    "This order is already associated with a different payment.");
        }

        // -------------------------------------------------
        // VERIFY PAYMENT WITH RAZORPAY
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
            throw new IllegalStateException(
                    "Unable to verify Razorpay payment. "
                    + "No policy was created. You can retry confirmation "
                    + "with the same payment details. If payment was deducted, "
                    + "do not start another checkout.",
                    exception);
        }

        if (!paymentVerified) {
            throw new IllegalArgumentException(
                    "Payment could not be verified as captured. "
                    + "No policy was created.");
        }

        /*
         * Commit this state independently from the purchase transaction.
         * If saving the policy or purchase subsequently fails, this record
         * survives and can be used during a confirmation retry.
         */
        paymentAttemptService.markPaymentVerified(
                razorpayOrderId,
                razorpayPaymentId);

        // -------------------------------------------------
        // CREATE POLICY
        // -------------------------------------------------

        LocalDate startDate = LocalDate.now();

        LocalDate expiryDate = startDate
                .plusYears(durationYears)
                .minusDays(1);

        Policy policy = new Policy();

        policy.setCoveredTypes(coveredType.trim());
        policy.setIsActive(true);
        policy.setStartDate(startDate);
        policy.setDurationYears(durationYears);
        policy.setExpiryDate(expiryDate);
        policy.setPolicyHolder(policyHolder);

        Policy savedPolicy = policyDao.savePolicy(policy);

        if (savedPolicy == null
                || savedPolicy.getPolicyNumber() == null) {
            throw new IllegalStateException(
                    "Policy could not be saved. Retry confirmation using the same payment.");
        }

        // -------------------------------------------------
        // CREATE PURCHASE RECORD
        // -------------------------------------------------

        PolicyPurchase purchase = new PolicyPurchase();

        purchase.setPolicy(savedPolicy);
        purchase.setCoverageAmount(coverageAmount);

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

        if (savedPurchase == null
                || savedPurchase.getPurchaseId() == null) {
            throw new IllegalStateException(
                    "Purchase record could not be saved. Retry confirmation using the same payment.");
        }

        // -------------------------------------------------
        // MARK COMPLETE ONLY AFTER THE PURCHASE TRANSACTION
        // HAS SUCCESSFULLY COMMITTED
        // -------------------------------------------------

        final String completedOrderId = razorpayOrderId;
        final String completedPaymentId = razorpayPaymentId;
        final String attemptReference = attempt.getAttemptReference();

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {

                    @Override
                    public void afterCommit() {
                        try {
                            paymentAttemptService.markPurchaseCompleted(
                                    completedOrderId,
                                    completedPaymentId);

                        } catch (Exception exception) {
                            /*
                             * The purchase has committed. Leave the purchase
                             * intact; record reconciliation if possible.
                             */
                            try {
                                paymentAttemptService.markReconciliationRequired(
                                        attemptReference,
                                        "Purchase committed, but payment-attempt "
                                        + "completion status could not be updated.");
                            } catch (Exception ignored) {
                                /*
                                 * The purchase record remains authoritative
                                 * for customer history. A future reconciliation
                                 * job can repair the attempt status.
                                 */
                            }
                        }
                    }
                });

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
    // AUTHENTICATION VALIDATION
    // =====================================================

    private void validateAuthentication(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new IllegalArgumentException(
                    "User authentication is required.");
        }
    }

    // =====================================================
    // TEXT VALIDATION
    // =====================================================

    private String requireText(
            String value,
            String message) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }

        return value.trim();
    }
}

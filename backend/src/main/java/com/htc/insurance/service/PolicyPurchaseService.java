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

import com.htc.insurance.dao.ClaimsDao;
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

    private final ClaimsDao claimsDao;
    private final PolicyDao policyDao;
    private final PolicyHolderDao policyHolderDao;
    private final UserDao userDao;
    private final PolicyPurchaseDao policyPurchaseDao;
    private final PaymentService paymentService;
    private final PaymentAttemptService paymentAttemptService;
    private final InsurancePlanRepository insurancePlanRepository;

    public PolicyPurchaseService(
            ClaimsDao claimsDao,
            PolicyDao policyDao,
            PolicyHolderDao policyHolderDao,
            UserDao userDao,
            PolicyPurchaseDao policyPurchaseDao,
            PaymentService paymentService,
            PaymentAttemptService paymentAttemptService,
            InsurancePlanRepository insurancePlanRepository) {

        this.claimsDao = claimsDao;
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

        // LOAD AND VALIDATE USER

        User user = userDao.getUserByUsername(username);

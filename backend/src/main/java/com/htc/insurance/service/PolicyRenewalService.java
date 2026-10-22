
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;

import com.htc.insurance.repository.PaymentAttemptRepository;

/**
 * INSUREX - POLICY RENEWAL SERVICE
 *
 * Business rules:
 *
 * 1. Only the policy owner can renew.
 * 2. Original policy must have a successful claim.
 * 3. Original purchase must be PAID.
 * 4. Refund-pending/refunded policies cannot renew.
 * 5. Administratively disabled policies cannot renew.
 * 6. Original premium and plan terms are preserved.
 * 7. Every renewal creates a NEW policy.
 * 8. Original policy is never reactivated.
 * 9. Only one renewal is permitted per original purchase.
 * 10. Captured payment failures require reconciliation.
 * 11. Original plan ID is preserved in renewal purchases.
 * 12. Legacy purchases may use a verified stored plan ID.
 */
@Service
public class PolicyRenewalService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    PolicyRenewalService.class);

    private final PolicyDao policyDao;
    private final PolicyPurchaseDao purchaseDao;
    private final ClaimsDao claimsDao;

    private final PaymentAttemptRepository attemptRepository;
    private final PaymentAttemptService attemptService;
    private final PaymentService paymentService;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public PolicyRenewalService(
            PolicyDao policyDao,
            PolicyPurchaseDao purchaseDao,
            ClaimsDao claimsDao,
            PaymentAttemptRepository attemptRepository,
            PaymentAttemptService attemptService,
            PaymentService paymentService) {

        this.policyDao = policyDao;
        this.purchaseDao = purchaseDao;
        this.claimsDao = claimsDao;
        this.attemptRepository = attemptRepository;
        this.attemptService = attemptService;
        this.paymentService = paymentService;
    }

    // =========================================================
    // CREATE RENEWAL ORDER
    // =========================================================

    /**
     * Validates renewal eligibility before creating
     * a Razorpay order.
     *
     * The remote Razorpay request is deliberately
     * not executed inside a long-lived DB transaction.
     */
    public PaymentOrderResponse createRenewalOrder(
            Long originalPolicyNumber,
            String username) throws Exception {

        requireUsername(username);

        Policy original =
                requireOriginalPolicy(
                        originalPolicyNumber,
                        username);

        validateRenewalLifecycle(original);

        PolicyPurchase purchase =
                requireOriginalPurchase(
                        originalPolicyNumber);

        validateEligibility(
                originalPolicyNumber,
                purchase);

        // =====================================================
        // RESOLVE ORIGINAL PLAN
        // =====================================================

        Long originalPlanId =
                resolveOriginalPlanId(
                        purchase,
                        username);

        if (originalPlanId == null
                || originalPlanId <= 0) {

            throw new IllegalStateException(
                    "Original insurance plan ID is invalid.");
        }

        return paymentService.createRenewalOrder(
                originalPolicyNumber,
                originalPlanId,
                username);
    }

    // =========================================================
    // CONFIRM RENEWAL
    // =========================================================

    /**
     * Confirms a Razorpay payment and creates
     * exactly one renewal purchase.
     *
     * Locks original policy first, then purchase.
     *
     * Existing completed renewal orders are handled
     * idempotently.
     */
    @Transactional(rollbackFor = Exception.class)
    public RenewalResult confirmRenewal(
            Long originalPolicyNumber,
            PaymentVerificationRequest verification,
            String username) throws Exception {

        requireUsername(username);

        if (verification == null
                || blank(verification.getRazorpayOrderId())
                || blank(verification.getRazorpayPaymentId())
                || blank(verification.getRazorpaySignature())) {

            throw new IllegalArgumentException(
                    "Razorpay verification details are required.");
        }

        String orderId =
                verification.getRazorpayOrderId().trim();

        String paymentId =
                verification.getRazorpayPaymentId().trim();

        // =====================================================
        // LOCK ORIGINAL POLICY
        // =====================================================

        if (originalPolicyNumber == null
                || originalPolicyNumber <= 0) {

            throw new IllegalArgumentException(
                    "A valid original policy number is required.");
        }

        Policy original =
                policyDao.getPolicyByIdForUpdate(
                        originalPolicyNumber);

        if (original == null) {

            throw new IllegalArgumentException(
                    "Original policy was not found.");
        }

        verifyOwner(original, username);

        // =====================================================
        // LOCK ORIGINAL PURCHASE
        // =====================================================

        PolicyPurchase originalPurchase =
                purchaseDao
                        .getPurchaseByPolicyNumberForUpdate(
                                originalPolicyNumber)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Original purchase was not found."));

        // =====================================================
        // FIND RENEWAL PAYMENT ATTEMPT
        // =====================================================

        PaymentAttempt attempt =
                attemptRepository
                        .findByRazorpayOrderId(orderId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Renewal payment order was not found."));

        if (!"RENEWAL".equalsIgnoreCase(
                attempt.getPurchaseType())
                || !Objects.equals(
                        originalPolicyNumber,
                        attempt.getRenewalSourcePolicyNumber())
                || !username.equals(
                        attempt.getUsername())) {

            throw new AccessDeniedException(
                    "Payment order does not belong to this renewal.");
        }

        if (attempt.getRazorpayPaymentId() != null
                && !paymentId.equals(
                        attempt.getRazorpayPaymentId())) {

            throw new IllegalStateException(
                    "Payment ID conflicts with this order.");
        }

        // =====================================================
        // VALIDATE ORIGINAL PAYMENT
        // =====================================================

        validateOriginalPayment(originalPurchase);

        // =====================================================
        // RESOLVE ORIGINAL PLAN ID
        // =====================================================

        Long originalPlanId =
                resolveOriginalPlanId(
                        originalPurchase,
                        username);

        // =====================================================
        // VERIFY RENEWAL TERMS
        // =====================================================

        if (!Objects.equals(
                attempt.getPlanId(),
                originalPlanId)
                || !Objects.equals(
                        attempt.getDurationYears(),
                        original.getDurationYears())
                || attempt.getCoverageAmount() == null
                || originalPurchase.getCoverageAmount() == null
                || attempt.getCoverageAmount().compareTo(
                        originalPurchase.getCoverageAmount()) != 0
                || attempt.getCalculatedPremium() == null
                || originalPurchase.getTotalPremium() == null
                || attempt.getCalculatedPremium().compareTo(
                        originalPurchase.getTotalPremium()) != 0
                || !"INR".equalsIgnoreCase(
                        attempt.getCurrency())) {

            throw new IllegalStateException(
                    "Renewal payment terms do not match "
                    + "the original purchase.");
        }

        // =====================================================
        // VERIFY RAZORPAY PAYMENT
        // =====================================================

        if (!paymentService.verifyPayment(
                verification,
                originalPurchase.getTotalPremium())) {

            throw new IllegalStateException(
                    "Razorpay payment verification failed.");
        }

        // =====================================================
        // HANDLE ALREADY-CONFIRMED ORDER
        // =====================================================

        PolicyPurchase sameOrder =
                purchaseDao.getPurchaseByRazorpayOrderId(
                        orderId);

        if (sameOrder != null) {

            if (!paymentId.equals(
                    sameOrder.getRazorpayPaymentId())
                    || sameOrder.getRenewedFromPurchase() == null
                    || !Objects.equals(
                            originalPurchase.getPurchaseId(),
                            sameOrder.getRenewedFromPurchase()
                                    .getPurchaseId())) {

                throw new IllegalStateException(
                        "Existing purchase does not match "
                        + "this renewal.");
            }

            return result(sameOrder, true);
        }

        // =====================================================
        // RECORD VERIFIED PAYMENT
        // =====================================================

        attemptService.markPaymentVerified(
                orderId,
                paymentId);

        registerReconciliationOnRollback(
                attempt.getAttemptReference());

        // =====================================================
        // RECHECK RENEWAL ELIGIBILITY UNDER LOCK
        // =====================================================

        validateRenewalLifecycle(original);

        validateOriginalPayment(originalPurchase);

        if (purchaseDao.existsRenewalByOriginalPurchaseId(
                originalPurchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "Original policy was already renewed. "
                    + "This additional captured payment "
                    + "requires reconciliation.");
        }

        if (!claimsDao.hasSuccessfulClaim(
                originalPolicyNumber)) {

            throw new IllegalStateException(
                    "An APPROVED or SETTLED claim "
                    + "is required for renewal.");
        }

        // =====================================================
        // CREATE NEW POLICY
        // =====================================================

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        Policy renewedPolicy = new Policy();

        renewedPolicy.setCoveredTypes(
                original.getCoveredTypes());

        renewedPolicy.setIsActive(true);

        renewedPolicy.setLifecycleStatus(
                PolicyLifecycleStatus.ACTIVE);

        renewedPolicy.setStartDate(today);

        renewedPolicy.setDurationYears(
                original.getDurationYears());

        renewedPolicy.setExpiryDate(
                today.plusYears(
                        original.getDurationYears())
                        .minusDays(1));

        renewedPolicy.setPolicyHolder(
                original.getPolicyHolder());

        Policy savedPolicy =
                policyDao.savePolicy(renewedPolicy);

        // =====================================================
        // CREATE NEW PAID POLICY PURCHASE
        // =====================================================

        PolicyPurchase renewedPurchase =
                new PolicyPurchase();

        renewedPurchase.setPolicy(savedPolicy);

        renewedPurchase.setRenewedFromPurchase(
                originalPurchase);

        // =====================================================
        // PRESERVE ORIGINAL PLAN ID - NEW
        // =====================================================

        renewedPurchase.setPlanId(originalPlanId);

        // =====================================================
        // PRESERVE ORIGINAL COVERAGE AND PREMIUM
        // =====================================================

        renewedPurchase.setCoverageAmount(
                originalPurchase.getCoverageAmount());

        renewedPurchase.setBasePremium(
                originalPurchase.getBasePremium());

        renewedPurchase.setDiscountAmount(
                originalPurchase.getDiscountAmount());

        renewedPurchase.setTaxableAmount(
                originalPurchase.getTaxableAmount());

        renewedPurchase.setGstRate(
                originalPurchase.getGstRate());

        renewedPurchase.setGstAmount(
                originalPurchase.getGstAmount());

        renewedPurchase.setTotalPremium(
                originalPurchase.getTotalPremium());

        // =====================================================
        // PRESERVE NOMINEE DETAILS
        // =====================================================

        renewedPurchase.setNomineeName(
                originalPurchase.getNomineeName());

        renewedPurchase.setNomineeRelation(
                originalPurchase.getNomineeRelation());

        renewedPurchase.setNomineeContact(
                originalPurchase.getNomineeContact());

        // =====================================================
        // PAYMENT DETAILS
        // =====================================================

        renewedPurchase.setPaymentMethod("RAZORPAY");
        renewedPurchase.setPaymentStatus("PAID");

        renewedPurchase.setTransactionId(paymentId);

        renewedPurchase.setRazorpayOrderId(orderId);
        renewedPurchase.setRazorpayPaymentId(paymentId);

        renewedPurchase.setPaymentDate(today);
        renewedPurchase.setPaymentDateTime(now);

        renewedPurchase.setPurchaseDate(today);
        renewedPurchase.setCreatedAt(now);

        renewedPurchase.setRefundStatus("NOT_REFUNDED");

        PolicyPurchase savedPurchase =
                purchaseDao.savePurchase(renewedPurchase);

        // =====================================================
        // AFTER-COMMIT PAYMENT ATTEMPT COMPLETION
        // =====================================================

        TransactionSynchronizationManager
                .registerSynchronization(
                        new TransactionSynchronization() {

            @Override
            public void afterCommit() {

                try {

                    attemptService.markPurchaseCompleted(
                            orderId,
                            paymentId);

                } catch (Exception exception) {

                    log.error(
                            "Renewal saved but attempt "
                            + "completion failed: {}",
                            orderId,
                            exception);

                    try {

                        attemptService.markReconciliationRequired(
                                attempt.getAttemptReference(),
                                "Renewal purchase committed; "
                                + "attempt completion needs reconciliation.");

                    } catch (Exception secondary) {

                        log.error(
                                "Renewal reconciliation "
                                + "marking failed: {}",
                                orderId,
                                secondary);
                    }
                }
            }
        });

        return result(savedPurchase, false);
    }

    // =========================================================
    // RECONCILIATION AFTER ROLLBACK
    // =========================================================

    private void registerReconciliationOnRollback(
            String attemptReference) {

        if (!TransactionSynchronizationManager
                .isSynchronizationActive()) {

            throw new IllegalStateException(
                    "Transaction synchronization is required.");
        }

        TransactionSynchronizationManager
                .registerSynchronization(
                        new TransactionSynchronization() {

            @Override
            public void afterCompletion(int status) {

                if (status !=
                        TransactionSynchronization.STATUS_COMMITTED) {

                    try {

                        attemptService.markReconciliationRequired(
                                attemptReference,
                                "Captured renewal payment was verified "
                                + "but renewal transaction did not commit.");

                    } catch (Exception exception) {

                        log.error(
                                "Unable to flag renewal "
                                + "for reconciliation: {}",
                                attemptReference,
                                exception);
                    }
                }
            }
        });
    }

    // =========================================================
    // REQUIRE ORIGINAL POLICY
    // =========================================================

    private Policy requireOriginalPolicy(
            Long number,
            String username) {

        if (number == null || number <= 0) {

            throw new IllegalArgumentException(
                    "A valid original policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyById(number);

        if (policy == null) {

            throw new IllegalArgumentException(
                    "Original policy was not found.");
        }

        verifyOwner(policy, username);

        return policy;
    }

    // =========================================================
    // VERIFY POLICY OWNER
    // =========================================================

    private void verifyOwner(
            Policy policy,
            String username) {

        if (policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null
                || !username.equals(
                        policy.getPolicyHolder()
                                .getUser()
                                .getUsername())) {

            throw new AccessDeniedException(
                    "This policy does not belong "
                    + "to the authenticated customer.");
        }
    }

    // =========================================================
    // REQUIRE ORIGINAL PURCHASE
    // =========================================================

    private PolicyPurchase requireOriginalPurchase(
            Long number) {

        PolicyPurchase purchase =
                purchaseDao.getPurchaseByPolicyNumber(number);

        if (purchase == null) {

            throw new IllegalStateException(
                    "Original policy purchase was not found.");
        }

        return purchase;
    }

    // =========================================================
    // RESOLVE ORIGINAL PLAN ID - NEW
    // =========================================================

    /**
     * Resolves the original plan ID using:
     *
     * 1. Stored PolicyPurchase.planId, when present.
     * 2. Completed original PaymentAttempt, as a fallback.
     *
     * If both records exist, their plan IDs must match.
     *
     * Historical purchases without either source cannot
     * be renewed until an administrator independently
     * verifies and backfills the original plan ID.
     *
     * This method never guesses a plan based on price
     * or coverage.
     */
    private Long resolveOriginalPlanId(
            PolicyPurchase purchase,
            String username) {

        if (purchase == null) {
            throw new IllegalArgumentException(
                    "Original purchase is required.");
        }

        Long storedPlanId = purchase.getPlanId();

        if (storedPlanId != null && storedPlanId <= 0) {
            throw new IllegalStateException(
                    "Stored original plan ID is invalid.");
        }

        if (blank(purchase.getRazorpayOrderId())) {

            if (storedPlanId != null) {
                return storedPlanId;
            }

            throw new IllegalStateException(
                    "Original plan cannot be recovered because "
                    + "the purchase has no Razorpay order ID "
                    + "or stored plan ID.");
        }

        PaymentAttempt historicalAttempt =
                attemptRepository
                        .findByRazorpayOrderId(
                                purchase.getRazorpayOrderId())
                        .orElse(null);

        if (historicalAttempt != null) {

            PaymentAttempt verifiedAttempt =
                    requireOriginalAttempt(
                            purchase,
                            username);

            Long historicalPlanId =
                    verifiedAttempt.getPlanId();

            if (storedPlanId != null
                    && !Objects.equals(
                            storedPlanId,
                            historicalPlanId)) {

                throw new IllegalStateException(
                        "Stored original plan ID conflicts "
                        + "with the completed payment history.");
            }

            return historicalPlanId;
        }

        if (storedPlanId != null) {

            // Historical purchase:
            // the original attempt record is unavailable,
            // but the independently verified plan ID
            // has been stored on the purchase.

            return storedPlanId;
        }

        throw new IllegalStateException(
                "Original plan cannot be recovered from "
                + "purchase or payment history. "
                + "An administrator must verify and "
                + "record the original plan ID.");
    }

    // =========================================================
    // REQUIRE ORIGINAL PAYMENT ATTEMPT
    // =========================================================

    private PaymentAttempt requireOriginalAttempt(
            PolicyPurchase purchase,
            String username) {

        if (blank(purchase.getRazorpayOrderId())) {

            throw new IllegalStateException(
                    "Original purchase has no recorded "
                    + "Razorpay order.");
        }

        PaymentAttempt originalAttempt =
                attemptRepository
                        .findByRazorpayOrderId(
                                purchase.getRazorpayOrderId())
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Original plan cannot be recovered "
                                        + "from payment history."));

        if (!username.equals(
                originalAttempt.getUsername())
                || originalAttempt.getPlanId() == null
                || originalAttempt.getPlanId() <= 0
                || originalAttempt.getStatus() == null
                || !"PURCHASE_COMPLETED".equals(
                        originalAttempt.getStatus().name())) {

            throw new IllegalStateException(
                    "Original payment attempt is not "
                    + "a completed customer purchase.");
        }

        return originalAttempt;
    }

    // =========================================================
    // VALIDATE RENEWAL ELIGIBILITY
    // =========================================================

    private void validateEligibility(
            Long number,
            PolicyPurchase purchase) {

        validateOriginalPayment(purchase);

        if (!claimsDao.hasSuccessfulClaim(number)) {

            throw new IllegalStateException(
                    "Only policies with APPROVED or SETTLED "
                    + "claims can be renewed.");
        }

        if (purchaseDao.existsRenewalByOriginalPurchaseId(
                purchase.getPurchaseId())) {

            throw new IllegalStateException(
                    "This policy has already been renewed.");
        }
    }

    // =========================================================
    // VALIDATE POLICY LIFECYCLE
    // =========================================================

    private void validateRenewalLifecycle(
            Policy policy) {

        if (policy == null) {

            throw new IllegalArgumentException(
                    "Original policy is required.");
        }

        PolicyLifecycleStatus lifecycle =
                policy.getLifecycleStatus();

        if (lifecycle == PolicyLifecycleStatus.REFUND_PENDING
                || lifecycle == PolicyLifecycleStatus.REFUNDED) {

            throw new IllegalStateException(
                    "A policy with a pending or completed refund "
                    + "cannot be renewed.");
        }

        if (lifecycle == PolicyLifecycleStatus.ADMIN_DISABLED) {

            throw new IllegalStateException(
                    "An administratively disabled policy "
                    + "cannot be renewed.");
        }

        // CLAIM_LOCKED is permitted because this flow
        // requires an APPROVED or SETTLED claim.
        //
        // EXPIRED is permitted if the original purchase
        // is paid, non-refunded and has a successful claim.
    }

    // =========================================================
    // VALIDATE ORIGINAL PAYMENT
    // =========================================================

    private void validateOriginalPayment(
            PolicyPurchase purchase) {

        if (!"PAID".equalsIgnoreCase(
                purchase.getPaymentStatus())
                || !"NOT_REFUNDED".equalsIgnoreCase(
                        purchase.getRefundStatus())) {

            throw new IllegalStateException(
                    "Original policy must be paid "
                    + "and not refunded.");
        }

        BigDecimal premium =
                purchase.getTotalPremium();

        if (premium == null
                || premium.signum() <= 0) {

            throw new IllegalStateException(
                    "Original paid premium is invalid.");
        }
    }

    // =========================================================
    // BUILD RENEWAL RESULT
    // =========================================================

    private RenewalResult result(
            PolicyPurchase purchase,
            boolean alreadyConfirmed) {

        return new RenewalResult(
                purchase.getPurchaseId(),
                purchase.getPolicy().getPolicyNumber(),
                purchase.getRenewedFromPurchase()
                        .getPolicy().getPolicyNumber(),
                purchase.getTotalPremium(),
                purchase.getRazorpayOrderId(),
                alreadyConfirmed);
    }

    // =========================================================
    // VALIDATE USERNAME
    // =========================================================

    private void requireUsername(String username) {

        if (blank(username)) {

            throw new IllegalArgumentException(
                    "An authenticated customer is required.");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    // =========================================================
    // RENEWAL RESULT
    // =========================================================

    public record RenewalResult(
            Long purchaseId,
            Long newPolicyNumber,
            Long originalPolicyNumber,
            BigDecimal paidPremium,
            String razorpayOrderId,
            boolean alreadyConfirmed) {
    }
}

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
import com.htc.insurance.entity.PaymentAttemptStatus;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.repository.PaymentAttemptRepository;

/**
 * Renewal orchestration. Never expose PaymentService.createRenewalOrder directly
 * from a controller: this service enforces the approved-claim requirement.
 */
@Service
public class PolicyRenewalService {

    private static final Logger log = LoggerFactory.getLogger(PolicyRenewalService.class);

    private final PolicyDao policyDao;
    private final PolicyPurchaseDao purchaseDao;
    private final ClaimsDao claimsDao;
    private final PaymentAttemptRepository attemptRepository;
    private final PaymentAttemptService attemptService;
    private final PaymentService paymentService;

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

    /**
     * Validate eligibility and create an order for the ORIGINAL PAID premium.
     * Do not wrap a remote Razorpay call in a long-lived database lock.
     * Concurrent order creation is possible; confirmation is serialized below.
     */
    public PaymentOrderResponse createRenewalOrder(
            Long originalPolicyNumber, String username) throws Exception {

        requireUsername(username);
        Policy original = requireOriginalPolicy(originalPolicyNumber, username);
        PolicyPurchase purchase = requireOriginalPurchase(originalPolicyNumber);
        validateEligibility(originalPolicyNumber, purchase);

        PaymentAttempt originalAttempt = requireOriginalAttempt(purchase, username);
        Long originalPlanId = originalAttempt.getPlanId();
        if (originalPlanId == null || originalPlanId <= 0) {
            throw new IllegalStateException("Original plan ID is invalid.");
        }

        return paymentService.createRenewalOrder(
                originalPolicyNumber, originalPlanId, username);
    }

    /**
     * Confirm a captured Razorpay payment and atomically create one renewal.
     * A successful payment with an already-renewed source is not discarded:
     * its attempt is marked for reconciliation after this transaction ends.
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
            throw new IllegalArgumentException("Razorpay verification details are required.");
        }

        String orderId = verification.getRazorpayOrderId().trim();
        String paymentId = verification.getRazorpayPaymentId().trim();

        // Lock original policy first, then purchase: same ordering as claim/refund.
        Policy original = policyDao.getPolicyByIdForUpdate(originalPolicyNumber);
        if (original == null) {
            throw new IllegalArgumentException("Original policy was not found.");
        }
        verifyOwner(original, username);

        PolicyPurchase originalPurchase = purchaseDao
                .getPurchaseByPolicyNumberForUpdate(originalPolicyNumber)
                .orElseThrow(() -> new IllegalStateException("Original purchase was not found."));

        PaymentAttempt attempt = attemptRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Renewal payment order was not found."));

        if (!"RENEWAL".equalsIgnoreCase(attempt.getPurchaseType())
                || !Objects.equals(originalPolicyNumber, attempt.getRenewalSourcePolicyNumber())
                || !username.equals(attempt.getUsername())) {
            throw new AccessDeniedException("Payment order does not belong to this renewal.");
        }
        if (attempt.getRazorpayPaymentId() != null
                && !paymentId.equals(attempt.getRazorpayPaymentId())) {
            throw new IllegalStateException("Payment ID conflicts with this order.");
        }

        // Recheck after acquiring locks. The order may have been created earlier.
        validateOriginalPayment(originalPurchase);
        PaymentAttempt originalAttempt = requireOriginalAttempt(originalPurchase, username);
        if (!Objects.equals(attempt.getPlanId(), originalAttempt.getPlanId())
                || !Objects.equals(attempt.getDurationYears(), original.getDurationYears())
                || attempt.getCoverageAmount() == null
                || originalPurchase.getCoverageAmount() == null
                || attempt.getCoverageAmount().compareTo(originalPurchase.getCoverageAmount()) != 0
                || attempt.getCalculatedPremium() == null
                || originalPurchase.getTotalPremium() == null
                || attempt.getCalculatedPremium().compareTo(originalPurchase.getTotalPremium()) != 0
                || !"INR".equalsIgnoreCase(attempt.getCurrency())) {
            throw new IllegalStateException("Renewal payment terms do not match the original purchase.");
        }

        // Even a retry must be verified against Razorpay, not merely local IDs.
        if (!paymentService.verifyPayment(verification, originalPurchase.getTotalPremium())) {
            throw new IllegalStateException("Razorpay payment verification failed.");
        }

        PolicyPurchase sameOrder = purchaseDao.getPurchaseByRazorpayOrderId(orderId);
        if (sameOrder != null) {
            if (!paymentId.equals(sameOrder.getRazorpayPaymentId())
                    || sameOrder.getRenewedFromPurchase() == null
                    || !Objects.equals(originalPurchase.getPurchaseId(),
                            sameOrder.getRenewedFromPurchase().getPurchaseId())) {
                throw new IllegalStateException("Existing purchase does not match this renewal.");
            }
            return result(sameOrder, true);
        }

        // Payment is already captured; preserve its status even if DB work rolls back.
        attemptService.markPaymentVerified(orderId, paymentId);
        registerReconciliationOnRollback(attempt.getAttemptReference());

        if (purchaseDao.existsRenewalByOriginalPurchaseId(originalPurchase.getPurchaseId())) {
            throw new IllegalStateException(
                    "Original policy was already renewed. This additional captured payment requires reconciliation.");
        }
        if (!claimsDao.hasSuccessfulClaim(originalPolicyNumber)) {
            throw new IllegalStateException(
                    "An APPROVED or SETTLED claim is required for renewal.");
        }

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        Policy renewedPolicy = new Policy();
        renewedPolicy.setCoveredTypes(original.getCoveredTypes());
        renewedPolicy.setIsActive(true);
        renewedPolicy.setStartDate(today);
        renewedPolicy.setDurationYears(original.getDurationYears());
        renewedPolicy.setExpiryDate(today.plusYears(original.getDurationYears()).minusDays(1));
        renewedPolicy.setPolicyHolder(original.getPolicyHolder());
        Policy savedPolicy = policyDao.savePolicy(renewedPolicy);

        PolicyPurchase renewedPurchase = new PolicyPurchase();
        renewedPurchase.setPolicy(savedPolicy);
        renewedPurchase.setRenewedFromPurchase(originalPurchase);
        renewedPurchase.setCoverageAmount(originalPurchase.getCoverageAmount());
        renewedPurchase.setBasePremium(originalPurchase.getBasePremium());
        renewedPurchase.setDiscountAmount(originalPurchase.getDiscountAmount());
        renewedPurchase.setTaxableAmount(originalPurchase.getTaxableAmount());
        renewedPurchase.setGstRate(originalPurchase.getGstRate());
        renewedPurchase.setGstAmount(originalPurchase.getGstAmount());
        renewedPurchase.setTotalPremium(originalPurchase.getTotalPremium());
        renewedPurchase.setNomineeName(originalPurchase.getNomineeName());
        renewedPurchase.setNomineeRelation(originalPurchase.getNomineeRelation());
        renewedPurchase.setNomineeContact(originalPurchase.getNomineeContact());
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
        PolicyPurchase savedPurchase = purchaseDao.savePurchase(renewedPurchase);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    attemptService.markPurchaseCompleted(orderId, paymentId);
                } catch (Exception exception) {
                    log.error("Renewal saved but attempt completion failed: {}", orderId, exception);
                    try {
                        attemptService.markReconciliationRequired(
                                attempt.getAttemptReference(),
                                "Renewal purchase committed; attempt completion needs reconciliation.");
                    } catch (Exception secondary) {
                        log.error("Renewal reconciliation marking failed: {}", orderId, secondary);
                    }
                }
            }
        });
        return result(savedPurchase, false);
    }

    private void registerReconciliationOnRollback(String attemptReference) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Transaction synchronization is required.");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    try {
                        attemptService.markReconciliationRequired(
                                attemptReference,
                                "Captured renewal payment was verified but renewal transaction did not commit.");
                    } catch (Exception exception) {
                        log.error("Unable to flag renewal for reconciliation: {}", attemptReference, exception);
                    }
                }
            }
        });
    }

    private Policy requireOriginalPolicy(Long number, String username) {
        if (number == null || number <= 0) {
            throw new IllegalArgumentException("A valid original policy number is required.");
        }
        Policy policy = policyDao.getPolicyById(number);
        if (policy == null) {
            throw new IllegalArgumentException("Original policy was not found.");
        }
        verifyOwner(policy, username);
        return policy;
    }

    private void verifyOwner(Policy policy, String username) {
        if (policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null
                || !username.equals(policy.getPolicyHolder().getUser().getUsername())) {
            throw new AccessDeniedException("This policy does not belong to the authenticated customer.");
        }
    }

    private PolicyPurchase requireOriginalPurchase(Long number) {
        PolicyPurchase purchase = purchaseDao.getPurchaseByPolicyNumber(number);
        if (purchase == null) {
            throw new IllegalStateException("Original policy purchase was not found.");
        }
        return purchase;
    }

    private PaymentAttempt requireOriginalAttempt(PolicyPurchase purchase, String username) {
        if (blank(purchase.getRazorpayOrderId())) {
            throw new IllegalStateException("Original purchase has no recorded Razorpay order.");
        }
        PaymentAttempt originalAttempt = attemptRepository
                .findByRazorpayOrderId(purchase.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalStateException(
                        "Original plan cannot be recovered from payment history."));
        if (!username.equals(originalAttempt.getUsername())
                || originalAttempt.getPlanId() == null
                || originalAttempt.getPlanId() <= 0
                || !"PURCHASE_COMPLETED".equals(originalAttempt.getStatus().name())) {
            throw new IllegalStateException("Original payment attempt is not a completed customer purchase.");
        }
        return originalAttempt;
    }

    private void validateEligibility(Long number, PolicyPurchase purchase) {
        validateOriginalPayment(purchase);
        if (!claimsDao.hasSuccessfulClaim(number)) {
            throw new IllegalStateException("Only policies with APPROVED or SETTLED claims can be renewed.");
        }
        if (purchaseDao.existsRenewalByOriginalPurchaseId(purchase.getPurchaseId())) {
            throw new IllegalStateException("This policy has already been renewed.");
        }
    }

    private void validateOriginalPayment(PolicyPurchase purchase) {
        if (!"PAID".equalsIgnoreCase(purchase.getPaymentStatus())
                || !"NOT_REFUNDED".equalsIgnoreCase(purchase.getRefundStatus())) {
            throw new IllegalStateException("Original policy must be paid and not refunded.");
        }
        BigDecimal premium = purchase.getTotalPremium();
        if (premium == null || premium.signum() <= 0) {
            throw new IllegalStateException("Original paid premium is invalid.");
        }
    }

    private RenewalResult result(PolicyPurchase purchase, boolean alreadyConfirmed) {
        return new RenewalResult(
                purchase.getPurchaseId(),
                purchase.getPolicy().getPolicyNumber(),
                purchase.getRenewedFromPurchase().getPolicy().getPolicyNumber(),
                purchase.getTotalPremium(),
                purchase.getRazorpayOrderId(),
                alreadyConfirmed);
    }

    private void requireUsername(String username) {
        if (blank(username)) {
            throw new IllegalArgumentException("An authenticated customer is required.");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record RenewalResult(
            Long purchaseId,
            Long newPolicyNumber,
            Long originalPolicyNumber,
            BigDecimal paidPremium,
            String razorpayOrderId,
            boolean alreadyConfirmed) {}
}

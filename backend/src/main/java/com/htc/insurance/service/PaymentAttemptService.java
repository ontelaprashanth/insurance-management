
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;
import com.htc.insurance.repository.PaymentAttemptRepository;

@Service
public class PaymentAttemptService {

    private static final String PURCHASE_TYPE_NEW = "NEW";
    private static final String PURCHASE_TYPE_RENEWAL = "RENEWAL";

    private final PaymentAttemptRepository repository;

    public PaymentAttemptService(
            PaymentAttemptRepository repository) {

        this.repository = repository;
    }

    // =========================================================
    // NORMAL POLICY PURCHASE - CREATE PAYMENT ATTEMPT
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String createAttempt(
            String username,
            Long planId,
            BigDecimal coverageAmount,
            Integer durationYears,
            BigDecimal calculatedPremium,
            String currency) {

        validatePaymentDetails(
                username,
                planId,
                coverageAmount,
                durationYears,
                calculatedPremium,
                currency);

        PaymentAttempt attempt = buildAttempt(
                username,
                planId,
                coverageAmount,
                durationYears,
                calculatedPremium,
                currency);

        attempt.setPurchaseType(PURCHASE_TYPE_NEW);
        attempt.setRenewalSourcePolicyNumber(null);

        return repository.saveAndFlush(attempt)
                .getAttemptReference();
    }

    // =========================================================
    // RENEWAL - CREATE PAYMENT ATTEMPT
    // =========================================================

    /**
     * Called only by the trusted backend renewal service.
     *
     * The renewal service must first verify:
     *
     * 1. Customer owns the original policy.
     * 2. Original policy has an APPROVED or SETTLED claim.
     * 3. Original purchase was paid and not refunded.
     * 4. No completed renewal exists.
     * 5. Premium equals the original paid premium.
     *
     * Never accept the premium directly from the browser.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String createRenewalAttempt(
            String username,
            Long originalPolicyNumber,
            Long planId,
            BigDecimal coverageAmount,
            Integer durationYears,
            BigDecimal originalPaidPremium,
            String currency) {

        if (originalPolicyNumber == null
                || originalPolicyNumber <= 0) {

            throw new IllegalArgumentException(
                    "A valid original policy number is required.");
        }

        validatePaymentDetails(
                username,
                planId,
                coverageAmount,
                durationYears,
                originalPaidPremium,
                currency);

        PaymentAttempt attempt = buildAttempt(
                username,
                planId,
                coverageAmount,
                durationYears,
                originalPaidPremium,
                currency);

        attempt.setPurchaseType(PURCHASE_TYPE_RENEWAL);

        attempt.setRenewalSourcePolicyNumber(
                originalPolicyNumber);

        return repository.saveAndFlush(attempt)
                .getAttemptReference();
    }

    // =========================================================
    // SHARED PAYMENT ATTEMPT BUILDER
    // =========================================================

    private PaymentAttempt buildAttempt(
            String username,
            Long planId,
            BigDecimal coverageAmount,
            Integer durationYears,
            BigDecimal calculatedPremium,
            String currency) {

        PaymentAttempt attempt = new PaymentAttempt();

        attempt.setAttemptReference(
                "INSX_" + UUID.randomUUID()
                        .toString()
                        .replace("-", ""));

        attempt.setUsername(username.trim());
        attempt.setPlanId(planId);
        attempt.setCoverageAmount(coverageAmount);
        attempt.setDurationYears(durationYears);
        attempt.setCalculatedPremium(calculatedPremium);
        attempt.setCurrency(currency.trim().toUpperCase());
        attempt.setStatus(PaymentAttemptStatus.ORDER_CREATING);

        return attempt;
    }

    // =========================================================
    // MARK RAZORPAY ORDER CREATED
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markOrderCreated(
            String attemptReference,
            String razorpayOrderId) {

        PaymentAttempt attempt =
                findByReference(attemptReference);

        if (razorpayOrderId == null
                || razorpayOrderId.isBlank()) {

            throw new IllegalArgumentException(
                    "A Razorpay order ID is required.");
        }

        if (attempt.getRazorpayOrderId() != null
                && !attempt.getRazorpayOrderId()
                        .equals(razorpayOrderId)) {

            throw new IllegalStateException(
                    "The payment attempt is already "
                    + "associated with another order.");
        }

        if (attempt.getStatus()
                == PaymentAttemptStatus.PURCHASE_COMPLETED) {

            throw new IllegalStateException(
                    "A completed payment attempt "
                    + "cannot create another order.");
        }

        if (attempt.getStatus()
                == PaymentAttemptStatus.PAYMENT_VERIFIED) {

            throw new IllegalStateException(
                    "A verified payment attempt "
                    + "cannot create another order.");
        }

        attempt.setRazorpayOrderId(razorpayOrderId);
        attempt.setStatus(PaymentAttemptStatus.ORDER_CREATED);
        attempt.setFailureReason(null);

        repository.saveAndFlush(attempt);
    }

    // =========================================================
    // GET PAYMENT ATTEMPT BY RAZORPAY ORDER
    // =========================================================

    @Transactional(
            readOnly = true,
            propagation = Propagation.REQUIRES_NEW)
    public PaymentAttempt getAttemptByOrderId(
            String razorpayOrderId) {

        if (razorpayOrderId == null
                || razorpayOrderId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay order ID is required.");
        }

        return findByOrderId(razorpayOrderId);
    }

    // =========================================================
    // MARK PAYMENT VERIFIED
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPaymentVerified(
            String razorpayOrderId,
            String razorpayPaymentId) {

        if (razorpayPaymentId == null
                || razorpayPaymentId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay payment ID is required.");
        }

        PaymentAttempt attempt =
                findByOrderId(razorpayOrderId);

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId()
                        .equals(razorpayPaymentId)) {

            throw new IllegalStateException(
                    "This order is already associated "
                    + "with another payment.");
        }

        if (attempt.getStatus()
                == PaymentAttemptStatus.PURCHASE_COMPLETED) {

            // Preserve idempotency for completed purchases.
            return;
        }

        if (attempt.getRazorpayOrderId() == null) {

            throw new IllegalStateException(
                    "Payment order has not been created.");
        }

        attempt.setRazorpayPaymentId(razorpayPaymentId);
        attempt.setStatus(PaymentAttemptStatus.PAYMENT_VERIFIED);
        attempt.setFailureReason(null);

        repository.saveAndFlush(attempt);
    }

    // =========================================================
    // MARK PURCHASE COMPLETED
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPurchaseCompleted(
            String razorpayOrderId,
            String razorpayPaymentId) {

        if (razorpayPaymentId == null
                || razorpayPaymentId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay payment ID is required.");
        }

        PaymentAttempt attempt =
                findByOrderId(razorpayOrderId);

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId()
                        .equals(razorpayPaymentId)) {

            throw new IllegalStateException(
                    "The payment attempt has "
                    + "a different payment ID.");
        }

        if (attempt.getStatus()
                == PaymentAttemptStatus.PURCHASE_COMPLETED) {

            return;
        }

        if (attempt.getStatus()
                != PaymentAttemptStatus.PAYMENT_VERIFIED) {

            throw new IllegalStateException(
                    "Payment must be verified before "
                    + "marking the purchase completed.");
        }

        attempt.setRazorpayPaymentId(razorpayPaymentId);
        attempt.setStatus(PaymentAttemptStatus.PURCHASE_COMPLETED);
        attempt.setFailureReason(null);

        repository.saveAndFlush(attempt);
    }

    // =========================================================
    // MARK RECONCILIATION REQUIRED
    // =========================================================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReconciliationRequired(
            String attemptReference,
            String reason) {

        PaymentAttempt attempt =
                findByReference(attemptReference);

        if (attempt.getStatus()
                == PaymentAttemptStatus.PURCHASE_COMPLETED) {

            return;
        }

        attempt.setStatus(
                PaymentAttemptStatus.REQUIRES_RECONCILIATION);

        attempt.setFailureReason(
                limit(reason, 500));

        repository.saveAndFlush(attempt);
    }

    // =========================================================
    // RENEWAL PAYMENT ATTEMPT HISTORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<PaymentAttempt> getRenewalAttempts(
            Long originalPolicyNumber) {

        if (originalPolicyNumber == null
                || originalPolicyNumber <= 0) {

            throw new IllegalArgumentException(
                    "A valid original policy number is required.");
        }

        return repository
                .findByRenewalSourcePolicyNumberOrderByCreatedAtDesc(
                        originalPolicyNumber);
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    private void validatePaymentDetails(
            String username,
            Long planId,
            BigDecimal coverageAmount,
            Integer durationYears,
            BigDecimal calculatedPremium,
            String currency) {

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "An authenticated user is required.");
        }

        if (planId == null || planId <= 0) {
            throw new IllegalArgumentException(
                    "A valid insurance plan is required.");
        }

        if (coverageAmount == null
                || coverageAmount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Coverage amount must be positive.");
        }

        if (durationYears == null || durationYears <= 0) {
            throw new IllegalArgumentException(
                    "Policy duration must be positive.");
        }

        if (calculatedPremium == null
                || calculatedPremium.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Payment premium must be positive.");
        }

        if (!"INR".equalsIgnoreCase(currency)) {
            throw new IllegalArgumentException(
                    "Only INR currency is supported.");
        }
    }

    // =========================================================
    // INTERNAL LOOKUPS
    // =========================================================

    private PaymentAttempt findByReference(
            String reference) {

        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException(
                    "Payment attempt reference is required.");
        }

        return repository.findByAttemptReference(reference)
                .orElseThrow(() -> new IllegalStateException(
                        "Payment attempt was not found."));
    }

    private PaymentAttempt findByOrderId(
            String orderId) {

        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException(
                    "Razorpay order ID is required.");
        }

        return repository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No payment attempt was found "
                        + "for this Razorpay order."));
    }

    // =========================================================
    // RECONCILIATION ERROR MESSAGE
    // =========================================================

    private String limit(String value, int maxLength) {

        if (value == null || value.isBlank()) {
            return "Payment operation requires reconciliation.";
        }

        String cleaned =
                value.replaceAll("[\\r\\n\\t]", " ");

        return cleaned.length() <= maxLength
                ? cleaned
                : cleaned.substring(0, maxLength);
    }
}

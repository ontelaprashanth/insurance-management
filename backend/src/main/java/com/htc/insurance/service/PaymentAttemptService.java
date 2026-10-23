
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;
import com.htc.insurance.repository.PaymentAttemptRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentAttemptService {

    private static final String PURCHASE_TYPE_NEW = "NEW";
    private static final String PURCHASE_TYPE_RENEWAL = "RENEWAL";

    // =========================================================
    // DEPENDENCY INJECTION - LOMBOK
    // =========================================================

    private final PaymentAttemptRepository repository;

    // =========================================================
    // NORMAL POLICY PURCHASE - CREATE PAYMENT ATTEMPT
    // =========================================================

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
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

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
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
        attempt.setCurrency(currency.trim().toUpperCase(
                java.util.Locale.ROOT));

        attempt.setStatus(
                PaymentAttemptStatus.ORDER_CREATING);

        return attempt;
    }

    // =========================================================
    // MARK RAZORPAY ORDER CREATED
    // =========================================================

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void markOrderCreated(
            String attemptReference,
            String razorpayOrderId) {

        requireText(razorpayOrderId,
                "A Razorpay order ID is required.");

        PaymentAttempt attempt =
                findByReferenceForUpdate(attemptReference);

        if (attempt.getRazorpayOrderId() != null
                && !attempt.getRazorpayOrderId()
                        .equals(razorpayOrderId)) {

            throw new IllegalStateException(
                    "The payment attempt is already "
                    + "associated with another order.");
        }

        PaymentAttemptStatus status = attempt.getStatus();

        if (status == PaymentAttemptStatus.PURCHASE_COMPLETED
                || status == PaymentAttemptStatus.PAYMENT_VERIFIED) {

            if (razorpayOrderId.equals(
                    attempt.getRazorpayOrderId())) {
                return;
            }

            throw new IllegalStateException(
                    "A verified or completed attempt "
                    + "cannot create another order.");
        }

        if (status == PaymentAttemptStatus.ORDER_CREATED) {

            if (razorpayOrderId.equals(
                    attempt.getRazorpayOrderId())) {
                return;
            }

            throw new IllegalStateException(
                    "The attempt already has an order.");
        }

        if (status == PaymentAttemptStatus.REQUIRES_RECONCILIATION) {

            // Save the verified order ID without clearing
            // the reconciliation flag.
            attempt.setRazorpayOrderId(razorpayOrderId);
            repository.saveAndFlush(attempt);
            return;
        }

        if (status != PaymentAttemptStatus.ORDER_CREATING) {

            throw new IllegalStateException(
                    "The payment attempt is not in "
                    + "an order-creating state.");
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

        requireText(razorpayOrderId,
                "Razorpay order ID is required.");

        return repository.findByRazorpayOrderId(
                        razorpayOrderId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No payment attempt was found "
                                + "for this Razorpay order."));
    }

    // =========================================================
    // MARK PAYMENT VERIFIED
    // =========================================================

    /**
     * Call this only after trusted Razorpay verification
     * has confirmed the payment is captured.
     *
     * Uses REQUIRES_NEW so the verified payment can
     * survive a later purchase transaction rollback.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void markPaymentVerified(
            String razorpayOrderId,
            String razorpayPaymentId) {

        requireText(razorpayOrderId,
                "Razorpay order ID is required.");

        requireText(razorpayPaymentId,
                "Razorpay payment ID is required.");

        PaymentAttempt attempt =
                findByOrderIdForUpdate(razorpayOrderId);

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId()
                        .equals(razorpayPaymentId)) {

            throw new IllegalStateException(
                    "This order is already associated "
                    + "with another payment.");
        }

        PaymentAttemptStatus status = attempt.getStatus();

        if (status == PaymentAttemptStatus.PURCHASE_COMPLETED) {

            if (!razorpayPaymentId.equals(
                    attempt.getRazorpayPaymentId())) {

                throw new IllegalStateException(
                        "Completed attempt has a different "
                        + "or missing payment ID.");
            }

            return;
        }

        if (status == PaymentAttemptStatus.PAYMENT_VERIFIED) {

            if (razorpayPaymentId.equals(
                    attempt.getRazorpayPaymentId())) {
                return;
            }

            throw new IllegalStateException(
                    "Verified attempt has a conflicting payment ID.");
        }

        if (status != PaymentAttemptStatus.ORDER_CREATED
                && status != PaymentAttemptStatus.REQUIRES_RECONCILIATION) {

            throw new IllegalStateException(
                    "The payment order is not ready "
                    + "for payment verification.");
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

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void markPurchaseCompleted(
            String razorpayOrderId,
            String razorpayPaymentId) {

        requireText(razorpayOrderId,
                "Razorpay order ID is required.");

        requireText(razorpayPaymentId,
                "Razorpay payment ID is required.");

        PaymentAttempt attempt =
                findByOrderIdForUpdate(razorpayOrderId);

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId()
                        .equals(razorpayPaymentId)) {

            throw new IllegalStateException(
                    "The payment attempt has "
                    + "a different payment ID.");
        }

        if (attempt.getStatus()
                == PaymentAttemptStatus.PURCHASE_COMPLETED) {

            if (!razorpayPaymentId.equals(
                    attempt.getRazorpayPaymentId())) {

                throw new IllegalStateException(
                    "Completed purchase has a missing "
                    + "or conflicting payment ID.");
            }

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

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void markReconciliationRequired(
            String attemptReference,
            String reason) {

        PaymentAttempt attempt =
                findByReferenceForUpdate(attemptReference);

        if (attempt.getStatus()
                == PaymentAttemptStatus.PURCHASE_COMPLETED) {
            return;
        }

        // Preserve existing Razorpay order and payment IDs.
        // Reconciliation must not discard known external IDs.

        attempt.setStatus(
                PaymentAttemptStatus.REQUIRES_RECONCILIATION);

        attempt.setFailureReason(limit(reason, 500));

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
    // VALIDATE PAYMENT DETAILS
    // =========================================================

    private void validatePaymentDetails(
            String username,
            Long planId,
            BigDecimal coverageAmount,
            Integer durationYears,
            BigDecimal calculatedPremium,
            String currency) {

        requireText(username,
                "An authenticated user is required.");

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
    // LOCKED LOOKUPS FOR STATUS UPDATES
    // =========================================================

    private PaymentAttempt findByReferenceForUpdate(
            String reference) {

        requireText(reference,
                "Payment attempt reference is required.");

        return repository
                .findByAttemptReferenceForUpdate(reference)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Payment attempt was not found."));
    }

    private PaymentAttempt findByOrderIdForUpdate(
            String orderId) {

        requireText(orderId,
                "Razorpay order ID is required.");

        return repository
                .findByRazorpayOrderIdForUpdate(orderId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No payment attempt was found "
                                + "for this Razorpay order."));
    }

    // =========================================================
    // COMMON HELPERS
    // =========================================================

    private void requireText(
            String value,
            String message) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

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

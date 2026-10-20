package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;
import com.htc.insurance.repository.PaymentAttemptRepository;

@Service
public class PaymentAttemptService {

    private final PaymentAttemptRepository repository;

    public PaymentAttemptService(PaymentAttemptRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String createAttempt(
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

        PaymentAttempt attempt = new PaymentAttempt();
        attempt.setAttemptReference(
                "INSX_" + UUID.randomUUID().toString().replace("-", ""));
        attempt.setUsername(username);
        attempt.setPlanId(planId);
        attempt.setCoverageAmount(coverageAmount);
        attempt.setDurationYears(durationYears);
        attempt.setCalculatedPremium(calculatedPremium);
        attempt.setCurrency(currency);
        attempt.setStatus(PaymentAttemptStatus.ORDER_CREATING);

        return repository.saveAndFlush(attempt).getAttemptReference();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markOrderCreated(
            String attemptReference,
            String razorpayOrderId) {

        PaymentAttempt attempt = findByReference(attemptReference);

        if (razorpayOrderId == null || razorpayOrderId.isBlank()) {
            throw new IllegalArgumentException(
                    "A Razorpay order ID is required.");
        }

        if (attempt.getRazorpayOrderId() != null
                && !attempt.getRazorpayOrderId().equals(razorpayOrderId)) {
            throw new IllegalStateException(
                    "The payment attempt is already associated with another order.");
        }

        attempt.setRazorpayOrderId(razorpayOrderId);
        attempt.setStatus(PaymentAttemptStatus.ORDER_CREATED);
        attempt.setFailureReason(null);

        repository.saveAndFlush(attempt);
    }

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public PaymentAttempt getAttemptByOrderId(String razorpayOrderId) {

        if (razorpayOrderId == null || razorpayOrderId.isBlank()) {
            throw new IllegalArgumentException(
                    "Razorpay order ID is required.");
        }

        return repository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No payment attempt was found for this Razorpay order."));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPaymentVerified(
            String razorpayOrderId,
            String razorpayPaymentId) {

        PaymentAttempt attempt = findByOrderId(razorpayOrderId);

        if (razorpayPaymentId == null || razorpayPaymentId.isBlank()) {
            throw new IllegalArgumentException(
                    "Razorpay payment ID is required.");
        }

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId().equals(razorpayPaymentId)) {
            throw new IllegalStateException(
                    "This order is already associated with another payment.");
        }

        if (attempt.getStatus() == PaymentAttemptStatus.PURCHASE_COMPLETED) {
            return;
        }

        attempt.setRazorpayPaymentId(razorpayPaymentId);
        attempt.setStatus(PaymentAttemptStatus.PAYMENT_VERIFIED);
        attempt.setFailureReason(null);

        repository.saveAndFlush(attempt);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPurchaseCompleted(
            String razorpayOrderId,
            String razorpayPaymentId) {

        PaymentAttempt attempt = findByOrderId(razorpayOrderId);

        if (attempt.getRazorpayPaymentId() != null
                && !attempt.getRazorpayPaymentId().equals(razorpayPaymentId)) {
            throw new IllegalStateException(
                    "The payment attempt has a different payment ID.");
        }

        if (attempt.getStatus() != PaymentAttemptStatus.PURCHASE_COMPLETED) {
            attempt.setRazorpayPaymentId(razorpayPaymentId);
            attempt.setStatus(PaymentAttemptStatus.PURCHASE_COMPLETED);
            attempt.setFailureReason(null);

            repository.saveAndFlush(attempt);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReconciliationRequired(
            String attemptReference,
            String reason) {

        PaymentAttempt attempt = findByReference(attemptReference);

        if (attempt.getStatus() == PaymentAttemptStatus.PURCHASE_COMPLETED) {
            return;
        }

        attempt.setStatus(
                PaymentAttemptStatus.REQUIRES_RECONCILIATION);
        attempt.setFailureReason(limit(reason, 500));

        repository.saveAndFlush(attempt);
    }

    private PaymentAttempt findByReference(String reference) {
        return repository.findByAttemptReference(reference)
                .orElseThrow(() -> new IllegalStateException(
                        "Payment attempt was not found."));
    }

    private PaymentAttempt findByOrderId(String orderId) {
        return repository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No payment attempt was found for this Razorpay order."));
    }

    private String limit(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "Payment operation requires reconciliation.";
        }

        String cleaned = value.replaceAll("[\\r\\n\\t]", " ");

        return cleaned.length() <= maxLength
                ? cleaned
                : cleaned.substring(0, maxLength);
    }
}


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

        PaymentAttempt attempt = findAttempt(attemptReference);

        attempt.setRazorpayOrderId(razorpayOrderId);
        attempt.setStatus(PaymentAttemptStatus.ORDER_CREATED);
        attempt.setFailureReason(null);

        repository.saveAndFlush(attempt);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReconciliationRequired(
            String attemptReference,
            String reason) {

        PaymentAttempt attempt = findAttempt(attemptReference);

        attempt.setStatus(
                PaymentAttemptStatus.REQUIRES_RECONCILIATION);

        // Keep diagnostic text generic; never store credentials,
        // signatures, or full payment request data.
        attempt.setFailureReason(limit(reason, 500));

        repository.saveAndFlush(attempt);
    }

    private PaymentAttempt findAttempt(String reference) {
        return repository.findByAttemptReference(reference)
                .orElseThrow(() -> new IllegalStateException(
                        "Payment attempt was not found."));
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

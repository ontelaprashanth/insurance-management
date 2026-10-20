package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyPurchaseDao;
import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.entity.PolicyPurchase;

@Service
public class RefundPreparationService {

    private static final long REFUND_WINDOW_HOURS = 24;

    private final PolicyPurchaseDao policyPurchaseDao;

    public RefundPreparationService(
            PolicyPurchaseDao policyPurchaseDao) {
        this.policyPurchaseDao = policyPurchaseDao;
    }

    /**
     * Validates and commits the pending refund state.
     *
     * This method must be invoked through the Spring-managed
     * service bean so that its transaction commits before the
     * caller contacts Razorpay.
     */
    @Transactional
    public PolicyPurchase prepareRefund(
            RefundRequestDto request,
            String authenticatedUsername) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Refund request is required.");
        }

        if (request.getPurchaseId() == null) {
            throw new IllegalArgumentException(
                    "Purchase ID is required.");
        }

        if (authenticatedUsername == null
                || authenticatedUsername.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated user is required.");
        }

        String reason = request.getRefundReason() == null
                ? ""
                : request.getRefundReason().trim();

        if (reason.isBlank()) {
            throw new IllegalArgumentException(
                    "Refund reason is required.");
        }

        if (reason.length() > 500) {
            throw new IllegalArgumentException(
                    "Refund reason cannot exceed 500 characters.");
        }

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(
                                request.getPurchaseId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Purchase not found."));

        // Verify that this purchase belongs to the caller.
        if (purchase.getPolicy() == null
                || purchase.getPolicy().getPolicyHolder() == null
                || purchase.getPolicy()
                        .getPolicyHolder().getUser() == null) {

            throw new IllegalStateException(
                    "Purchase ownership information is unavailable.");
        }

        String ownerUsername = purchase.getPolicy()
                .getPolicyHolder()
                .getUser()
                .getUsername();

        if (ownerUsername == null
                || !ownerUsername.equalsIgnoreCase(
                        authenticatedUsername.trim())) {

            throw new org.springframework.security.access
                    .AccessDeniedException(
                            "You are not authorized to refund this purchase.");
        }

        // Only completed payments may be refunded.
        String paymentStatus = purchase.getPaymentStatus();

        if (paymentStatus == null
                || !"PAID".equalsIgnoreCase(
                        paymentStatus.trim())) {

            throw new IllegalStateException(
                    "Only paid purchases can be refunded.");
        }

        // Require a confirmed Razorpay payment ID.
        if (purchase.getRazorpayPaymentId() == null
                || purchase.getRazorpayPaymentId().isBlank()) {

            throw new IllegalStateException(
                    "The Razorpay payment ID is missing.");
        }

        // One refund per purchase with the current entity design.
        String refundStatus = purchase.getRefundStatus();

        if (refundStatus != null
                && !"NOT_REFUNDED".equalsIgnoreCase(
                        refundStatus.trim())) {

            throw new IllegalStateException(
                    "This purchase already has a refund in progress "
                    + "or has previously been refunded. Current status: "
                    + refundStatus);
        }

        BigDecimal refundAmount = purchase.getTotalPremium();

        if (refundAmount == null
                || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalStateException(
                    "The purchase has no valid refundable amount.");
        }

        // Enforce the existing 24-hour eligibility rule.
        LocalDateTime paymentDateTime =
                purchase.getPaymentDateTime();

        if (paymentDateTime == null) {
            throw new IllegalStateException(
                    "Payment timestamp is unavailable. "
                    + "Refund eligibility cannot be verified.");
        }

        LocalDateTime now = LocalDateTime.now();

        if (paymentDateTime.isAfter(now)) {
            throw new IllegalStateException(
                    "The payment timestamp is invalid.");
        }

        LocalDateTime deadline =
                paymentDateTime.plusHours(REFUND_WINDOW_HOURS);

        if (!now.isBefore(deadline)) {
            throw new IllegalStateException(
                    "The 24-hour refund window has expired.");
        }

        /*
         * Persist the pending state before the external API call.
         * Do not clear REFUND_PENDING automatically if the
         * subsequent Razorpay response is uncertain.
         */
        purchase.setRefundStatus("REFUND_PENDING");
        purchase.setRefundAmount(refundAmount);
        purchase.setRefundReason(reason);
        purchase.setRefundId(null);
        purchase.setRefundDateTime(null);

        return policyPurchaseDao.savePurchase(purchase);
    }
}

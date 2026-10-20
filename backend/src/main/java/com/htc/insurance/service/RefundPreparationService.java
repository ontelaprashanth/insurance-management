
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.dto.RefundRequestDto;

import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyPurchase;

@Service
public class RefundPreparationService {

    private static final long REFUND_WINDOW_HOURS = 24;

    private final PolicyPurchaseDao policyPurchaseDao;
    private final PolicyDao policyDao;
    private final ClaimsDao claimsDao;

    public RefundPreparationService(
            PolicyPurchaseDao policyPurchaseDao,
            PolicyDao policyDao,
            ClaimsDao claimsDao) {

        this.policyPurchaseDao = policyPurchaseDao;
        this.policyDao = policyDao;
        this.claimsDao = claimsDao;
    }

    // =========================================================
    // PREPARE REFUND
    // =========================================================

    /**
     * Validates refund eligibility and commits REFUND_PENDING.
     *
     * Rejects automatic refunds when claims already exist.
     *
     * Deactivates the policy within the same transaction.
     *
     * Razorpay must only be called after this transaction
     * commits successfully.
     */
    @Transactional
    public PolicyPurchase prepareRefund(
            RefundRequestDto request,
            String authenticatedUsername) {

        // =====================================================
        // VALIDATE REQUEST
        // =====================================================

        if (request == null) {
            throw new IllegalArgumentException(
                    "Refund request is required.");
        }

        if (request.getPurchaseId() == null
                || request.getPurchaseId() <= 0) {

            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
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

        // =====================================================
        // LOAD PURCHASE WITH DATABASE LOCK
        // =====================================================

        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByIdForUpdate(
                        request.getPurchaseId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Purchase not found."));

        // =====================================================
        // VERIFY OWNERSHIP
        // =====================================================

        Policy policy = purchase.getPolicy();

        if (policy == null
                || policy.getPolicyNumber() == null
                || policy.getPolicyHolder() == null
                || policy.getPolicyHolder().getUser() == null) {

            throw new IllegalStateException(
                    "Purchase ownership information is unavailable.");
        }

        String ownerUsername = policy
                .getPolicyHolder()
                .getUser()
                .getUsername();

        if (ownerUsername == null
                || !ownerUsername.equalsIgnoreCase(
                        authenticatedUsername.trim())) {

            throw new AccessDeniedException(
                    "You are not authorized to refund this purchase.");
        }

        // =====================================================
        // VERIFY PAYMENT
        // =====================================================

        String paymentStatus = purchase.getPaymentStatus();

        if (paymentStatus == null
                || !"PAID".equalsIgnoreCase(
                        paymentStatus.trim())) {

            throw new IllegalStateException(
                    "Only paid purchases can be refunded.");
        }

        if (purchase.getRazorpayPaymentId() == null
                || purchase.getRazorpayPaymentId().isBlank()) {

            throw new IllegalStateException(
                    "The Razorpay payment ID is missing.");
        }

        // =====================================================
        // PREVENT DUPLICATE REFUNDS
        // =====================================================

        String refundStatus = purchase.getRefundStatus();

        if (refundStatus != null
                && !"NOT_REFUNDED".equalsIgnoreCase(
                        refundStatus.trim())) {

            throw new IllegalStateException(
                    "This purchase already has a refund in progress "
                    + "or has previously been refunded. Current status: "
                    + refundStatus);
        }

        // =====================================================
        // VALIDATE REFUND AMOUNT
        // =====================================================

        BigDecimal refundAmount = purchase.getTotalPremium();

        if (refundAmount == null
                || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalStateException(
                    "The purchase has no valid refundable amount.");
        }

        // =====================================================
        // ENFORCE 24-HOUR REFUND WINDOW
        // =====================================================

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

        // =====================================================
        // BLOCK REFUNDS WHEN CLAIMS EXIST
        // =====================================================

        if (hasExistingClaims(policy.getPolicyNumber())) {

            throw new IllegalStateException(
                    "Refund cannot be requested because "
                    + "a claim has already been submitted "
                    + "against this policy. "
                    + "Please contact support for review.");
        }

        // =====================================================
        // SAVE REFUND PENDING STATE
        // =====================================================

        purchase.setRefundStatus("REFUND_PENDING");
        purchase.setRefundAmount(refundAmount);
        purchase.setRefundReason(reason);
        purchase.setRefundId(null);
        purchase.setRefundDateTime(null);

        // =====================================================
        // DEACTIVATE POLICY
        // =====================================================

        policy.setIsActive(false);

        // =====================================================
        // SAVE BOTH IN SAME TRANSACTION
        // =====================================================

        policyDao.savePolicy(policy);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // CHECK WHETHER POLICY HAS EXISTING CLAIMS
    // =========================================================

    private boolean hasExistingClaims(Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalStateException(
                    "Policy number is required.");
        }

        List<Claims> claims = claimsDao.getAllClaims();

        if (claims == null) {
            throw new IllegalStateException(
                    "Unable to verify existing claims.");
        }

        return claims.stream()
                .filter(claim -> claim != null)
                .filter(claim -> claim.getPolicy() != null)
                .anyMatch(claim ->
                        policyNumber.equals(
                                claim.getPolicy()
                                        .getPolicyNumber()));
    }
}

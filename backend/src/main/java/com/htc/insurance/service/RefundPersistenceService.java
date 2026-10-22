
package com.htc.insurance.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.entity.RefundAttemptStatus;

import com.htc.insurance.repository.RefundAttemptRepository;

@Service
public class RefundPersistenceService {

    private static final String REFUND_PENDING =
            "REFUND_PENDING";

    private static final String REFUND_PROCESSING =
            "REFUND_PROCESSING";

    private static final String REFUNDED =
            "REFUNDED";

    private static final String REFUND_FAILED =
            "REFUND_FAILED";

    private static final String RECONCILIATION =
            "REFUND_REQUIRES_RECONCILIATION";

    private final PolicyPurchaseDao policyPurchaseDao;
    private final PolicyDao policyDao;
    private final RefundAttemptRepository refundAttemptRepository;

    public RefundPersistenceService(
            PolicyPurchaseDao policyPurchaseDao,
            PolicyDao policyDao,
            RefundAttemptRepository refundAttemptRepository) {

        this.policyPurchaseDao = policyPurchaseDao;
        this.policyDao = policyDao;
        this.refundAttemptRepository = refundAttemptRepository;
    }

    // =========================================================
    // REFUND ACCEPTED BY RAZORPAY
    // =========================================================

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase markRefundProcessing(
            Long purchaseId,
            String razorpayRefundId) {

        validateRefundId(razorpayRefundId);

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        RefundAttempt attempt = requireAttempt(purchaseId);

        validateExistingRefundId(
                purchase.getRefundId(),
                razorpayRefundId);

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                razorpayRefundId);

        // A verified completed refund must never
        // be downgraded to PROCESSING.
        if (REFUNDED.equalsIgnoreCase(
                purchase.getRefundStatus())
                || attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED) {

            if (!REFUNDED.equalsIgnoreCase(
                    purchase.getRefundStatus())
                    || attempt.getStatus()
                        != RefundAttemptStatus.REFUNDED) {

                throw new IllegalStateException(
                        "Refund records are inconsistent. "
                        + "Reconciliation is required.");
            }

            markPolicyRefunded(policy);

            return purchase;
        }

        if (REFUND_FAILED.equalsIgnoreCase(
                purchase.getRefundStatus())
                || attempt.getStatus()
                    == RefundAttemptStatus.FAILED) {

            throw new IllegalStateException(
                    "Razorpay reported a failed refund. "
                    + "Do not reset it to PROCESSING.");
        }

        String currentStatus = purchase.getRefundStatus();

        if (!REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUND_PROCESSING.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not awaiting refund processing.");
        }

        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUND_PROCESSING);

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.PROCESSING);
        attempt.setFailureReason(null);

        // Refund is still processing.
        // Policy must remain unavailable for claims.
        markPolicyRefundPending(policy);

        refundAttemptRepository.save(attempt);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // REFUND COMPLETED AND VERIFIED WITH RAZORPAY
    // =========================================================

    /**
     * IMPORTANT:
     * This method must only be called after the caller
     * has verified Razorpay's processed refund status,
     * refund ID, payment ID and refund amount.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase markRefunded(
            Long purchaseId,
            String razorpayRefundId) {

        validateRefundId(razorpayRefundId);

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        RefundAttempt attempt = requireAttempt(purchaseId);

        validateExistingRefundId(
                purchase.getRefundId(),
                razorpayRefundId);

        validateExistingRefundId(
                attempt.getRazorpayRefundId(),
                razorpayRefundId);

        // Idempotent handling for repeated webhooks.
        if (REFUNDED.equalsIgnoreCase(
                purchase.getRefundStatus())
                && attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED) {

            markPolicyRefunded(policy);

            return purchase;
        }

        String currentStatus = purchase.getRefundStatus();

        if (!REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)
                && !REFUNDED.equalsIgnoreCase(currentStatus)
                && !REFUND_PENDING.equalsIgnoreCase(currentStatus)
                && !REFUND_FAILED.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase is not ready for refund completion.");
        }

        // Caller must independently verify Razorpay
        // before invoking this method.
        purchase.setRefundId(razorpayRefundId);
        purchase.setRefundStatus(REFUNDED);

        if (purchase.getRefundDateTime() == null) {
            purchase.setRefundDateTime(LocalDateTime.now());
        }

        attempt.setRazorpayRefundId(razorpayRefundId);
        attempt.setStatus(RefundAttemptStatus.REFUNDED);
        attempt.setFailureReason(null);

        // Purchase and policy update atomically.
        markPolicyRefunded(policy);

        refundAttemptRepository.save(attempt);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // RECOVER VERIFIED REFUND WITHOUT ATTEMPT
    // =========================================================

    /**
     * Repairs a purchase after Razorpay has independently
     * confirmed that the refund is processed.
     *
     * Does not create another Razorpay refund.
     *
     * Caller must verify:
     * - Refund status = processed
     * - Refund ID
     * - Original payment ID
     * - Exact refund amount
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public PolicyPurchase recoverProcessedRefundWithoutAttempt(
            Long purchaseId,
            String razorpayRefundId,
            String verifiedPaymentId,
            long verifiedAmountInPaise) {

        validateRefundId(razorpayRefundId);

        if (verifiedAmountInPaise <= 0) {
            throw new IllegalArgumentException(
                    "Verified refund amount must be positive.");
        }

        LockedRefundContext context =
                lockPolicyAndPurchase(purchaseId);

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        if (purchase.getRefundId() == null
                || !purchase.getRefundId()
                    .equals(razorpayRefundId)) {

            throw new IllegalStateException(
                    "Purchase refund ID does not match "
                    + "the verified Razorpay refund.");
        }

        if (verifiedPaymentId == null
                || purchase.getRazorpayPaymentId() == null
                || !purchase.getRazorpayPaymentId()
                    .equals(verifiedPaymentId)) {

            throw new IllegalStateException(
                    "Original Razorpay payment ID does not match.");
        }

        if (purchase.getRefundAmount() == null
                || purchase.getRefundAmount()
                    .movePointRight(2)
                    .longValueExact() != verifiedAmountInPaise) {

            throw new IllegalStateException(
                    "Refund amount does not match Razorpay.");
        }

        if (refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .isPresent()) {

            throw new IllegalStateException(
                    "Refund attempt now exists. "
                    + "Use normal reconciliation.");
        }

        String currentStatus = purchase.getRefundStatus();

        if (REFUNDED.equalsIgnoreCase(currentStatus)) {

            if (purchase.getRefundDateTime() == null) {
                purchase.setRefundDateTime(LocalDateTime.now());
            }

            markPolicyRefunded(policy);

            return policyPurchaseDao.savePurchase(purchase);
        }

        if (!REFUND_PROCESSING.equalsIgnoreCase(currentStatus)
                && !RECONCILIATION.equalsIgnoreCase(currentStatus)) {

            throw new IllegalStateException(
                    "Purchase status is not eligible "
                    + "for verified refund recovery.");
        }

        purchase.setRefundStatus(REFUNDED);

        if (purchase.getRefundDateTime() == null) {
            purchase.setRefundDateTime(LocalDateTime.now());
        }

        markPolicyRefunded(policy);

        return policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // UNCERTAIN REFUND OUTCOME
    // =========================================================

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void markReconciliationRequired(Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            return;
        }

        LockedRefundContext context =
                lockPolicyAndPurchaseIfPresent(purchaseId);

        if (context == null) {
            return;
        }

        PolicyPurchase purchase = context.purchase;
        Policy policy = context.policy;

        String status = purchase.getRefundStatus();

        if (REFUNDED.equalsIgnoreCase(status)) {

            markPolicyRefunded(policy);
            return;
        }

        if (REFUND_FAILED.equalsIgnoreCase(status)) {
            return;
        }

        RefundAttempt attempt = refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .orElse(null);

        if (attempt != null) {

            if (attempt.getStatus()
                    == RefundAttemptStatus.REFUNDED) {

                // Preserve inconsistency for reconciliation;
                // do not downgrade verified attempt status.
                return;
            }

            if (attempt.getStatus()
                    == RefundAttemptStatus.FAILED) {
                return;
            }

            if (attempt.getRazorpayRefundId() != null
                    && !attempt.getRazorpayRefundId().isBlank()) {
                return;
            }
        }

        if (REFUND_PROCESSING.equalsIgnoreCase(status)
                && purchase.getRefundId() != null
                && !purchase.getRefundId().isBlank()) {
            return;
        }

        if (RECONCILIATION.equalsIgnoreCase(status)) {
            return;
        }

        if (!REFUND_PENDING.equalsIgnoreCase(status)
                && !REFUND_PROCESSING.equalsIgnoreCase(status)) {
            return;
        }

        purchase.setRefundStatus(RECONCILIATION);

        if (attempt != null) {

            attempt.setStatus(
                    RefundAttemptStatus.REQUIRES_RECONCILIATION);

            refundAttemptRepository.save(attempt);
        }

        markPolicyRefundPending(policy);

        policyPurchaseDao.savePurchase(purchase);
    }

    // =========================================================
    // MARK POLICY REFUND PENDING
    // =========================================================

    private void markPolicyRefundPending(Policy policy) {

        if (policy == null) {
            throw new IllegalStateException(
                    "Refund policy is unavailable.");
        }

        if (policy.getLifecycleStatus()
                == PolicyLifecycleStatus.REFUNDED) {

            throw new IllegalStateException(
                    "A refunded policy cannot return "
                    + "to refund pending.");
        }

        policy.setIsActive(Boolean.FALSE);

        policy.setLifecycleStatus(
                PolicyLifecycleStatus.REFUND_PENDING);

        policyDao.savePolicy(policy);
    }

    // =========================================================
    // MARK POLICY REFUNDED
    // =========================================================

    private void markPolicyRefunded(Policy policy) {

        if (policy == null) {
            throw new IllegalStateException(
                    "Refund policy is unavailable.");
        }

        policy.setIsActive(Boolean.FALSE);

        policy.setLifecycleStatus(
                PolicyLifecycleStatus.REFUNDED);

        policyDao.savePolicy(policy);
    }

    // =========================================================
    // LOCK POLICY FIRST, PURCHASE SECOND
    // =========================================================

    private LockedRefundContext lockPolicyAndPurchase(
            Long purchaseId) {

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "Valid purchase ID is required.");
        }

        // Initial read only identifies the policy.
        PolicyPurchase initial =
                policyPurchaseDao.getPurchaseById(purchaseId);

        if (initial == null
                || initial.getPolicy() == null
                || initial.getPolicy().getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Purchase or associated policy not found.");
        }

        Long policyNumber =
                initial.getPolicy().getPolicyNumber();

        Policy policy =
                policyDao.getPolicyByIdForUpdate(policyNumber);

        if (policy == null) {
            throw new IllegalStateException(
                    "Policy not found.");
        }

        PolicyPurchase purchase =
                policyPurchaseDao
                        .getPurchaseByIdForUpdate(purchaseId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Purchase not found."));

        if (purchase.getPolicy() == null
                || !policyNumber.equals(
                        purchase.getPolicy().getPolicyNumber())) {

            throw new IllegalStateException(
                    "Purchase policy changed during processing.");
        }

        return new LockedRefundContext(policy, purchase);
    }

    // =========================================================
    // OPTIONAL LOCK FOR RECONCILIATION
    // =========================================================

    private LockedRefundContext lockPolicyAndPurchaseIfPresent(
            Long purchaseId) {

        PolicyPurchase initial =
                policyPurchaseDao.getPurchaseById(purchaseId);

        if (initial == null) {
            return null;
        }

        return lockPolicyAndPurchase(purchaseId);
    }

    // =========================================================
    // REQUIRE REFUND ATTEMPT
    // =========================================================

    private RefundAttempt requireAttempt(Long purchaseId) {

        return refundAttemptRepository
                .findByPurchaseId(purchaseId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Refund attempt not found."));
    }

    // =========================================================
    // VALIDATE REFUND ID
    // =========================================================

    private void validateRefundId(String refundId) {

        if (refundId == null || refundId.isBlank()) {
            throw new IllegalArgumentException(
                    "Razorpay refund ID is required.");
        }
    }

    // =========================================================
    // VALIDATE EXISTING REFUND ID
    // =========================================================

    private void validateExistingRefundId(
            String existingRefundId,
            String incomingRefundId) {

        if (existingRefundId != null
                && !existingRefundId.isBlank()
                && !existingRefundId.equals(incomingRefundId)) {

            throw new IllegalStateException(
                    "Existing Razorpay refund ID does not match.");
        }
    }

    // =========================================================
    // LOCKED CONTEXT
    // =========================================================

    private static final class LockedRefundContext {

        private final Policy policy;
        private final PolicyPurchase purchase;

        private LockedRefundContext(
                Policy policy,
                PolicyPurchase purchase) {

            this.policy = policy;
            this.purchase = purchase;
        }
    }
}

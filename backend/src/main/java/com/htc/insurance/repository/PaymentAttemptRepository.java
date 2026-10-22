
package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;

@Repository
public interface PaymentAttemptRepository
        extends JpaRepository<PaymentAttempt, Long> {

    // =========================================================
    // EXISTING PAYMENT ATTEMPT LOOKUPS
    // =========================================================

    Optional<PaymentAttempt> findByAttemptReference(
            String attemptReference
    );

    Optional<PaymentAttempt> findByRazorpayOrderId(
            String razorpayOrderId
    );

    Optional<PaymentAttempt> findByRazorpayPaymentId(
            String razorpayPaymentId
    );

    // =========================================================
    // CUSTOMER PAYMENT HISTORY
    // =========================================================

    List<PaymentAttempt> findByUsernameOrderByCreatedAtDesc(
            String username
    );

    // =========================================================
    // PAYMENT RECONCILIATION
    // =========================================================

    List<PaymentAttempt> findByStatusInOrderByCreatedAtAsc(
            List<PaymentAttemptStatus> statuses
    );

    // =========================================================
    // DUPLICATE RAZORPAY REFERENCE PROTECTION
    // =========================================================

    boolean existsByRazorpayOrderId(
            String razorpayOrderId
    );

    boolean existsByRazorpayPaymentId(
            String razorpayPaymentId
    );

    // =========================================================
    // POLICY RENEWAL - NEW METHODS
    // =========================================================

    /*
     * Retrieve all payment attempts created to renew an
     * original policy.
     *
     * Includes completed, failed and abandoned attempts.
     * Useful for reconciliation and payment history.
     */
    List<PaymentAttempt>
            findByRenewalSourcePolicyNumberOrderByCreatedAtDesc(
                    Long renewalSourcePolicyNumber
            );

    /*
     * Retrieve payment attempts by purchase type.
     *
     * Expected values:
     * NEW
     * RENEWAL
     *
     * Legacy records may have null purchaseType.
     */
    List<PaymentAttempt> findByPurchaseType(
            String purchaseType
    );

    /*
     * Check whether a particular original policy already
     * has a payment attempt with a given status.
     *
     * Useful for detecting pending renewal checkouts.
     *
     * This is advisory only. It does not replace
     * transaction locking or database uniqueness.
     */
    boolean existsByRenewalSourcePolicyNumberAndStatus(
            Long renewalSourcePolicyNumber,
            PaymentAttemptStatus status
    );
}

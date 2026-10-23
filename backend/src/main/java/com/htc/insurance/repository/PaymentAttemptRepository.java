
package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;

@Repository
public interface PaymentAttemptRepository
        extends JpaRepository<PaymentAttempt, Long> {

    // =========================================================
    // PAYMENT ATTEMPT LOOKUPS
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
    // POLICY RENEWAL PAYMENT HISTORY
    // =========================================================

    /**
     * Retrieves all payment attempts associated with
     * the specified original policy number.
     *
     * Includes pending, completed and reconciliation attempts.
     */
    List<PaymentAttempt>
    findByRenewalSourcePolicyNumberOrderByCreatedAtDesc(
            Long renewalSourcePolicyNumber
    );

    // =========================================================
    // FIND PAYMENT ATTEMPTS BY PURCHASE TYPE
    // =========================================================

    /**
     * Supported purchase types:
     * NEW
     * RENEWAL
     */
    List<PaymentAttempt> findByPurchaseType(
            String purchaseType
    );

    // =========================================================
    // CHECK RENEWAL ATTEMPT STATUS
    // =========================================================

    /**
     * Checks whether a renewal attempt exists
     * for the supplied policy and status.
     *
     * This is an advisory check and does not replace
     * database uniqueness constraints.
     */
    boolean existsByRenewalSourcePolicyNumberAndStatus(
            Long renewalSourcePolicyNumber,
            PaymentAttemptStatus status
    );

    // =========================================================
    // LOCK PAYMENT ATTEMPT BY REFERENCE
    // =========================================================

    /**
     * Acquires a pessimistic write lock on the payment attempt.
     *
     * Must execute within an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT a
           FROM PaymentAttempt a
           WHERE a.attemptReference = :reference
           """)
    Optional<PaymentAttempt> findByAttemptReferenceForUpdate(
            @Param("reference") String reference
    );

    // =========================================================
    // LOCK PAYMENT ATTEMPT BY RAZORPAY ORDER ID
    // =========================================================

    /**
     * Acquires a pessimistic write lock before updating
     * a payment associated with the Razorpay order.
     *
     * Must execute within an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT a
           FROM PaymentAttempt a
           WHERE a.razorpayOrderId = :orderId
           """)
    Optional<PaymentAttempt> findByRazorpayOrderIdForUpdate(
            @Param("orderId") String orderId
    );
}

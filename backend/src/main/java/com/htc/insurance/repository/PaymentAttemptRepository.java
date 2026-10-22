
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
    // POLICY RENEWAL - PAYMENT ATTEMPT HISTORY
    // =========================================================

    /**
     * Returns all payment attempts for an original policy.
     *
     * Includes:
     * - Pending renewal attempts
     * - Completed renewal attempts
     * - Attempts requiring reconciliation
     */
    List<PaymentAttempt>
            findByRenewalSourcePolicyNumberOrderByCreatedAtDesc(
                    Long renewalSourcePolicyNumber
            );

    // =========================================================
    // FIND BY PURCHASE TYPE
    // =========================================================

    /**
     * Supported purchase types:
     * NEW
     * RENEWAL
     *
     * Historical purchases may have a null purchase type.
     */
    List<PaymentAttempt> findByPurchaseType(
            String purchaseType
    );

    // =========================================================
    // CHECK RENEWAL ATTEMPT STATUS
    // =========================================================

    /**
     * Advisory duplicate-checking method.
     *
     * Does not replace database uniqueness constraints
     * or transactional locking.
     */
    boolean existsByRenewalSourcePolicyNumberAndStatus(
            Long renewalSourcePolicyNumber,
            PaymentAttemptStatus status
    );

    // =========================================================
    // LOCK PAYMENT ATTEMPT BY REFERENCE
    // =========================================================

    /**
     * Locks the payment attempt before updating
     * its Razorpay order or reconciliation status.
     *
     * Must execute inside an active transaction.
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
     * Locks the payment attempt before updating
     * a verified or completed payment.
     *
     * Prevents concurrent payment status changes.
     *
     * Must execute inside an active transaction.
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


package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.entity.RefundAttemptStatus;

@Repository
public interface RefundAttemptRepository
        extends JpaRepository<RefundAttempt, Long> {

    // =========================================================
    // FIND REFUND ATTEMPT BY PURCHASE ID
    // =========================================================

    Optional<RefundAttempt> findByPurchaseId(
            Long purchaseId
    );

    // =========================================================
    // FIND REFUND ATTEMPT BY RAZORPAY REFUND ID
    // =========================================================

    Optional<RefundAttempt> findByRazorpayRefundId(
            String razorpayRefundId
    );

    // =========================================================
    // FIND UNFINISHED REFUND ATTEMPTS
    // =========================================================

    List<RefundAttempt> findByStatusInOrderByCreatedAtAsc(
            List<RefundAttemptStatus> statuses
    );

    // =========================================================
    // CHECK EXISTING REFUND ATTEMPT
    // =========================================================

    boolean existsByPurchaseId(
            Long purchaseId
    );

    // =========================================================
    // LOCK REFUND ATTEMPT BY ID
    // =========================================================

    /**
     * Acquires a pessimistic write lock on the refund attempt.
     *
     * Must execute inside an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT r
           FROM RefundAttempt r
           WHERE r.refundAttemptId = :attemptId
           """)
    Optional<RefundAttempt> findByIdForUpdate(
            @Param("attemptId") Long attemptId
    );

    // =========================================================
    // LOCK REFUND ATTEMPT BY PURCHASE ID
    // =========================================================

    /**
     * Locks the refund attempt associated with a purchase.
     *
     * Used to coordinate refund status updates.
     *
     * Must execute inside an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT r
           FROM RefundAttempt r
           WHERE r.purchaseId = :purchaseId
           """)
    Optional<RefundAttempt> findByPurchaseIdForUpdate(
            @Param("purchaseId") Long purchaseId
    );

    // =========================================================
    // LOCK REFUND ATTEMPT BY RAZORPAY REFUND ID
    // =========================================================

    /**
     * Locks the refund attempt using its Razorpay refund ID.
     *
     * Useful during webhook processing and reconciliation.
     *
     * Must execute inside an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT r
           FROM RefundAttempt r
           WHERE r.razorpayRefundId = :refundId
           """)
    Optional<RefundAttempt> findByRazorpayRefundIdForUpdate(
            @Param("refundId") String refundId
    );
}

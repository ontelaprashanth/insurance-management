
package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PolicyPurchase;

@Repository
public interface PolicyPurchaseRepository
        extends JpaRepository<PolicyPurchase, Long> {

    // =========================================================
    // GET PURCHASE BY POLICY NUMBER
    // =========================================================

    Optional<PolicyPurchase> findByPolicyPolicyNumber(
            Long policyNumber);

    // =========================================================
    // GET PURCHASE BY TRANSACTION ID
    // =========================================================

    Optional<PolicyPurchase> findByTransactionId(
            String transactionId);

    // =========================================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // =========================================================

    Optional<PolicyPurchase> findByRazorpayOrderId(
            String razorpayOrderId);

    // =========================================================
    // GET ALL PURCHASES - ADMIN
    // =========================================================

    @Override
    List<PolicyPurchase> findAll();

    // =========================================================
    // GET PURCHASES BY USERNAME - USER
    // =========================================================

    List<PolicyPurchase> findByPolicyPolicyHolderUserUsername(
            String username);

    // =========================================================
    // GET PURCHASE BY ID WITH DATABASE WRITE LOCK
    // =========================================================

    /**
     * Used for refund processing.
     *
     * Must be called inside an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT p
           FROM PolicyPurchase p
           WHERE p.purchaseId = :purchaseId
           """)
    Optional<PolicyPurchase> findByIdForUpdate(
            @Param("purchaseId") Long purchaseId);

    // =========================================================
    // GET PURCHASE BY POLICY NUMBER WITH WRITE LOCK
    // =========================================================

    /**
     * Used to coordinate claim submission and refunds.
     *
     * Must be called inside an active transaction.
     *
     * Assumes each purchased policy has at most one
     * associated purchase record.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT p
           FROM PolicyPurchase p
           WHERE p.policy.policyNumber = :policyNumber
           """)
    Optional<PolicyPurchase> findByPolicyNumberForUpdate(
            @Param("policyNumber") Long policyNumber);

    // =========================================================
    // POLICY RENEWAL - NEW METHODS
    // =========================================================

    /**
     * Finds the completed renewal purchase associated with
     * an original purchase.
     *
     * Returns Optional because only one renewal purchase
     * may reference a particular original purchase.
     *
     * Database uniqueness is enforced by the
     * renewed_from_purchase_id constraint.
     */
    Optional<PolicyPurchase>
            findByRenewedFromPurchasePurchaseId(
                    Long originalPurchaseId);

    /**
     * Checks whether the original purchase has already
     * been renewed successfully.
     *
     * This is useful before creating another renewal order.
     *
     * The service must still use database locking because
     * this check alone cannot prevent concurrent requests.
     */
    boolean existsByRenewedFromPurchasePurchaseId(
            Long originalPurchaseId);

    /**
     * Finds purchases created through renewal.
     *
     * Useful for renewal history and administration.
     */
    List<PolicyPurchase> findByRenewedFromPurchaseIsNotNull();

    // =========================================================
    // FIND PURCHASES WITH UNFINISHED REFUNDS
    // =========================================================

    /**
     * Finds purchases that still display an unfinished
     * refund status.
     *
     * This is a read-only query.
     *
     * It allows reconciliation to identify a purchase
     * even when the associated RefundAttempt is not
     * currently PROCESSING.
     */
    @Query("""
           SELECT p
           FROM PolicyPurchase p
           WHERE UPPER(p.refundStatus) IN (
               'REFUND_PROCESSING',
               'PROCESSING',
               'REFUND_REQUIRES_RECONCILIATION'
           )
           ORDER BY p.purchaseId ASC
           """)
    List<PolicyPurchase> findPurchasesWithUnfinishedRefunds();
}

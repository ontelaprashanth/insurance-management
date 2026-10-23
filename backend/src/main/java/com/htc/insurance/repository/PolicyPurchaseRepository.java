
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
            Long policyNumber
    );

    // =========================================================
    // GET PURCHASE BY TRANSACTION ID
    // =========================================================

    Optional<PolicyPurchase> findByTransactionId(
            String transactionId
    );

    // =========================================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // =========================================================

    Optional<PolicyPurchase> findByRazorpayOrderId(
            String razorpayOrderId
    );

    // =========================================================
    // GET ALL PURCHASES - ADMIN
    // =========================================================

    @Override
    List<PolicyPurchase> findAll();

    // =========================================================
    // GET PURCHASES BY USERNAME - CUSTOMER
    // =========================================================

    List<PolicyPurchase> findByPolicyPolicyHolderUserUsername(
            String username
    );

    // =========================================================
    // LOCK PURCHASE BY ID
    // =========================================================

    /**
     * Acquires a pessimistic write lock.
     *
     * Used during refund processing.
     *
     * Must execute inside an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT p
           FROM PolicyPurchase p
           WHERE p.purchaseId = :purchaseId
           """)
    Optional<PolicyPurchase> findByIdForUpdate(
            @Param("purchaseId") Long purchaseId
    );

    // =========================================================
    // LOCK PURCHASE BY POLICY NUMBER
    // =========================================================

    /**
     * Coordinates claim submission and refund processing.
     *
     * Must execute inside an active transaction.
     *
     * Assumes each policy has at most one purchase record.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT p
           FROM PolicyPurchase p
           WHERE p.policy.policyNumber = :policyNumber
           """)
    Optional<PolicyPurchase> findByPolicyNumberForUpdate(
            @Param("policyNumber") Long policyNumber
    );

    // =========================================================
    // POLICY RENEWAL - FIND RENEWAL PURCHASE
    // =========================================================

    /**
     * Finds a renewal purchase associated with
     * the specified original purchase.
     *
     * The database uniqueness constraint on
     * renewed_from_purchase_id allows at most one.
     */
    Optional<PolicyPurchase>
    findByRenewedFromPurchasePurchaseId(
            Long originalPurchaseId
    );

    // =========================================================
    // POLICY RENEWAL - CHECK EXISTING RENEWAL
    // =========================================================

    /**
     * Checks whether a renewal purchase record exists.
     *
     * This check alone does not prevent concurrent
     * renewal requests.
     */
    boolean existsByRenewedFromPurchasePurchaseId(
            Long originalPurchaseId
    );

    // =========================================================
    // POLICY RENEWAL - PURCHASE HISTORY
    // =========================================================

    /**
     * Retrieves purchases that reference an
     * earlier purchase through renewal.
     */
    List<PolicyPurchase> findByRenewedFromPurchaseIsNotNull();

    // =========================================================
    // REFUND RECONCILIATION
    // =========================================================

    /**
     * Retrieves purchases with unfinished refund statuses.
     *
     * Includes:
     * REFUND_PROCESSING
     * PROCESSING
     * REFUND_REQUIRES_RECONCILIATION
     *
     * Oldest purchase ID first.
     *
     * This is a read-only query.
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

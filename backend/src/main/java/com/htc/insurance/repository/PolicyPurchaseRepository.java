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

    // ==========================================
    // GET PURCHASE BY POLICY NUMBER
    // ==========================================

    Optional<PolicyPurchase> findByPolicyPolicyNumber(
            Long policyNumber);


    // ==========================================
    // GET PURCHASE BY TRANSACTION ID
    // ==========================================

    Optional<PolicyPurchase> findByTransactionId(
            String transactionId);


    // ==========================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // ==========================================

    Optional<PolicyPurchase> findByRazorpayOrderId(
            String razorpayOrderId);


    // ==========================================
    // GET ALL PURCHASES
    // ADMIN
    // ==========================================

    @Override
    List<PolicyPurchase> findAll();


    // ==========================================
    // GET PURCHASES BY USERNAME
    // USER
    // ==========================================

    List<PolicyPurchase> findByPolicyPolicyHolderUserUsername(
            String username);


    // ==========================================
    // GET PURCHASE WITH DATABASE WRITE LOCK
    // REFUND PROCESSING
    // ==========================================

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT p
        FROM PolicyPurchase p
        WHERE p.purchaseId = :purchaseId
        """)
    Optional<PolicyPurchase> findByIdForUpdate(
            @Param("purchaseId") Long purchaseId);
}

package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PolicyPurchase;

@Repository
public interface PolicyPurchaseRepository
        extends JpaRepository<PolicyPurchase, Long> {

    // ==========================================
    // GET PURCHASE BY POLICY NUMBER
    // ==========================================

    Optional<PolicyPurchase> findByPolicyPolicyNumber(
            Long policyNumber
    );


    // ==========================================
    // GET PURCHASE BY TRANSACTION ID
    // ==========================================

    Optional<PolicyPurchase> findByTransactionId(
            String transactionId
    );


    // ==========================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // ==========================================

    Optional<PolicyPurchase> findByRazorpayOrderId(
            String razorpayOrderId
    );


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

    List<PolicyPurchase>
    findByPolicyPolicyHolderUserUsername(
            String username
    );
}
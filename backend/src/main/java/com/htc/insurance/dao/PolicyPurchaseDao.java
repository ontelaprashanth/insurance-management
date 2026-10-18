package com.htc.insurance.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.repository.PolicyPurchaseRepository;

@Repository
public class PolicyPurchaseDao {

    @Autowired
    private PolicyPurchaseRepository repository;


    // ==========================================
    // SAVE PURCHASE
    // ==========================================

    public PolicyPurchase savePurchase(
            PolicyPurchase purchase) {

        return repository.save(purchase);
    }


    // ==========================================
    // GET PURCHASE BY ID
    // ==========================================

    public PolicyPurchase getPurchaseById(
            Long purchaseId) {

        return repository.findById(
                purchaseId
        ).orElse(null);
    }


    // ==========================================
    // GET PURCHASE BY POLICY NUMBER
    // ==========================================

    public PolicyPurchase getPurchaseByPolicyNumber(
            Long policyNumber) {

        Optional<PolicyPurchase> purchase =
                repository.findByPolicyPolicyNumber(
                        policyNumber
                );

        return purchase.orElse(null);
    }


    // ==========================================
    // GET PURCHASE BY TRANSACTION ID
    // ==========================================

    public PolicyPurchase getPurchaseByTransactionId(
            String transactionId) {

        Optional<PolicyPurchase> purchase =
                repository.findByTransactionId(
                        transactionId
                );

        return purchase.orElse(null);
    }


    // ==========================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // ==========================================

    public PolicyPurchase getPurchaseByRazorpayOrderId(
            String razorpayOrderId) {

        Optional<PolicyPurchase> purchase =
                repository.findByRazorpayOrderId(
                        razorpayOrderId
                );

        return purchase.orElse(null);
    }


    // ==========================================
    // GET ALL PURCHASES
    // ADMIN
    // ==========================================

    public List<PolicyPurchase> getAllPurchases() {

        return repository.findAll();
    }


    // ==========================================
    // GET PURCHASES BY USERNAME
    // USER
    // ==========================================

    public List<PolicyPurchase>
    getPurchasesByUsername(
            String username) {

        return repository
                .findByPolicyPolicyHolderUserUsername(
                        username
                );
    }
}
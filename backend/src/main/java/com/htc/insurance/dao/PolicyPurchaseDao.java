
package com.htc.insurance.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.repository.PolicyPurchaseRepository;

@Repository
public class PolicyPurchaseDao {

    private final PolicyPurchaseRepository repository;

    public PolicyPurchaseDao(
            PolicyPurchaseRepository repository) {

        this.repository = repository;
    }

    // =========================================================
    // SAVE PURCHASE
    // =========================================================

    public PolicyPurchase savePurchase(
            PolicyPurchase purchase) {

        return repository.save(purchase);
    }

    // =========================================================
    // GET PURCHASE BY ID
    // =========================================================

    public PolicyPurchase getPurchaseById(
            Long purchaseId) {

        return repository.findById(purchaseId)
                .orElse(null);
    }

    // =========================================================
    // GET PURCHASE BY ID WITH WRITE LOCK
    // =========================================================

    public Optional<PolicyPurchase> getPurchaseByIdForUpdate(
            Long purchaseId) {

        if (purchaseId == null) {
            throw new IllegalArgumentException(
                    "Purchase ID is required.");
        }

        return repository.findByIdForUpdate(
                purchaseId);
    }

    // =========================================================
    // GET PURCHASE BY POLICY NUMBER
    // =========================================================

    public PolicyPurchase getPurchaseByPolicyNumber(
            Long policyNumber) {

        return repository
                .findByPolicyPolicyNumber(policyNumber)
                .orElse(null);
    }

    // =========================================================
    // GET PURCHASE BY POLICY NUMBER WITH WRITE LOCK
    // =========================================================

    /**
     * Used to coordinate claim submission and refund
     * preparation for the same purchased policy.
     *
     * Must be called inside an active transaction.
     */
    public Optional<PolicyPurchase>
    getPurchaseByPolicyNumberForUpdate(
            Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        return repository
                .findByPolicyNumberForUpdate(policyNumber);
    }

    // =========================================================
    // GET PURCHASE BY TRANSACTION ID
    // =========================================================

    public PolicyPurchase getPurchaseByTransactionId(
            String transactionId) {

        return repository.findByTransactionId(
                transactionId).orElse(null);
    }

    // =========================================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // =========================================================

    public PolicyPurchase getPurchaseByRazorpayOrderId(
            String razorpayOrderId) {

        return repository.findByRazorpayOrderId(
                razorpayOrderId).orElse(null);
    }

    // =========================================================
    // GET ALL PURCHASES - ADMIN
    // =========================================================

    public List<PolicyPurchase> getAllPurchases() {

        return repository.findAll();
    }

    // =========================================================
    // GET PURCHASES BY USERNAME - USER
    // =========================================================

    public List<PolicyPurchase> getPurchasesByUsername(
            String username) {

        return repository
                .findByPolicyPolicyHolderUserUsername(
                        username);
    }

    // =========================================================
    // GET PURCHASES WITH UNFINISHED REFUNDS
    // =========================================================

    /**
     * Used by refund reconciliation to find purchases
     * that still have an unfinished refund status.
     *
     * Does not modify database records.
     */
    public List<PolicyPurchase> getPurchasesWithUnfinishedRefunds() {

        return repository.findPurchasesWithUnfinishedRefunds();
    }
}

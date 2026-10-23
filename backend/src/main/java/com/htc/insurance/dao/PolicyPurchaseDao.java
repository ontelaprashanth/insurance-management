
package com.htc.insurance.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.repository.PolicyPurchaseRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class PolicyPurchaseDao {

    private final PolicyPurchaseRepository repository;

    // =========================================================
    // SAVE PURCHASE
    // =========================================================

    public PolicyPurchase savePurchase(PolicyPurchase purchase) {
        return repository.save(purchase);
    }

    // =========================================================
    // GET PURCHASE BY ID
    // =========================================================

    public PolicyPurchase getPurchaseById(Long purchaseId) {
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
                    "Purchase ID is required."
            );
        }

        return repository.findByIdForUpdate(purchaseId);
    }

    // =========================================================
    // GET PURCHASE BY POLICY NUMBER
    // =========================================================

    public PolicyPurchase getPurchaseByPolicyNumber(
            Long policyNumber) {

        return repository.findByPolicyPolicyNumber(policyNumber)
                .orElse(null);
    }

    // =========================================================
    // GET PURCHASE BY POLICY NUMBER WITH WRITE LOCK
    // =========================================================

    /**
     * Coordinates claim submission and refund preparation.
     *
     * Must be called inside an active transaction.
     */
    public Optional<PolicyPurchase> getPurchaseByPolicyNumberForUpdate(
            Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required."
            );
        }

        return repository.findByPolicyNumberForUpdate(policyNumber);
    }

    // =========================================================
    // GET PURCHASE BY TRANSACTION ID
    // =========================================================

    public PolicyPurchase getPurchaseByTransactionId(
            String transactionId) {

        return repository.findByTransactionId(transactionId)
                .orElse(null);
    }

    // =========================================================
    // GET PURCHASE BY RAZORPAY ORDER ID
    // =========================================================

    public PolicyPurchase getPurchaseByRazorpayOrderId(
            String razorpayOrderId) {

        return repository.findByRazorpayOrderId(razorpayOrderId)
                .orElse(null);
    }

    // =========================================================
    // GET ALL PURCHASES
    // =========================================================

    public List<PolicyPurchase> getAllPurchases() {
        return repository.findAll();
    }

    // =========================================================
    // GET PURCHASES BY USERNAME
    // =========================================================

    public List<PolicyPurchase> getPurchasesByUsername(
            String username) {

        return repository.findByPolicyPolicyHolderUserUsername(
                username
        );
    }

    // =========================================================
    // FIND RENEWAL BY ORIGINAL PURCHASE
    // =========================================================

    public PolicyPurchase getRenewalByOriginalPurchaseId(
            Long originalPurchaseId) {

        validateOriginalPurchaseId(originalPurchaseId);

        return repository.findByRenewedFromPurchasePurchaseId(
                originalPurchaseId
        ).orElse(null);
    }

    // =========================================================
    // CHECK WHETHER PURCHASE WAS RENEWED
    // =========================================================

    public boolean existsRenewalByOriginalPurchaseId(
            Long originalPurchaseId) {

        validateOriginalPurchaseId(originalPurchaseId);

        return repository.existsByRenewedFromPurchasePurchaseId(
                originalPurchaseId
        );
    }

    // =========================================================
    // GET ALL RENEWAL PURCHASES
    // =========================================================

    public List<PolicyPurchase> getAllRenewalPurchases() {
        return repository.findByRenewedFromPurchaseIsNotNull();
    }

    // =========================================================
    // GET PURCHASES WITH UNFINISHED REFUNDS
    // =========================================================

    public List<PolicyPurchase> getPurchasesWithUnfinishedRefunds() {
        return repository.findPurchasesWithUnfinishedRefunds();
    }

    // =========================================================
    // COMMON RENEWAL ID VALIDATION
    // =========================================================

    private void validateOriginalPurchaseId(Long originalPurchaseId) {

        if (originalPurchaseId == null || originalPurchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid original purchase ID is required."
            );
        }
    }
}

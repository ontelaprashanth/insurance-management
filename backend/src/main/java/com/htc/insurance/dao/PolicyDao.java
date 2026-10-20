
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Policy;
import com.htc.insurance.repository.PolicyRepository;

@Repository
public class PolicyDao {

    private final PolicyRepository repository;

    public PolicyDao(PolicyRepository repository) {
        this.repository = repository;
    }

    // =========================================================
    // SAVE POLICY
    // =========================================================

    public Policy savePolicy(Policy policy) {
        return repository.save(policy);
    }

    // =========================================================
    // GET ALL POLICIES
    // =========================================================

    public List<Policy> getAllPolicies() {
        return repository.findAll();
    }

    // =========================================================
    // GET POLICY BY NUMBER
    // =========================================================

    public Policy getPolicyById(Long policyNumber) {
        return repository.findById(policyNumber)
                .orElse(null);
    }

    // =========================================================
    // GET POLICY WITH DATABASE WRITE LOCK
    // =========================================================

    /**
     * Acquires a pessimistic write lock on the policy row.
     *
     * Use inside an active @Transactional method.
     *
     * Claim submission and refund preparation should
     * both acquire this lock before eligibility checks.
     *
     * The lock remains held until the transaction ends.
     */
    public Policy getPolicyByIdForUpdate(
            Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        return repository
                .findByPolicyNumberForUpdate(policyNumber)
                .orElse(null);
    }

    // =========================================================
    // UPDATE POLICY
    // =========================================================

    public Policy updatePolicy(Policy policy) {
        return repository.save(policy);
    }

    // =========================================================
    // DELETE POLICY
    // =========================================================

    public void deletePolicy(Long policyNumber) {
        repository.deleteById(policyNumber);
    }
}


package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Policy;
import com.htc.insurance.repository.PolicyRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class PolicyDao {

    private final PolicyRepository repository;

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
     * Must be called inside an active @Transactional method.
     *
     * Claim submission, refund preparation, and renewal
     * confirmation should acquire this lock before
     * checking eligibility.
     *
     * The lock remains held until the transaction ends.
     */
    public Policy getPolicyByIdForUpdate(Long policyNumber) {

        if (policyNumber == null || policyNumber <= 0) {
            throw new IllegalArgumentException(
                    "A valid policy number is required."
            );
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

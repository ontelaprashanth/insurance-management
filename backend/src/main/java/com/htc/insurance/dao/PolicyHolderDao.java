
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.repository.PolicyHolderRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class PolicyHolderDao {

    private final PolicyHolderRepository repository;

    // =========================================================
    // SAVE POLICY HOLDER
    // =========================================================

    public PolicyHolder savePolicyHolder(PolicyHolder policyHolder) {
        return repository.save(policyHolder);
    }

    // =========================================================
    // GET ALL POLICY HOLDERS
    // =========================================================

    public List<PolicyHolder> getAllPolicyHolders() {
        return repository.findAll();
    }

    // =========================================================
    // GET POLICY HOLDER BY ID
    // =========================================================

    public PolicyHolder getPolicyHolderById(Long policyHolderId) {
        return repository.findById(policyHolderId)
                .orElse(null);
    }

    // =========================================================
    // UPDATE POLICY HOLDER
    // =========================================================

    public PolicyHolder updatePolicyHolder(PolicyHolder policyHolder) {
        return repository.save(policyHolder);
    }

    // =========================================================
    // DELETE POLICY HOLDER
    // =========================================================

    public void deletePolicyHolder(Long policyHolderId) {
        repository.deleteById(policyHolderId);
    }

    // =========================================================
    // GET POLICY HOLDER BY USERNAME
    // =========================================================

    public PolicyHolder getPolicyHolderByUsername(String username) {
        return repository.findByUserUsername(username)
                .orElse(null);
    }
}

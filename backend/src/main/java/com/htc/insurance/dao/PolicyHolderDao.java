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

    public PolicyHolder savePolicyHolder(
            PolicyHolder policyHolder) {

        return repository.save(policyHolder);
    }

    public List<PolicyHolder> getAllPolicyHolders() {

        return repository.findAll();
    }

    public PolicyHolder getPolicyHolderById(
            Long policyHolderId) {

        return repository.findById(policyHolderId)
                .orElse(null);
    }

    public PolicyHolder updatePolicyHolder(
            PolicyHolder policyHolder) {

        return repository.save(policyHolder);
    }

    public void deletePolicyHolder(
            Long policyHolderId) {

        repository.deleteById(policyHolderId);
    }

    public PolicyHolder getPolicyHolderByUsername(
            String username) {

        return repository
                .findByUserUsername(username)
                .orElse(null);
    }
}
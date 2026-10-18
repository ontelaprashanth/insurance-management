package com.htc.insurance.dao;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Policy;
import com.htc.insurance.repository.PolicyRepository;

@Repository
public class PolicyDao {

    @Autowired
    private PolicyRepository repository;

    public Policy savePolicy(Policy policy) {
        return repository.save(policy);
    }

    public List<Policy> getAllPolicies() {
        return repository.findAll();
    }

    public Policy getPolicyById(Long policyNumber) {
        return repository.findById(policyNumber).orElse(null);
    }

    public Policy updatePolicy(Policy policy) {
        return repository.save(policy);
    }

    public void deletePolicy(Long policyNumber) {
        repository.deleteById(policyNumber);
    }
}
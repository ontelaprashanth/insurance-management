
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Claims;
import com.htc.insurance.repository.ClaimsRepository;

@Repository
public class ClaimsDao {

    private final ClaimsRepository repository;

    public ClaimsDao(ClaimsRepository repository) {
        this.repository = repository;
    }

    // =========================================================
    // SAVE CLAIM
    // =========================================================

    public Claims saveClaims(Claims claims) {
        return repository.save(claims);
    }

    // =========================================================
    // GET ALL CLAIMS
    // =========================================================

    public List<Claims> getAllClaims() {
        return repository.findAll();
    }

    // =========================================================
    // GET CLAIM BY NUMBER
    // =========================================================

    public Claims getClaimsById(Long claimNumber) {
        return repository.findById(claimNumber)
                .orElse(null);
    }

    // =========================================================
    // UPDATE CLAIM
    // =========================================================

    public Claims updateClaims(Claims claims) {
        return repository.save(claims);
    }

    // =========================================================
    // DELETE CLAIM
    // =========================================================

    public void deleteClaims(Long claimNumber) {
        repository.deleteById(claimNumber);
    }

    // =========================================================
    // CHECK WHETHER POLICY HAS ANY CLAIMS
    // =========================================================

    public boolean existsClaimsByPolicyNumber(
            Long policyNumber) {

        if (policyNumber == null) {
            throw new IllegalArgumentException(
                    "Policy number is required.");
        }

        return repository.existsByPolicy_PolicyNumber(
                policyNumber);
    }
}

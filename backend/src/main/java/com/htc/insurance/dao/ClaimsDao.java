
package com.htc.insurance.dao;

import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Claims;
import com.htc.insurance.repository.ClaimsRepository;

@Repository
public class ClaimsDao {

    private final ClaimsRepository repository;

    public ClaimsDao(ClaimsRepository repository) {
        this.repository = repository;
    }

    // =========================================================
    // SAVE CLAIM - PRESERVED
    // =========================================================

    public Claims saveClaims(Claims claims) {
        return repository.save(claims);
    }

    // =========================================================
    // GET ALL CLAIMS - PRESERVED
    // =========================================================

    public List<Claims> getAllClaims() {
        return repository.findAll();
    }

    // =========================================================
    // GET CLAIM BY NUMBER - PRESERVED
    // =========================================================

    public Claims getClaimsById(Long claimNumber) {
        return repository.findById(claimNumber)
                .orElse(null);
    }

    // =========================================================
    // UPDATE CLAIM - PRESERVED
    // =========================================================

    public Claims updateClaims(Claims claims) {
        return repository.save(claims);
    }

    // =========================================================
    // DELETE CLAIM - PRESERVED
    // =========================================================

    public void deleteClaims(Long claimNumber) {
        repository.deleteById(claimNumber);
    }

    // =========================================================
    // REFUND PROTECTION - PRESERVED
    // =========================================================

    /**
     * Checks whether a policy has any claim history.
     *
     * Includes:
     * PENDING
     * APPROVED
     * REJECTED
     * SETTLED
     *
     * Even a rejected claim blocks refund eligibility.
     */
    public boolean existsClaimsByPolicyNumber(
            Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository.existsByPolicy_PolicyNumber(
                policyNumber);
    }

    // =========================================================
    // NEW - GET CLAIM HISTORY FOR A POLICY
    // =========================================================

    /**
     * Retrieves all claims belonging to a policy,
     * including rejected and settled claims.
     */
    public List<Claims> getClaimsByPolicyNumber(
            Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository
                .findByPolicy_PolicyNumberOrderByClaimNumberDesc(
                        policyNumber);
    }

    // =========================================================
    // NEW - CHECK BLOCKING CLAIMS
    // =========================================================

    /**
     * Prevents another claim when an existing claim
     * is PENDING, APPROVED, or SETTLED.
     *
     * REJECTED claims do not consume the allowance.
     */
    public boolean hasBlockingClaim(
            Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository
                .existsByPolicy_PolicyNumberAndStatusIn(
                        policyNumber,
                        List.of(
                                ClaimStatus.PENDING,
                                ClaimStatus.APPROVED,
                                ClaimStatus.SETTLED
                        ));
    }

    // =========================================================
    // NEW - CHECK APPROVED OR SETTLED CLAIM
    // =========================================================

    /**
     * Used to determine whether a policy has
     * consumed its claim allowance.
     *
     * This is one of the requirements for renewal.
     */
    public boolean hasSuccessfulClaim(
            Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository
                .existsByPolicy_PolicyNumberAndStatusIn(
                        policyNumber,
                        List.of(
                                ClaimStatus.APPROVED,
                                ClaimStatus.SETTLED
                        ));
    }

    // =========================================================
    // NEW - CHECK SPECIFIC CLAIM STATUS
    // =========================================================

    public boolean existsClaimWithStatus(
            Long policyNumber,
            ClaimStatus status) {

        validatePolicyNumber(policyNumber);

        if (status == null) {
            throw new IllegalArgumentException(
                    "Claim status is required.");
        }

        return repository
                .existsByPolicy_PolicyNumberAndStatus(
                        policyNumber,
                        status);
    }

    // =========================================================
    // NEW - GET CLAIMS BY SELECTED STATUSES
    // =========================================================

    public List<Claims> getClaimsByPolicyNumberAndStatuses(
            Long policyNumber,
            Collection<ClaimStatus> statuses) {

        validatePolicyNumber(policyNumber);

        if (statuses == null || statuses.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one claim status is required.");
        }

        return repository
                .findByPolicy_PolicyNumberAndStatusIn(
                        policyNumber,
                        statuses);
    }

    // =========================================================
    // COMMON VALIDATION
    // =========================================================

    private void validatePolicyNumber(
            Long policyNumber) {

        if (policyNumber == null || policyNumber <= 0) {
            throw new IllegalArgumentException(
                    "A valid policy number is required.");
        }
    }
}

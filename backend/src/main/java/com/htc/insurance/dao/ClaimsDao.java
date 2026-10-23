
package com.htc.insurance.dao;

import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Claims;
import com.htc.insurance.repository.ClaimsRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ClaimsDao {

    private final ClaimsRepository repository;

    // =========================================================
    // BASIC CLAIM OPERATIONS
    // =========================================================

    public Claims saveClaims(Claims claims) {
        return repository.save(claims);
    }

    public List<Claims> getAllClaims() {
        return repository.findAll();
    }

    public Claims getClaimsById(Long claimNumber) {
        return repository.findById(claimNumber)
                .orElse(null);
    }

    public Claims updateClaims(Claims claims) {
        return repository.save(claims);
    }

    public void deleteClaims(Long claimNumber) {
        repository.deleteById(claimNumber);
    }

    // =========================================================
    // REFUND PROTECTION
    // =========================================================

    /**
     * Checks whether a policy has any claim history.
     *
     * All claim statuses are included.
     *
     * Even rejected claims block refund eligibility.
     */
    public boolean existsClaimsByPolicyNumber(Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository.existsByPolicy_PolicyNumber(
                policyNumber
        );
    }

    // =========================================================
    // GET POLICY CLAIM HISTORY
    // =========================================================

    /**
     * Returns all claims belonging to a policy,
     * ordered by claim number descending.
     *
     * Includes rejected and settled claims.
     */
    public List<Claims> getClaimsByPolicyNumber(Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository
                .findByPolicy_PolicyNumberOrderByClaimNumberDesc(
                        policyNumber
                );
    }

    // =========================================================
    // CHECK BLOCKING CLAIMS
    // =========================================================

    /**
     * Prevents another claim when an existing claim is:
     *
     * PENDING
     * APPROVED
     * SETTLED
     *
     * REJECTED claims do not consume the allowance.
     */
    public boolean hasBlockingClaim(Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository.existsByPolicy_PolicyNumberAndStatusIn(
                policyNumber,
                List.of(
                        ClaimStatus.PENDING,
                        ClaimStatus.APPROVED,
                        ClaimStatus.SETTLED
                )
        );
    }

    // =========================================================
    // CHECK SUCCESSFUL CLAIMS
    // =========================================================

    /**
     * Checks whether a policy has an APPROVED
     * or SETTLED claim.
     *
     * Used by policy renewal eligibility logic.
     */
    public boolean hasSuccessfulClaim(Long policyNumber) {

        validatePolicyNumber(policyNumber);

        return repository.existsByPolicy_PolicyNumberAndStatusIn(
                policyNumber,
                List.of(
                        ClaimStatus.APPROVED,
                        ClaimStatus.SETTLED
                )
        );
    }

    // =========================================================
    // CHECK SPECIFIC CLAIM STATUS
    // =========================================================

    public boolean existsClaimWithStatus(
            Long policyNumber,
            ClaimStatus status) {

        validatePolicyNumber(policyNumber);

        if (status == null) {
            throw new IllegalArgumentException(
                    "Claim status is required."
            );
        }

        return repository.existsByPolicy_PolicyNumberAndStatus(
                policyNumber,
                status
        );
    }

    // =========================================================
    // GET CLAIMS BY SELECTED STATUSES
    // =========================================================

    public List<Claims> getClaimsByPolicyNumberAndStatuses(
            Long policyNumber,
            Collection<ClaimStatus> statuses) {

        validatePolicyNumber(policyNumber);

        if (statuses == null || statuses.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one claim status is required."
            );
        }

        return repository.findByPolicy_PolicyNumberAndStatusIn(
                policyNumber,
                statuses
        );
    }

    // =========================================================
    // COMMON POLICY NUMBER VALIDATION
    // =========================================================

    private void validatePolicyNumber(Long policyNumber) {

        if (policyNumber == null || policyNumber <= 0) {
            throw new IllegalArgumentException(
                    "A valid policy number is required."
            );
        }
    }
}

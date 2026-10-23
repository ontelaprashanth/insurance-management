
package com.htc.insurance.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Claims;

@Repository
public interface ClaimsRepository
        extends JpaRepository<Claims, Long> {

    // =========================================================
    // REFUND PROTECTION
    // =========================================================

    /**
     * Returns true if a policy has ever had a claim.
     *
     * IMPORTANT:
     * Even a REJECTED claim prevents a refund.
     *
     * Do not replace this with a status-based check.
     */
    boolean existsByPolicy_PolicyNumber(
            Long policyNumber
    );

    // =========================================================
    // GET CLAIM HISTORY FOR A POLICY
    // =========================================================

    /**
     * Retrieves all claims for a particular policy.
     *
     * Includes:
     * PENDING, APPROVED, REJECTED, SETTLED.
     *
     * Newest claim number first.
     */
    List<Claims> findByPolicy_PolicyNumberOrderByClaimNumberDesc(
            Long policyNumber
    );

    // =========================================================
    // CHECK FOR BLOCKING CLAIM STATUSES
    // =========================================================

    /**
     * Checks whether a policy has any claims
     * matching the supplied statuses.
     *
     * Used to prevent duplicate claim submissions.
     *
     * Example:
     * PENDING, APPROVED, SETTLED.
     */
    boolean existsByPolicy_PolicyNumberAndStatusIn(
            Long policyNumber,
            Collection<ClaimStatus> statuses
    );

    // =========================================================
    // CHECK A PARTICULAR CLAIM STATUS
    // =========================================================

    /**
     * Checks whether a policy has a claim
     * with the specified status.
     *
     * Useful for renewal eligibility.
     */
    boolean existsByPolicy_PolicyNumberAndStatus(
            Long policyNumber,
            ClaimStatus status
    );

    // =========================================================
    // GET CLAIMS BY SELECTED STATUSES
    // =========================================================

    /**
     * Retrieves claims matching the selected
     * statuses for a particular policy.
     *
     * Useful for admin processing and history.
     */
    List<Claims> findByPolicy_PolicyNumberAndStatusIn(
            Long policyNumber,
            Collection<ClaimStatus> statuses
    );
}

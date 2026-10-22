
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
    // REFUND PROTECTION - PRESERVED
    // =========================================================

    /**
     * Returns true if a policy has ever had a claim.
     *
     * Even a REJECTED claim prevents a refund.
     *
     * Do not replace this with a status-based check.
     */
    boolean existsByPolicy_PolicyNumber(
            Long policyNumber);

    // =========================================================
    // GET CLAIMS FOR A SPECIFIC POLICY
    // =========================================================

    /**
     * Retrieves claim history for a particular policy.
     *
     * Includes PENDING, APPROVED, REJECTED and SETTLED.
     */
    List<Claims> findByPolicy_PolicyNumberOrderByClaimNumberDesc(
            Long policyNumber);

    // =========================================================
    // CHECK FOR BLOCKING CLAIM STATUS
    // =========================================================

    /**
     * Checks whether a policy has any claims matching
     * the supplied statuses.
     *
     * Used to block duplicate claim submissions.
     *
     * Example blocking statuses:
     * PENDING, APPROVED, SETTLED.
     */
    boolean existsByPolicy_PolicyNumberAndStatusIn(
            Long policyNumber,
            Collection<ClaimStatus> statuses);

    // =========================================================
    // CHECK FOR A PARTICULAR CLAIM STATUS
    // =========================================================

    /**
     * Useful for renewal eligibility checks.
     *
     * Example:
     * APPROVED or SETTLED.
     */
    boolean existsByPolicy_PolicyNumberAndStatus(
            Long policyNumber,
            ClaimStatus status);

    // =========================================================
    // GET CLAIMS BY STATUS FOR A POLICY
    // =========================================================

    /**
     * Retrieves claims matching selected statuses
     * for a specific policy.
     *
     * Useful for admin processing and claim history.
     */
    List<Claims> findByPolicy_PolicyNumberAndStatusIn(
            Long policyNumber,
            Collection<ClaimStatus> statuses);
}

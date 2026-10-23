
package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.PolicyHolder;

public interface PolicyHolderRepository
        extends JpaRepository<PolicyHolder, Long> {

    // =========================================================
    // FIND POLICY HOLDER BY USERNAME
    // =========================================================

    /**
     * Finds the policy holder profile associated
     * with the specified username.
     *
     * Uses the relationship:
     * PolicyHolder -> User -> username
     *
     * Returns Optional.empty() when no matching
     * policy holder exists.
     */
    Optional<PolicyHolder> findByUserUsername(
            String username
    );
}

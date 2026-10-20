
package com.htc.insurance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Claims;

@Repository
public interface ClaimsRepository
        extends JpaRepository<Claims, Long> {

    // =========================================================
    // CHECK WHETHER A POLICY HAS ANY CLAIMS
    // Used to prevent refunds after claim submission
    // =========================================================

    boolean existsByPolicy_PolicyNumber(Long policyNumber);
}

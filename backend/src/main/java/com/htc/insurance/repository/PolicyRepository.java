
package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Policy;

import jakarta.persistence.LockModeType;

@Repository
public interface PolicyRepository
        extends JpaRepository<Policy, Long> {

    // =========================================================
    // LOCK POLICY ROW FOR CLAIM / REFUND / RENEWAL
    // =========================================================

    /**
     * Obtains a pessimistic write lock on the policy row.
     *
     * Must be called inside an active transaction.
     *
     * Claim submission, refund preparation and renewal
     * confirmation must acquire this lock before checking
     * whether the operation is permitted.
     *
     * The lock remains held until the transaction ends.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT p
           FROM Policy p
           WHERE p.policyNumber = :policyNumber
           """)
    Optional<Policy> findByPolicyNumberForUpdate(
            @Param("policyNumber") Long policyNumber);
}

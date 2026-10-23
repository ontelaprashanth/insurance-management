
package com.htc.insurance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Settlement;

@Repository
public interface SettlementRepository
        extends JpaRepository<Settlement, Long> {

    // =========================================================
    // GET SETTLEMENTS BY CLAIM NUMBER
    // =========================================================

    /**
     * Retrieves settlement records associated
     * with the specified claim number.
     */
    List<Settlement> findByClaim_ClaimNumber(
            Long claimNumber
    );

    // =========================================================
    // CHECK WHETHER SETTLEMENT ALREADY EXISTS
    // =========================================================

    /**
     * Checks whether a settlement record already
     * exists for the specified claim number.
     *
     * Used to prevent duplicate settlement creation.
     */
    boolean existsByClaim_ClaimNumber(
            Long claimNumber
    );
}

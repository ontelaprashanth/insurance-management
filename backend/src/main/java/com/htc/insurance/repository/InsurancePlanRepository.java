
package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.InsurancePlan;

@Repository
public interface InsurancePlanRepository
        extends JpaRepository<InsurancePlan, Long> {

    // =========================================================
    // FIND INSURANCE PLAN BY CODE
    // =========================================================

    /**
     * Retrieves an insurance plan using its unique plan code.
     *
     * Useful for plan selection and policy purchases.
     */
    Optional<InsurancePlan> findByPlanCode(
            String planCode
    );

    // =========================================================
    // GET ACTIVE INSURANCE PLANS
    // =========================================================

    /**
     * Retrieves all active insurance plans.
     *
     * Used to display available plans to customers.
     */
    List<InsurancePlan> findByIsActiveTrue();

    // =========================================================
    // CHECK IF PLAN CODE EXISTS
    // =========================================================

    /**
     * Checks whether a plan with the specified
     * plan code already exists.
     *
     * Useful for preventing duplicate plan codes.
     */
    boolean existsByPlanCode(
            String planCode
    );
}

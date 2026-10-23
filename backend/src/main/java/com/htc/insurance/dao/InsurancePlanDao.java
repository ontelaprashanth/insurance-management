
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.htc.insurance.entity.InsurancePlan;

public interface InsurancePlanDao
        extends JpaRepository<InsurancePlan, Long> {

    // Fetch only active insurance plans
    @Query("""
        SELECT p
        FROM InsurancePlan p
        WHERE p.isActive = true
        ORDER BY p.planId ASC
        """)
    List<InsurancePlan> findAvailablePlans();
}

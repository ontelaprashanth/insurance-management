
package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.InsurancePlan;

@Repository
public interface InsurancePlanRepository
        extends JpaRepository<InsurancePlan, Long> {

    Optional<InsurancePlan> findByPlanCode(String planCode);

    List<InsurancePlan> findByIsActiveTrue();

    boolean existsByPlanCode(String planCode);
}

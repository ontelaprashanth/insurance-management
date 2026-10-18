
package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.repository.InsurancePlanRepository;

@Service
public class InsurancePlanService {

    private final InsurancePlanRepository insurancePlanRepository;

    public InsurancePlanService(
            InsurancePlanRepository insurancePlanRepository) {
        this.insurancePlanRepository = insurancePlanRepository;
    }

    /**
     * Returns all active catalogue plans.
     * Customer-owned policies are stored separately in the policy table.
     */
    @Transactional(readOnly = true)
    public List<InsurancePlan> getAvailablePlans() {
        return insurancePlanRepository.findByIsActiveTrue()
                .stream()
                .sorted((first, second) ->
                        first.getPlanId().compareTo(second.getPlanId()))
                .toList();
    }

    /**
     * Finds an active catalogue plan by its database ID.
     */
    @Transactional(readOnly = true)
    public InsurancePlan getActivePlanById(Long planId) {
        if (planId == null) {
            throw new IllegalArgumentException(
                    "Insurance plan ID is required.");
        }

        InsurancePlan plan = insurancePlanRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Insurance plan not found: " + planId));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalArgumentException(
                    "This insurance plan is currently unavailable.");
        }

        return plan;
    }

    /**
     * Finds a plan using its stable catalogue code.
     */
    @Transactional(readOnly = true)
    public InsurancePlan getActivePlanByCode(String planCode) {
        if (planCode == null || planCode.isBlank()) {
            throw new IllegalArgumentException(
                    "Insurance plan code is required.");
        }

        String normalizedCode = planCode.trim()
                .toUpperCase(Locale.ROOT);

        InsurancePlan plan = insurancePlanRepository
                .findByPlanCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Insurance plan not found: " + normalizedCode));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalArgumentException(
                    "This insurance plan is currently unavailable.");
        }

        return plan;
    }

    /**
     * Creates default catalogue entries only when their plan codes
     * do not already exist. Existing plans are never overwritten.
     */
    @Transactional
    public void seedDefaultPlans() {
        createPlanIfMissing(
                "HEALTH",
                "Health Insurance",
                "Hospital stays, surgery and treatment costs",
                "Health",
                "8999.00",
                "1000000.00"
        );

        createPlanIfMissing(
                "LIFE",
                "Life Insurance",
                "Income protection for the people who depend on you",
                "Life Insurance",
                "6999.00",
                "1000000.00"
        );

        createPlanIfMissing(
                "HOME",
                "Home Insurance",
                "Structure and contents against fire, theft and damage",
                "Home Insurance",
                "2999.00",
                "1000000.00"
        );

        createPlanIfMissing(
                "MOTOR",
                "Motor Insurance",
                "Own damage and third-party liability for your vehicle",
                "Motor Insurance",
                "2499.00",
                "1000000.00"
        );

        createPlanIfMissing(
                "TRAVEL",
                "Travel Insurance",
                "Trip cancellation, medical and baggage cover",
                "Travel Insurance",
                "799.00",
                "1000000.00"
        );

        createPlanIfMissing(
                "ACCIDENT",
                "Accident Insurance",
                "Lump-sum cover for injury and disability",
                "Accident Insurance",
                "1499.00",
                "1000000.00"
        );
    }

    private void createPlanIfMissing(
            String planCode,
            String planName,
            String description,
            String coveredType,
            String basePremium,
            String baseCoverage) {

        if (insurancePlanRepository.existsByPlanCode(planCode)) {
            return;
        }

        InsurancePlan plan = new InsurancePlan();
        plan.setPlanCode(planCode);
        plan.setPlanName(planName);
        plan.setDescription(description);
        plan.setCoveredType(coveredType);
        plan.setBasePremium(new BigDecimal(basePremium));
        plan.setBaseCoverage(new BigDecimal(baseCoverage));
        plan.setIsActive(true);

        insurancePlanRepository.save(plan);
    }
}

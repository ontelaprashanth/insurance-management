
package com.htc.insurance.service;

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
     * Returns active insurance plans ordered by plan ID.
     * Archived plans are excluded from the customer catalogue.
     */
    @Transactional(readOnly = true)
    public List<InsurancePlan> getAvailablePlans() {

        return insurancePlanRepository.findByIsActiveTrue()
                .stream()
                .sorted((first, second) ->
                        first.getPlanId().compareTo(
                                second.getPlanId()))
                .toList();
    }

    /**
     * Retrieves an active insurance plan by ID.
     */
    @Transactional(readOnly = true)
    public InsurancePlan getActivePlanById(Long planId) {

        if (planId == null || planId <= 0) {
            throw new IllegalArgumentException(
                    "A valid insurance plan ID is required.");
        }

        InsurancePlan plan = insurancePlanRepository
                .findById(planId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Insurance plan not found: " + planId));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalArgumentException(
                    "This insurance plan is currently unavailable.");
        }

        return plan;
    }

    /**
     * Retrieves an active plan using its stable plan code.
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
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Insurance plan not found: "
                                        + normalizedCode));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalArgumentException(
                    "This insurance plan is currently unavailable.");
        }

        return plan;
    }
}

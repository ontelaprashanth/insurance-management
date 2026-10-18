
package com.htc.insurance.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.service.InsurancePlanService;

@RestController
@RequestMapping("/api/plans")
public class InsurancePlanController {

    private final InsurancePlanService insurancePlanService;

    public InsurancePlanController(
            InsurancePlanService insurancePlanService) {
        this.insurancePlanService = insurancePlanService;
    }

    /**
     * Returns all active insurance catalogue plans.
     *
     * GET /api/plans/available
     */
    @GetMapping("/available")
    public ResponseEntity<List<InsurancePlan>> getAvailablePlans() {
        return ResponseEntity.ok(
                insurancePlanService.getAvailablePlans());
    }
}

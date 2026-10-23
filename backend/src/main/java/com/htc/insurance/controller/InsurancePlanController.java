
package com.htc.insurance.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.entity.InsurancePlan;
import com.htc.insurance.service.InsurancePlanService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
public class InsurancePlanController {

    private final InsurancePlanService insurancePlanService;

    // =========================================================
    // GET ALL AVAILABLE INSURANCE PLANS
    // =========================================================

    @GetMapping("/available")
    public ResponseEntity<List<InsurancePlan>> getAvailablePlans() {
        return ResponseEntity.ok(
                insurancePlanService.getAvailablePlans()
        );
    }
}

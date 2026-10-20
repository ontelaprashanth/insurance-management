
package com.htc.insurance.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.PolicyDto;
import com.htc.insurance.service.PolicyService;

@RestController
@RequestMapping("/policy")
public class PolicyController {

    private final PolicyService policyService;

    public PolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    // =========================================================
    // USER - GET AVAILABLE POLICIES
    // =========================================================

    @GetMapping("/available")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PolicyDto>>
    getAvailablePolicies() {

        return ResponseEntity.ok(
                policyService.getAvailablePolicies()
        );
    }

    // =========================================================
    // USER - GET MY ACTIVE POLICIES
    // =========================================================

    @GetMapping("/my-policies")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PolicyDto>>
    getMyPolicies(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(
                policyService.getPoliciesByUsername(
                        authentication.getName()
                )
        );
    }

    // =========================================================
    // ADMIN - SAVE POLICY
    // =========================================================

    @PostMapping("/save")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto>
    savePolicy(@RequestBody PolicyDto policyDto) {

        return ResponseEntity.ok(
                policyService.savePolicy(policyDto)
        );
    }

    // =========================================================
    // ADMIN - GET ALL POLICIES
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PolicyDto>>
    getAllPolicies() {

        return ResponseEntity.ok(
                policyService.getAllPolicies()
        );
    }

    // =========================================================
    // ADMIN - GET POLICY BY NUMBER
    // =========================================================

    @GetMapping("/get/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto>
    getPolicyById(@PathVariable Long policyNumber) {

        PolicyDto policy =
                policyService.getPolicyById(policyNumber);

        if (policy == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(policy);
    }

    // =========================================================
    // ADMIN - UPDATE POLICY
    // =========================================================

    @PutMapping("/update/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto>
    updatePolicy(
            @PathVariable Long policyNumber,
            @RequestBody PolicyDto policyDto) {

        PolicyDto updated =
                policyService.updatePolicy(
                        policyNumber,
                        policyDto
                );

        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(updated);
    }

    // =========================================================
    // ADMIN - DELETE POLICY
    // =========================================================

    @DeleteMapping("/delete/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String>
    deletePolicy(@PathVariable Long policyNumber) {

        policyService.deletePolicy(policyNumber);

        return ResponseEntity.ok(
                "Policy deleted successfully."
        );
    }

    // =========================================================
    // ADMIN - ACTIVATE POLICY
    // =========================================================

    @PutMapping("/activate/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto>
    activatePolicy(@PathVariable Long policyNumber) {

        return ResponseEntity.ok(
                policyService.activatePolicy(policyNumber)
        );
    }

    // =========================================================
    // ADMIN - DEACTIVATE POLICY
    // =========================================================

    @PutMapping("/deactivate/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto>
    deactivatePolicy(@PathVariable Long policyNumber) {

        return ResponseEntity.ok(
                policyService.deactivatePolicy(policyNumber)
        );
    }
}

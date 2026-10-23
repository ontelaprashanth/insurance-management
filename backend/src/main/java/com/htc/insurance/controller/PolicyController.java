
package com.htc.insurance.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.PolicyDto;
import com.htc.insurance.service.PolicyService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/policy")
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;

    // =========================================================
    // USER - GET AVAILABLE POLICIES
    // =========================================================

    @GetMapping("/available")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PolicyDto>> getAvailablePolicies() {

        return ResponseEntity.ok(
                policyService.getAvailablePolicies()
        );
    }

    // =========================================================
    // USER - GET MY POLICIES
    // =========================================================

    @GetMapping("/my-policies")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PolicyDto>> getMyPolicies(
            Authentication authentication) {

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
    // ADMIN - CREATE POLICY
    // =========================================================

    @PostMapping("/save")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto> savePolicy(
            @RequestBody PolicyDto policyDto) {

        return ResponseEntity.ok(
                policyService.savePolicy(policyDto)
        );
    }

    // =========================================================
    // ADMIN - GET ALL POLICIES
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PolicyDto>> getAllPolicies() {

        return ResponseEntity.ok(
                policyService.getAllPolicies()
        );
    }

    // =========================================================
    // ADMIN - GET POLICY BY NUMBER
    // =========================================================

    @GetMapping("/get/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto> getPolicyById(
            @PathVariable Long policyNumber) {

        return respond(
                policyService.getPolicyById(policyNumber)
        );
    }

    // =========================================================
    // ADMIN - UPDATE POLICY
    // =========================================================

    @PutMapping("/update/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto> updatePolicy(
            @PathVariable Long policyNumber,
            @RequestBody PolicyDto policyDto) {

        return respond(
                policyService.updatePolicy(
                        policyNumber,
                        policyDto
                )
        );
    }

    // =========================================================
    // ADMIN - DELETE POLICY
    // =========================================================

    @DeleteMapping("/delete/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deletePolicy(
            @PathVariable Long policyNumber) {

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
    public ResponseEntity<PolicyDto> activatePolicy(
            @PathVariable Long policyNumber) {

        return ResponseEntity.ok(
                policyService.activatePolicy(policyNumber)
        );
    }

    // =========================================================
    // ADMIN - DEACTIVATE POLICY
    // =========================================================

    @PutMapping("/deactivate/{policyNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PolicyDto> deactivatePolicy(
            @PathVariable Long policyNumber) {

        return ResponseEntity.ok(
                policyService.deactivatePolicy(policyNumber)
        );
    }

    // =========================================================
    // SHARED RESPONSE HELPER
    // =========================================================

    private ResponseEntity<PolicyDto> respond(PolicyDto policy) {

        return policy == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(policy);
    }
}

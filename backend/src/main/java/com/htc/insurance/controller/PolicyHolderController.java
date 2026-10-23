
package com.htc.insurance.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.PolicyHolderDto;
import com.htc.insurance.service.PolicyHolderService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/policyholder")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PolicyHolderController {

    private final PolicyHolderService policyHolderService;

    // =========================================================
    // ADMIN - CREATE POLICY HOLDER
    // =========================================================

    @PostMapping("/save")
    public PolicyHolderDto savePolicyHolder(
            @RequestBody PolicyHolderDto policyHolderDto) {

        return policyHolderService.savePolicyHolder(
                policyHolderDto
        );
    }

    // =========================================================
    // ADMIN - GET ALL POLICY HOLDERS
    // =========================================================

    @GetMapping("/getAll")
    public List<PolicyHolderDto> getAllPolicyHolders() {

        return policyHolderService.getAllPolicyHolders();
    }

    // =========================================================
    // ADMIN - GET POLICY HOLDER BY ID
    // =========================================================

    @GetMapping("/get/{policyHolderId}")
    public PolicyHolderDto getPolicyHolderById(
            @PathVariable Long policyHolderId) {

        return policyHolderService.getPolicyHolderById(
                policyHolderId
        );
    }

    // =========================================================
    // ADMIN - UPDATE POLICY HOLDER
    // =========================================================

    @PutMapping("/update/{policyHolderId}")
    public PolicyHolderDto updatePolicyHolder(
            @PathVariable Long policyHolderId,
            @RequestBody PolicyHolderDto policyHolderDto) {

        return policyHolderService.updatePolicyHolder(
                policyHolderId,
                policyHolderDto
        );
    }

    // =========================================================
    // ADMIN - DELETE POLICY HOLDER
    // =========================================================

    @DeleteMapping("/delete/{policyHolderId}")
    public String deletePolicyHolder(
            @PathVariable Long policyHolderId) {

        policyHolderService.deletePolicyHolder(policyHolderId);

        return "Policy Holder deleted successfully";
    }
}

package com.htc.insurance.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.PolicyHolderDto;
import com.htc.insurance.service.PolicyHolderService;

@RestController
@RequestMapping("/policyholder")
public class PolicyHolderController {

    @Autowired
    private PolicyHolderService policyHolderService;


    // ==============================
    // SAVE POLICY HOLDER
    // ==============================
    // ADMIN ONLY

    @PostMapping("/save")
    @PreAuthorize("hasRole('ADMIN')")
    public PolicyHolderDto savePolicyHolder(
            @RequestBody PolicyHolderDto policyHolderDto) {

        return policyHolderService.savePolicyHolder(
                policyHolderDto);
    }


    // ==============================
    // GET ALL POLICY HOLDERS
    // ==============================
    // ADMIN ONLY

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public List<PolicyHolderDto> getAllPolicyHolders() {

        return policyHolderService.getAllPolicyHolders();
    }


    // ==============================
    // GET POLICY HOLDER BY ID
    // ==============================
    // ADMIN ONLY

    @GetMapping("/get/{policyHolderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public PolicyHolderDto getPolicyHolderById(
            @PathVariable Long policyHolderId) {

        return policyHolderService.getPolicyHolderById(
                policyHolderId);
    }


    // ==============================
    // UPDATE POLICY HOLDER
    // ==============================
    // ADMIN ONLY

    @PutMapping("/update/{policyHolderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public PolicyHolderDto updatePolicyHolder(
            @PathVariable Long policyHolderId,
            @RequestBody PolicyHolderDto policyHolderDto) {

        return policyHolderService.updatePolicyHolder(
                policyHolderId,
                policyHolderDto);
    }


    // ==============================
    // DELETE POLICY HOLDER
    // ==============================
    // ADMIN ONLY

    @DeleteMapping("/delete/{policyHolderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public String deletePolicyHolder(
            @PathVariable Long policyHolderId) {

        policyHolderService.deletePolicyHolder(
                policyHolderId);

        return "Policy Holder deleted successfully";
    }
}
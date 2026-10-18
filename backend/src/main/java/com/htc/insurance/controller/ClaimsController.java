package com.htc.insurance.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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

import com.htc.insurance.dto.ClaimDecisionDto;
import com.htc.insurance.dto.ClaimsDto;
import com.htc.insurance.service.ClaimsService;

@RestController
@RequestMapping("/claims")
public class ClaimsController {

    @Autowired
    private ClaimsService claimsService;


    // =========================================================
    // USER + ADMIN
    // SUBMIT NEW CLAIM
    // =========================================================
    @PostMapping("/save")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ClaimsDto saveClaims(
            @RequestBody ClaimsDto claimsDto,
            Authentication authentication) {

        return claimsService.saveClaims(
                claimsDto,
                authentication
        );
    }


    // =========================================================
    // USER
    // GET MY CLAIMS
    // =========================================================
    @GetMapping("/my-claims")
    @PreAuthorize("hasRole('USER')")
    public List<ClaimsDto> getMyClaims(
            Authentication authentication) {

        return claimsService.getMyClaims(
                authentication
        );
    }


    // =========================================================
    // ADMIN
    // GET ALL CLAIMS
    // =========================================================
    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ClaimsDto> getAllClaims() {

        return claimsService.getAllClaims();
    }


    // =========================================================
    // USER + ADMIN
    // GET ONE CLAIM
    // =========================================================
    @GetMapping("/get/{claimNumber}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ClaimsDto getClaimsById(
            @PathVariable Long claimNumber,
            Authentication authentication) {

        return claimsService.getClaimsById(
                claimNumber,
                authentication
        );
    }


    // =========================================================
    // ADMIN
    // UPDATE CLAIM
    // =========================================================
    @PutMapping("/update/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimsDto updateClaims(
            @PathVariable Long claimNumber,
            @RequestBody ClaimsDto claimsDto) {

        return claimsService.updateClaims(
                claimNumber,
                claimsDto
        );
    }


    // =========================================================
    // ADMIN
    // APPROVE CLAIM
    // =========================================================
    @PutMapping("/approve/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimsDto approveClaim(
            @PathVariable Long claimNumber,
            @RequestBody ClaimDecisionDto decisionDto) {

        return claimsService.approveClaim(
                claimNumber,
                decisionDto
        );
    }


    // =========================================================
    // ADMIN
    // REJECT CLAIM
    // =========================================================
    @PutMapping("/reject/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimsDto rejectClaim(
            @PathVariable Long claimNumber,
            @RequestBody ClaimDecisionDto decisionDto) {

        return claimsService.rejectClaim(
                claimNumber,
                decisionDto
        );
    }


    // =========================================================
    // ADMIN
    // DELETE CLAIM
    // =========================================================
    @DeleteMapping("/delete/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public String deleteClaims(
            @PathVariable Long claimNumber) {

        claimsService.deleteClaims(
                claimNumber
        );

        return "Claim deleted successfully";
    }
}
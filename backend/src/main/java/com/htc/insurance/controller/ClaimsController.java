
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

import com.htc.insurance.dto.ClaimDecisionDto;
import com.htc.insurance.dto.ClaimsDto;
import com.htc.insurance.service.ClaimsService;

@RestController
@RequestMapping("/claims")
public class ClaimsController {

    private final ClaimsService claimsService;

    public ClaimsController(ClaimsService claimsService) {
        this.claimsService = claimsService;
    }

    // =========================================================
    // USER + ADMIN - SUBMIT NEW CLAIM
    // =========================================================

    @PostMapping("/save")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ClaimsDto> saveClaims(
            @RequestBody ClaimsDto claimsDto,
            Authentication authentication) {

        ClaimsDto savedClaim = claimsService.saveClaims(
                claimsDto,
                authentication
        );

        return ResponseEntity.ok(savedClaim);
    }

    // =========================================================
    // USER - GET MY CLAIMS
    // =========================================================

    @GetMapping("/my-claims")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<ClaimsDto>> getMyClaims(
            Authentication authentication) {

        return ResponseEntity.ok(
                claimsService.getMyClaims(authentication)
        );
    }

    // =========================================================
    // ADMIN - GET ALL CLAIMS
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ClaimsDto>> getAllClaims() {

        return ResponseEntity.ok(
                claimsService.getAllClaims()
        );
    }

    // =========================================================
    // USER + ADMIN - GET CLAIM BY NUMBER
    // =========================================================

    @GetMapping("/get/{claimNumber}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ClaimsDto> getClaimsById(
            @PathVariable Long claimNumber,
            Authentication authentication) {

        ClaimsDto claim = claimsService.getClaimsById(
                claimNumber,
                authentication
        );

        if (claim == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(claim);
    }

    // =========================================================
    // ADMIN - UPDATE CLAIM
    // =========================================================

    @PutMapping("/update/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimsDto> updateClaims(
            @PathVariable Long claimNumber,
            @RequestBody ClaimsDto claimsDto) {

        ClaimsDto updatedClaim = claimsService.updateClaims(
                claimNumber,
                claimsDto
        );

        if (updatedClaim == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(updatedClaim);
    }

    // =========================================================
    // ADMIN - APPROVE CLAIM
    // =========================================================

    @PutMapping("/approve/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimsDto> approveClaim(
            @PathVariable Long claimNumber,
            @RequestBody ClaimDecisionDto decisionDto) {

        ClaimsDto approvedClaim = claimsService.approveClaim(
                claimNumber,
                decisionDto
        );

        if (approvedClaim == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(approvedClaim);
    }

    // =========================================================
    // ADMIN - REJECT CLAIM
    // =========================================================

    @PutMapping("/reject/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimsDto> rejectClaim(
            @PathVariable Long claimNumber,
            @RequestBody ClaimDecisionDto decisionDto) {

        ClaimsDto rejectedClaim = claimsService.rejectClaim(
                claimNumber,
                decisionDto
        );

        if (rejectedClaim == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(rejectedClaim);
    }

    // =========================================================
    // ADMIN - DELETE CLAIM
    // =========================================================

    @DeleteMapping("/delete/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteClaims(
            @PathVariable Long claimNumber) {

        claimsService.deleteClaims(claimNumber);

        return ResponseEntity.ok(
                "Claim deleted successfully"
        );
    }
}

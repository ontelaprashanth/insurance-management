
package com.htc.insurance.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.ClaimDecisionDto;
import com.htc.insurance.dto.ClaimsDto;
import com.htc.insurance.service.ClaimsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/claims")
@RequiredArgsConstructor
public class ClaimsController {

    private final ClaimsService claimsService;

    // =========================================================
    // USER + ADMIN - SUBMIT CLAIM
    // =========================================================

    @PostMapping("/save")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ClaimsDto> saveClaims(
            @RequestBody ClaimsDto claimsDto,
            Authentication authentication) {

        return ResponseEntity.ok(
                claimsService.saveClaims(claimsDto, authentication)
        );
    }

    // =========================================================
    // USER - MY CLAIMS
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
    // ADMIN - ALL CLAIMS
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ClaimsDto>> getAllClaims() {

        return ResponseEntity.ok(claimsService.getAllClaims());
    }

    // =========================================================
    // USER + ADMIN - GET CLAIM
    // =========================================================

    @GetMapping("/get/{claimNumber}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ClaimsDto> getClaimsById(
            @PathVariable Long claimNumber,
            Authentication authentication) {

        return respond(
                claimsService.getClaimsById(
                        claimNumber,
                        authentication
                )
        );
    }

    // =========================================================
    // ADMIN - UPDATE CLAIM
    // =========================================================

    @PutMapping("/update/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimsDto> updateClaims(
            @PathVariable Long claimNumber,
            @RequestBody ClaimsDto claimsDto) {

        return respond(
                claimsService.updateClaims(claimNumber, claimsDto)
        );
    }

    // =========================================================
    // ADMIN - APPROVE CLAIM
    // =========================================================

    @PutMapping("/approve/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimsDto> approveClaim(
            @PathVariable Long claimNumber,
            @RequestBody ClaimDecisionDto decisionDto) {

        return respond(
                claimsService.approveClaim(claimNumber, decisionDto)
        );
    }

    // =========================================================
    // ADMIN - REJECT CLAIM
    // =========================================================

    @PutMapping("/reject/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimsDto> rejectClaim(
            @PathVariable Long claimNumber,
            @RequestBody ClaimDecisionDto decisionDto) {

        return respond(
                claimsService.rejectClaim(claimNumber, decisionDto)
        );
    }

    // =========================================================
    // ADMIN - DELETE CLAIM
    // =========================================================

    @DeleteMapping("/delete/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteClaims(
            @PathVariable Long claimNumber) {

        claimsService.deleteClaims(claimNumber);

        return ResponseEntity.ok("Claim deleted successfully");
    }

    // =========================================================
    // SHARED RESPONSE HELPER
    // =========================================================

    private ResponseEntity<ClaimsDto> respond(ClaimsDto claim) {
        return claim == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(claim);
    }
}

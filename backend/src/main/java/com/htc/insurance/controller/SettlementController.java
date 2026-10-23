
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.SettlementDto;
import com.htc.insurance.service.SettlementService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/settlement")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    // =========================================================
    // ADMIN - CREATE SETTLEMENT
    // =========================================================

    @PostMapping("/save")
    public ResponseEntity<SettlementDto> saveSettlement(
            @RequestBody SettlementDto dto) {

        return ResponseEntity.ok(
                settlementService.saveSettlement(dto)
        );
    }

    // =========================================================
    // ADMIN - GET ALL SETTLEMENTS
    // =========================================================

    @GetMapping("/getAll")
    public ResponseEntity<List<SettlementDto>> getAllSettlements() {

        return ResponseEntity.ok(
                settlementService.getAllSettlements()
        );
    }

    // =========================================================
    // ADMIN - GET SETTLEMENT BY ID
    // =========================================================

    @GetMapping("/get/{settlementNumber}")
    public ResponseEntity<SettlementDto> getSettlementById(
            @PathVariable Long settlementNumber) {

        return respond(
                settlementService.getSettlementById(settlementNumber)
        );
    }

    // =========================================================
    // ADMIN - GET SETTLEMENTS BY CLAIM NUMBER
    // =========================================================

    @GetMapping("/claim/{claimNumber}")
    public ResponseEntity<List<SettlementDto>> getSettlementsByClaim(
            @PathVariable Long claimNumber) {

        return ResponseEntity.ok(
                settlementService.getSettlementsByClaimNumber(
                        claimNumber
                )
        );
    }

    // =========================================================
    // ADMIN - UPDATE PENDING SETTLEMENT
    // =========================================================

    @PutMapping("/update/{settlementNumber}")
    public ResponseEntity<SettlementDto> updateSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody SettlementDto dto) {

        return respond(
                settlementService.updateSettlement(
                        settlementNumber,
                        dto
                )
        );
    }

    // =========================================================
    // ADMIN - RECORD BANK TRANSFER
    // PENDING / FAILED -> PROCESSING
    // =========================================================

    @PutMapping("/transfer/{settlementNumber}")
    public ResponseEntity<SettlementDto> recordTransfer(
            @PathVariable Long settlementNumber,
            @RequestBody SettlementDto dto,
            Authentication authentication) {

        return ResponseEntity.ok(
                settlementService.recordTransfer(
                        settlementNumber,
                        dto,
                        requireAdminUsername(authentication)
                )
        );
    }

    // =========================================================
    // ADMIN - LEGACY PROCESS ENDPOINT
    // =========================================================

    /*
     * Preserved for backward compatibility.
     *
     * SettlementService intentionally rejects processing
     * without first recording a bank transaction reference.
     *
     * Use:
     * PUT /settlement/transfer/{settlementNumber}
     *
     * This endpoint must not independently mark
     * a claim as SETTLED.
     */

    @PutMapping("/process/{settlementNumber}")
    public ResponseEntity<SettlementDto> processSettlement(
            @PathVariable Long settlementNumber) {

        return ResponseEntity.ok(
                settlementService.processSettlement(
                        settlementNumber
                )
        );
    }

    // =========================================================
    // ADMIN - CONFIRM SUCCESSFUL BANK PAYMENT
    // PROCESSING -> SETTLED
    // =========================================================

    @PutMapping("/confirm/{settlementNumber}")
    public ResponseEntity<SettlementDto> confirmSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        return ResponseEntity.ok(
                settlementService.confirmSettlement(
                        settlementNumber,
                        requestValue(request, "confirmationRemarks"),
                        requireAdminUsername(authentication)
                )
        );
    }

    // =========================================================
    // ADMIN - RECORD FAILED BANK TRANSFER
    // PROCESSING -> FAILED
    // =========================================================

    @PutMapping("/fail/{settlementNumber}")
    public ResponseEntity<SettlementDto> failSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request) {

        return ResponseEntity.ok(
                settlementService.failSettlement(
                        settlementNumber,
                        requestValue(request, "reason")
                )
        );
    }

    // =========================================================
    // ADMIN - REJECT PENDING SETTLEMENT
    // PENDING -> REJECTED
    // =========================================================

    @PutMapping("/reject/{settlementNumber}")
    public ResponseEntity<SettlementDto> rejectSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request) {

        return ResponseEntity.ok(
                settlementService.rejectSettlement(
                        settlementNumber,
                        requestValue(request, "rejectionReason")
                )
        );
    }

    // =========================================================
    // ADMIN - DELETE PENDING SETTLEMENT
    // =========================================================

    @DeleteMapping("/delete/{settlementNumber}")
    public ResponseEntity<String> deleteSettlement(
            @PathVariable Long settlementNumber) {

        settlementService.deleteSettlement(settlementNumber);

        return ResponseEntity.ok(
                "Settlement deleted successfully."
        );
    }

    // =========================================================
    // SHARED SETTLEMENT RESPONSE
    // =========================================================

    private ResponseEntity<SettlementDto> respond(
            SettlementDto settlement) {

        return settlement == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(settlement);
    }

    // =========================================================
    // SAFE REQUEST VALUE EXTRACTION
    // =========================================================

    private String requestValue(
            Map<String, String> request,
            String key) {

        return request == null ? null : request.get(key);
    }

    // =========================================================
    // AUTHENTICATED ADMIN USERNAME
    // =========================================================

    private String requireAdminUsername(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new AccessDeniedException(
                    "Administrator authentication is required."
            );
        }

        return authentication.getName();
    }
}

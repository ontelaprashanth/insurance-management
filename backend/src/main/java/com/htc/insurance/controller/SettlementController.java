
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.SettlementDto;
import com.htc.insurance.service.SettlementService;

@RestController
@RequestMapping("/settlement")
@PreAuthorize("hasRole('ADMIN')")
public class SettlementController {

    @Autowired
    private SettlementService settlementService;

    // ==========================================
    // CREATE SETTLEMENT
    // ==========================================

    @PostMapping("/save")
    public ResponseEntity<SettlementDto> saveSettlement(
            @RequestBody SettlementDto dto) {

        return ResponseEntity.ok(
                settlementService.saveSettlement(dto));
    }

    // ==========================================
    // GET ALL SETTLEMENTS
    // ==========================================

    @GetMapping("/getAll")
    public ResponseEntity<List<SettlementDto>> getAllSettlements() {

        return ResponseEntity.ok(
                settlementService.getAllSettlements());
    }

    // ==========================================
    // GET SETTLEMENT BY ID
    // ==========================================

    @GetMapping("/get/{settlementNumber}")
    public ResponseEntity<SettlementDto> getSettlementById(
            @PathVariable Long settlementNumber) {

        SettlementDto settlement =
                settlementService.getSettlementById(
                        settlementNumber);

        if (settlement == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(settlement);
    }

    // ==========================================
    // GET SETTLEMENTS BY CLAIM
    // ==========================================

    @GetMapping("/claim/{claimNumber}")
    public ResponseEntity<List<SettlementDto>> getSettlementsByClaim(
            @PathVariable Long claimNumber) {

        return ResponseEntity.ok(
                settlementService
                        .getSettlementsByClaimNumber(claimNumber));
    }

    // ==========================================
    // UPDATE PENDING SETTLEMENT
    // ==========================================

    @PutMapping("/update/{settlementNumber}")
    public ResponseEntity<SettlementDto> updateSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody SettlementDto dto) {

        SettlementDto updated =
                settlementService.updateSettlement(
                        settlementNumber, dto);

        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(updated);
    }

    // ==========================================
    // RECORD BANK TRANSFER
    // ==========================================

    @PutMapping("/transfer/{settlementNumber}")
    public ResponseEntity<SettlementDto> recordTransfer(
            @PathVariable Long settlementNumber,
            @RequestBody SettlementDto dto,
            Authentication authentication) {

        return ResponseEntity.ok(
                settlementService.recordTransfer(
                        settlementNumber,
                        dto,
                        authentication.getName()));
    }

    // ==========================================
    // LEGACY PROCESS ENDPOINT
    // ==========================================
    // Preserve existing route.
    // Must only transition PENDING -> PROCESSING.
    // It must NEVER mark a claim as SETTLED.

    @PutMapping("/process/{settlementNumber}")
    public ResponseEntity<SettlementDto> processSettlement(
            @PathVariable Long settlementNumber) {

        return ResponseEntity.ok(
                settlementService.processSettlement(
                        settlementNumber));
    }

    // ==========================================
    // CONFIRM SUCCESSFUL BANK PAYMENT
    // ==========================================

    @PutMapping("/confirm/{settlementNumber}")
    public ResponseEntity<SettlementDto> confirmSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        String remarks = request == null
                ? null
                : request.get("confirmationRemarks");

        return ResponseEntity.ok(
                settlementService.confirmSettlement(
                        settlementNumber,
                        remarks,
                        authentication.getName()));
    }

    // ==========================================
    // RECORD FAILED BANK TRANSFER
    // ==========================================

    @PutMapping("/fail/{settlementNumber}")
    public ResponseEntity<SettlementDto> failSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request) {

        String reason = request == null
                ? null
                : request.get("reason");

        return ResponseEntity.ok(
                settlementService.failSettlement(
                        settlementNumber, reason));
    }

    // ==========================================
    // REJECT PENDING SETTLEMENT
    // ==========================================

    @PutMapping("/reject/{settlementNumber}")
    public ResponseEntity<SettlementDto> rejectSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request) {

        String reason = request == null
                ? null
                : request.get("rejectionReason");

        return ResponseEntity.ok(
                settlementService.rejectSettlement(
                        settlementNumber, reason));
    }

    // ==========================================
    // DELETE PENDING SETTLEMENT
    // ==========================================

    @DeleteMapping("/delete/{settlementNumber}")
    public ResponseEntity<String> deleteSettlement(
            @PathVariable Long settlementNumber) {

        settlementService.deleteSettlement(settlementNumber);

        return ResponseEntity.ok(
                "Settlement deleted successfully.");
    }
}

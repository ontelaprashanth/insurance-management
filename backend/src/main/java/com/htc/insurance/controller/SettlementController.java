
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.SettlementDto;
import com.htc.insurance.service.SettlementService;

@RestController
@RequestMapping("/settlement")
public class SettlementController {

    @Autowired
    private SettlementService settlementService;

    @PostMapping("/save")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettlementDto> saveSettlement(
            @RequestBody SettlementDto settlementDto) {

        return ResponseEntity.ok(
                settlementService.saveSettlement(settlementDto)
        );
    }

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SettlementDto>> getAllSettlements() {

        return ResponseEntity.ok(
                settlementService.getAllSettlements()
        );
    }

    @GetMapping("/get/{settlementNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettlementDto> getSettlementById(
            @PathVariable Long settlementNumber) {

        SettlementDto settlement =
                settlementService.getSettlementById(settlementNumber);

        if (settlement == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(settlement);
    }

    @GetMapping("/claim/{claimNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SettlementDto>> getSettlementsByClaim(
            @PathVariable Long claimNumber) {

        return ResponseEntity.ok(
                settlementService.getSettlementsByClaimNumber(claimNumber)
        );
    }

    @PutMapping("/update/{settlementNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettlementDto> updateSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody SettlementDto settlementDto) {

        SettlementDto updated =
                settlementService.updateSettlement(
                        settlementNumber,
                        settlementDto
                );

        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(updated);
    }

    @PutMapping("/process/{settlementNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettlementDto> processSettlement(
            @PathVariable Long settlementNumber) {

        return ResponseEntity.ok(
                settlementService.processSettlement(settlementNumber)
        );
    }

    @PutMapping("/reject/{settlementNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettlementDto> rejectSettlement(
            @PathVariable Long settlementNumber,
            @RequestBody Map<String, String> request) {

        String reason = request == null
                ? null
                : request.get("rejectionReason");

        return ResponseEntity.ok(
                settlementService.rejectSettlement(
                        settlementNumber,
                        reason
                )
        );
    }

    @DeleteMapping("/delete/{settlementNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteSettlement(
            @PathVariable Long settlementNumber) {

        settlementService.deleteSettlement(settlementNumber);

        return ResponseEntity.ok(
                "Settlement deleted successfully."
        );
    }
}

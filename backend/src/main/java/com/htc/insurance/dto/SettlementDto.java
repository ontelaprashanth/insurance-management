
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class SettlementDto {

    // ==========================================
    // EXISTING SETTLEMENT FIELDS
    // ==========================================

    private Long settlementNumber;
    private LocalDate settlementDate;
    private BigDecimal amount;
    private String settlementStatus;
    private Long claimNumber;
    private String rejectionReason;

    // ==========================================
    // MANUAL BANK TRANSFER DETAILS
    // ==========================================

    private String transactionReference;
    private LocalDate transferDate;
    private String transferRecordedBy;

    // ==========================================
    // FINAL SETTLEMENT CONFIRMATION
    // ==========================================

    private LocalDateTime confirmedAt;
    private String confirmedBy;
    private String confirmationRemarks;
}

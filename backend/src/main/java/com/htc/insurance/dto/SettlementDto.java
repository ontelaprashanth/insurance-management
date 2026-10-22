
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
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

    // Bank transaction reference / UTR
    private String transactionReference;

    // Date the transfer was recorded
    private LocalDate transferDate;

    // Admin who recorded the transfer
    private String transferRecordedBy;

    // ==========================================
    // FINAL SETTLEMENT CONFIRMATION
    // ==========================================

    // Timestamp of successful confirmation
    private LocalDateTime confirmedAt;

    // Admin who confirmed the settlement
    private String confirmedBy;

    // Optional confirmation notes
    private String confirmationRemarks;
}

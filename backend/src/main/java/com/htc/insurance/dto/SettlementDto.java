
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    // ==========================================
    // DEFAULT CONSTRUCTOR
    // ==========================================

    public SettlementDto() {
    }

    // ==========================================
    // SETTLEMENT DETAILS
    // ==========================================

    public Long getSettlementNumber() {
        return settlementNumber;
    }

    public void setSettlementNumber(Long settlementNumber) {
        this.settlementNumber = settlementNumber;
    }

    public LocalDate getSettlementDate() {
        return settlementDate;
    }

    public void setSettlementDate(LocalDate settlementDate) {
        this.settlementDate = settlementDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getSettlementStatus() {
        return settlementStatus;
    }

    public void setSettlementStatus(String settlementStatus) {
        this.settlementStatus = settlementStatus;
    }

    public Long getClaimNumber() {
        return claimNumber;
    }

    public void setClaimNumber(Long claimNumber) {
        this.claimNumber = claimNumber;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    // ==========================================
    // BANK TRANSFER
    // ==========================================

    public String getTransactionReference() {
        return transactionReference;
    }

    public void setTransactionReference(
            String transactionReference) {
        this.transactionReference = transactionReference;
    }

    public LocalDate getTransferDate() {
        return transferDate;
    }

    public void setTransferDate(LocalDate transferDate) {
        this.transferDate = transferDate;
    }

    public String getTransferRecordedBy() {
        return transferRecordedBy;
    }

    public void setTransferRecordedBy(
            String transferRecordedBy) {
        this.transferRecordedBy = transferRecordedBy;
    }

    // ==========================================
    // CONFIRMATION
    // ==========================================

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public String getConfirmedBy() {
        return confirmedBy;
    }

    public void setConfirmedBy(String confirmedBy) {
        this.confirmedBy = confirmedBy;
    }

    public String getConfirmationRemarks() {
        return confirmationRemarks;
    }

    public void setConfirmationRemarks(
            String confirmationRemarks) {
        this.confirmationRemarks = confirmationRemarks;
    }
}

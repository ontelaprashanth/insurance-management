
package com.htc.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "settlement")
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long settlementNumber;

    // =========================================================
    // SETTLEMENT DETAILS
    // =========================================================

    private LocalDate settlementDate;

    private BigDecimal amount;

    // PENDING, PROCESSING, SETTLED, REJECTED, FAILED
    @Column(name = "settlement_status", length = 30)
    private String settlementStatus;

    // =========================================================
    // REJECTION / FAILURE DETAILS
    // =========================================================

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    // =========================================================
    // BANK TRANSFER DETAILS
    // =========================================================

    @Column(name = "transaction_reference", length = 150)
    private String transactionReference;

    @Column(name = "transfer_date")
    private LocalDate transferDate;

    @Column(name = "transfer_recorded_by", length = 150)
    private String transferRecordedBy;

    // =========================================================
    // PAYMENT CONFIRMATION DETAILS
    // =========================================================

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmed_by", length = 150)
    private String confirmedBy;

    @Column(name = "confirmation_remarks", length = 1000)
    private String confirmationRemarks;

    // =========================================================
    // CLAIM RELATIONSHIP
    // =========================================================

    @ManyToOne
    @JoinColumn(
        name = "claim_number",
        nullable = false,
        unique = true
    )
    private Claims claim;

    // =========================================================
    // DEFAULT CONSTRUCTOR
    // =========================================================

    public Settlement() {
    }

    // =========================================================
    // SETTLEMENT NUMBER
    // =========================================================

    public Long getSettlementNumber() {
        return settlementNumber;
    }

    public void setSettlementNumber(Long settlementNumber) {
        this.settlementNumber = settlementNumber;
    }

    // =========================================================
    // SETTLEMENT DATE
    // =========================================================

    public LocalDate getSettlementDate() {
        return settlementDate;
    }

    public void setSettlementDate(LocalDate settlementDate) {
        this.settlementDate = settlementDate;
    }

    // =========================================================
    // AMOUNT
    // =========================================================

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    // =========================================================
    // SETTLEMENT STATUS
    // =========================================================

    public String getSettlementStatus() {
        return settlementStatus;
    }

    public void setSettlementStatus(String settlementStatus) {
        this.settlementStatus = settlementStatus;
    }

    // =========================================================
    // REJECTION REASON
    // =========================================================

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    // =========================================================
    // TRANSACTION REFERENCE
    // =========================================================

    public String getTransactionReference() {
        return transactionReference;
    }

    public void setTransactionReference(String transactionReference) {
        this.transactionReference = transactionReference;
    }

    // =========================================================
    // TRANSFER DATE
    // =========================================================

    public LocalDate getTransferDate() {
        return transferDate;
    }

    public void setTransferDate(LocalDate transferDate) {
        this.transferDate = transferDate;
    }

    // =========================================================
    // TRANSFER RECORDED BY
    // =========================================================

    public String getTransferRecordedBy() {
        return transferRecordedBy;
    }

    public void setTransferRecordedBy(String transferRecordedBy) {
        this.transferRecordedBy = transferRecordedBy;
    }

    // =========================================================
    // CONFIRMED AT
    // =========================================================

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    // =========================================================
    // CONFIRMED BY
    // =========================================================

    public String getConfirmedBy() {
        return confirmedBy;
    }

    public void setConfirmedBy(String confirmedBy) {
        this.confirmedBy = confirmedBy;
    }

    // =========================================================
    // CONFIRMATION REMARKS
    // =========================================================

    public String getConfirmationRemarks() {
        return confirmationRemarks;
    }

    public void setConfirmationRemarks(String confirmationRemarks) {
        this.confirmationRemarks = confirmationRemarks;
    }

    // =========================================================
    // CLAIM RELATIONSHIP
    // =========================================================

    public Claims getClaim() {
        return claim;
    }

    public void setClaim(Claims claim) {
        this.claim = claim;
    }
}

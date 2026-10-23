
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

import lombok.Data;

@Entity
@Table(name = "settlement")
@Data
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long settlementNumber;

    // =========================================================
    // SETTLEMENT DETAILS
    // =========================================================

    // Settlement record date
    private LocalDate settlementDate;

    // Amount approved for settlement
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

    // Bank transaction reference / UTR
    @Column(name = "transaction_reference", length = 150)
    private String transactionReference;

    // Date admin recorded the bank transfer
    @Column(name = "transfer_date")
    private LocalDate transferDate;

    // Admin who recorded the transfer
    @Column(name = "transfer_recorded_by", length = 150)
    private String transferRecordedBy;

    // =========================================================
    // PAYMENT CONFIRMATION DETAILS
    // =========================================================

    // Time settlement was finally confirmed
    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    // Admin who confirmed successful payment
    @Column(name = "confirmed_by", length = 150)
    private String confirmedBy;

    // Optional audit note
    @Column(name = "confirmation_remarks", length = 1000)
    private String confirmationRemarks;

    // =========================================================
    // CLAIM RELATIONSHIP
    // =========================================================

    // One settlement per claim.
    // Failed bank transfers are retried using the same record.
    @ManyToOne
    @JoinColumn(
            name = "claim_number",
            nullable = false,
            unique = true
    )
    private Claims claim;
}

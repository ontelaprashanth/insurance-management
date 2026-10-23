
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

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "settlement")
@Getter
@Setter
@NoArgsConstructor
public class Settlement {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

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
}

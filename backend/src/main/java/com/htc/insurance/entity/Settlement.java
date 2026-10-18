
package com.htc.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

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

    private LocalDate settlementDate;

    private BigDecimal amount;

    private String settlementStatus;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @ManyToOne
    @JoinColumn(name = "claim_number")
    private Claims claim;
}

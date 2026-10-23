
package com.htc.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "claims")
@Getter
@Setter
@NoArgsConstructor
public class Claims {

    // =========================================================
    // CLAIM IDENTIFICATION
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long claimNumber;

    private LocalDate claimDate;

    @Column(name = "nfilepo")
    private String nFilepo;

    // =========================================================
    // CLAIM INFORMATION
    // =========================================================

    private BigDecimal amount;

    private String claimType;

    private LocalDate incidentDate;

    private String incidentLocation;

    @Column(columnDefinition = "TEXT")
    private String description;

    // =========================================================
    // ADMIN REVIEW
    // =========================================================

    private BigDecimal approvedAmount;

    @Column(columnDefinition = "TEXT")
    private String adminRemarks;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    private LocalDate reviewedDate;

    // =========================================================
    // POLICY RELATIONSHIP
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "policy_number")
    private Policy policy;

    // =========================================================
    // REVIEWER RELATIONSHIP
    // =========================================================

    @OneToMany(mappedBy = "claim")
    private List<Reviewer> reviewers;

    // =========================================================
    // SETTLEMENT RELATIONSHIP
    // =========================================================

    @OneToMany(mappedBy = "claim")
    private List<Settlement> settlements;

    // =========================================================
    // CLAIM STATUS
    // =========================================================

    @Enumerated(EnumType.STRING)
    private ClaimStatus status;
}

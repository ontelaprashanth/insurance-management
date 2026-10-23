
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.htc.insurance.entity.ClaimStatus;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ClaimsDto {

    // =====================================================
    // CLAIM INFORMATION
    // =====================================================

    private Long claimNumber;

    private LocalDate claimDate;

    @JsonProperty("nfilepo")
    private String nFilepo;

    private BigDecimal amount;

    private String claimType;

    // =====================================================
    // INCIDENT DETAILS
    // =====================================================

    private LocalDate incidentDate;

    private String incidentLocation;

    private String description;

    // =====================================================
    // ADMIN DECISION DETAILS
    // =====================================================

    private BigDecimal approvedAmount;

    private String adminRemarks;

    private String rejectionReason;

    private LocalDate reviewedDate;

    // =====================================================
    // POLICY AND CLAIM STATUS
    // =====================================================

    private Long policyNumber;

    private ClaimStatus status;

    // =====================================================
    // REVIEWER REFERENCE
    // =====================================================

    private Long reviewerId;
}

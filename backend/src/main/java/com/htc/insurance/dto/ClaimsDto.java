package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.htc.insurance.entity.ClaimStatus;

import lombok.Data;

@Data
public class ClaimsDto {

    /*
     * Generated claim number
     */
    private Long claimNumber;

    /*
     * Date customer submitted claim
     */
    private LocalDate claimDate;

    /*
     * Existing document/file reference
     */
    @JsonProperty("nfilepo")
    private String nFilepo;

    /*
     * Amount requested by customer
     */
    private BigDecimal amount;

    /*
     * Claim category
     */
    private String claimType;

    /*
     * Date of actual incident
     */
    private LocalDate incidentDate;

    /*
     * Location of incident
     */
    private String incidentLocation;

    /*
     * Customer's explanation
     */
    private String description;

    /*
     * Amount approved by admin
     */
    private BigDecimal approvedAmount;

    /*
     * Admin remarks
     */
    private String adminRemarks;

    /*
     * Reason for rejection
     */
    private String rejectionReason;

    /*
     * Date admin reviewed claim
     */
    private LocalDate reviewedDate;

    /*
     * Policy connected with claim
     */
    private Long policyNumber;

    /*
     * PENDING / APPROVED / REJECTED
     */
    private ClaimStatus status;

    /*
     * Existing reviewer ID
     */
    private Long reviewerId;
}
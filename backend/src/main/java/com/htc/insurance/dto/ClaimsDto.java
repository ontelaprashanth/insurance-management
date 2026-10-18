package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.htc.insurance.entity.ClaimStatus;

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

    public ClaimsDto() {
    }

    public Long getClaimNumber() {
        return claimNumber;
    }

    public void setClaimNumber(Long claimNumber) {
        this.claimNumber = claimNumber;
    }

    public LocalDate getClaimDate() {
        return claimDate;
    }

    public void setClaimDate(LocalDate claimDate) {
        this.claimDate = claimDate;
    }

    @JsonProperty("nfilepo")
    public String getNFilepo() {
        return nFilepo;
    }

    @JsonProperty("nfilepo")
    public void setNFilepo(String nFilepo) {
        this.nFilepo = nFilepo;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getClaimType() {
        return claimType;
    }

    public void setClaimType(String claimType) {
        this.claimType = claimType;
    }

    public LocalDate getIncidentDate() {
        return incidentDate;
    }

    public void setIncidentDate(LocalDate incidentDate) {
        this.incidentDate = incidentDate;
    }

    public String getIncidentLocation() {
        return incidentLocation;
    }

    public void setIncidentLocation(String incidentLocation) {
        this.incidentLocation = incidentLocation;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getApprovedAmount() {
        return approvedAmount;
    }

    public void setApprovedAmount(BigDecimal approvedAmount) {
        this.approvedAmount = approvedAmount;
    }

    public String getAdminRemarks() {
        return adminRemarks;
    }

    public void setAdminRemarks(String adminRemarks) {
        this.adminRemarks = adminRemarks;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public LocalDate getReviewedDate() {
        return reviewedDate;
    }

    public void setReviewedDate(LocalDate reviewedDate) {
        this.reviewedDate = reviewedDate;
    }

    public Long getPolicyNumber() {
        return policyNumber;
    }

    public void setPolicyNumber(Long policyNumber) {
        this.policyNumber = policyNumber;
    }

    public ClaimStatus getStatus() {
        return status;
    }

    public void setStatus(ClaimStatus status) {
        this.status = status;
    }

    public Long getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(Long reviewerId) {
        this.reviewerId = reviewerId;
    }
}

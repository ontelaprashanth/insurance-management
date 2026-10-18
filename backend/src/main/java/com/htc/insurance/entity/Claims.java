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
import lombok.Data;

@Entity
@Table(name = "claims")
@Data
public class Claims {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long claimNumber;

    /*
     * Date when customer submitted the claim
     */
    private LocalDate claimDate;

    /*
     * Existing field from your project.
     * Can be used for file/document reference.
     */
    @Column(name = "nfilepo")
    private String nFilepo;

    /*
     * Amount requested by customer
     */
    private BigDecimal amount;

    /*
     * Type of insurance claim
     *
     * Examples:
     * Hospitalization
     * Accident
     * Medical
     * Vehicle Damage
     * Property Damage
     * Travel
     */
    private String claimType;

    /*
     * Date when the actual incident happened
     */
    private LocalDate incidentDate;

    /*
     * Place where the incident happened
     */
    private String incidentLocation;

    /*
     * Detailed explanation of the incident
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /*
     * Amount approved by admin
     */
    private BigDecimal approvedAmount;

    /*
     * General remarks from admin
     */
    @Column(columnDefinition = "TEXT")
    private String adminRemarks;

    /*
     * Reason for rejection
     */
    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    /*
     * Date when admin reviewed the claim
     */
    private LocalDate reviewedDate;

    /*
     * Claim belongs to a policy
     */
    @ManyToOne
    @JoinColumn(name = "policy_number")
    private Policy policy;

    /*
     * Existing reviewer relationship
     */
    @OneToMany(mappedBy = "claim")
    private List<Reviewer> reviewers;

    /*
     * Existing settlement relationship
     */
    @OneToMany(mappedBy = "claim")
    private List<Settlement> settlements;

    /*
     * PENDING / APPROVED / REJECTED
     */
    @Enumerated(EnumType.STRING)
    private ClaimStatus status;
}
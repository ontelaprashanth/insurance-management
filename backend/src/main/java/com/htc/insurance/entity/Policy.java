
package com.htc.insurance.entity;

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

@Entity
@Table(name = "policy")
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long policyNumber;

    private String coveredTypes;

    private Boolean isActive;

    private LocalDate startDate;

    private Integer durationYears;

    private LocalDate expiryDate;

    // =========================================================
    // POLICY LIFECYCLE STATUS
    // =========================================================

    @Enumerated(EnumType.STRING)
    @Column(name = "lifecycle_status", length = 30)
    private PolicyLifecycleStatus lifecycleStatus;

    // =========================================================
    // RELATIONSHIPS
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "policy_holder_id")
    private PolicyHolder policyHolder;

    @OneToMany(mappedBy = "policy")
    private List<Claims> claims;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public Policy() {
    }

    // =========================================================
    // POLICY NUMBER
    // =========================================================

    public Long getPolicyNumber() {
        return policyNumber;
    }

    public void setPolicyNumber(Long policyNumber) {
        this.policyNumber = policyNumber;
    }

    // =========================================================
    // COVERAGE TYPES
    // =========================================================

    public String getCoveredTypes() {
        return coveredTypes;
    }

    public void setCoveredTypes(String coveredTypes) {
        this.coveredTypes = coveredTypes;
    }

    // =========================================================
    // ACTIVE STATUS
    // =========================================================

    public Boolean getIsActive() {
        return isActive;
    }

    public Boolean isActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    // =========================================================
    // POLICY LIFECYCLE
    // =========================================================

    public PolicyLifecycleStatus getLifecycleStatus() {
        return lifecycleStatus;
    }

    public void setLifecycleStatus(
            PolicyLifecycleStatus lifecycleStatus) {
        this.lifecycleStatus = lifecycleStatus;
    }

    // =========================================================
    // START DATE
    // =========================================================

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    // =========================================================
    // DURATION
    // =========================================================

    public Integer getDurationYears() {
        return durationYears;
    }

    public void setDurationYears(Integer durationYears) {
        this.durationYears = durationYears;
    }

    // =========================================================
    // EXPIRY DATE
    // =========================================================

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    // =========================================================
    // POLICY HOLDER
    // =========================================================

    public PolicyHolder getPolicyHolder() {
        return policyHolder;
    }

    public void setPolicyHolder(PolicyHolder policyHolder) {
        this.policyHolder = policyHolder;
    }

    // =========================================================
    // CLAIMS
    // =========================================================

    public List<Claims> getClaims() {
        return claims;
    }

    public void setClaims(List<Claims> claims) {
        this.claims = claims;
    }
}

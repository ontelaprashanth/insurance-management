
package com.htc.insurance.entity;

import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.Entity;
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

    @ManyToOne
    @JoinColumn(name = "policy_holder_id")
    private PolicyHolder policyHolder;

    @OneToMany(mappedBy = "policy")
    private List<Claims> claims;

    public Policy() {
    }

    public Long getPolicyNumber() {
        return policyNumber;
    }

    public void setPolicyNumber(Long policyNumber) {
        this.policyNumber = policyNumber;
    }

    public String getCoveredTypes() {
        return coveredTypes;
    }

    public void setCoveredTypes(String coveredTypes) {
        this.coveredTypes = coveredTypes;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public Boolean isActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public Integer getDurationYears() {
        return durationYears;
    }

    public void setDurationYears(Integer durationYears) {
        this.durationYears = durationYears;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public PolicyHolder getPolicyHolder() {
        return policyHolder;
    }

    public void setPolicyHolder(PolicyHolder policyHolder) {
        this.policyHolder = policyHolder;
    }

    public List<Claims> getClaims() {
        return claims;
    }

    public void setClaims(List<Claims> claims) {
        this.claims = claims;
    }
}

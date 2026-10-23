package com.htc.insurance.entity;

import java.math.BigDecimal;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

@Entity
@Table(name = "insurance_plan", uniqueConstraints = {
    @UniqueConstraint(name = "uk_insurance_plan_code", columnNames = "plan_code")
})
@Data
public class InsurancePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long planId;

    @Column(name = "plan_code", nullable = false, unique = true, length = 40)
    private String planCode;

    @Column(name = "plan_name", nullable = false, length = 100)
    private String planName;

    @Column(name = "description", nullable = false, length = 500)
    private String description;

    @Column(name = "covered_type", nullable = false, length = 100)
    private String coveredType;

    @Column(name = "base_premium", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePremium;

    @Column(name = "base_coverage", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseCoverage;

    @Column(nullable = false)
    private Boolean isActive = true;

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCoveredType() {
        return coveredType;
    }

    public void setCoveredType(String coveredType) {
        this.coveredType = coveredType;
    }

    public BigDecimal getBasePremium() {
        return basePremium;
    }

    public void setBasePremium(BigDecimal basePremium) {
        this.basePremium = basePremium;
    }

    public BigDecimal getBaseCoverage() {
        return baseCoverage;
    }

    public void setBaseCoverage(BigDecimal baseCoverage) {
        this.baseCoverage = baseCoverage;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

}

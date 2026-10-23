
package com.htc.insurance.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "insurance_plan",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_insurance_plan_code",
            columnNames = "plan_code"
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
public class InsurancePlan {

    // =========================================================
    // PLAN IDENTIFICATION
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long planId;

    @Column(
        name = "plan_code",
        nullable = false,
        unique = true,
        length = 40
    )
    private String planCode;

    // =========================================================
    // PLAN DETAILS
    // =========================================================

    @Column(
        name = "plan_name",
        nullable = false,
        length = 100
    )
    private String planName;

    @Column(
        name = "description",
        nullable = false,
        length = 500
    )
    private String description;

    @Column(
        name = "covered_type",
        nullable = false,
        length = 100
    )
    private String coveredType;

    // =========================================================
    // PREMIUM AND COVERAGE
    // =========================================================

    @Column(
        name = "base_premium",
        nullable = false,
        precision = 12,
        scale = 2
    )
    private BigDecimal basePremium;

    @Column(
        name = "base_coverage",
        nullable = false,
        precision = 15,
        scale = 2
    )
    private BigDecimal baseCoverage;

    // =========================================================
    // PLAN STATUS
    // =========================================================

    @Column(nullable = false)
    private Boolean isActive = true;
}

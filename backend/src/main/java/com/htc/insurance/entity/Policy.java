
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

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "policy")
@Getter
@Setter
@NoArgsConstructor
public class Policy {

    // =========================================================
    // POLICY IDENTIFICATION
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long policyNumber;

    // =========================================================
    // POLICY DETAILS
    // =========================================================

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
    // EXISTING ACTIVE STATUS COMPATIBILITY
    // =========================================================

    /**
     * Preserves the existing isActive() method.
     *
     * Lombok also generates:
     * getIsActive()
     * setIsActive(Boolean)
     */
    public Boolean isActive() {
        return isActive;
    }
}

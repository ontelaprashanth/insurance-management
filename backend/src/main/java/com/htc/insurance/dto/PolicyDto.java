
package com.htc.insurance.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class PolicyDto {

    // =====================================================
    // POLICY INFORMATION
    // =====================================================

    private Long policyNumber;

    private String coveredTypes;

    private Boolean isActive;

    private LocalDate startDate;

    private Integer durationYears;

    private LocalDate expiryDate;

    // =====================================================
    // POLICY HOLDER
    // =====================================================

    private Long policyHolderId;

    // =====================================================
    // CLAIM INFORMATION
    // =====================================================

    private Boolean hasClaims;

    // =====================================================
    // COMPUTED POLICY STATUS
    // =====================================================

    /**
     * ACTIVE, INACTIVE, or EXPIRED.
     */
    private String status;
}


package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class ClaimDecisionDto {

    // =====================================================
    // APPROVED AMOUNT
    // =====================================================

    private BigDecimal approvedAmount;

    // =====================================================
    // ADMIN REMARKS
    // =====================================================

    private String adminRemarks;

    // =====================================================
    // REJECTION REASON
    // =====================================================

    private String rejectionReason;
}


package com.htc.insurance.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class PolicyDto {

    private Long policyNumber;
    private String coveredTypes;
    private Boolean isActive;
    private LocalDate startDate;
    private Integer durationYears;
    private LocalDate expiryDate;
    private Long policyHolderId;
    private Boolean hasClaims;

    // Computed status: ACTIVE, INACTIVE, or EXPIRED.
    private String status;
}

package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class ClaimDecisionDto {

    private BigDecimal approvedAmount;

    private String adminRemarks;

    private String rejectionReason;
}
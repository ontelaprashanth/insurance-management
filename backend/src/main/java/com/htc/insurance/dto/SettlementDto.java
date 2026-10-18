
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Data;

@Data
public class SettlementDto {

    private Long settlementNumber;

    private LocalDate settlementDate;

    private BigDecimal amount;

    private String settlementStatus;

    private Long claimNumber;

    private String rejectionReason;
}

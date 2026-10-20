package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class RefundRequestDto {

    private Long purchaseId;

    private BigDecimal refundAmount;

    private String refundReason;
}

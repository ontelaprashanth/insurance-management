package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class PaymentOrderRequest {

    private BigDecimal amount;

    private String currency;

    private String receipt;
}
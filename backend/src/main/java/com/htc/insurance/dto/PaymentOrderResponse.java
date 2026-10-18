package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponse {

    private String orderId;

    private String keyId;

    private BigDecimal amount;

    private String currency;

    private String receipt;
}
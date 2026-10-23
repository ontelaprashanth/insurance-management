
package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PaymentOrderRequest {

    // =====================================================
    // SELECTED INSURANCE PLAN
    // =====================================================

    private Long planId;

    // =====================================================
    // REQUESTED COVERAGE
    // =====================================================

    private BigDecimal coverageAmount;

    // =====================================================
    // POLICY DURATION
    // =====================================================

    private Integer durationYears;

    // =====================================================
    // LEGACY PAYMENT AMOUNT
    // =====================================================

    /**
     * Retained for compatibility with the existing PaymentService.
     *
     * The backend must calculate the payable amount and must
     * never trust this client-supplied value.
     */
    @Deprecated
    @Getter(onMethod_ = @Deprecated)
    @Setter(onMethod_ = @Deprecated)
    private BigDecimal amount;

    // =====================================================
    // PAYMENT CURRENCY
    // =====================================================

    private String currency;

    // =====================================================
    // RAZORPAY RECEIPT
    // =====================================================

    private String receipt;
}


package com.htc.insurance.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class PaymentOrderRequest {

    /*
     * Catalogue plan selected by the customer.
     */
    private Long planId;

    /*
     * Requested insurance coverage amount.
     */
    private BigDecimal coverageAmount;

    /*
     * Requested policy duration in years.
     */
    private Integer durationYears;

    /*
     * Retained temporarily for compatibility with the existing
     * PaymentService. The secured order-creation flow must NOT
     * trust this client-supplied amount.
     */
    @Deprecated
    private BigDecimal amount;

    /*
     * Payment currency. The backend validates this against
     * its configured Razorpay currency.
     */
    private String currency;

    /*
     * Optional Razorpay receipt reference.
     */
    private String receipt;
}

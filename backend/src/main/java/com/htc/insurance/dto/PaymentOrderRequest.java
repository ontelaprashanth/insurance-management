package com.htc.insurance.dto;

import java.math.BigDecimal;

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

    public PaymentOrderRequest() {
    }

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }

    public BigDecimal getCoverageAmount() {
        return coverageAmount;
    }

    public void setCoverageAmount(BigDecimal coverageAmount) {
        this.coverageAmount = coverageAmount;
    }

    public Integer getDurationYears() {
        return durationYears;
    }

    public void setDurationYears(Integer durationYears) {
        this.durationYears = durationYears;
    }

    @Deprecated
    public BigDecimal getAmount() {
        return amount;
    }

    @Deprecated
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReceipt() {
        return receipt;
    }

    public void setReceipt(String receipt) {
        this.receipt = receipt;
    }
}

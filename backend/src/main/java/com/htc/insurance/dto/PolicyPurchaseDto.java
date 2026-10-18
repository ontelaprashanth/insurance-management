
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class PurchasePolicyDto {

    // =====================================================
    // PERMANENT CATALOGUE
    // =====================================================

    private Long planId;

    // =====================================================
    // PURCHASE / CUSTOMER POLICY DETAILS
    // =====================================================

    private Long purchaseId;

    private Long policyNumber;

    private String username;

    private String coveredTypes;

    private Integer durationYears;

    private BigDecimal coverageAmount;

    // =====================================================
    // NOMINEE DETAILS
    // =====================================================

    private String nomineeName;

    private String nomineeRelation;

    private String nomineeContact;

    // =====================================================
    // PAYMENT METHOD
    // =====================================================

    private String paymentMethod;

    // =====================================================
    // PRICING
    // =====================================================

    private BigDecimal basePremium;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstRate;

    private BigDecimal gstAmount;

    private BigDecimal totalPremium;

    // =====================================================
    // PAYMENT RESULT
    // =====================================================

    private String paymentStatus;

    private String transactionId;

    private String razorpayOrderId;

    private String razorpayPaymentId;

    /*
     * Used only to verify the Razorpay payment.
     * Do not persist this signature in the database.
     */
    private String razorpaySignature;

    private LocalDate paymentDate;

    private LocalDateTime paymentDateTime;

    // =====================================================
    // PURCHASE TIMESTAMP
    // =====================================================

    private LocalDate purchaseDate;

    private LocalDateTime createdAt;

    // =====================================================
    // REFUND DETAILS
    // =====================================================

    private String refundStatus;

    private String refundId;

    private BigDecimal refundAmount;

    private String refundReason;

    private LocalDateTime refundDateTime;

    // =====================================================
    // REFUND ELIGIBILITY
    // =====================================================

    private LocalDateTime refundDeadline;

    private Boolean refundEligible;
}

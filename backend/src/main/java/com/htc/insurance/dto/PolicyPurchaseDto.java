
package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PolicyPurchaseDto {

    // =========================================================
    // PLAN AND PURCHASE INFORMATION
    // =========================================================

    private Long planId;
    private Long purchaseId;
    private Long policyNumber;

    // =========================================================
    // POLICY RENEWAL RELATIONSHIP
    // =========================================================

    private Long renewedFromPurchaseId;
    private Long renewedFromPolicyNumber;

    // =========================================================
    // CUSTOMER AND POLICY DETAILS
    // =========================================================

    private String username;
    private String coveredTypes;
    private Integer durationYears;
    private BigDecimal coverageAmount;

    // =========================================================
    // NOMINEE INFORMATION
    // =========================================================

    private String nomineeName;
    private String nomineeRelation;
    private String nomineeContact;

    // =========================================================
    // PAYMENT METHOD
    // =========================================================

    private String paymentMethod;

    // =========================================================
    // PREMIUM BREAKDOWN
    // =========================================================

    private BigDecimal basePremium;
    private BigDecimal discountAmount;
    private BigDecimal taxableAmount;
    private BigDecimal gstRate;
    private BigDecimal gstAmount;
    private BigDecimal totalPremium;

    // =========================================================
    // PAYMENT STATUS AND RAZORPAY REFERENCES
    // =========================================================

    private String paymentStatus;
    private String transactionId;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;

    // =========================================================
    // PAYMENT AND PURCHASE DATES
    // =========================================================

    private LocalDate paymentDate;
    private LocalDateTime paymentDateTime;
    private LocalDate purchaseDate;
    private LocalDateTime createdAt;

    // =========================================================
    // REFUND DETAILS
    // =========================================================

    private String refundStatus;
    private String refundId;
    private BigDecimal refundAmount;
    private String refundReason;
    private LocalDateTime refundDateTime;

    // =========================================================
    // REFUND ELIGIBILITY
    // =========================================================

    private LocalDateTime refundDeadline;
    private Boolean refundEligible;
}


package com.htc.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class PurchasePolicyDto {

    // =====================================================
    // PURCHASE / POLICY DETAILS
    // =====================================================

    private Long purchaseId;

    private Long policyNumber;

    private String username;

    private String coveredTypes;

    private Integer durationYears;

    private BigDecimal coverageAmount;

    private Long planId;

    // =====================================================
    // RENEWAL RELATIONSHIP
    // =====================================================

    // Purchase ID of the original policy.
    // Null for a normal policy purchase.
    private Long renewedFromPurchaseId;

    // Policy number of the original policy.
    // Null for a normal policy purchase.
    private Long renewedFromPolicyNumber;

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
    // PREMIUM DETAILS
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
     * Razorpay checkout signature.
     *
     * Received from the frontend and verified by the backend.
     * Do not persist this value in the purchase entity.
     */
    private String razorpaySignature;

    private LocalDate paymentDate;

    private LocalDateTime paymentDateTime;

    // =====================================================
    // PURCHASE TIMESTAMPS
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

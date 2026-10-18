package com.htc.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "policy_purchase")
@Data
public class PolicyPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long purchaseId;


    // =========================
    // POLICY
    // =========================

    @OneToOne
    @JoinColumn(
        name = "policy_number",
        nullable = false
    )
    private Policy policy;


    // =========================
    // COVERAGE
    // =========================

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal coverageAmount;


    // =========================
    // PREMIUM
    // =========================

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal basePremium;

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal discountAmount;

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal taxableAmount;

    @Column(
        precision = 5,
        scale = 2
    )
    private BigDecimal gstRate;

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal gstAmount;

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal totalPremium;


    // =========================
    // NOMINEE
    // =========================

    private String nomineeName;

    private String nomineeRelation;

    private String nomineeContact;


    // =========================
    // PAYMENT
    // =========================

    private String paymentMethod;

    private String paymentStatus;


    // =========================
    // RAZORPAY
    // =========================

    @Column(unique = true)
    private String transactionId;

    @Column(unique = true)
    private String razorpayOrderId;

    @Column(unique = true)
    private String razorpayPaymentId;


    // =========================
    // PAYMENT DATE & TIME
    // =========================

    private LocalDate paymentDate;

    private LocalDateTime paymentDateTime;


    // =========================
    // PURCHASE DATE
    // =========================

    private LocalDate purchaseDate;

    private LocalDateTime createdAt;


    // =========================
    // REFUND
    // =========================

    private String refundStatus;

    private String refundId;

    @Column(
        precision = 15,
        scale = 2
    )
    private BigDecimal refundAmount;

    private String refundReason;

    private LocalDateTime refundDateTime;
}
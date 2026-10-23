
package com.htc.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "policy_purchase",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_policy_purchase_renewed_from",
            columnNames = "renewed_from_purchase_id"
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
public class PolicyPurchase {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long purchaseId;

    // =========================================================
    // POLICY - ONE PURCHASE PER POLICY
    // =========================================================

    @OneToOne
    @JoinColumn(
        name = "policy_number",
        nullable = false,
        unique = true
    )
    private Policy policy;

    // =========================================================
    // POLICY RENEWAL
    // =========================================================

    /*
     * Links a renewed purchase to its original purchase.
     *
     * NORMAL PURCHASE:
     * renewedFromPurchase = null
     *
     * RENEWAL PURCHASE:
     * renewedFromPurchase = original PolicyPurchase
     *
     * Each renewal creates a NEW Policy and PolicyPurchase.
     *
     * Original policy, claims, payments and settlements
     * remain unchanged for historical records.
     *
     * The unique constraint prevents more than one
     * saved renewal purchase referencing the same
     * original purchase.
     *
     * Multiple abandoned payment attempts are allowed;
     * uniqueness applies only to saved purchases.
     */

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "renewed_from_purchase_id",
        referencedColumnName = "purchaseId"
    )
    private PolicyPurchase renewedFromPurchase;

    // =========================================================
    // ORIGINAL INSURANCE PLAN
    // =========================================================

    /*
     * Stores the verified insurance plan selected
     * during the original purchase.
     *
     * For normal purchases, the value comes from
     * the verified PaymentAttempt.
     *
     * For renewals, the original plan ID is retained.
     *
     * Nullable for historical purchases created
     * before plan ID tracking was introduced.
     *
     * Never infer a historical plan ID using only
     * current premium or coverage values.
     */

    @Column(name = "plan_id")
    private Long planId;

    // =========================================================
    // COVERAGE
    // =========================================================

    @Column(precision = 15, scale = 2)
    private BigDecimal coverageAmount;

    // =========================================================
    // PREMIUM BREAKDOWN
    // =========================================================

    @Column(precision = 15, scale = 2)
    private BigDecimal basePremium;

    @Column(precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal taxableAmount;

    @Column(precision = 5, scale = 2)
    private BigDecimal gstRate;

    @Column(precision = 15, scale = 2)
    private BigDecimal gstAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalPremium;

    // =========================================================
    // NOMINEE INFORMATION
    // =========================================================

    private String nomineeName;

    private String nomineeRelation;

    private String nomineeContact;

    // =========================================================
    // PAYMENT INFORMATION
    // =========================================================

    private String paymentMethod;

    private String paymentStatus;

    // =========================================================
    // RAZORPAY REFERENCES
    // =========================================================

    @Column(unique = true)
    private String transactionId;

    @Column(unique = true)
    private String razorpayOrderId;

    @Column(unique = true)
    private String razorpayPaymentId;

    // =========================================================
    // PAYMENT DATE AND TIME
    // =========================================================

    private LocalDate paymentDate;

    private LocalDateTime paymentDateTime;

    // =========================================================
    // PURCHASE DATE AND TIME
    // =========================================================

    private LocalDate purchaseDate;

    private LocalDateTime createdAt;

    // =========================================================
    // REFUND INFORMATION
    // =========================================================

    /*
     * Expected refund status values:
     *
     * NOT_REFUNDED
     * REFUND_PENDING
     * REFUND_PROCESSING
     * REFUNDED
     * REFUND_FAILED
     *
     * Actual transitions are managed by refund services.
     */

    private String refundStatus;

    private String refundId;

    @Column(precision = 15, scale = 2)
    private BigDecimal refundAmount;

    @Column(length = 500)
    private String refundReason;

    private LocalDateTime refundDateTime;
}

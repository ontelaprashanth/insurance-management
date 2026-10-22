
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
     * Original policy, claims, payments and settlements
     * remain unchanged for historical records.
     *
     * The unique constraint prevents more than one
     * completed renewal purchase referencing the same
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
    // ORIGINAL INSURANCE PLAN - NEW
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
    // PREMIUM
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
    // NOMINEE
    // =========================================================

    private String nomineeName;
    private String nomineeRelation;
    private String nomineeContact;

    // =========================================================
    // PAYMENT
    // =========================================================

    private String paymentMethod;
    private String paymentStatus;

    // =========================================================
    // RAZORPAY
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
    // REFUND
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

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public PolicyPurchase() {
    }

    // =========================================================
    // PRIMARY KEY GETTERS AND SETTERS
    // =========================================================

    public Long getPurchaseId() {
        return purchaseId;
    }

    public void setPurchaseId(Long purchaseId) {
        this.purchaseId = purchaseId;
    }

    // =========================================================
    // POLICY GETTERS AND SETTERS
    // =========================================================

    public Policy getPolicy() {
        return policy;
    }

    public void setPolicy(Policy policy) {
        this.policy = policy;
    }

    // =========================================================
    // RENEWAL GETTERS AND SETTERS
    // =========================================================

    public PolicyPurchase getRenewedFromPurchase() {
        return renewedFromPurchase;
    }

    public void setRenewedFromPurchase(
            PolicyPurchase renewedFromPurchase) {

        this.renewedFromPurchase = renewedFromPurchase;
    }

    // =========================================================
    // PLAN ID GETTERS AND SETTERS - NEW
    // =========================================================

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }

    // =========================================================
    // COVERAGE GETTERS AND SETTERS
    // =========================================================

    public BigDecimal getCoverageAmount() {
        return coverageAmount;
    }

    public void setCoverageAmount(
            BigDecimal coverageAmount) {

        this.coverageAmount = coverageAmount;
    }

    // =========================================================
    // PREMIUM GETTERS AND SETTERS
    // =========================================================

    public BigDecimal getBasePremium() {
        return basePremium;
    }

    public void setBasePremium(
            BigDecimal basePremium) {

        this.basePremium = basePremium;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(
            BigDecimal discountAmount) {

        this.discountAmount = discountAmount;
    }

    public BigDecimal getTaxableAmount() {
        return taxableAmount;
    }

    public void setTaxableAmount(
            BigDecimal taxableAmount) {

        this.taxableAmount = taxableAmount;
    }

    public BigDecimal getGstRate() {
        return gstRate;
    }

    public void setGstRate(BigDecimal gstRate) {
        this.gstRate = gstRate;
    }

    public BigDecimal getGstAmount() {
        return gstAmount;
    }

    public void setGstAmount(
            BigDecimal gstAmount) {

        this.gstAmount = gstAmount;
    }

    public BigDecimal getTotalPremium() {
        return totalPremium;
    }

    public void setTotalPremium(
            BigDecimal totalPremium) {

        this.totalPremium = totalPremium;
    }

    // =========================================================
    // NOMINEE GETTERS AND SETTERS
    // =========================================================

    public String getNomineeName() {
        return nomineeName;
    }

    public void setNomineeName(
            String nomineeName) {

        this.nomineeName = nomineeName;
    }

    public String getNomineeRelation() {
        return nomineeRelation;
    }

    public void setNomineeRelation(
            String nomineeRelation) {

        this.nomineeRelation = nomineeRelation;
    }

    public String getNomineeContact() {
        return nomineeContact;
    }

    public void setNomineeContact(
            String nomineeContact) {

        this.nomineeContact = nomineeContact;
    }

    // =========================================================
    // PAYMENT GETTERS AND SETTERS
    // =========================================================

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(
            String paymentMethod) {

        this.paymentMethod = paymentMethod;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(
            String paymentStatus) {

        this.paymentStatus = paymentStatus;
    }

    // =========================================================
    // RAZORPAY GETTERS AND SETTERS
    // =========================================================

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(
            String transactionId) {

        this.transactionId = transactionId;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(
            String razorpayOrderId) {

        this.razorpayOrderId = razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(
            String razorpayPaymentId) {

        this.razorpayPaymentId = razorpayPaymentId;
    }

    // =========================================================
    // PAYMENT DATE GETTERS AND SETTERS
    // =========================================================

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(
            LocalDate paymentDate) {

        this.paymentDate = paymentDate;
    }

    public LocalDateTime getPaymentDateTime() {
        return paymentDateTime;
    }

    public void setPaymentDateTime(
            LocalDateTime paymentDateTime) {

        this.paymentDateTime = paymentDateTime;
    }

    // =========================================================
    // PURCHASE DATE GETTERS AND SETTERS
    // =========================================================

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(
            LocalDate purchaseDate) {

        this.purchaseDate = purchaseDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(
            LocalDateTime createdAt) {

        this.createdAt = createdAt;
    }

    // =========================================================
    // REFUND GETTERS AND SETTERS
    // =========================================================

    public String getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(
            String refundStatus) {

        this.refundStatus = refundStatus;
    }

    public String getRefundId() {
        return refundId;
    }

    public void setRefundId(
            String refundId) {

        this.refundId = refundId;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(
            BigDecimal refundAmount) {

        this.refundAmount = refundAmount;
    }

    public String getRefundReason() {
        return refundReason;
    }

    public void setRefundReason(
            String refundReason) {

        this.refundReason = refundReason;
    }

    public LocalDateTime getRefundDateTime() {
        return refundDateTime;
    }

    public void setRefundDateTime(
            LocalDateTime refundDateTime) {

        this.refundDateTime = refundDateTime;
    }
}

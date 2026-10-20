package com.htc.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(
    name = "payment_attempt",
    indexes = {
        @Index(
            name = "idx_payment_attempt_username",
            columnList = "username"
        ),
        @Index(
            name = "idx_payment_attempt_status",
            columnList = "status"
        ),
        @Index(
            name = "idx_payment_attempt_created_at",
            columnList = "created_at"
        )
    }
)
public class PaymentAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_id")
    private Long attemptId;

    /*
     * Unique server-generated reference for this attempt.
     */
    @Column(
        name = "attempt_reference",
        nullable = false,
        unique = true,
        length = 64
    )
    private String attemptReference;

    /*
     * The authenticated account that initiated checkout.
     */
    @Column(name = "username", nullable = false, length = 100)
    private String username;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(
        name = "coverage_amount",
        nullable = false,
        precision = 19,
        scale = 2
    )
    private BigDecimal coverageAmount;

    @Column(name = "duration_years", nullable = false)
    private Integer durationYears;

    /*
     * Calculated by the backend, never trusted from the browser.
     */
    @Column(
        name = "calculated_premium",
        nullable = false,
        precision = 19,
        scale = 2
    )
    private BigDecimal calculatedPremium;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    /*
     * Razorpay identifiers are nullable until an order/payment exists.
     */
    @Column(name = "razorpay_order_id", unique = true, length = 100)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", unique = true, length = 100)
    private String razorpayPaymentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private PaymentAttemptStatus status;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /*
     * Prevents silent overwrites when concurrent requests update
     * the same attempt.
     */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public PaymentAttempt() {
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        if (status == null) {
            status = PaymentAttemptStatus.ORDER_CREATING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public String getAttemptReference() {
        return attemptReference;
    }

    public void setAttemptReference(String attemptReference) {
        this.attemptReference = attemptReference;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public BigDecimal getCalculatedPremium() {
        return calculatedPremium;
    }

    public void setCalculatedPremium(BigDecimal calculatedPremium) {
        this.calculatedPremium = calculatedPremium;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public PaymentAttemptStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentAttemptStatus status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }
}


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
        ),
        @Index(
            name = "idx_payment_attempt_renewal_source",
            columnList = "renewal_source_policy_number"
        )
    }
)
public class PaymentAttempt {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

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

    // =========================================================
    // CUSTOMER
    // =========================================================

    /*
     * The authenticated account that initiated checkout.
     */
    @Column(name = "username", nullable = false, length = 100)
    private String username;

    // =========================================================
    // INSURANCE PLAN
    // =========================================================

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
     *
     * NEW:
     * Calculated from the selected insurance plan.
     *
     * RENEWAL:
     * Taken from the original paid PolicyPurchase.
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

    // =========================================================
    // PURCHASE TYPE / RENEWAL TRACKING
    // =========================================================

    /*
     * NEW:
     * Normal insurance purchase.
     *
     * RENEWAL:
     * Renewal of a previously claimed policy.
     *
     * Nullable for backward compatibility with existing rows.
     * Existing null values must be interpreted as NEW.
     */
    @Column(
        name = "purchase_type",
        length = 20
    )
    private String purchaseType;

    /*
     * Original policy number when purchaseType is RENEWAL.
     *
     * Must be null for normal purchases.
     *
     * This field is intentionally not unique because multiple
     * payment attempts may be created for the same renewal.
     * Only one successful renewal purchase is permitted,
     * enforced separately in PolicyPurchase.
     */
    @Column(name = "renewal_source_policy_number")
    private Long renewalSourcePolicyNumber;

    // =========================================================
    // RAZORPAY
    // =========================================================

    /*
     * Razorpay identifiers are nullable until an order/payment
     * exists.
     */
    @Column(
        name = "razorpay_order_id",
        unique = true,
        length = 100
    )
    private String razorpayOrderId;

    @Column(
        name = "razorpay_payment_id",
        unique = true,
        length = 100
    )
    private String razorpayPaymentId;

    // =========================================================
    // PAYMENT STATUS
    // =========================================================

    @Enumerated(EnumType.STRING)
    @Column(
        name = "status",
        nullable = false,
        length = 40
    )
    private PaymentAttemptStatus status;

    @Column(
        name = "failure_reason",
        columnDefinition = "TEXT"
    )
    private String failureReason;

    // =========================================================
    // TIMESTAMPS
    // =========================================================

    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    @Column(
        name = "updated_at",
        nullable = false
    )
    private LocalDateTime updatedAt;

    // =========================================================
    // OPTIMISTIC LOCKING
    // =========================================================

    /*
     * Prevents silent overwrites when concurrent requests update
     * the same payment attempt.
     */
    @Version
    @Column(
        name = "version",
        nullable = false
    )
    private Long version;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public PaymentAttempt() {
    }

    // =========================================================
    // JPA LIFECYCLE
    // =========================================================

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

        if (purchaseType == null || purchaseType.isBlank()) {
            purchaseType = "NEW";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // =========================================================
    // GETTERS AND SETTERS
    // =========================================================

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

    // =========================================================
    // RENEWAL GETTERS AND SETTERS
    // =========================================================

    public String getPurchaseType() {
        return purchaseType;
    }

    public void setPurchaseType(String purchaseType) {
        this.purchaseType = purchaseType;
    }

    public Long getRenewalSourcePolicyNumber() {
        return renewalSourcePolicyNumber;
    }

    public void setRenewalSourcePolicyNumber(
            Long renewalSourcePolicyNumber) {

        this.renewalSourcePolicyNumber =
                renewalSourcePolicyNumber;
    }

    // =========================================================
    // RAZORPAY GETTERS AND SETTERS
    // =========================================================

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

    // =========================================================
    // STATUS GETTERS AND SETTERS
    // =========================================================

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

    // =========================================================
    // TIMESTAMP GETTERS
    // =========================================================

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

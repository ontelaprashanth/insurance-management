
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

@Entity
@Table(
    name = "refund_attempt",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_refund_attempt_purchase",
            columnNames = "purchase_id"
        ),
        @UniqueConstraint(
            name = "uk_refund_attempt_razorpay_refund",
            columnNames = "razorpay_refund_id"
        )
    }
)
public class RefundAttempt {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_attempt_id")
    private Long refundAttemptId;

    // =========================================================
    // PURCHASE AND RAZORPAY REFERENCES
    // =========================================================

    @Column(name = "purchase_id", nullable = false)
    private Long purchaseId;

    @Column(
        name = "razorpay_payment_id",
        nullable = false,
        length = 100
    )
    private String razorpayPaymentId;

    @Column(
        name = "razorpay_refund_id",
        length = 100
    )
    private String razorpayRefundId;

    // =========================================================
    // REFUND DETAILS
    // =========================================================

    @Column(
        name = "refund_amount",
        nullable = false,
        precision = 15,
        scale = 2
    )
    private BigDecimal refundAmount;

    @Column(
        name = "refund_reason",
        nullable = false,
        length = 500
    )
    private String refundReason;

    @Enumerated(EnumType.STRING)
    @Column(
        name = "refund_status",
        nullable = false,
        length = 40
    )
    private RefundAttemptStatus status;

    @Column(
        name = "requested_by",
        nullable = false,
        length = 100
    )
    private String requestedBy;

    @Column(
        name = "failure_reason",
        length = 500
    )
    private String failureReason;

    // =========================================================
    // AUDIT FIELDS
    // =========================================================

    @Column(
        name = "created_at",
        nullable = false
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

    @Version
    private Long version;

    // =========================================================
    // ENTITY LIFECYCLE
    // =========================================================

    @PrePersist
    protected void onCreate() {

        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        if (status == null) {
            status = RefundAttemptStatus.REQUESTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // =========================================================
    // GETTERS AND SETTERS
    // =========================================================

    public Long getRefundAttemptId() {
        return refundAttemptId;
    }

    public void setRefundAttemptId(Long refundAttemptId) {
        this.refundAttemptId = refundAttemptId;
    }

    public Long getPurchaseId() {
        return purchaseId;
    }

    public void setPurchaseId(Long purchaseId) {
        this.purchaseId = purchaseId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public String getRazorpayRefundId() {
        return razorpayRefundId;
    }

    public void setRazorpayRefundId(String razorpayRefundId) {
        this.razorpayRefundId = razorpayRefundId;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(BigDecimal refundAmount) {
        this.refundAmount = refundAmount;
    }

    public String getRefundReason() {
        return refundReason;
    }

    public void setRefundReason(String refundReason) {
        this.refundReason = refundReason;
    }

    public RefundAttemptStatus getStatus() {
        return status;
    }

    public void setStatus(RefundAttemptStatus status) {
        this.status = status;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
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

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}

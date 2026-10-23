
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

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
@Getter
@Setter
@NoArgsConstructor
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
}

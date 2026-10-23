
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

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
@Getter
@Setter
@NoArgsConstructor
public class PaymentAttempt {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_id")
    private Long attemptId;

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

    @Column(
        name = "username",
        nullable = false,
        length = 100
    )
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

    @Column(
        name = "calculated_premium",
        nullable = false,
        precision = 19,
        scale = 2
    )
    private BigDecimal calculatedPremium;

    @Column(
        name = "currency",
        nullable = false,
        length = 3
    )
    private String currency;

    // =========================================================
    // PURCHASE TYPE / RENEWAL TRACKING
    // =========================================================

    /*
     * NEW:
     * Normal insurance purchase.
     *
     * RENEWAL:
     * Renewal of an existing eligible policy.
     *
     * Nullable for compatibility with historical rows.
     * Null is interpreted as NEW by business logic.
     */

    @Column(
        name = "purchase_type",
        length = 20
    )
    private String purchaseType;

    @Column(name = "renewal_source_policy_number")
    private Long renewalSourcePolicyNumber;

    // =========================================================
    // RAZORPAY PAYMENT IDENTIFIERS
    // =========================================================

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

    @Setter(lombok.AccessLevel.NONE)
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    @Setter(lombok.AccessLevel.NONE)
    @Column(
        name = "updated_at",
        nullable = false
    )
    private LocalDateTime updatedAt;

    // =========================================================
    // OPTIMISTIC LOCKING
    // =========================================================

    @Setter(lombok.AccessLevel.NONE)
    @Version
    @Column(
        name = "version",
        nullable = false
    )
    private Long version;

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
}

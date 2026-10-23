
package com.htc.insurance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "reviewer")
@Getter
@Setter
@NoArgsConstructor
public class Reviewer {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewerId;

    // =========================================================
    // REVIEWER DETAILS
    // =========================================================

    private String name;

    private String email;

    private String contactNumber;

    // =========================================================
    // RATING
    // =========================================================

    private Integer rating;

    // =========================================================
    // REVIEW
    // =========================================================

    @Column(
        name = "review",
        columnDefinition = "TEXT"
    )
    private String review;

    // =========================================================
    // ADMIN REPLY
    // =========================================================

    @Column(
        name = "admin_reply",
        columnDefinition = "TEXT"
    )
    private String adminReply;

    // =========================================================
    // REVIEW STATUS
    // =========================================================

    private String status;

    // =========================================================
    // USER RELATIONSHIP
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // =========================================================
    // CLAIM RELATIONSHIP
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "claim_number")
    private Claims claim;
}

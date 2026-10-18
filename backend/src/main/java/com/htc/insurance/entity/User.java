package com.htc.insurance.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;


    // =========================================================
    // LOGIN INFORMATION
    // =========================================================

    @Column(
        name = "username",
        nullable = false,
        unique = true,
        length = 50
    )
    private String username;

    @Column(
        name = "email",
        unique = true,
        length = 100
    )
    private String email;

    @Column(
        name = "password",
        nullable = false
    )
    private String password;

    @Column(
        name = "role",
        nullable = false,
        length = 20
    )
    private String role;


    // =========================================================
    // ACCOUNT STATUS
    // =========================================================

    @Column(
        name = "is_active"
    )
    private Boolean isActive;

    @Column(
        name = "created_at"
    )
    private LocalDateTime createdAt;

    @Column(
        name = "expiry_date"
    )
    private LocalDateTime expiryDate;


    // =========================================================
    // CONTACT
    // =========================================================

    @Column(
        name = "contact_number",
        unique = true,
        length = 10
    )
    private String contactNumber;


    // =========================================================
    // PERSONAL INFORMATION
    // =========================================================

    @Column(
        name = "occupation",
        length = 50
    )
    private String occupation;

    @Column(
        name = "income"
    )
    private Double income;

    @Column(
        name = "aadhar_number",
        length = 12
    )
    private String aadharNumber;


    // =========================================================
    // BANK INFORMATION
    // =========================================================

    @Column(
        name = "bank_name",
        length = 100
    )
    private String bankName;

    @Column(
        name = "account_number",
        length = 18
    )
    private String accountNumber;

    @Column(
        name = "ifsc_code",
        length = 11
    )
    private String ifscCode;


    // =========================================================
    // REVIEWS
    // =========================================================

    @OneToMany(mappedBy = "user")
    private List<Reviewer> reviewers;
}
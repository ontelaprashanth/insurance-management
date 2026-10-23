
package com.htc.insurance.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "otp_verification")
@Getter
@Setter
@NoArgsConstructor
public class OtpVerification {

    // =========================================================
    // OTP VERIFICATION ID
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // USER IDENTIFICATION
    // =========================================================

    private String identifier;

    private String mobileNumber;

    // =========================================================
    // OTP VERIFICATION DETAILS
    // =========================================================

    private String verificationId;

    private String otp;

    private String purpose;

    // =========================================================
    // OTP EXPIRATION AND CREATION
    // =========================================================

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;

    // =========================================================
    // OTP VERIFICATION STATUS
    // =========================================================

    private boolean verified;

    private int attempts;
}

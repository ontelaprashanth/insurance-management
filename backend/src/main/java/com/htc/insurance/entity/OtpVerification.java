package com.htc.insurance.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "otp_verification")
@Data
public class OtpVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String identifier;

    private String mobileNumber;

    private String verificationId;

    private String otp;

    private String purpose;

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;

    private boolean verified;

    private int attempts;
}
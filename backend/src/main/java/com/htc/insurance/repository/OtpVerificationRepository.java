package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.OtpVerification;

public interface OtpVerificationRepository
        extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification>
    findTopByIdentifierAndPurposeOrderByCreatedAtDesc(
            String identifier,
            String purpose
    );
}
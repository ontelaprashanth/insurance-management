
package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.OtpVerification;

public interface OtpVerificationRepository
        extends JpaRepository<OtpVerification, Long> {

    // =========================================================
    // FIND LATEST OTP VERIFICATION
    // =========================================================

    /**
     * Retrieves the most recently created OTP verification
     * record for the supplied identifier and purpose.
     *
     * Example purposes:
     * LOGIN
     * RESET
     *
     * Returns Optional.empty() when no matching record exists.
     */
    Optional<OtpVerification>
    findTopByIdentifierAndPurposeOrderByCreatedAtDesc(
            String identifier,
            String purpose
    );
}

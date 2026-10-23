
package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ResetPasswordRequest {

    // =====================================================
    // USER IDENTIFIER
    // =====================================================

    @NotBlank(
        message = "Username, email or mobile number is required"
    )
    private String identifier;

    // =====================================================
    // OTP VERIFICATION
    // =====================================================

    @NotBlank(message = "OTP is required")
    @Pattern(
        regexp = "^\\d{6}$",
        message = "OTP must be a 6-digit number"
    )
    private String otp;

    // =====================================================
    // NEW PASSWORD
    // =====================================================

    @NotBlank(message = "New password is required")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Password must be at least 8 characters and contain uppercase, lowercase, number and special character"
    )
    private String newPassword;
}

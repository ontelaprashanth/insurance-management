package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import lombok.Data;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "Username, email or mobile number is required")
    private String identifier;

    @NotBlank(message = "OTP is required")
    @Pattern(
        regexp = "^\\d{6}$",
        message = "OTP must be a 6-digit number"
    )
    private String otp;

    @NotBlank(message = "New password is required")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Password must be at least 8 characters and contain uppercase, lowercase, number and special character"
    )
    private String newPassword;
}

package com.htc.insurance.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserDto {

    // =========================================================
    // USER ID
    // =========================================================

    private Long userId;

    // =========================================================
    // USERNAME
    // =========================================================

    @NotBlank(message = "Username is required")
    @Size(
        min = 3,
        max = 50,
        message = "Username must be between 3 and 50 characters"
    )
    private String username;

    // =========================================================
    // EMAIL
    // =========================================================

    @Email(message = "Invalid email address")
    @Size(
        max = 100,
        message = "Email cannot exceed 100 characters"
    )
    private String email;

    // =========================================================
    // PASSWORD
    // =========================================================

    @Pattern(
        regexp = "^$|^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
    )
    private String password;

    // =========================================================
    // SYSTEM FIELDS
    // =========================================================

    private String role;

    private Boolean isActive;

    private LocalDateTime createdAt;

    private LocalDateTime expiryDate;

    // =========================================================
    // CONTACT NUMBER
    // =========================================================

    @NotBlank(message = "Contact number is required")
    @Pattern(
        regexp = "^[6-9]\\d{9}$",
        message = "Contact number must be a valid 10-digit Indian mobile number"
    )
    private String contactNumber;

    // =========================================================
    // OCCUPATION
    // =========================================================

    @NotBlank(message = "Occupation is required")
    @Size(
        max = 50,
        message = "Occupation cannot exceed 50 characters"
    )
    private String occupation;

    // =========================================================
    // INCOME
    // =========================================================

    @NotNull(message = "Income is required")
    @DecimalMin(
        value = "0.0",
        inclusive = true,
        message = "Income cannot be negative"
    )
    private Double income;

    // =========================================================
    // AADHAAR
    // =========================================================

    @NotBlank(message = "Aadhar number is required")
    @Pattern(
        regexp = "^\\d{12}$",
        message = "Aadhar number must contain exactly 12 digits"
    )
    private String aadharNumber;

    // =========================================================
    // BANK NAME
    // =========================================================

    @NotBlank(message = "Bank name is required")
    @Size(
        max = 100,
        message = "Bank name cannot exceed 100 characters"
    )
    private String bankName;

    // =========================================================
    // ACCOUNT NUMBER
    // =========================================================

    @NotBlank(message = "Account number is required")
    @Pattern(
        regexp = "^\\d{9,18}$",
        message = "Account number must contain between 9 and 18 digits"
    )
    private String accountNumber;

    // =========================================================
    // IFSC CODE
    // =========================================================

    @NotBlank(message = "IFSC code is required")
    @Pattern(
        regexp = "^[A-Z]{4}0[A-Z0-9]{6}$",
        message = "Invalid IFSC code"
    )
    private String ifscCode;
}

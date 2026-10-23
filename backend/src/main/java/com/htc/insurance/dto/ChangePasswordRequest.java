
package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ChangePasswordRequest {

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        message = "New password must be at least 8 characters and contain uppercase, lowercase, number and special character"
    )
    private String newPassword;

    // =====================================================
    // CONSTRUCTORS
    // =====================================================

    public ChangePasswordRequest() {
    }

    public ChangePasswordRequest(
            String currentPassword,
            String newPassword) {

        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
    }

    // =====================================================
    // GETTERS
    // =====================================================

    public String getCurrentPassword() {
        return currentPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    // =====================================================
    // SETTERS
    // =====================================================

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}

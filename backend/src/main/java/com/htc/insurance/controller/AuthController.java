
package com.htc.insurance.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.ForgotPasswordRequest;
import com.htc.insurance.dto.LoginRequest;
import com.htc.insurance.dto.LoginResponse;
import com.htc.insurance.dto.OtpRequest;
import com.htc.insurance.dto.ResetPasswordRequest;
import com.htc.insurance.dto.VerifyOtpRequest;
import com.htc.insurance.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request) {

        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);

        } catch (AuthenticationException e) {
            return unauthorized("Invalid username or password");

        } catch (IllegalArgumentException e) {
            return unauthorized(safeMessage(e));

        } catch (Exception e) {
            log.error("Unexpected login error", e);
            return serverError("Unable to process login request");
        }
    }

    // =========================================================
    // SEND OTP
    // =========================================================

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(
            @Valid @RequestBody OtpRequest request) {

        try {
            authService.sendOtp(request);
            return success("OTP sent successfully.");

        } catch (IllegalArgumentException e) {
            return badRequest(safeMessage(e));

        } catch (Exception e) {
            log.error("Failed to send OTP", e);
            return serverError("Unable to send OTP");
        }
    }

    // =========================================================
    // VERIFY OTP
    // =========================================================

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        try {
            if (!authService.verifyOtp(request)) {
                return badRequest("Invalid or expired OTP.");
            }

            return success("OTP verified successfully.");

        } catch (IllegalArgumentException e) {
            return badRequest(safeMessage(e));

        } catch (Exception e) {
            log.error("Failed to verify OTP", e);
            return serverError("Unable to verify OTP");
        }
    }

    // =========================================================
    // FORGOT PASSWORD
    // =========================================================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        try {
            authService.forgotPassword(request);
            return success("Password reset OTP sent successfully.");

        } catch (IllegalArgumentException e) {
            return badRequest(safeMessage(e));

        } catch (Exception e) {
            log.error("Forgot password request failed", e);
            return serverError("Unable to send password reset OTP");
        }
    }

    // =========================================================
    // RESET PASSWORD
    // =========================================================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        try {
            authService.resetPassword(request);
            return success("Password reset successfully.");

        } catch (IllegalArgumentException e) {
            return badRequest(safeMessage(e));

        } catch (Exception e) {
            log.error("Password reset failed", e);
            return serverError("Unable to reset password");
        }
    }

    // =========================================================
    // RESPONSE HELPERS
    // =========================================================

    private ResponseEntity<?> success(String message) {
        return response(HttpStatus.OK, true, message);
    }

    private ResponseEntity<?> badRequest(String message) {
        return response(HttpStatus.BAD_REQUEST, false, message);
    }

    private ResponseEntity<?> unauthorized(String message) {
        return response(HttpStatus.UNAUTHORIZED, false, message);
    }

    private ResponseEntity<?> serverError(String message) {
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                false,
                message
        );
    }

    private ResponseEntity<?> response(
            HttpStatus status,
            boolean success,
            String message) {

        return ResponseEntity.status(status).body(
                Map.of(
                        "success", success,
                        "message", message
                )
        );
    }

    private String safeMessage(Exception exception) {
        String message = exception.getMessage();

        return message == null || message.isBlank()
                ? "Request could not be processed"
                : message;
    }
}

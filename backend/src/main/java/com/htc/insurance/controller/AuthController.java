
package com.htc.insurance.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.htc.insurance.dto.ForgotPasswordRequest;
import com.htc.insurance.dto.LoginRequest;
import com.htc.insurance.dto.LoginResponse;
import com.htc.insurance.dto.OtpRequest;
import com.htc.insurance.dto.ResetPasswordRequest;
import com.htc.insurance.dto.VerifyOtpRequest;
import com.htc.insurance.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request) {

        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Invalid username or password"
                    ));

        } catch (AuthenticationException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Invalid username or password"
                    ));

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", getMessage(e)
                    ));

        } catch (Exception e) {

            // Log the actual error on the server, not in the response.
            System.err.println("Login failed due to an unexpected error:");
            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Unable to process login request"
                    ));
        }
    }

    // =========================================================
    // SEND GENERAL OTP
    // =========================================================

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(
            @Valid @RequestBody OtpRequest request) {

        try {
            authService.sendOtp(request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "OTP sent successfully."
            ));

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", getMessage(e)
                    ));

        } catch (Exception e) {

            System.err.println("Send OTP failed:");
            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Unable to send OTP"
                    ));
        }
    }

    // =========================================================
    // VERIFY OTP
    // =========================================================

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        try {
            boolean verified = authService.verifyOtp(request);

            if (!verified) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "success", false,
                                "message", "Invalid or expired OTP."
                        ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "OTP verified successfully."
            ));

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", getMessage(e)
                    ));

        } catch (Exception e) {

            System.err.println("Verify OTP failed:");
            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Unable to verify OTP"
                    ));
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

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password reset OTP sent successfully."
            ));

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", getMessage(e)
                    ));

        } catch (Exception e) {

            System.err.println("Forgot password failed:");
            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Unable to send password reset OTP"
                    ));
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

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password reset successfully."
            ));

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", getMessage(e)
                    ));

        } catch (Exception e) {

            System.err.println("Reset password failed:");
            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Unable to reset password"
                    ));
        }
    }

    // =========================================================
    // SAFE ERROR MESSAGE
    // =========================================================

    private String getMessage(Exception e) {

        if (e.getMessage() == null || e.getMessage().isBlank()) {
            return "Request could not be processed";
        }

        return e.getMessage();
    }
}

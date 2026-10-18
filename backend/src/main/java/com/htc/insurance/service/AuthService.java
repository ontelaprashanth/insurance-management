
package com.htc.insurance.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.ForgotPasswordRequest;
import com.htc.insurance.dto.LoginRequest;
import com.htc.insurance.dto.LoginResponse;
import com.htc.insurance.dto.OtpRequest;
import com.htc.insurance.dto.ResetPasswordRequest;
import com.htc.insurance.dto.VerifyOtpRequest;
import com.htc.insurance.entity.User;
import com.htc.insurance.security.JwtService;

@Service
public class AuthService {

    private static final String GENERAL = "GENERAL";
    private static final String PASSWORD_RESET = "PASSWORD_RESET";
    private static final String INVALID_CREDENTIALS =
            "Invalid username or password";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDao userDao;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserDao userDao,
            OtpService otpService,
            PasswordEncoder passwordEncoder) {

        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDao = userDao;
        this.otpService = otpService;
        this.passwordEncoder = passwordEncoder;
    }

    // =========================================================
    // LOGIN
    // USERNAME / EMAIL / MOBILE + PASSWORD
    // =========================================================

    public LoginResponse login(LoginRequest request) {

        String identifier = getIdentifier(request);

        if (identifier == null) {
            throw new IllegalArgumentException(
                    "Username, email or mobile number is required");
        }

        if (request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new IllegalArgumentException(
                    "Password is required");
        }

        User user = findUser(identifier);

        // Do not disclose whether an account exists.
        if (user == null) {
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException(
                    "This account is inactive");
        }

        final Authentication authentication;

        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getUsername(),
                            request.getPassword()));
        } catch (AuthenticationException ex) {
            // Covers incorrect passwords and other authentication failures.
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }

        String authenticatedUsername = authentication.getName();

        String role = authentication.getAuthorities()
                .stream()
                .findFirst()
                .map(authority -> authority.getAuthority())
                .orElse("ROLE_USER");

        role = role.replaceFirst("^ROLE_", "");

        String token = jwtService.generateToken(
                authenticatedUsername,
                role);

        return new LoginResponse(token);
    }

    // =========================================================
    // SEND GENERAL OTP
    // =========================================================

    public void sendOtp(OtpRequest request) {

        String identifier = validateIdentifier(
                request != null ? request.getIdentifier() : null);

        User user = findUser(identifier);

        if (user == null) {
            throw new IllegalArgumentException(
                    "No account found with this username, email or mobile number");
        }

        validateActiveUser(user);
        validateMobileNumber(user);

        otpService.generateOtp(
                identifier,
                user.getContactNumber(),
                GENERAL);
    }

    // =========================================================
    // VERIFY OTP
    // =========================================================

    public boolean verifyOtp(VerifyOtpRequest request) {

        if (request == null) {
            return false;
        }

        String identifier = request.getIdentifier();
        String otp = request.getOtp();

        if (identifier == null || identifier.isBlank()
                || otp == null || otp.isBlank()) {
            return false;
        }

        identifier = identifier.trim();
        otp = otp.trim();

        if (!otp.matches("\\d{6}")) {
            return false;
        }

        String purpose = request.getPurpose();

        if (purpose == null || purpose.isBlank()) {
            purpose = GENERAL;
        } else {
            purpose = purpose.trim().toUpperCase();
        }

        if (!GENERAL.equals(purpose)
                && !PASSWORD_RESET.equals(purpose)) {
            return false;
        }

        return otpService.verifyOtp(
                identifier,
                otp,
                purpose);
    }

    // =========================================================
    // FORGOT PASSWORD
    // =========================================================

    public void forgotPassword(ForgotPasswordRequest request) {

        String identifier = validateIdentifier(
                request != null ? request.getIdentifier() : null);

        User user = findUser(identifier);

        if (user == null) {
            throw new IllegalArgumentException(
                    "No account found with this username, email or mobile number");
        }

        validateActiveUser(user);
        validateMobileNumber(user);

        otpService.generateOtp(
                identifier,
                user.getContactNumber(),
                PASSWORD_RESET);
    }

    // =========================================================
    // RESET PASSWORD
    // =========================================================

    public void resetPassword(ResetPasswordRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Reset password request is required");
        }

        String identifier = validateIdentifier(
                request.getIdentifier());

        if (request.getOtp() == null
                || request.getOtp().isBlank()) {
            throw new IllegalArgumentException("OTP is required");
        }

        String otp = request.getOtp().trim();

        if (!otp.matches("\\d{6}")) {
            throw new IllegalArgumentException(
                    "OTP must be a 6-digit number");
        }

        if (request.getNewPassword() == null
                || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException(
                    "New password is required");
        }

        String newPassword = request.getNewPassword();

        validatePassword(newPassword);

        User user = findUser(identifier);

        if (user == null) {
            throw new IllegalArgumentException(
                    "User account not found");
        }

        validateActiveUser(user);

        if (passwordEncoder.matches(
                newPassword,
                user.getPassword())) {
            throw new IllegalArgumentException(
                    "New password must be different from your current password");
        }

        boolean valid = otpService.verifyOtp(
                identifier,
                otp,
                PASSWORD_RESET);

        if (!valid) {
            throw new IllegalArgumentException(
                    "Invalid or expired OTP");
        }

        user.setPassword(passwordEncoder.encode(newPassword));

        userDao.updateUser(user);
    }

    // =========================================================
    // FIND USER
    // USERNAME / EMAIL / MOBILE
    // =========================================================

    private User findUser(String identifier) {

        if (identifier == null || identifier.isBlank()) {
            return null;
        }

        String value = identifier.trim();

        User user = userDao.getUserByUsername(value);

        if (user != null) {
            return user;
        }

        user = userDao.getUserByEmail(value);

        if (user != null) {
            return user;
        }

        return userDao.getUserByContactNumber(value);
    }

    // =========================================================
    // GET LOGIN IDENTIFIER
    // =========================================================

    private String getIdentifier(LoginRequest request) {

        if (request == null
                || request.getIdentifier() == null
                || request.getIdentifier().isBlank()) {
            return null;
        }

        return request.getIdentifier().trim();
    }

    // =========================================================
    // VALIDATE IDENTIFIER
    // =========================================================

    private String validateIdentifier(String identifier) {

        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException(
                    "Username, email or mobile number is required");
        }

        return identifier.trim();
    }

    // =========================================================
    // VALIDATE ACTIVE USER
    // =========================================================

    private void validateActiveUser(User user) {

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException(
                    "This account is inactive");
        }
    }

    // =========================================================
    // VALIDATE MOBILE NUMBER
    // =========================================================

    private void validateMobileNumber(User user) {

        if (user.getContactNumber() == null
                || user.getContactNumber().isBlank()) {
            throw new IllegalArgumentException(
                    "No registered mobile number is available for this account");
        }

        if (!user.getContactNumber().matches("^[6-9]\\d{9}$")) {
            throw new IllegalArgumentException(
                    "Registered mobile number is invalid");
        }
    }

    // =========================================================
    // PASSWORD VALIDATION
    // =========================================================

    private void validatePassword(String password) {

        if (password.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters");
        }

        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException(
                    "Password must contain at least one uppercase letter");
        }

        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException(
                    "Password must contain at least one lowercase letter");
        }

        if (!password.matches(".*\\d.*")) {
            throw new IllegalArgumentException(
                    "Password must contain at least one number");
        }

        if (!password.matches(".*[@#$%^&+=!].*")) {
            throw new IllegalArgumentException(
                    "Password must contain at least one special character");
        }
    }
}

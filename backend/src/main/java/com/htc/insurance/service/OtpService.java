package com.htc.insurance.service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.htc.insurance.entity.OtpVerification;
import com.htc.insurance.repository.OtpVerificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepository;

    private final RestClient restClient = RestClient.create();

    @Value("${messagecentral.base-url}")
    private String baseUrl;

    @Value("${messagecentral.customer-id}")
    private String customerId;

    @Value("${messagecentral.email}")
    private String email;

    @Value("${messagecentral.key}")
    private String key;

    @Value("${messagecentral.country-code:91}")
    private String countryCode;

    @Value("${messagecentral.flow-type:SMS}")
    private String flowType;

    @Value("${messagecentral.otp-length:6}")
    private int otpLength;

    @Value("${messagecentral.otp-expiry-minutes:5}")
    private long otpExpiryMinutes;

    @Value("${messagecentral.max-attempts:5}")
    private int maxAttempts;

    // =========================================================
    // GENERATE AND SEND OTP
    // =========================================================

    public String generateOtp(
            String identifier,
            String mobileNumber,
            String purpose) {

        validateInput(
                identifier,
                mobileNumber,
                purpose
        );

        identifier = identifier.trim();
        mobileNumber = mobileNumber.trim();
        purpose = purpose.trim();

        validateConfiguration();

        // -----------------------------------------------------
        // GENERATE MESSAGE CENTRAL AUTH TOKEN
        // -----------------------------------------------------

        String authToken = getAuthToken();

        // -----------------------------------------------------
        // SEND OTP
        // -----------------------------------------------------

        JsonNode response =
                sendOtp(
                        authToken,
                        mobileNumber
                );

        JsonNode data =
                response.path("data");

        String verificationId =
                data.path("verificationId")
                        .asText(null);

        String responseCode =
                response.path("responseCode")
                        .asText();

        // -----------------------------------------------------
        // VERIFY MESSAGE CENTRAL RESPONSE
        // -----------------------------------------------------

        if (verificationId == null
                || verificationId.isBlank()) {

            String message =
                    response.path("message")
                            .asText(
                                    "Unable to send OTP"
                            );

            throw new RuntimeException(
                    "Message Central OTP failed. "
                            + "Response Code: "
                            + responseCode
                            + ", Message: "
                            + message
                            + ", Response: "
                            + response
            );
        }

        // -----------------------------------------------------
        // INVALIDATE PREVIOUS OTP
        // -----------------------------------------------------

        otpRepository
                .findTopByIdentifierAndPurposeOrderByCreatedAtDesc(
                        identifier,
                        purpose
                )
                .ifPresent(oldOtp -> {

                    if (!oldOtp.isVerified()) {

                        oldOtp.setVerified(true);

                        otpRepository.save(oldOtp);
                    }
                });

        // -----------------------------------------------------
        // CREATE LOCAL OTP TRANSACTION
        // -----------------------------------------------------

        LocalDateTime now =
                LocalDateTime.now();

        OtpVerification verification =
                new OtpVerification();

        verification.setIdentifier(
                identifier
        );

        verification.setMobileNumber(
                mobileNumber
        );

        verification.setVerificationId(
                verificationId
        );

        verification.setPurpose(
                purpose
        );

        verification.setCreatedAt(
                now
        );

        verification.setExpiresAt(
                now.plusMinutes(
                        otpExpiryMinutes
                )
        );

        verification.setVerified(false);

        verification.setAttempts(0);

        otpRepository.save(
                verification
        );

        // -----------------------------------------------------
        // CONSOLE LOG
        // -----------------------------------------------------

        System.out.println();
        System.out.println(
                "=========================================="
        );
        System.out.println(
                "       INSUREX MESSAGE CENTRAL OTP"
        );
        System.out.println(
                "=========================================="
        );
        System.out.println(
                "Identifier    : "
                        + identifier
        );
        System.out.println(
                "Mobile        : "
                        + maskMobile(mobileNumber)
        );
        System.out.println(
                "Purpose       : "
                        + purpose
        );
        System.out.println(
                "Verification  : "
                        + verificationId
        );
        System.out.println(
                "OTP Length    : "
                        + otpLength
        );
        System.out.println(
                "Expires In    : "
                        + otpExpiryMinutes
                        + " minutes"
        );
        System.out.println(
                "Response Code : "
                        + responseCode
        );
        System.out.println(
                "=========================================="
        );
        System.out.println();

        return verificationId;
    }

    // =========================================================
    // VERIFY OTP
    // =========================================================

    public boolean verifyOtp(
            String identifier,
            String otp,
            String purpose) {

        if (identifier == null
                || identifier.isBlank()
                || otp == null
                || otp.isBlank()
                || purpose == null
                || purpose.isBlank()) {

            return false;
        }

        identifier = identifier.trim();
        otp = otp.trim();
        purpose = purpose.trim();

        // -----------------------------------------------------
        // FIND LATEST OTP
        // -----------------------------------------------------

        OtpVerification verification =
                otpRepository
                        .findTopByIdentifierAndPurposeOrderByCreatedAtDesc(
                                identifier,
                                purpose
                        )
                        .orElse(null);

        if (verification == null) {
            return false;
        }

        // -----------------------------------------------------
        // ALREADY VERIFIED
        // -----------------------------------------------------

        if (verification.isVerified()) {
            return false;
        }

        // -----------------------------------------------------
        // MAXIMUM ATTEMPTS
        // -----------------------------------------------------

        if (verification.getAttempts()
                >= maxAttempts) {

            return false;
        }

        // -----------------------------------------------------
        // LOCAL EXPIRY
        // -----------------------------------------------------

        if (verification.getExpiresAt() == null
                || verification.getExpiresAt()
                        .isBefore(LocalDateTime.now())) {

            return false;
        }

        // -----------------------------------------------------
        // VERIFY INPUT OTP FORMAT
        // -----------------------------------------------------

        if (!otp.matches("\\d{" + otpLength + "}")) {

            return false;
        }

        // -----------------------------------------------------
        // VALIDATE CONFIGURATION
        // -----------------------------------------------------

        validateConfiguration();

        // -----------------------------------------------------
        // GENERATE FRESH AUTH TOKEN
        // -----------------------------------------------------

        String authToken =
                getAuthToken();

        // -----------------------------------------------------
        // VALIDATE OTP THROUGH MESSAGE CENTRAL
        // -----------------------------------------------------

        JsonNode response =
                validateOtp(
                        authToken,
                        verification.getVerificationId(),
                        otp
                );

        String responseCode =
                response.path("responseCode")
                        .asText();

        JsonNode data =
                response.path("data");

        String verificationStatus =
                data.path("verificationStatus")
                        .asText();

        boolean success =
                "200".equals(responseCode)
                        && "VERIFICATION_COMPLETED"
                                .equalsIgnoreCase(
                                        verificationStatus
                                );

        // -----------------------------------------------------
        // COUNT OTP ATTEMPT
        //
        // Count only after Message Central actually
        // processes the verification request.
        // -----------------------------------------------------

        verification.setAttempts(
                verification.getAttempts() + 1
        );

        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------

        if (success) {

            verification.setVerified(true);

            otpRepository.save(
                    verification
            );

            System.out.println();
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "       INSUREX OTP VERIFIED"
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "Identifier : "
                            + identifier
            );
            System.out.println(
                    "Purpose    : "
                            + purpose
            );
            System.out.println(
                    "Status     : VERIFIED"
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println();

            return true;
        }

        // -----------------------------------------------------
        // FAILURE
        // -----------------------------------------------------

        otpRepository.save(
                verification
        );

        System.out.println();
        System.out.println(
                "=========================================="
        );
        System.out.println(
                "       INSUREX OTP VERIFICATION FAILED"
        );
        System.out.println(
                "=========================================="
        );
        System.out.println(
                "Identifier      : "
                        + identifier
        );
        System.out.println(
                "Purpose         : "
                        + purpose
        );
        System.out.println(
                "Response Code   : "
                        + responseCode
        );
        System.out.println(
                "Verification    : "
                        + verificationStatus
        );
        System.out.println(
                "Attempts        : "
                        + verification.getAttempts()
                        + "/"
                        + maxAttempts
        );
        System.out.println(
                "Response        : "
                        + response
        );
        System.out.println(
                "=========================================="
        );
        System.out.println();

        return false;
    }

    // =========================================================
    // MESSAGE CENTRAL AUTHENTICATION TOKEN
    // =========================================================

    private String getAuthToken() {

        validateConfiguration();

        String url =
                UriComponentsBuilder
                        .fromUriString(
                                baseUrl
                                        + "/auth/v1/authentication/token"
                        )
                        .queryParam(
                                "customerId",
                                customerId
                        )
                        .queryParam(
                                "key",
                                key
                        )
                        .queryParam(
                                "scope",
                                "NEW"
                        )
                        .queryParam(
                                "country",
                                countryCode
                        )
                        .queryParam(
                                "email",
                                email
                        )
                        .build()
                        .toUriString();

        try {

            /*
             * Message Central Token API:
             *
             * GET
             *
             * /auth/v1/authentication/token
             */

            JsonNode response =
                    restClient
                            .get()
                            .uri(url)
                            .header(
                                    HttpHeaders.ACCEPT,
                                    "*/*"
                            )
                            .retrieve()
                            .body(JsonNode.class);

            if (response == null) {

                throw new RuntimeException(
                        "Message Central returned an empty "
                                + "authentication response."
                );
            }

            // -------------------------------------------------
            // TOKEN IS DIRECTLY UNDER "token"
            // -------------------------------------------------

            String authToken =
                    response
                            .path("token")
                            .asText(null);

            if (authToken == null
                    || authToken.isBlank()) {

                throw new RuntimeException(
                        "Message Central authentication failed. "
                                + "Response: "
                                + response
                );
            }

            System.out.println();
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "   MESSAGE CENTRAL AUTHENTICATION"
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "Status : "
                            + response
                                    .path("status")
                                    .asText()
            );
            System.out.println(
                    "Token  : Generated successfully"
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println();

            return authToken;

        } catch (RestClientResponseException ex) {

            throw new RuntimeException(
                    "Message Central authentication HTTP error. "
                            + "Status: "
                            + ex.getStatusCode().value()
                            + ", Response: "
                            + ex.getResponseBodyAsString()
            );

        } catch (RuntimeException ex) {

            throw ex;

        } catch (Exception ex) {

            throw new RuntimeException(
                    "Message Central authentication request failed: "
                            + ex.getMessage(),
                    ex
            );
        }
    }

    // =========================================================
    // SEND OTP THROUGH MESSAGE CENTRAL
    // =========================================================

    private JsonNode sendOtp(
            String authToken,
            String mobileNumber) {

        String url =
                UriComponentsBuilder
                        .fromUriString(
                                baseUrl
                                        + "/verification/v3/send"
                        )
                        .queryParam(
                                "customerId",
                                customerId
                        )
                        .queryParam(
                                "countryCode",
                                countryCode
                        )
                        .queryParam(
                                "flowType",
                                flowType
                        )
                        .queryParam(
                                "mobileNumber",
                                mobileNumber
                        )
                        .queryParam(
                                "otpLength",
                                otpLength
                        )
                        .build()
                        .toUriString();

        try {

            /*
             * Message Central Send OTP API:
             *
             * POST
             *
             * /verification/v3/send
             */

            JsonNode response =
                    restClient
                            .post()
                            .uri(url)
                            .header(
                                    "authToken",
                                    authToken
                            )
                            .header(
                                    HttpHeaders.ACCEPT,
                                    "*/*"
                            )
                            .retrieve()
                            .body(JsonNode.class);

            if (response == null) {

                throw new RuntimeException(
                        "Empty response from Message Central."
                );
            }

            System.out.println();
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "       MESSAGE CENTRAL SEND OTP"
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "Response Code : "
                            + response
                                    .path("responseCode")
                                    .asText()
            );
            System.out.println(
                    "Response      : "
                            + response
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println();

            return response;

        } catch (RestClientResponseException ex) {

            throw new RuntimeException(
                    "Message Central OTP send failed. "
                            + "Status: "
                            + ex.getStatusCode().value()
                            + ", Response: "
                            + ex.getResponseBodyAsString()
            );
        }
    }

    // =========================================================
    // VALIDATE OTP THROUGH MESSAGE CENTRAL
    // =========================================================

    private JsonNode validateOtp(
            String authToken,
            String verificationId,
            String otp) {

        String url =
                UriComponentsBuilder
                        .fromUriString(
                                baseUrl
                                        + "/verification/v3/validateOtp"
                        )
                        .queryParam(
                                "verificationId",
                                verificationId
                        )
                        .queryParam(
                                "code",
                                otp
                        )
                        .build()
                        .toUriString();

        try {

            /*
             * Message Central Validate OTP API:
             *
             * GET
             *
             * /verification/v3/validateOtp
             */

            JsonNode response =
                    restClient
                            .get()
                            .uri(url)
                            .header(
                                    "authToken",
                                    authToken
                            )
                            .header(
                                    HttpHeaders.ACCEPT,
                                    "*/*"
                            )
                            .retrieve()
                            .body(JsonNode.class);

            if (response == null) {

                throw new RuntimeException(
                        "Empty response from Message Central."
                );
            }

            System.out.println();
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "       MESSAGE CENTRAL VERIFY OTP"
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "Response Code : "
                            + response
                                    .path("responseCode")
                                    .asText()
            );
            System.out.println(
                    "Verification  : "
                            + response
                                    .path("data")
                                    .path("verificationStatus")
                                    .asText()
            );
            System.out.println(
                    "Response      : "
                            + response
            );
            System.out.println(
                    "=========================================="
            );
            System.out.println();

            return response;

        } catch (RestClientResponseException ex) {

            throw new RuntimeException(
                    "Message Central OTP validation failed. "
                            + "Status: "
                            + ex.getStatusCode().value()
                            + ", Response: "
                            + ex.getResponseBodyAsString()
            );
        }
    }

    // =========================================================
    // INPUT VALIDATION
    // =========================================================

    private void validateInput(
            String identifier,
            String mobileNumber,
            String purpose) {

        if (identifier == null
                || identifier.isBlank()) {

            throw new RuntimeException(
                    "Identifier is required."
            );
        }

        if (mobileNumber == null
                || mobileNumber.isBlank()) {

            throw new RuntimeException(
                    "Mobile number is required."
            );
        }

        if (purpose == null
                || purpose.isBlank()) {

            throw new RuntimeException(
                    "OTP purpose is required."
            );
        }
    }

    // =========================================================
    // CONFIGURATION VALIDATION
    // =========================================================

    private void validateConfiguration() {

        if (baseUrl == null
                || baseUrl.isBlank()) {

            throw new RuntimeException(
                    "Message Central base URL is missing."
            );
        }

        if (customerId == null
                || customerId.isBlank()) {

            throw new RuntimeException(
                    "Message Central customer ID is missing."
            );
        }

        if (email == null
                || email.isBlank()) {

            throw new RuntimeException(
                    "Message Central email is missing."
            );
        }

        if (key == null
                || key.isBlank()) {

            throw new RuntimeException(
                    "Message Central key is missing."
            );
        }

        if (countryCode == null
                || countryCode.isBlank()) {

            throw new RuntimeException(
                    "Message Central country code is missing."
            );
        }

        if (flowType == null
                || flowType.isBlank()) {

            throw new RuntimeException(
                    "Message Central flow type is missing."
            );
        }

        if (otpLength < 4
                || otpLength > 8) {

            throw new RuntimeException(
                    "Message Central OTP length must be between 4 and 8."
            );
        }

        if (otpExpiryMinutes <= 0) {

            throw new RuntimeException(
                    "OTP expiry must be greater than 0 minutes."
            );
        }

        if (maxAttempts <= 0) {

            throw new RuntimeException(
                    "Maximum OTP attempts must be greater than 0."
            );
        }
    }

    // =========================================================
    // MASK MOBILE NUMBER
    // =========================================================

    private String maskMobile(
            String mobile) {

        if (mobile == null
                || mobile.length() < 4) {

            return "****";
        }

        return "******"
                + mobile.substring(
                        mobile.length() - 4
                );
    }
}

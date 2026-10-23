
package com.htc.insurance.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class VerifyOtpRequest {

    // =========================================================
    // USER IDENTIFIER
    // =========================================================

    private String identifier;

    // =========================================================
    // OTP
    // =========================================================

    private String otp;

    // =========================================================
    // OTP PURPOSE
    // =========================================================

    private String purpose;
}

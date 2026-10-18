package com.htc.insurance.dto;

import lombok.Data;

@Data
public class VerifyOtpRequest {

    private String identifier;

    private String otp;

    private String purpose;
}
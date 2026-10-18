package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "Username, email or mobile number is required")
    private String identifier;
}
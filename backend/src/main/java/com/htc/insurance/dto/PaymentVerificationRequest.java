package com.htc.insurance.dto;

import lombok.Data;

@Data
public class PaymentVerificationRequest {

    private String razorpayOrderId;

    private String razorpayPaymentId;

    private String razorpaySignature;
}
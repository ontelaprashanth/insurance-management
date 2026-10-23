
package com.htc.insurance.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PaymentVerificationRequest {

    // =====================================================
    // RAZORPAY ORDER ID
    // =====================================================

    private String razorpayOrderId;

    // =====================================================
    // RAZORPAY PAYMENT ID
    // =====================================================

    private String razorpayPaymentId;

    // =====================================================
    // RAZORPAY SIGNATURE
    // =====================================================

    private String razorpaySignature;
}

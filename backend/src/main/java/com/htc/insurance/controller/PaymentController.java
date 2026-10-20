
package com.htc.insurance.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.PaymentOrderRequest;
import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.service.PaymentService;

@RestController
@RequestMapping("/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-order")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @RequestBody PaymentOrderRequest request,
            Authentication authentication) throws Exception {

        PaymentOrderResponse response = paymentService.createOrder(
                request, authentication.getName());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> verifyPayment(
            @RequestBody PaymentVerificationRequest request)
            throws Exception {

        boolean verified = paymentService.verifyPayment(request);

        if (!verified) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Payment verification failed."
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Payment verified successfully."
                )
        );
    }
}

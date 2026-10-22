package com.htc.insurance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.service.PolicyRenewalService;
import com.htc.insurance.service.PolicyRenewalService.RenewalResult;

@RestController
@RequestMapping("/api/policy-renewals")
public class PolicyRenewalController {

    private final PolicyRenewalService renewalService;

    public PolicyRenewalController(PolicyRenewalService renewalService) {
        this.renewalService = renewalService;
    }

    @PostMapping("/{originalPolicyNumber}/order")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @PathVariable Long originalPolicyNumber,
            Authentication authentication) throws Exception {
        return ResponseEntity.ok(renewalService.createRenewalOrder(
                originalPolicyNumber, requireUsername(authentication)));
    }

    @PostMapping("/{originalPolicyNumber}/confirm")
    public ResponseEntity<RenewalResult> confirm(
            @PathVariable Long originalPolicyNumber,
            @RequestBody PaymentVerificationRequest verification,
            Authentication authentication) throws Exception {
        return ResponseEntity.ok(renewalService.confirmRenewal(
                originalPolicyNumber, verification, requireUsername(authentication)));
    }

    private String requireUsername(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Authentication is required.");
        }
        return authentication.getName();
    }
}

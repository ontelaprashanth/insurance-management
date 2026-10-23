
package com.htc.insurance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.PaymentOrderResponse;
import com.htc.insurance.dto.PaymentVerificationRequest;
import com.htc.insurance.service.PolicyRenewalService;
import com.htc.insurance.service.PolicyRenewalService.RenewalResult;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/policy-renewals")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class PolicyRenewalController {

    private final PolicyRenewalService renewalService;

    // =========================================================
    // USER - CREATE POLICY RENEWAL ORDER
    // =========================================================

    @PostMapping("/{originalPolicyNumber}/order")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @PathVariable Long originalPolicyNumber,
            Authentication authentication) throws Exception {

        return ResponseEntity.ok(
                renewalService.createRenewalOrder(
                        originalPolicyNumber,
                        requireUsername(authentication)
                )
        );
    }

    // =========================================================
    // USER - CONFIRM POLICY RENEWAL
    // =========================================================

    @PostMapping("/{originalPolicyNumber}/confirm")
    public ResponseEntity<RenewalResult> confirm(
            @PathVariable Long originalPolicyNumber,
            @RequestBody PaymentVerificationRequest verification,
            Authentication authentication) throws Exception {

        return ResponseEntity.ok(
                renewalService.confirmRenewal(
                        originalPolicyNumber,
                        verification,
                        requireUsername(authentication)
                )
        );
    }

    // =========================================================
    // AUTHENTICATION HELPER
    // =========================================================

    private String requireUsername(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new AccessDeniedException(
                    "Authentication is required."
            );
        }

        return authentication.getName();
    }
}

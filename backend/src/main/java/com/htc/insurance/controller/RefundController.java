
package com.htc.insurance.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.service.RefundService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/refund")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    // =========================================================
    // USER - REQUEST FULL RAZORPAY REFUND
    // =========================================================

    @PostMapping("/request")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> requestRefund(
            @Valid @RequestBody RefundRequestDto request,
            Authentication authentication) throws Exception {

        // =====================================================
        // VERIFY AUTHENTICATION
        // =====================================================

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Authentication is required."
                    ));
        }

        // =====================================================
        // PROCESS REFUND
        // =====================================================

        PolicyPurchase purchase = refundService.refundPurchase(
                request,
                authentication.getName()
        );

        // =====================================================
        // RETURN REFUND DETAILS
        // =====================================================

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Refund request submitted to Razorpay. "
                        + "The refund may take time to reach your account.",
                "purchaseId", purchase.getPurchaseId(),
                "refundId", purchase.getRefundId(),
                "refundStatus", purchase.getRefundStatus(),
                "refundAmount", purchase.getRefundAmount()
        ));
    }
}

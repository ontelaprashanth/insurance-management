package com.htc.insurance.controller;

import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.service.RefundService;

@RestController
@RequestMapping("/refund")
public class RefundController {

    private final RefundService refundService;

    public RefundController(RefundService refundService) {
        this.refundService = refundService;
    }

    // ==========================================
    // REQUEST A FULL REFUND
    // AUTHENTICATED USER
    // ==========================================

    @PostMapping("/request")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> requestRefund(
            @Valid @RequestBody RefundRequestDto request,
            Authentication authentication) throws Exception {

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Authentication is required."));
        }

        PolicyPurchase purchase = refundService.refundPurchase(
                request,
                authentication.getName());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Refund request submitted to Razorpay. "
                        + "The refund may take time to reach your account.",
                "purchaseId", purchase.getPurchaseId(),
                "refundId", purchase.getRefundId(),
                "refundStatus", purchase.getRefundStatus(),
                "refundAmount", purchase.getRefundAmount()));
    }
}

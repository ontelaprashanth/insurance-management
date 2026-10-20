package com.htc.insurance.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.PurchasePolicyDto;
import com.htc.insurance.dto.RefundRequestDto;
import com.htc.insurance.service.PolicyPurchaseService;
import com.htc.insurance.service.RazorpayRefundService;

@RestController
@RequestMapping("/policy")
public class PolicyPurchaseController {

    private final PolicyPurchaseService policyPurchaseService;
    private final RazorpayRefundService razorpayRefundService;

    public PolicyPurchaseController(
            PolicyPurchaseService policyPurchaseService,
            RazorpayRefundService razorpayRefundService) {

        this.policyPurchaseService = policyPurchaseService;
        this.razorpayRefundService = razorpayRefundService;
    }

    // ==========================================
    // USER - PURCHASE INSURANCE POLICY
    // POST /policy/purchase
    // ==========================================

    @PostMapping("/purchase")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PurchasePolicyDto> purchasePolicy(
            @RequestBody PurchasePolicyDto purchaseDto,
            Authentication authentication) {

        if (purchaseDto == null) {
            throw new IllegalArgumentException(
                    "Purchase details are required.");
        }

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new AccessDeniedException(
                    "Authentication is required.");
        }

        PurchasePolicyDto response =
                policyPurchaseService.purchasePolicy(
                        purchaseDto,
                        authentication);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(response);
    }

    // ==========================================
    // ADMIN - GET ALL PURCHASES
    // GET /policy/purchases
    // ==========================================

    @GetMapping("/purchases")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PurchasePolicyDto>> getAllPurchases() {

        return ResponseEntity.ok(
                policyPurchaseService.getAllPurchases());
    }

    // ==========================================
    // USER - GET MY PURCHASES
    // GET /policy/my-purchases
    // ==========================================

    @GetMapping("/my-purchases")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PurchasePolicyDto>> getMyPurchases(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new AccessDeniedException(
                    "Authentication is required.");
        }

        return ResponseEntity.ok(
                policyPurchaseService.getMyPurchases(
                        authentication));
    }

    // ==========================================
    // USER - REQUEST FULL REFUND
    // POST /policy/purchases/{purchaseId}/refund
    // ==========================================

    @PostMapping("/purchases/{purchaseId}/refund")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PurchasePolicyDto> requestRefund(
            @PathVariable Long purchaseId,
            @Valid @RequestBody RefundRequestDto request,
            Authentication authentication) throws Exception {

        if (purchaseId == null || purchaseId <= 0) {
            throw new IllegalArgumentException(
                    "A valid purchase ID is required.");
        }

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new AccessDeniedException(
                    "Authentication is required.");
        }

        if (request == null
                || request.getRefundReason() == null
                || request.getRefundReason().isBlank()) {

            throw new IllegalArgumentException(
                    "Refund reason is required.");
        }

        // Service must validate ownership, payment status,
        // refund eligibility and duplicate refund protection.
        razorpayRefundService.requestFullRefund(
                purchaseId,
                authentication.getName(),
                request.getRefundReason().trim());

        // Return the established DTO, not the JPA entity.
        return policyPurchaseService.getMyPurchases(authentication)
                .stream()
                .filter(p -> purchaseId.equals(p.getPurchaseId()))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new IllegalStateException(
                        "Refund was processed, but the purchase response "
                        + "could not be loaded."));
    }
}

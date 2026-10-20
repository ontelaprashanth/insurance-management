package com.htc.insurance.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    // USER - PURCHASE INSURANCE POLICY

    @PostMapping("/purchase")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PurchasePolicyDto> purchasePolicy(
            @RequestBody PurchasePolicyDto purchaseDto,
            Authentication authentication) {

        if (purchaseDto == null) {
            throw new IllegalArgumentException(
                    "Purchase details are required.");
        }

        PurchasePolicyDto response =
                policyPurchaseService.purchasePolicy(
                        purchaseDto, authentication);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(response);
    }

    // ADMIN - GET ALL PURCHASES

    @GetMapping("/purchases")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PurchasePolicyDto>> getAllPurchases() {
        return ResponseEntity.ok(
                policyPurchaseService.getAllPurchases());
    }

    // USER - GET MY PURCHASES

    @GetMapping("/my-purchases")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PurchasePolicyDto>> getMyPurchases(
            Authentication authentication) {
        return ResponseEntity.ok(
                policyPurchaseService.getMyPurchases(authentication));
    }

    // USER - REQUEST FULL REFUND FOR THEIR OWN PURCHASE

    @PostMapping("/purchases/{purchaseId}/refund")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PurchasePolicyDto> requestRefund(
            @PathVariable Long purchaseId,
            @Valid @RequestBody RefundRequestDto request,
            Authentication authentication) throws Exception {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException(
                    "Authentication is required.");
        }

        var updatedPurchase =
                razorpayRefundService.requestFullRefund(
                        purchaseId,
                        authentication.getName(),
                        request.getReason());

        /*
         * Return the established purchase DTO format rather than exposing
         * the JPA entity or creating a new response format.
         */
        return ResponseEntity.ok(
                policyPurchaseService.getMyPurchases(authentication)
                        .stream()
                        .filter(p -> purchaseId.equals(p.getPurchaseId()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException(
                                "Refund was processed, but the purchase response "
                                + "could not be loaded.")));
    }
}

package com.htc.insurance.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.PurchasePolicyDto;
import com.htc.insurance.service.PolicyPurchaseService;

@RestController
@RequestMapping("/policy")
public class PolicyPurchaseController {

    private final PolicyPurchaseService policyPurchaseService;

    public PolicyPurchaseController(
            PolicyPurchaseService policyPurchaseService) {

        this.policyPurchaseService =
                policyPurchaseService;
    }


    // ==========================================
    // USER - PURCHASE INSURANCE POLICY
    // ==========================================

    @PostMapping("/purchase")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PurchasePolicyDto> purchasePolicy(
            @RequestBody PurchasePolicyDto purchaseDto,
            Authentication authentication) {

        PurchasePolicyDto response =
                policyPurchaseService.purchasePolicy(
                        purchaseDto,
                        authentication
                );

        return ResponseEntity.ok(response);
    }


    // ==========================================
    // ADMIN - GET ALL PURCHASE / PAYMENT DETAILS
    // ==========================================

    @GetMapping("/purchases")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PurchasePolicyDto>> getAllPurchases() {

        List<PurchasePolicyDto> purchases =
                policyPurchaseService.getAllPurchases();

        return ResponseEntity.ok(purchases);
    }


    // ==========================================
    // USER - GET MY PURCHASE / PAYMENT DETAILS
    // ==========================================

    @GetMapping("/my-purchases")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<PurchasePolicyDto>> getMyPurchases(
            Authentication authentication) {

        List<PurchasePolicyDto> purchases =
                policyPurchaseService.getMyPurchases(
                        authentication
                );

        return ResponseEntity.ok(purchases);
    }
}

package com.htc.insurance.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dto.SettlementDto;
import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.Settlement;
import com.htc.insurance.entity.User;
import com.htc.insurance.repository.ClaimsRepository;
import com.htc.insurance.repository.SettlementRepository;

@Service
@Transactional
public class SettlementService {

    @Autowired
    private SettlementRepository settlementRepository;

    @Autowired
    private ClaimsRepository claimsRepository;

    @Autowired
    private NotificationService notificationService;

    // =========================================================
    // CREATE SETTLEMENT
    // =========================================================

    public SettlementDto saveSettlement(SettlementDto dto) {

        if (dto == null) {
            throw new IllegalArgumentException(
                    "Settlement details are required.");
        }

        if (dto.getClaimNumber() == null) {
            throw new IllegalArgumentException(
                    "Claim number is required.");
        }

        if (dto.getAmount() == null
                || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Settlement amount must be greater than zero.");
        }

        if (dto.getSettlementDate() == null) {
            throw new IllegalArgumentException(
                    "Settlement date is required.");
        }

        Claims claim = claimsRepository.findById(dto.getClaimNumber())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Claim not found: " + dto.getClaimNumber()));

        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalArgumentException(
                    "Settlement can be created only for an approved claim.");
        }

        if (claim.getApprovedAmount() == null) {
            throw new IllegalArgumentException(
                    "Approved amount is not available for this claim.");
        }

        if (dto.getAmount().compareTo(claim.getApprovedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Settlement amount cannot exceed the approved claim amount of "
                            + claim.getApprovedAmount());
        }

        List<Settlement> existing = settlementRepository
                .findByClaim_ClaimNumber(dto.getClaimNumber());

        if (!existing.isEmpty()) {
            throw new IllegalArgumentException(
                    "A settlement already exists for this claim.");
        }

        Settlement settlement = new Settlement();
        settlement.setSettlementDate(dto.getSettlementDate());
        settlement.setAmount(dto.getAmount());
        settlement.setSettlementStatus("PENDING");
        settlement.setRejectionReason(null);
        settlement.setClaim(claim);

        Settlement saved = settlementRepository.save(settlement);

        notifySettlementOwner(
                saved,
                "Settlement Created",
                "A settlement #" + saved.getSettlementNumber()
                        + " has been created for your claim #"
                        + claim.getClaimNumber()
                        + " for ₹" + saved.getAmount()
                        + ". The settlement is currently pending.",
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // PROCESS SETTLEMENT
    // =========================================================

    public SettlementDto processSettlement(Long settlementNumber) {

        Settlement settlement = findSettlement(settlementNumber);

        if (settlement.getClaim() == null) {
            throw new IllegalArgumentException(
                    "Settlement is not linked to a claim.");
        }

        Claims claim = settlement.getClaim();

        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalArgumentException(
                    "Only settlements for approved claims can be processed.");
        }

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {
            throw new IllegalArgumentException(
                    "Only pending settlements can be processed.");
        }

        if (claim.getApprovedAmount() == null) {
            throw new IllegalArgumentException(
                    "Approved claim amount is not available.");
        }

        if (settlement.getAmount().compareTo(
                claim.getApprovedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Settlement amount cannot exceed the approved claim amount.");
        }

        settlement.setSettlementStatus("SETTLED");
        settlement.setRejectionReason(null);

        // Keep the associated claim synchronized with the completed settlement.
        claim.setStatus(ClaimStatus.SETTLED);
        claimsRepository.save(claim);

        Settlement saved = settlementRepository.save(settlement);

        notifySettlementOwner(
                saved,
                "Settlement Completed",
                "Your settlement #" + saved.getSettlementNumber()
                        + " for claim #" + claim.getClaimNumber()
                        + " has been successfully settled for ₹"
                        + saved.getAmount() + ".",
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // REJECT SETTLEMENT
    // =========================================================

    public SettlementDto rejectSettlement(
            Long settlementNumber, String rejectionReason) {

        if (rejectionReason == null || rejectionReason.isBlank()) {
            throw new IllegalArgumentException(
                    "Please enter a rejection reason.");
        }

        String reason = rejectionReason.trim();

        if (reason.length() > 1000) {
            throw new IllegalArgumentException(
                    "Rejection reason cannot exceed 1000 characters.");
        }

        Settlement settlement = findSettlement(settlementNumber);

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {
            throw new IllegalArgumentException(
                    "Only pending settlements can be rejected.");
        }

        Claims claim = settlement.getClaim();
        if (claim == null) {
            throw new IllegalStateException(
                    "Settlement is not linked to a claim.");
        }
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Only settlements for approved claims can be rejected.");
        }

        settlement.setSettlementStatus("REJECTED");
        settlement.setRejectionReason(reason);

        // A rejected settlement also rejects the claim, as required by InsureX.
        // The rejected claim and settlement are retained for audit/history.
        claim.setStatus(ClaimStatus.REJECTED);
        claimsRepository.save(claim);

        Settlement saved = settlementRepository.save(settlement);

        notifySettlementOwner(
                saved,
                "Settlement Rejected",
                "Your settlement #" + saved.getSettlementNumber()
                        + " for claim #" + getClaimNumber(saved)
                        + " has been rejected. The associated claim has also been rejected. Reason: "
                        + reason
                        + ". You may submit a new claim if your policy is eligible.",
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // GET ALL SETTLEMENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<SettlementDto> getAllSettlements() {

        return settlementRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // GET SETTLEMENT BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public SettlementDto getSettlementById(Long settlementNumber) {

        Settlement settlement = settlementRepository
                .findById(settlementNumber)
                .orElse(null);

        return settlement == null ? null : mapToDto(settlement);
    }

    // =========================================================
    // GET SETTLEMENTS BY CLAIM
    // =========================================================

    @Transactional(readOnly = true)
    public List<SettlementDto> getSettlementsByClaimNumber(
            Long claimNumber) {

        return settlementRepository
                .findByClaim_ClaimNumber(claimNumber)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // UPDATE SETTLEMENT
    // =========================================================

    public SettlementDto updateSettlement(
            Long settlementNumber, SettlementDto dto) {

        if (dto == null) {
            throw new IllegalArgumentException(
                    "Settlement details are required.");
        }

        Settlement settlement = settlementRepository
                .findById(settlementNumber)
                .orElse(null);

        if (settlement == null) {
            return null;
        }

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {
            throw new IllegalArgumentException(
                    "Only pending settlements can be updated.");
        }

        if (dto.getAmount() == null
                || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Settlement amount must be greater than zero.");
        }

        if (dto.getSettlementDate() == null) {
            throw new IllegalArgumentException(
                    "Settlement date is required.");
        }

        Claims claim = settlement.getClaim();

        if (claim == null) {
            throw new IllegalArgumentException(
                    "Settlement is not linked to a claim.");
        }

        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalArgumentException(
                    "Settlement can be updated only for an approved claim.");
        }

        if (claim.getApprovedAmount() == null) {
            throw new IllegalArgumentException(
                    "Approved claim amount is not available.");
        }

        if (dto.getAmount().compareTo(claim.getApprovedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Settlement amount cannot exceed the approved claim amount of "
                            + claim.getApprovedAmount());
        }

        settlement.setSettlementDate(dto.getSettlementDate());
        settlement.setAmount(dto.getAmount());

        Settlement saved = settlementRepository.save(settlement);

        notifySettlementOwner(
                saved,
                "Settlement Updated",
                "Your settlement #" + saved.getSettlementNumber()
                        + " for claim #" + claim.getClaimNumber()
                        + " has been updated. Current settlement amount is ₹"
                        + saved.getAmount() + ".",
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // DELETE SETTLEMENT
    // =========================================================

    public void deleteSettlement(Long settlementNumber) {

        Settlement settlement = findSettlement(settlementNumber);

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {
            throw new IllegalArgumentException(
                    "Only pending settlements can be deleted.");
        }

        settlementRepository.delete(settlement);

        notifySettlementOwner(
                settlement,
                "Settlement Deleted",
                "Your settlement #" + settlementNumber
                        + " for claim #" + getClaimNumber(settlement)
                        + " has been deleted.",
                "SETTLEMENT");
    }

    // =========================================================
    // FIND SETTLEMENT
    // =========================================================

    private Settlement findSettlement(Long settlementNumber) {

        if (settlementNumber == null) {
            throw new IllegalArgumentException(
                    "Settlement number is required.");
        }

        return settlementRepository.findById(settlementNumber)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Settlement not found: " + settlementNumber));
    }

    // =========================================================
    // NOTIFY SETTLEMENT OWNER
    // =========================================================

    private void notifySettlementOwner(
            Settlement settlement,
            String title,
            String message,
            String type) {

        if (settlement == null || settlement.getClaim() == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Settlement or claim is null.");
            return;
        }

        Claims claim = settlement.getClaim();
        Policy policy = claim.getPolicy();

        if (policy == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Claim has no policy.");
            return;
        }

        PolicyHolder holder = policy.getPolicyHolder();

        if (holder == null || holder.getUser() == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Policy holder or user is null.");
            return;
        }

        User customer = holder.getUser();

        if (customer.getUserId() == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Customer user ID is null.");
            return;
        }

        try {
            notificationService.createNotification(
                    customer, title, message, type);

            System.out.println(
                    "NOTIFICATION: Successfully created -> " + title);

        } catch (Exception e) {
            System.out.println(
                    "NOTIFICATION ERROR: "
                            + e.getClass().getSimpleName()
                            + " - " + e.getMessage());
        }
    }

    // =========================================================
    // GET CLAIM NUMBER
    // =========================================================

    private Long getClaimNumber(Settlement settlement) {

        if (settlement == null || settlement.getClaim() == null) {
            return null;
        }

        return settlement.getClaim().getClaimNumber();
    }

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    private SettlementDto mapToDto(Settlement settlement) {

        SettlementDto dto = new SettlementDto();

        dto.setSettlementNumber(settlement.getSettlementNumber());
        dto.setSettlementDate(settlement.getSettlementDate());
        dto.setAmount(settlement.getAmount());
        dto.setSettlementStatus(settlement.getSettlementStatus());

        // Required for displaying the rejection reason in the UI.
        dto.setRejectionReason(settlement.getRejectionReason());

        if (settlement.getClaim() != null) {
            dto.setClaimNumber(
                    settlement.getClaim().getClaimNumber());
        }

        return dto;
    }
}

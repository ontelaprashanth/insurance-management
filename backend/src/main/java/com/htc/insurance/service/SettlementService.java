package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.PolicyPurchaseDao;

import com.htc.insurance.dto.SettlementDto;

import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.PolicyLifecycleStatus;
import com.htc.insurance.entity.PolicyPurchase;
import com.htc.insurance.entity.Settlement;
import com.htc.insurance.entity.User;

import com.htc.insurance.repository.ClaimsRepository;
import com.htc.insurance.repository.SettlementRepository;

@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class SettlementService {

    @Autowired
    private SettlementRepository settlementRepository;

    @Autowired
    private ClaimsRepository claimsRepository;

    @Autowired
    private ClaimsDao claimsDao;

    @Autowired
    private PolicyDao policyDao;

    @Autowired
    private PolicyPurchaseDao policyPurchaseDao;

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

        validateSettlementDetails(dto);

        Claims claim = getClaimWithLockedPolicy(
                dto.getClaimNumber());

        // OPTION 1: An approved claim remains payable.
        // Premium refund requests must be blocked by RefundPreparationService
        // once a claim is APPROVED or SETTLED. Do not block settlement here
        // merely because a separate refund record exists: historical conflicts
        // require reconciliation, not automatic cancellation of claim payment.
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Settlement can be created only "
                            + "for an approved claim.");
        }

        validateApprovedAmount(
                claim, dto.getAmount());

        List<Settlement> existing =
                settlementRepository.findByClaim_ClaimNumber(
                        dto.getClaimNumber());

        if (!existing.isEmpty()) {
            throw new IllegalStateException(
                    "A settlement already exists for this claim.");
        }

        Settlement settlement = new Settlement();

        settlement.setSettlementDate(
                dto.getSettlementDate());

        settlement.setAmount(dto.getAmount());
        settlement.setSettlementStatus("PENDING");
        settlement.setRejectionReason(null);
        settlement.setClaim(claim);

        Settlement saved =
                settlementRepository.save(settlement);

        notifySettlementOwner(
                saved,
                "Settlement Created",
                "A settlement #"
                        + saved.getSettlementNumber()
                        + " has been created for your claim #"
                        + claim.getClaimNumber()
                        + " for ₹"
                        + saved.getAmount()
                        + ". The settlement is currently pending.",
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // PROCESS SETTLEMENT
    // =========================================================

    /**
     * Legacy endpoint deliberately cannot finalize a payout.
     * The administrator must record a transfer with a bank reference first.
     */
    public SettlementDto processSettlement(Long settlementNumber) {
        throw new IllegalStateException(
                "Use /settlement/transfer/{id} to record the bank transfer. "
                + "The legacy process endpoint cannot confirm payment.");
    }

    // =========================================================
    // RECORD TRANSFER (PENDING/FAILED -> PROCESSING)
    // =========================================================

    public SettlementDto recordTransfer(
            Long settlementNumber,
            SettlementDto dto,
            String adminUsername) {

        requireAdminName(adminUsername);
        if (dto == null
                || dto.getTransactionReference() == null
                || dto.getTransactionReference().isBlank()) {
            throw new IllegalArgumentException(
                    "Bank transaction reference / UTR is required.");
        }
        String reference = dto.getTransactionReference().trim();
        if (reference.length() > 150) {
            throw new IllegalArgumentException(
                    "Bank transaction reference exceeds 150 characters.");
        }
        if (dto.getTransferDate() == null
                || dto.getTransferDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "A valid transfer date, not in the future, is required.");
        }

        Settlement settlement = getSettlementWithLockedPolicy(settlementNumber);
        String status = settlement.getSettlementStatus();
        if (!"PENDING".equalsIgnoreCase(status)
                && !"FAILED".equalsIgnoreCase(status)) {
            throw new IllegalStateException(
                    "Only pending or failed transfers can be recorded.");
        }
        Claims claim = settlement.getClaim();
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Claim must remain approved before recording transfer.");
        }
        validateApprovedAmount(claim, settlement.getAmount());

        settlement.setTransactionReference(reference);
        settlement.setTransferDate(dto.getTransferDate());
        settlement.setTransferRecordedBy(adminUsername.trim());
        settlement.setSettlementStatus("PROCESSING");
        settlement.setRejectionReason(null);
        settlement.setConfirmedAt(null);
        settlement.setConfirmedBy(null);
        settlement.setConfirmationRemarks(null);

        Settlement saved = settlementRepository.save(settlement);
        notifySettlementOwner(saved,
                "Settlement Transfer Recorded",
                "A bank transfer has been recorded for claim #"
                        + claim.getClaimNumber()
                        + ". Settlement confirmation is pending.",
                "SETTLEMENT");
        return mapToDto(saved);
    }

    // =========================================================
    // MANUAL CONFIRMATION (PROCESSING -> SETTLED)
    // =========================================================

    public SettlementDto confirmSettlement(
            Long settlementNumber,
            String confirmationRemarks,
            String adminUsername) {

        requireAdminName(adminUsername);
        if (confirmationRemarks == null
                || confirmationRemarks.isBlank()) {
            throw new IllegalArgumentException(
                    "Describe how successful bank payment was verified.");
        }
        if (confirmationRemarks.trim().length() > 1000) {
            throw new IllegalArgumentException(
                    "Confirmation remarks cannot exceed 1000 characters.");
        }

        Settlement settlement = getSettlementWithLockedPolicy(settlementNumber);
        if (!"PROCESSING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {
            throw new IllegalStateException(
                    "Only processing settlements can be confirmed.");
        }
        if (settlement.getTransactionReference() == null
                || settlement.getTransactionReference().isBlank()
                || settlement.getTransferDate() == null) {
            throw new IllegalStateException(
                    "Bank transfer details must be recorded first.");
        }
        Claims claim = settlement.getClaim();
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Only approved claims can be settled.");
        }
        validateApprovedAmount(claim, settlement.getAmount());

        // Manual confirmation is an administrator attestation,
        // not an automatic bank/provider verification.
        settlement.setSettlementStatus("SETTLED");
        settlement.setConfirmedAt(LocalDateTime.now());
        settlement.setConfirmedBy(adminUsername.trim());
        settlement.setConfirmationRemarks(confirmationRemarks.trim());
        settlement.setRejectionReason(null);
        claim.setStatus(ClaimStatus.SETTLED);
        claimsRepository.save(claim);
        Settlement saved = settlementRepository.save(settlement);

        notifySettlementOwner(saved,
                "Settlement Confirmed",
                "Your settlement #" + saved.getSettlementNumber()
                        + " for claim #" + claim.getClaimNumber()
                        + " has been confirmed by the administrator for ₹"
                        + saved.getAmount() + ".",
                "SETTLEMENT");
        return mapToDto(saved);
    }

    // =========================================================
    // BANK TRANSFER FAILURE (PROCESSING -> FAILED)
    // =========================================================

    public SettlementDto failSettlement(
            Long settlementNumber, String reason) {

        if (reason == null || reason.isBlank()
                || reason.trim().length() > 1000) {
            throw new IllegalArgumentException(
                    "A failure reason of 1-1000 characters is required.");
        }
        Settlement settlement = getSettlementWithLockedPolicy(settlementNumber);
        if (!"PROCESSING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {
            throw new IllegalStateException(
                    "Only processing transfers can be marked failed.");
        }
        if (settlement.getClaim().getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Claim must be approved to record a transfer failure.");
        }
        settlement.setSettlementStatus("FAILED");
        settlement.setRejectionReason(reason.trim());
        Settlement saved = settlementRepository.save(settlement);
        notifySettlementOwner(saved,
                "Settlement Transfer Failed",
                "The transfer for claim #"
                        + saved.getClaim().getClaimNumber()
                        + " could not be completed. Your approved claim "
                        + "remains approved while the transfer is resolved.",
                "SETTLEMENT");
        return mapToDto(saved);
    }

    private void requireAdminName(String adminUsername) {
        if (adminUsername == null || adminUsername.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated administrator is required.");
        }
        if (adminUsername.length() > 150) {
            throw new IllegalArgumentException("Administrator name is too long.");
        }
    }

    // =========================================================
    // =========================================================
    // REJECT SETTLEMENT
    // =========================================================

    public SettlementDto rejectSettlement(
            Long settlementNumber,
            String rejectionReason) {

        if (rejectionReason == null
                || rejectionReason.isBlank()) {

            throw new IllegalArgumentException(
                    "Please enter a rejection reason.");
        }

        String reason = rejectionReason.trim();

        if (reason.length() > 1000) {
            throw new IllegalArgumentException(
                    "Rejection reason cannot exceed 1000 characters.");
        }

        // Lock policy first.
        Settlement settlement =
                getSettlementWithLockedPolicy(
                        settlementNumber);

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {

            throw new IllegalStateException(
                    "Only pending settlements can be rejected.");
        }

        Claims claim = settlement.getClaim();

        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Only approved claims can be rejected "
                            + "during settlement.");
        }

        Policy policy = claim.getPolicy();

        if (policy == null
                || policy.getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Settlement policy information is unavailable.");
        }

        // Lock purchase second.
        PolicyPurchase purchase = policyPurchaseDao
                .getPurchaseByPolicyNumberForUpdate(
                        policy.getPolicyNumber())
                .orElse(null);

        // =====================================================
        // REJECT SETTLEMENT AND CLAIM
        // =====================================================

        settlement.setSettlementStatus("REJECTED");
        settlement.setRejectionReason(reason);

        claim.setStatus(ClaimStatus.REJECTED);
        claim.setRejectionReason(reason);
        claim.setApprovedAmount(null);
        claim.setReviewedDate(LocalDate.now());

        claimsRepository.save(claim);

        Settlement saved =
                settlementRepository.save(settlement);

        // Flush changes before checking other claims.
        claimsRepository.flush();

        // =====================================================
        // RESTORE POLICY IF ELIGIBLE
        // =====================================================

        boolean restored =
                restorePolicyAfterRejection(
                        policy,
                        purchase);

        // =====================================================
        // CUSTOMER NOTIFICATION
        // =====================================================

        String message =
                "Your settlement #"
                        + saved.getSettlementNumber()
                        + " for claim #"
                        + claim.getClaimNumber()
                        + " has been rejected. "
                        + "The associated claim has also been rejected. "
                        + "Reason: "
                        + reason
                        + ".";

        if (restored) {

            message +=
                    " Your policy is now eligible for "
                            + "another claim. "
                            + "You can file a new claim.";

        } else {

            message +=
                    " Your policy is not currently eligible "
                            + "for another claim.";
        }

        notifySettlementOwner(
                saved,
                "Settlement Rejected",
                message,
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // RESTORE POLICY AFTER SETTLEMENT REJECTION
    // =========================================================

    private boolean restorePolicyAfterRejection(
            Policy policy,
            PolicyPurchase purchase) {

        if (policy == null
                || policy.getPolicyNumber() == null) {
            return false;
        }

        // Only claim-locked policies may be restored.
        // Never automatically restore an admin-disabled,
        // expired, refunded or legacy policy.
        if (policy.getLifecycleStatus()
                != PolicyLifecycleStatus.CLAIM_LOCKED) {
            return false;
        }

        LocalDate today = LocalDate.now();

        boolean coverageValid =
                policy.getStartDate() != null
                && policy.getExpiryDate() != null
                && !policy.getStartDate().isAfter(today)
                && policy.getExpiryDate().isAfter(today);

        if (!coverageValid) {
            return false;
        }

        if (hasBlockingRefund(purchase)) {
            return false;
        }

        // All historical claims must be rejected.
        // Any pending, approved, settled, or unknown
        // claim status blocks restoration.
        List<Claims> existingClaims =
                claimsDao.getClaimsByPolicyNumber(
                        policy.getPolicyNumber());

        for (Claims existing : existingClaims) {

            if (existing == null
                    || existing.getPolicy() == null
                    || !policy.getPolicyNumber().equals(
                            existing.getPolicy()
                                    .getPolicyNumber())) {
                continue;
            }

            if (existing.getStatus()
                    != ClaimStatus.REJECTED) {
                return false;
            }
        }

        policy.setLifecycleStatus(
                PolicyLifecycleStatus.ACTIVE);

        policy.setIsActive(true);

        policyDao.savePolicy(policy);

        return true;
    }

    // =========================================================
    // CHECK REFUND STATUS
    // =========================================================

    private boolean hasBlockingRefund(
            PolicyPurchase purchase) {

        // Preserve legacy policies without purchase records.
        if (purchase == null) {
            return false;
        }

        String refundStatus =
                purchase.getRefundStatus();

        // Unknown refund status blocks restoration.
        if (refundStatus == null
                || refundStatus.isBlank()) {
            return true;
        }

        return !"NOT_REFUNDED".equalsIgnoreCase(
                refundStatus.trim());
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
    public SettlementDto getSettlementById(
            Long settlementNumber) {

        Settlement settlement =
                settlementRepository.findById(
                        settlementNumber)
                        .orElse(null);

        return settlement == null
                ? null
                : mapToDto(settlement);
    }

    // =========================================================
    // GET SETTLEMENTS BY CLAIM NUMBER
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
            Long settlementNumber,
            SettlementDto dto) {

        if (dto == null) {
            throw new IllegalArgumentException(
                    "Settlement details are required.");
        }

        validateSettlementDetails(dto);

        Settlement settlement =
                getSettlementWithLockedPolicy(
                        settlementNumber);

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {

            throw new IllegalStateException(
                    "Only pending settlements can be updated.");
        }

        Claims claim = settlement.getClaim();

        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                    "Settlement can be updated only "
                            + "for an approved claim.");
        }

        validateApprovedAmount(
                claim, dto.getAmount());

        settlement.setSettlementDate(
                dto.getSettlementDate());

        settlement.setAmount(dto.getAmount());

        Settlement saved =
                settlementRepository.save(settlement);

        notifySettlementOwner(
                saved,
                "Settlement Updated",
                "Your settlement #"
                        + saved.getSettlementNumber()
                        + " for claim #"
                        + claim.getClaimNumber()
                        + " has been updated. "
                        + "Current settlement amount is ₹"
                        + saved.getAmount()
                        + ".",
                "SETTLEMENT");

        return mapToDto(saved);
    }

    // =========================================================
    // DELETE SETTLEMENT
    // =========================================================

    public void deleteSettlement(
            Long settlementNumber) {

        Settlement settlement =
                getSettlementWithLockedPolicy(
                        settlementNumber);

        if (!"PENDING".equalsIgnoreCase(
                settlement.getSettlementStatus())) {

            throw new IllegalStateException(
                    "Only pending settlements can be deleted.");
        }

        settlementRepository.delete(settlement);

        notifySettlementOwner(
                settlement,
                "Settlement Deleted",
                "Your settlement #"
                        + settlementNumber
                        + " for claim #"
                        + getClaimNumber(settlement)
                        + " has been deleted.",
                "SETTLEMENT");
    }

    // =========================================================
    // VALIDATE SETTLEMENT DETAILS
    // =========================================================

    private void validateSettlementDetails(
            SettlementDto dto) {

        if (dto.getAmount() == null
                || dto.getAmount()
                        .compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Settlement amount must be greater than zero.");
        }

        if (dto.getSettlementDate() == null) {
            throw new IllegalArgumentException(
                    "Settlement date is required.");
        }

        if (dto.getSettlementDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Settlement date cannot be in the future.");
        }
    }

    // =========================================================
    // VALIDATE APPROVED AMOUNT
    // =========================================================

    private void validateApprovedAmount(
            Claims claim,
            BigDecimal amount) {

        if (claim.getApprovedAmount() == null) {
            throw new IllegalStateException(
                    "Approved claim amount is not available.");
        }

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Settlement amount must be greater than zero.");
        }

        if (amount.compareTo(
                claim.getApprovedAmount()) > 0) {

            throw new IllegalArgumentException(
                    "Settlement amount cannot exceed "
                            + "the approved claim amount of "
                            + claim.getApprovedAmount());
        }
    }

    // =========================================================
    // FIND SETTLEMENT
    // =========================================================

    private Settlement findSettlement(
            Long settlementNumber) {

        if (settlementNumber == null) {
            throw new IllegalArgumentException(
                    "Settlement number is required.");
        }

        return settlementRepository
                .findById(settlementNumber)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Settlement not found: "
                                        + settlementNumber));
    }

    // =========================================================
    // GET SETTLEMENT WITH LOCKED POLICY
    // =========================================================

    private Settlement getSettlementWithLockedPolicy(
            Long settlementNumber) {

        Settlement initial =
                findSettlement(settlementNumber);

        if (initial.getClaim() == null
                || initial.getClaim().getPolicy() == null
                || initial.getClaim().getPolicy()
                        .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Settlement policy information is unavailable.");
        }

        Long policyNumber =
                initial.getClaim()
                        .getPolicy()
                        .getPolicyNumber();

        Policy lockedPolicy =
                policyDao.getPolicyByIdForUpdate(
                        policyNumber);

        if (lockedPolicy == null) {
            throw new IllegalStateException(
                    "Settlement policy no longer exists.");
        }

        Settlement settlement =
                findSettlement(settlementNumber);

        if (settlement.getClaim() == null
                || settlement.getClaim().getPolicy() == null
                || !policyNumber.equals(
                        settlement.getClaim()
                                .getPolicy()
                                .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Settlement changed during processing.");
        }

        return settlement;
    }

    // =========================================================
    // GET CLAIM WITH LOCKED POLICY
    // =========================================================

    private Claims getClaimWithLockedPolicy(
            Long claimNumber) {

        Claims initial =
                claimsRepository.findById(claimNumber)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Claim not found: "
                                                + claimNumber));

        if (initial.getPolicy() == null
                || initial.getPolicy()
                        .getPolicyNumber() == null) {

            throw new IllegalStateException(
                    "Claim policy information is unavailable.");
        }

        Long policyNumber =
                initial.getPolicy()
                        .getPolicyNumber();

        Policy lockedPolicy =
                policyDao.getPolicyByIdForUpdate(
                        policyNumber);

        if (lockedPolicy == null) {
            throw new IllegalStateException(
                    "Policy not found.");
        }

        Claims claim =
                claimsRepository.findById(claimNumber)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Claim no longer exists."));

        if (claim.getPolicy() == null
                || !policyNumber.equals(
                        claim.getPolicy()
                                .getPolicyNumber())) {

            throw new IllegalStateException(
                    "Claim policy changed during processing.");
        }

        return claim;
    }

    // =========================================================
    // NOTIFY SETTLEMENT OWNER
    // =========================================================

    private void notifySettlementOwner(
            Settlement settlement,
            String title,
            String message,
            String type) {

        if (settlement == null
                || settlement.getClaim() == null) {
            return;
        }

        Claims claim = settlement.getClaim();
        Policy policy = claim.getPolicy();

        if (policy == null) {
            return;
        }

        PolicyHolder holder =
                policy.getPolicyHolder();

        if (holder == null
                || holder.getUser() == null) {
            return;
        }

        User customer = holder.getUser();

        if (customer.getUserId() == null) {
            return;
        }

        try {
            notificationService.createNotification(
                    customer,
                    title,
                    message,
                    type);

        } catch (Exception e) {
            System.err.println(
                    "Settlement notification failed: "
                            + e.getClass().getSimpleName()
                            + " - "
                            + e.getMessage());
        }
    }

    // =========================================================
    // GET CLAIM NUMBER
    // =========================================================

    private Long getClaimNumber(
            Settlement settlement) {

        if (settlement == null
                || settlement.getClaim() == null) {
            return null;
        }

        return settlement.getClaim()
                .getClaimNumber();
    }

    // =========================================================
    // ENTITY TO DTO
    // =========================================================

    private SettlementDto mapToDto(
            Settlement settlement) {

        SettlementDto dto = new SettlementDto();

        dto.setSettlementNumber(
                settlement.getSettlementNumber());

        dto.setSettlementDate(
                settlement.getSettlementDate());

        dto.setAmount(
                settlement.getAmount());

        dto.setSettlementStatus(
                settlement.getSettlementStatus());

        dto.setRejectionReason(
                settlement.getRejectionReason());
        dto.setTransactionReference(settlement.getTransactionReference());
        dto.setTransferDate(settlement.getTransferDate());
        dto.setTransferRecordedBy(settlement.getTransferRecordedBy());
        dto.setConfirmedAt(settlement.getConfirmedAt());
        dto.setConfirmedBy(settlement.getConfirmedBy());
        dto.setConfirmationRemarks(settlement.getConfirmationRemarks());

        if (settlement.getClaim() != null) {
            dto.setClaimNumber(
                    settlement.getClaim()
                            .getClaimNumber());
        }

        return dto;
    }
}

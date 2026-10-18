package com.htc.insurance.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.PolicyDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.ClaimDecisionDto;
import com.htc.insurance.dto.ClaimsDto;
import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.User;
import com.htc.insurance.mapper.ClaimsMapper;

@Service
public class ClaimsService {

    @Autowired
    private ClaimsDao claimsDao;

    @Autowired
    private PolicyDao policyDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private ClaimsMapper claimsMapper;

    @Autowired
    private NotificationService notificationService;


    // =========================================================
    // USER + ADMIN
    // SUBMIT NEW CLAIM
    // =========================================================

    public ClaimsDto saveClaims(
            ClaimsDto claimsDto,
            Authentication authentication) {

        if (claimsDto == null) {
            throw new RuntimeException(
                    "Claim data is required.");
        }

        if (authentication == null ||
                authentication.getName() == null ||
                authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication required.");
        }

        if (claimsDto.getPolicyNumber() == null) {
            throw new RuntimeException(
                    "Policy number is required.");
        }

        String username =
                authentication.getName();

        User user =
                userDao.getUserByUsername(username);

        if (user == null) {
            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        Policy policy =
                policyDao.getPolicyById(
                        claimsDto.getPolicyNumber());

        if (policy == null) {
            throw new RuntimeException(
                    "Policy not found.");
        }


        // =====================================================
        // VERIFY POLICY OWNERSHIP
        // =====================================================

        PolicyHolder policyHolder =
                policy.getPolicyHolder();

        if (policyHolder == null ||
                policyHolder.getUser() == null ||
                policyHolder.getUser().getUserId() == null ||
                !policyHolder.getUser()
                        .getUserId()
                        .equals(user.getUserId())) {

            throw new RuntimeException(
                    "You can only raise a claim against your own policy.");
        }


        // =====================================================
        // POLICY MUST BE ACTIVE
        // =====================================================

        if (!Boolean.TRUE.equals(
                policy.getIsActive())) {

            throw new RuntimeException(
                    "Claims cannot be submitted for an inactive policy.");
        }


        // =====================================================
        // CONVERT DTO -> ENTITY
        // =====================================================

        Claims claims =
                claimsMapper.convertClaimsDtoToEntity(
                        claimsDto);

        if (claims == null) {
            throw new RuntimeException(
                    "Unable to create claim.");
        }


        // =====================================================
        // CONNECT POLICY
        // =====================================================

        claims.setPolicy(policy);


        // =====================================================
        // AUTOMATIC CLAIM DATE
        // =====================================================

        claims.setClaimDate(
                LocalDate.now());


        // =====================================================
        // NEW CLAIM ALWAYS STARTS AS PENDING
        // =====================================================

        claims.setStatus(
                ClaimStatus.PENDING);


        // =====================================================
        // CLEAR ADMIN DECISION FIELDS
        // =====================================================

        claims.setApprovedAmount(null);
        claims.setAdminRemarks(null);
        claims.setRejectionReason(null);
        claims.setReviewedDate(null);


        // =====================================================
        // SAVE
        // =====================================================

        Claims savedClaims =
                claimsDao.saveClaims(
                        claims);


        // =====================================================
        // NOTIFICATION - CLAIM SUBMITTED
        // =====================================================

        createClaimNotification(
                user,
                "Claim Submitted",
                "Your claim #"
                        + savedClaims.getClaimNumber()
                        + " has been submitted successfully "
                        + "and is now under review.",
                "CLAIM"
        );


        return claimsMapper.convertClaimsEntityToDto(
                savedClaims);
    }


    // =========================================================
    // ADMIN
    // GET ALL CLAIMS
    // =========================================================

    public List<ClaimsDto> getAllClaims() {

        List<Claims> claimsList =
                claimsDao.getAllClaims();

        return claimsList
                .stream()
                .map(claimsMapper::convertClaimsEntityToDto)
                .collect(Collectors.toList());
    }


    // =========================================================
    // USER
    // GET MY CLAIMS
    // =========================================================

    public List<ClaimsDto> getMyClaims(
            Authentication authentication) {

        if (authentication == null ||
                authentication.getName() == null ||
                authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication required.");
        }

        String username =
                authentication.getName();

        User user =
                userDao.getUserByUsername(username);

        if (user == null) {
            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        List<Claims> allClaims =
                claimsDao.getAllClaims();

        return allClaims
                .stream()
                .filter(claim -> {

                    Policy policy =
                            claim.getPolicy();

                    if (policy == null) {
                        return false;
                    }

                    PolicyHolder holder =
                            policy.getPolicyHolder();

                    if (holder == null ||
                            holder.getUser() == null ||
                            holder.getUser().getUserId() == null) {

                        return false;
                    }

                    return holder.getUser()
                            .getUserId()
                            .equals(user.getUserId());
                })
                .map(claimsMapper::convertClaimsEntityToDto)
                .collect(Collectors.toList());
    }


    // =========================================================
    // USER + ADMIN
    // GET CLAIM BY ID
    // =========================================================

    public ClaimsDto getClaimsById(
            Long claimNumber,
            Authentication authentication) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (authentication == null ||
                authentication.getName() == null ||
                authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication required.");
        }

        Claims claim =
                claimsDao.getClaimsById(
                        claimNumber);

        if (claim == null) {
            return null;
        }


        // =====================================================
        // ADMIN CAN VIEW ANY CLAIM
        // =====================================================

        boolean isAdmin =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(
                                authority ->
                                        authority.getAuthority()
                                                .equals("ROLE_ADMIN"));

        if (isAdmin) {

            return claimsMapper
                    .convertClaimsEntityToDto(
                            claim);
        }


        // =====================================================
        // USER CAN ONLY VIEW OWN CLAIM
        // =====================================================

        String username =
                authentication.getName();

        User user =
                userDao.getUserByUsername(
                        username);

        if (user == null) {
            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        Policy policy =
                claim.getPolicy();

        if (policy == null ||
                policy.getPolicyHolder() == null ||
                policy.getPolicyHolder().getUser() == null ||
                policy.getPolicyHolder().getUser().getUserId() == null) {

            throw new RuntimeException(
                    "Claim ownership could not be verified.");
        }

        Long ownerId =
                policy.getPolicyHolder()
                        .getUser()
                        .getUserId();

        if (!ownerId.equals(
                user.getUserId())) {

            throw new RuntimeException(
                    "You are not authorized to view this claim.");
        }

        return claimsMapper
                .convertClaimsEntityToDto(
                        claim);
    }


    // =========================================================
    // ADMIN
    // UPDATE CLAIM
    // =========================================================

    public ClaimsDto updateClaims(
            Long claimNumber,
            ClaimsDto claimsDto) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (claimsDto == null) {
            throw new RuntimeException(
                    "Claim data is required.");
        }

        Claims existingClaims =
                claimsDao.getClaimsById(
                        claimNumber);

        if (existingClaims == null) {
            return null;
        }

        if (claimsDto.getPolicyNumber() == null) {
            throw new RuntimeException(
                    "Policy number is required.");
        }

        Policy policy =
                policyDao.getPolicyById(
                        claimsDto.getPolicyNumber());

        if (policy == null) {
            throw new RuntimeException(
                    "Policy not found.");
        }

        Claims claims =
                claimsMapper.convertClaimsDtoToEntity(
                        claimsDto);

        if (claims == null) {
            throw new RuntimeException(
                    "Unable to update claim.");
        }

        claims.setClaimNumber(
                claimNumber);

        claims.setPolicy(
                policy);


        // =====================================================
        // PRESERVE ORIGINAL SUBMISSION INFORMATION
        // =====================================================

        claims.setClaimDate(
                existingClaims.getClaimDate());

        claims.setStatus(
                existingClaims.getStatus());

        claims.setApprovedAmount(
                existingClaims.getApprovedAmount());

        claims.setAdminRemarks(
                existingClaims.getAdminRemarks());

        claims.setRejectionReason(
                existingClaims.getRejectionReason());

        claims.setReviewedDate(
                existingClaims.getReviewedDate());


        Claims updatedClaims =
                claimsDao.updateClaims(
                        claims);


        // =====================================================
        // NOTIFICATION - CLAIM UPDATED
        // =====================================================

        notifyClaimOwner(
                updatedClaims,
                "Claim Updated",
                "Your claim #"
                        + updatedClaims.getClaimNumber()
                        + " has been updated successfully.",
                "CLAIM"
        );


        return claimsMapper.convertClaimsEntityToDto(
                updatedClaims);
    }


    // =========================================================
    // ADMIN
    // APPROVE CLAIM
    // =========================================================

    public ClaimsDto approveClaim(
            Long claimNumber,
            ClaimDecisionDto decisionDto) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (decisionDto == null) {
            throw new RuntimeException(
                    "Claim decision data is required.");
        }

        Claims claim =
                claimsDao.getClaimsById(
                        claimNumber);

        if (claim == null) {
            return null;
        }


        // =====================================================
        // ONLY PENDING CLAIMS CAN BE APPROVED
        // =====================================================

        if (claim.getStatus() != ClaimStatus.PENDING) {
            throw new RuntimeException(
                    "Only pending claims can be approved.");
        }


        // =====================================================
        // APPROVED AMOUNT IS REQUIRED
        // =====================================================

        if (decisionDto.getApprovedAmount() == null) {
            throw new RuntimeException(
                    "Approved amount is required.");
        }


        // =====================================================
        // APPROVED AMOUNT CANNOT BE NEGATIVE
        // =====================================================

        if (decisionDto.getApprovedAmount()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Approved amount cannot be negative.");
        }


        // =====================================================
        // ORIGINAL CLAIM AMOUNT MUST EXIST
        // =====================================================

        if (claim.getAmount() == null) {
            throw new RuntimeException(
                    "Claim amount is not available.");
        }


        // =====================================================
        // APPROVED AMOUNT CANNOT EXCEED CLAIM AMOUNT
        // =====================================================

        if (decisionDto.getApprovedAmount()
                .compareTo(claim.getAmount()) > 0) {

            throw new RuntimeException(
                    "Approved amount cannot be greater than the claimed amount.");
        }


        // =====================================================
        // SET APPROVAL DETAILS
        // =====================================================

        claim.setStatus(
                ClaimStatus.APPROVED);

        claim.setApprovedAmount(
                decisionDto.getApprovedAmount());

        claim.setAdminRemarks(
                decisionDto.getAdminRemarks());

        claim.setRejectionReason(
                null);

        claim.setReviewedDate(
                LocalDate.now());


        Claims updatedClaim =
                claimsDao.updateClaims(
                        claim);


        // =====================================================
        // NOTIFICATION - CLAIM APPROVED
        // =====================================================

        notifyClaimOwner(
                updatedClaim,
                "Claim Approved",
                "Your claim #"
                        + updatedClaim.getClaimNumber()
                        + " has been approved for ₹"
                        + updatedClaim.getApprovedAmount()
                        + ".",
                "CLAIM"
        );


        return claimsMapper.convertClaimsEntityToDto(
                updatedClaim);
    }


    // =========================================================
    // ADMIN
    // REJECT CLAIM
    // =========================================================

    public ClaimsDto rejectClaim(
            Long claimNumber,
            ClaimDecisionDto decisionDto) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (decisionDto == null) {
            throw new RuntimeException(
                    "Claim decision data is required.");
        }

        Claims claim =
                claimsDao.getClaimsById(
                        claimNumber);

        if (claim == null) {
            return null;
        }


        // =====================================================
        // ONLY PENDING CLAIMS CAN BE REJECTED
        // =====================================================

        if (claim.getStatus() != ClaimStatus.PENDING) {
            throw new RuntimeException(
                    "Only pending claims can be rejected.");
        }


        // =====================================================
        // REJECTION REASON IS REQUIRED
        // =====================================================

        if (decisionDto.getRejectionReason() == null ||
                decisionDto.getRejectionReason()
                        .isBlank()) {

            throw new RuntimeException(
                    "Rejection reason is required.");
        }


        // =====================================================
        // SET REJECTION DETAILS
        // =====================================================

        claim.setStatus(
                ClaimStatus.REJECTED);

        claim.setApprovedAmount(
                null);

        claim.setAdminRemarks(
                decisionDto.getAdminRemarks());

        claim.setRejectionReason(
                decisionDto.getRejectionReason()
                        .trim());

        claim.setReviewedDate(
                LocalDate.now());


        Claims updatedClaim =
                claimsDao.updateClaims(
                        claim);


        // =====================================================
        // NOTIFICATION - CLAIM REJECTED
        // =====================================================

        notifyClaimOwner(
                updatedClaim,
                "Claim Rejected",
                "Your claim #"
                        + updatedClaim.getClaimNumber()
                        + " has been rejected. Reason: "
                        + updatedClaim.getRejectionReason(),
                "CLAIM"
        );


        return claimsMapper.convertClaimsEntityToDto(
                updatedClaim);
    }


    // =========================================================
    // ADMIN
    // DELETE CLAIM
    // =========================================================

    public void deleteClaims(
            Long claimNumber) {

        if (claimNumber == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        Claims existingClaim =
                claimsDao.getClaimsById(
                        claimNumber);

        if (existingClaim == null) {
            throw new RuntimeException(
                    "Claim not found: " + claimNumber);
        }


        // -----------------------------------------------------
        // Store claim owner before deleting
        // -----------------------------------------------------

        Policy policy =
                existingClaim.getPolicy();

        User customer = null;

        if (policy != null &&
                policy.getPolicyHolder() != null) {

            customer =
                    policy.getPolicyHolder().getUser();
        }


        // -----------------------------------------------------
        // Delete claim
        // -----------------------------------------------------

        claimsDao.deleteClaims(
                claimNumber);


        // =====================================================
        // NOTIFICATION - CLAIM DELETED
        // =====================================================

        if (customer != null &&
                customer.getUserId() != null) {

            try {

                notificationService.createNotification(
                        customer,
                        "Claim Deleted",
                        "Your claim #"
                                + claimNumber
                                + " has been deleted.",
                        "CLAIM"
                );

            } catch (Exception e) {

                System.out.println(
                        "NOTIFICATION ERROR: "
                                + e.getClass().getSimpleName()
                                + " - "
                                + e.getMessage());
            }
        }
    }


    // =========================================================
    // COMMON METHOD
    // CREATE CLAIM NOTIFICATION
    // =========================================================

    private void createClaimNotification(
            User user,
            String title,
            String message,
            String type) {

        if (user == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: User is null.");
            return;
        }

        if (user.getUserId() == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: User ID is null.");
            return;
        }

        try {

            System.out.println(
                    "NOTIFICATION: Creating claim notification for user: "
                            + user.getUsername()
                            + " | userId="
                            + user.getUserId());

            notificationService.createNotification(
                    user,
                    title,
                    message,
                    type
            );

            System.out.println(
                    "NOTIFICATION: Successfully created -> "
                            + title);

        } catch (Exception e) {

            System.out.println(
                    "NOTIFICATION ERROR: "
                            + e.getClass().getSimpleName()
                            + " - "
                            + e.getMessage());
        }
    }


    // =========================================================
    // COMMON METHOD
    // NOTIFY CLAIM OWNER
    // =========================================================

    private void notifyClaimOwner(
            Claims claim,
            String title,
            String message,
            String type) {

        if (claim == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Claim is null.");
            return;
        }

        Policy policy =
                claim.getPolicy();

        if (policy == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Claim has no policy.");
            return;
        }

        PolicyHolder policyHolder =
                policy.getPolicyHolder();

        if (policyHolder == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Policy holder is null.");
            return;
        }

        User customer =
                policyHolder.getUser();

        if (customer == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Policy holder has no user.");
            return;
        }

        createClaimNotification(
                customer,
                title,
                message,
                type
        );
    }
}
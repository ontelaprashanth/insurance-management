
package com.htc.insurance.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dto.PolicyHolderDto;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.mapper.PolicyHolderMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PolicyHolderService {

    // ==========================================
    // DEPENDENCIES - LOMBOK CONSTRUCTOR INJECTION
    // ==========================================

    private final PolicyHolderDao policyHolderDao;
    private final PolicyHolderMapper mapper;

    // ==========================================
    // SAVE POLICY HOLDER
    // ==========================================

    public PolicyHolderDto savePolicyHolder(
            PolicyHolderDto policyHolderDto) {

        if (policyHolderDto == null) {
            throw new RuntimeException(
                    "Policy holder data is required.");
        }

        PolicyHolder policyHolder =
                mapper.convertPolicyHolderDtoToEntity(
                        policyHolderDto);

        PolicyHolder policyHolderDb =
                policyHolderDao.savePolicyHolder(
                        policyHolder);

        return mapper.convertPolicyHolderEntityToDto(
                policyHolderDb);
    }

    // ==========================================
    // GET ALL POLICY HOLDERS
    // ==========================================

    public List<PolicyHolderDto> getAllPolicyHolders() {

        List<PolicyHolder> policyHolders =
                policyHolderDao.getAllPolicyHolders();

        List<PolicyHolderDto> dtoList =
                new ArrayList<>();

        for (PolicyHolder policyHolder : policyHolders) {

            PolicyHolderDto dto =
                    mapper.convertPolicyHolderEntityToDto(
                            policyHolder);

            dtoList.add(dto);
        }

        return dtoList;
    }

    // ==========================================
    // GET POLICY HOLDER BY ID
    // ==========================================

    public PolicyHolderDto getPolicyHolderById(
            Long policyHolderId) {

        PolicyHolder policyHolder =
                policyHolderDao.getPolicyHolderById(
                        policyHolderId);

        if (policyHolder == null) {
            return null;
        }

        return mapper.convertPolicyHolderEntityToDto(
                policyHolder);
    }

    // ==========================================
    // UPDATE POLICY HOLDER
    // ==========================================

    public PolicyHolderDto updatePolicyHolder(
            Long policyHolderId,
            PolicyHolderDto policyHolderDto) {

        if (policyHolderDto == null) {
            throw new RuntimeException(
                    "Policy holder data is required.");
        }

        PolicyHolder existingPolicyHolder =
                policyHolderDao.getPolicyHolderById(
                        policyHolderId);

        if (existingPolicyHolder == null) {
            return null;
        }

        PolicyHolder policyHolder =
                mapper.convertPolicyHolderDtoToEntity(
                        policyHolderDto);

        // Preserve existing primary key
        policyHolder.setPolicyHolderId(
                policyHolderId);

        // Preserve existing user relationship
        policyHolder.setUser(
                existingPolicyHolder.getUser());

        PolicyHolder updatedPolicyHolder =
                policyHolderDao.updatePolicyHolder(
                        policyHolder);

        return mapper.convertPolicyHolderEntityToDto(
                updatedPolicyHolder);
    }

    // ==========================================
    // DELETE POLICY HOLDER
    // ==========================================

    public void deletePolicyHolder(
            Long policyHolderId) {

        PolicyHolder existingPolicyHolder =
                policyHolderDao.getPolicyHolderById(
                        policyHolderId);

        if (existingPolicyHolder == null) {
            throw new RuntimeException(
                    "Policy holder not found: " + policyHolderId);
        }

        policyHolderDao.deletePolicyHolder(
                policyHolderId);
    }

    // ==========================================
    // GET LOGGED-IN USER'S POLICY HOLDER
    // ==========================================

    public PolicyHolder getPolicyHolderByUsername(
            String username) {

        if (username == null || username.isBlank()) {
            return null;
        }

        return policyHolderDao
                .getPolicyHolderByUsername(username);
    }
}

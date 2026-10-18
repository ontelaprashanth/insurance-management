
package com.htc.insurance.mapper;

import java.time.LocalDate;

import org.springframework.stereotype.Component;

import com.htc.insurance.dto.PolicyDto;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;

@Component
public class PolicyMapper {

    public Policy convertPolicyDtoToEntity(PolicyDto dto) {

        if (dto == null) {
            return null;
        }

        Policy policy = new Policy();

        policy.setPolicyNumber(dto.getPolicyNumber());
        policy.setCoveredTypes(dto.getCoveredTypes());
        policy.setIsActive(dto.getIsActive());
        policy.setStartDate(dto.getStartDate());
        policy.setDurationYears(dto.getDurationYears());
        policy.setExpiryDate(dto.getExpiryDate());

        if (dto.getPolicyHolderId() != null) {
            PolicyHolder holder = new PolicyHolder();

            holder.setPolicyHolderId(dto.getPolicyHolderId());

            policy.setPolicyHolder(holder);
        }

        return policy;
    }

    public PolicyDto convertPolicyEntityToDto(Policy policy) {

        if (policy == null) {
            return null;
        }

        PolicyDto dto = new PolicyDto();

        dto.setPolicyNumber(policy.getPolicyNumber());
        dto.setCoveredTypes(policy.getCoveredTypes());
        dto.setIsActive(policy.getIsActive());
        dto.setStartDate(policy.getStartDate());
        dto.setDurationYears(policy.getDurationYears());
        dto.setExpiryDate(policy.getExpiryDate());

        if (policy.getPolicyHolder() != null) {
            dto.setPolicyHolderId(
                    policy.getPolicyHolder().getPolicyHolderId()
            );
        }

        // Determine the policy status for API responses.
        LocalDate today = LocalDate.now();
        LocalDate expiryDate = policy.getExpiryDate();

        if (expiryDate != null && !expiryDate.isAfter(today)) {

            // Expiry date is today or in the past.
            dto.setStatus("EXPIRED");

        } else if (!Boolean.TRUE.equals(policy.getIsActive())) {

            // Policy is manually deactivated or inactive.
            dto.setStatus("INACTIVE");

        } else {

            dto.setStatus("ACTIVE");
        }

        // Preserve the existing claims indicator.
        dto.setHasClaims(
                policy.getClaims() != null
                        && !policy.getClaims().isEmpty()
        );

        return dto;
    }
}

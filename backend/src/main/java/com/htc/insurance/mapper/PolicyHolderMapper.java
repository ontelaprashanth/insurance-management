
package com.htc.insurance.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.htc.insurance.dto.PolicyHolderDto;
import com.htc.insurance.entity.PolicyHolder;

@Mapper(componentModel = "spring")
public interface PolicyHolderMapper {

    // =========================================================
    // POLICY HOLDER DTO TO ENTITY
    // =========================================================

    @Mapping(
        target = "user.userId",
        source = "userId"
    )
    @Mapping(
        target = "policies",
        ignore = true
    )
    PolicyHolder convertPolicyHolderDtoToEntity(
            PolicyHolderDto policyHolderDto
    );

    // =========================================================
    // POLICY HOLDER ENTITY TO DTO
    // =========================================================

    @Mapping(
        target = "userId",
        source = "user.userId"
    )
    PolicyHolderDto convertPolicyHolderEntityToDto(
            PolicyHolder policyHolder
    );
}

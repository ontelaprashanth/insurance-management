package com.htc.insurance.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.htc.insurance.dto.PolicyHolderDto;
import com.htc.insurance.entity.PolicyHolder;

@Mapper(componentModel = "spring")
public interface PolicyHolderMapper {

    @Mapping(
        target = "user.userId",
        source = "userId"
    )
    @Mapping(
        target = "policies",
        ignore = true
    )
    PolicyHolder convertPolicyHolderDtoToEntity(
            PolicyHolderDto policyHolderDto);

    @Mapping(
        target = "userId",
        source = "user.userId"
    )
    PolicyHolderDto convertPolicyHolderEntityToDto(
            PolicyHolder policyHolder);
}
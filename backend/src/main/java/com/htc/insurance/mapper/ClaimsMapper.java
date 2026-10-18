package com.htc.insurance.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.htc.insurance.dto.ClaimsDto;
import com.htc.insurance.entity.Claims;

@Mapper(componentModel = "spring")
public interface ClaimsMapper {

    @Mapping(
        source = "policy.policyNumber",
        target = "policyNumber"
    )
    @Mapping(
        source = "reviewers",
        target = "reviewerId",
        ignore = true
    )
    ClaimsDto convertClaimsEntityToDto(
            Claims claims
    );

    @Mapping(
        source = "policyNumber",
        target = "policy",
        ignore = true
    )
    @Mapping(
        source = "reviewerId",
        target = "reviewers",
        ignore = true
    )
    @Mapping(
        target = "settlements",
        ignore = true
    )
    Claims convertClaimsDtoToEntity(
            ClaimsDto claimsDto
    );
}
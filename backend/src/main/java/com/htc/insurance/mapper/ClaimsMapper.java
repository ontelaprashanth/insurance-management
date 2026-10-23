
package com.htc.insurance.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.htc.insurance.dto.ClaimsDto;
import com.htc.insurance.entity.Claims;

@Mapper(componentModel = "spring")
public interface ClaimsMapper {

    // =========================================================
    // CLAIMS ENTITY TO DTO
    // =========================================================

    @Mapping(
        source = "policy.policyNumber",
        target = "policyNumber"
    )
    @Mapping(
        target = "reviewerId",
        ignore = true
    )
    ClaimsDto convertClaimsEntityToDto(
            Claims claims
    );

    // =========================================================
    // CLAIMS DTO TO ENTITY
    // =========================================================

    @Mapping(
        target = "policy",
        ignore = true
    )
    @Mapping(
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

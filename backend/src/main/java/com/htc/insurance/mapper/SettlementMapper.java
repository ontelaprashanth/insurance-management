
package com.htc.insurance.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.htc.insurance.dto.SettlementDto;
import com.htc.insurance.entity.Settlement;

@Mapper(componentModel = "spring")
public interface SettlementMapper {

    // =========================================================
    // SETTLEMENT ENTITY TO DTO
    // =========================================================

    @Mapping(
        source = "claim.claimNumber",
        target = "claimNumber"
    )
    SettlementDto toDto(
            Settlement settlement
    );

    // =========================================================
    // SETTLEMENT DTO TO ENTITY
    // =========================================================

    @Mapping(
        target = "claim",
        ignore = true
    )
    Settlement toEntity(
            SettlementDto settlementDto
    );
}

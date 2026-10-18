package com.htc.insurance.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.htc.insurance.dto.ReviewerDto;
import com.htc.insurance.entity.Reviewer;

@Mapper(componentModel = "spring")
public interface ReviewerMapper {

    @Mapping(target = "user", ignore = true)
    @Mapping(target = "claim", ignore = true)
    Reviewer convertReviewerDtoToEntity(
            ReviewerDto reviewerDto);

    @Mapping(source = "user.userId", target = "userId")
    @Mapping(source = "claim.claimNumber", target = "claimNumber")
    ReviewerDto convertReviewerEntityToDto(
            Reviewer reviewer);
}
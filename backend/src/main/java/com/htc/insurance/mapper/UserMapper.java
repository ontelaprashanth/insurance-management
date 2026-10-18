package com.htc.insurance.mapper;

import org.springframework.stereotype.Component;

import com.htc.insurance.dto.UserDto;
import com.htc.insurance.entity.User;

@Component
public class UserMapper {

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public User convertUserDtoToUserEntity(UserDto dto) {

        if (dto == null) {
            return null;
        }

        User user = new User();

        user.setUserId(dto.getUserId());
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setRole(dto.getRole());
        user.setIsActive(dto.getIsActive());
        user.setCreatedAt(dto.getCreatedAt());
        user.setExpiryDate(dto.getExpiryDate());
        user.setContactNumber(dto.getContactNumber());
        user.setOccupation(dto.getOccupation());
        user.setIncome(dto.getIncome());
        user.setAadharNumber(dto.getAadharNumber());
        user.setBankName(dto.getBankName());
        user.setAccountNumber(dto.getAccountNumber());
        user.setIfscCode(dto.getIfscCode());

        return user;
    }

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public UserDto convertUserEntityToUserDto(User user) {

        if (user == null) {
            return null;
        }

        UserDto dto = new UserDto();

        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());

        // Never expose encrypted password
        dto.setPassword(null);

        dto.setRole(user.getRole());
        dto.setIsActive(user.getIsActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setExpiryDate(user.getExpiryDate());
        dto.setContactNumber(user.getContactNumber());
        dto.setOccupation(user.getOccupation());
        dto.setIncome(user.getIncome());
        dto.setAadharNumber(user.getAadharNumber());
        dto.setBankName(user.getBankName());
        dto.setAccountNumber(user.getAccountNumber());
        dto.setIfscCode(user.getIfscCode());

        return dto;
    }
}
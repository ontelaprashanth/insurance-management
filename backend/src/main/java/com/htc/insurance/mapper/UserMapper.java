
package com.htc.insurance.mapper;

import org.springframework.stereotype.Component;

import com.htc.insurance.dto.UserDto;
import com.htc.insurance.entity.User;

@Component
public class UserMapper {

    // =========================================================
    // USER DTO TO ENTITY
    // =========================================================

    public User convertUserDtoToUserEntity(UserDto dto) {

        if (dto == null) {
            return null;
        }

        User user = new User();

        // =====================================================
        // USER IDENTIFICATION
        // =====================================================

        user.setUserId(dto.getUserId());

        // =====================================================
        // LOGIN INFORMATION
        // =====================================================

        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setRole(dto.getRole());

        // =====================================================
        // ACCOUNT STATUS
        // =====================================================

        user.setIsActive(dto.getIsActive());
        user.setCreatedAt(dto.getCreatedAt());
        user.setExpiryDate(dto.getExpiryDate());

        // =====================================================
        // CONTACT INFORMATION
        // =====================================================

        user.setContactNumber(dto.getContactNumber());

        // =====================================================
        // PERSONAL INFORMATION
        // =====================================================

        user.setOccupation(dto.getOccupation());
        user.setIncome(dto.getIncome());
        user.setAadharNumber(dto.getAadharNumber());

        // =====================================================
        // BANK INFORMATION
        // =====================================================

        user.setBankName(dto.getBankName());
        user.setAccountNumber(dto.getAccountNumber());
        user.setIfscCode(dto.getIfscCode());

        return user;
    }

    // =========================================================
    // USER ENTITY TO DTO
    // =========================================================

    public UserDto convertUserEntityToUserDto(User user) {

        if (user == null) {
            return null;
        }

        UserDto dto = new UserDto();

        // =====================================================
        // USER IDENTIFICATION
        // =====================================================

        dto.setUserId(user.getUserId());

        // =====================================================
        // LOGIN INFORMATION
        // =====================================================

        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());

        // Never expose encrypted passwords in API responses.
        dto.setPassword(null);

        dto.setRole(user.getRole());

        // =====================================================
        // ACCOUNT STATUS
        // =====================================================

        dto.setIsActive(user.getIsActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setExpiryDate(user.getExpiryDate());

        // =====================================================
        // CONTACT INFORMATION
        // =====================================================

        dto.setContactNumber(user.getContactNumber());

        // =====================================================
        // PERSONAL INFORMATION
        // =====================================================

        dto.setOccupation(user.getOccupation());
        dto.setIncome(user.getIncome());
        dto.setAadharNumber(user.getAadharNumber());

        // =====================================================
        // BANK INFORMATION
        // =====================================================

        dto.setBankName(user.getBankName());
        dto.setAccountNumber(user.getAccountNumber());
        dto.setIfscCode(user.getIfscCode());

        return dto;
    }
}

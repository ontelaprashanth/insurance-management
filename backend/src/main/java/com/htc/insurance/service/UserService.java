
package com.htc.insurance.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.PolicyHolderDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.ChangePasswordRequest;
import com.htc.insurance.dto.UserDto;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.User;
import com.htc.insurance.mapper.UserMapper;

@Service
public class UserService {

    private final UserDao userDao;
    private final UserMapper mapper;
    private final PasswordEncoder passwordEncoder;
    private final PolicyHolderDao policyHolderDao;

    public UserService(
            UserDao userDao,
            UserMapper mapper,
            PasswordEncoder passwordEncoder,
            PolicyHolderDao policyHolderDao) {

        this.userDao = userDao;
        this.mapper = mapper;
        this.passwordEncoder = passwordEncoder;
        this.policyHolderDao = policyHolderDao;
    }

    // =========================================================
    // SAVE USER
    // PUBLIC REGISTRATION
    // Creates USER and linked PolicyHolder in one transaction.
    // =========================================================

    @Transactional
    public UserDto saveUser(UserDto userDto) {

        if (userDto == null) {
            throw new IllegalArgumentException(
                    "User details are required."
            );
        }

        if (userDto.getPassword() == null
                || userDto.getPassword().isBlank()) {

            throw new IllegalArgumentException(
                    "Password is required."
            );
        }

        if (userDto.getUsername() == null
                || userDto.getUsername().isBlank()) {

            throw new IllegalArgumentException(
                    "Username is required."
            );
        }

        String username = userDto.getUsername().trim();

        if (userDao.existsByUsername(username)) {
            throw new IllegalArgumentException(
                    "Username already exists."
            );
        }

        if (userDto.getEmail() != null
                && !userDto.getEmail().isBlank()
                && userDao.existsByEmail(
                        userDto.getEmail().trim())) {

            throw new IllegalArgumentException(
                    "Email already exists."
            );
        }

        if (userDto.getContactNumber() != null
                && !userDto.getContactNumber().isBlank()
                && userDao.existsByContactNumber(
                        userDto.getContactNumber().trim())) {

            throw new IllegalArgumentException(
                    "Contact number already exists."
            );
        }

        // Create the user entity.
        User user =
                mapper.convertUserDtoToUserEntity(userDto);

        // Public registration always creates a USER.
        user.setRole("USER");

        LocalDateTime createdAt = LocalDateTime.now();

        user.setCreatedAt(createdAt);
        user.setExpiryDate(createdAt.plusYears(1));
        user.setIsActive(true);

        // Encode the password before saving.
        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        // Save user first to generate userId.
        User savedUser = userDao.saveUser(user);

        if (savedUser == null || savedUser.getUserId() == null) {
            throw new IllegalStateException(
                    "Unable to create the user account."
            );
        }

        // Create a policyholder profile linked to this user.
        PolicyHolder policyHolder =
                policyHolderDao.getPolicyHolderByUsername(
                        savedUser.getUsername()
                );

        if (policyHolder == null) {

            policyHolder = new PolicyHolder();

            // Initial display name; customer details can be updated later.
            policyHolder.setName(savedUser.getUsername());

            // Establish the users.user_id relationship.
            policyHolder.setUser(savedUser);

            // DOB remains null until a valid date is provided.
            policyHolder.setDob(null);

            policyHolderDao.savePolicyHolder(policyHolder);
        }

        // If profile creation fails, the transaction rolls back
        // the user insert as well.

        return mapper.convertUserEntityToUserDto(savedUser);
    }

    // =========================================================
    // UPDATE EXPIRY STATUS
    // =========================================================

    private void updateActiveStatus(User user) {

        if (user == null) {
            return;
        }

        if (user.getExpiryDate() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        if (now.isAfter(user.getExpiryDate())) {

            if (Boolean.TRUE.equals(user.getIsActive())) {
                user.setIsActive(false);
            }
        }
    }

    // =========================================================
    // ACTIVATE USER
    // ADMIN ONLY
    // =========================================================

    public UserDto activateUser(Long userId) {

        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required."
            );
        }

        User user = userDao.getUserById(userId);

        if (user == null) {
            throw new IllegalArgumentException(
                    "User not found."
            );
        }

        if (user.getExpiryDate() != null
                && LocalDateTime.now().isAfter(user.getExpiryDate())) {

            throw new IllegalArgumentException(
                    "This account has expired and cannot be activated."
            );
        }

        user.setIsActive(true);

        User updatedUser = userDao.updateUser(user);

        return mapper.convertUserEntityToUserDto(updatedUser);
    }

    // =========================================================
    // DEACTIVATE USER
    // ADMIN ONLY
    // =========================================================

    public UserDto deactivateUser(Long userId) {

        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required."
            );
        }

        User user = userDao.getUserById(userId);

        if (user == null) {
            throw new IllegalArgumentException(
                    "User not found."
            );
        }

        user.setIsActive(false);

        User updatedUser = userDao.updateUser(user);

        return mapper.convertUserEntityToUserDto(updatedUser);
    }

    // =========================================================
    // GET CURRENT LOGGED-IN USER
    // =========================================================

    public UserDto getCurrentUser(String username) {

        if (username == null || username.isBlank()) {
            return null;
        }

        User user = userDao.getUserByUsername(username.trim());

        if (user == null) {
            return null;
        }

        updateActiveStatus(user);

        userDao.updateUser(user);

        return mapper.convertUserEntityToUserDto(user);
    }

    // =========================================================
    // CHANGE CURRENT USER PASSWORD
    // =========================================================

    public void changePassword(
            String username,
            ChangePasswordRequest request) {

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated user could not be identified."
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Password change request is required."
            );
        }

        if (request.getCurrentPassword() == null
                || request.getCurrentPassword().isBlank()) {

            throw new IllegalArgumentException(
                    "Current password is required."
            );
        }

        if (request.getNewPassword() == null
                || request.getNewPassword().isBlank()) {

            throw new IllegalArgumentException(
                    "New password is required."
            );
        }

        User user = userDao.getUserByUsername(username.trim());

        if (user == null) {
            throw new IllegalArgumentException(
                    "User not found."
            );
        }

        updateActiveStatus(user);

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            userDao.updateUser(user);

            throw new IllegalArgumentException(
                    "Your account is inactive or expired."
            );
        }

        if (user.getPassword() == null
                || user.getPassword().isBlank()) {

            throw new IllegalArgumentException(
                    "Current password is not available."
            );
        }

        boolean currentPasswordMatches =
                passwordEncoder.matches(
                        request.getCurrentPassword(),
                        user.getPassword()
                );

        if (!currentPasswordMatches) {
            throw new IllegalArgumentException(
                    "Current password is incorrect."
            );
        }

        boolean samePassword =
                passwordEncoder.matches(
                        request.getNewPassword(),
                        user.getPassword()
                );

        if (samePassword) {
            throw new IllegalArgumentException(
                    "New password must be different from the current password."
            );
        }

        user.setPassword(
                passwordEncoder.encode(request.getNewPassword())
        );

        userDao.updateUser(user);
    }

    // =========================================================
    // GET USER BY ID
    // ADMIN ONLY
    // =========================================================

    public UserDto getUserById(Long userId) {

        if (userId == null) {
            return null;
        }

        User user = userDao.getUserById(userId);

        if (user == null) {
            return null;
        }

        updateActiveStatus(user);

        userDao.updateUser(user);

        return mapper.convertUserEntityToUserDto(user);
    }

    // =========================================================
    // GET ALL USERS
    // ADMIN ONLY
    // =========================================================

    public List<UserDto> getAllUsers() {

        List<User> users = userDao.getAllUsers();

        List<UserDto> dtoList = new ArrayList<>();

        if (users == null) {
            return dtoList;
        }

        for (User user : users) {

            if (user == null) {
                continue;
            }

            updateActiveStatus(user);

            userDao.updateUser(user);

            dtoList.add(
                    mapper.convertUserEntityToUserDto(user)
            );
        }

        return dtoList;
    }

    // =========================================================
    // UPDATE USER
    // ADMIN ONLY
    // =========================================================

    public UserDto updateUser(
            Long userId,
            UserDto userDto) {

        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required."
            );
        }

        if (userDto == null) {
            throw new IllegalArgumentException(
                    "User details are required."
            );
        }

        User existingUser = userDao.getUserById(userId);

        if (existingUser == null) {
            return null;
        }

        // Duplicate email check.
        if (userDto.getEmail() != null
                && !userDto.getEmail().isBlank()
                && !userDto.getEmail().equalsIgnoreCase(
                        existingUser.getEmail() == null
                                ? ""
                                : existingUser.getEmail())) {

            User emailUser =
                    userDao.getUserByEmail(userDto.getEmail().trim());

            if (emailUser != null
                    && !emailUser.getUserId().equals(userId)) {

                throw new IllegalArgumentException(
                        "Email already exists."
                );
            }
        }

        // Duplicate contact check.
        if (userDto.getContactNumber() != null
                && !userDto.getContactNumber().isBlank()
                && !userDto.getContactNumber().equals(
                        existingUser.getContactNumber())) {

            User contactUser =
                    userDao.getUserByContactNumber(
                            userDto.getContactNumber().trim()
                    );

            if (contactUser != null
                    && !contactUser.getUserId().equals(userId)) {

                throw new IllegalArgumentException(
                        "Contact number already exists."
                );
            }
        }

        updateActiveStatus(existingUser);

        User user =
                mapper.convertUserDtoToUserEntity(userDto);

        user.setUserId(userId);
        user.setUsername(existingUser.getUsername());
        user.setCreatedAt(existingUser.getCreatedAt());
        user.setExpiryDate(existingUser.getExpiryDate());
        user.setIsActive(existingUser.getIsActive());
        user.setRole(existingUser.getRole());

        if (userDto.getEmail() == null
                || userDto.getEmail().isBlank()) {
            user.setEmail(existingUser.getEmail());
        }

        if (userDto.getContactNumber() == null
                || userDto.getContactNumber().isBlank()) {
            user.setContactNumber(existingUser.getContactNumber());
        }

        if (userDto.getOccupation() == null
                || userDto.getOccupation().isBlank()) {
            user.setOccupation(existingUser.getOccupation());
        }

        if (userDto.getIncome() == null) {
            user.setIncome(existingUser.getIncome());
        }

        if (userDto.getAadharNumber() == null
                || userDto.getAadharNumber().isBlank()) {
            user.setAadharNumber(existingUser.getAadharNumber());
        }

        if (userDto.getBankName() == null
                || userDto.getBankName().isBlank()) {
            user.setBankName(existingUser.getBankName());
        }

        if (userDto.getAccountNumber() == null
                || userDto.getAccountNumber().isBlank()) {
            user.setAccountNumber(existingUser.getAccountNumber());
        }

        if (userDto.getIfscCode() == null
                || userDto.getIfscCode().isBlank()) {
            user.setIfscCode(existingUser.getIfscCode());
        }

        if (userDto.getPassword() != null
                && !userDto.getPassword().isBlank()) {

            user.setPassword(
                    passwordEncoder.encode(userDto.getPassword())
            );
        } else {
            user.setPassword(existingUser.getPassword());
        }

        user.setReviewers(existingUser.getReviewers());

        User updatedUser = userDao.updateUser(user);

        return mapper.convertUserEntityToUserDto(updatedUser);
    }

    // =========================================================
    // UPDATE CURRENT LOGGED-IN USER PROFILE
    // =========================================================

    public UserDto updateCurrentUser(
            String username,
            UserDto userDto) {

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated user could not be identified."
            );
        }

        if (userDto == null) {
            throw new IllegalArgumentException(
                    "User details are required."
            );
        }

        User existingUser =
                userDao.getUserByUsername(username.trim());

        if (existingUser == null) {
            return null;
        }

        updateActiveStatus(existingUser);

        if (!Boolean.TRUE.equals(existingUser.getIsActive())) {
            userDao.updateUser(existingUser);

            throw new IllegalArgumentException(
                    "Your account is inactive or expired."
            );
        }

        // Duplicate email check.
        if (userDto.getEmail() != null
                && !userDto.getEmail().isBlank()
                && !userDto.getEmail().equalsIgnoreCase(
                        existingUser.getEmail() == null
                                ? ""
                                : existingUser.getEmail())) {

            User emailUser =
                    userDao.getUserByEmail(userDto.getEmail().trim());

            if (emailUser != null
                    && !emailUser.getUserId().equals(
                            existingUser.getUserId())) {

                throw new IllegalArgumentException(
                        "Email already exists."
                );
            }
        }

        // Duplicate contact check.
        if (userDto.getContactNumber() != null
                && !userDto.getContactNumber().isBlank()
                && !userDto.getContactNumber().equals(
                        existingUser.getContactNumber())) {

            User contactUser =
                    userDao.getUserByContactNumber(
                            userDto.getContactNumber().trim()
                    );

            if (contactUser != null
                    && !contactUser.getUserId().equals(
                            existingUser.getUserId())) {

                throw new IllegalArgumentException(
                        "Contact number already exists."
                );
            }
        }

        User updatedUser =
                mapper.convertUserDtoToUserEntity(userDto);

        updatedUser.setUserId(existingUser.getUserId());
        updatedUser.setUsername(existingUser.getUsername());

        if (userDto.getEmail() == null
                || userDto.getEmail().isBlank()) {
            updatedUser.setEmail(existingUser.getEmail());
        }

        if (userDto.getContactNumber() == null
                || userDto.getContactNumber().isBlank()) {
            updatedUser.setContactNumber(existingUser.getContactNumber());
        }

        if (userDto.getOccupation() == null
                || userDto.getOccupation().isBlank()) {
            updatedUser.setOccupation(existingUser.getOccupation());
        }

        if (userDto.getIncome() == null) {
            updatedUser.setIncome(existingUser.getIncome());
        }

        if (userDto.getAadharNumber() == null
                || userDto.getAadharNumber().isBlank()) {
            updatedUser.setAadharNumber(existingUser.getAadharNumber());
        }

        if (userDto.getBankName() == null
                || userDto.getBankName().isBlank()) {
            updatedUser.setBankName(existingUser.getBankName());
        }

        if (userDto.getAccountNumber() == null
                || userDto.getAccountNumber().isBlank()) {
            updatedUser.setAccountNumber(existingUser.getAccountNumber());
        }

        if (userDto.getIfscCode() == null
                || userDto.getIfscCode().isBlank()) {
            updatedUser.setIfscCode(existingUser.getIfscCode());
        }

        updatedUser.setRole(existingUser.getRole());
        updatedUser.setCreatedAt(existingUser.getCreatedAt());
        updatedUser.setExpiryDate(existingUser.getExpiryDate());
        updatedUser.setIsActive(existingUser.getIsActive());

        // Profile updates never change the password.
        updatedUser.setPassword(existingUser.getPassword());

        updatedUser.setReviewers(existingUser.getReviewers());

        User savedUser = userDao.updateUser(updatedUser);

        return mapper.convertUserEntityToUserDto(savedUser);
    }

    // =========================================================
    // DELETE USER
    // ADMIN ONLY
    // =========================================================

    public void deleteUser(Long userId) {

        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required."
            );
        }

        User existingUser = userDao.getUserById(userId);

        if (existingUser == null) {
            throw new IllegalArgumentException(
                    "User not found."
            );
        }

        userDao.deleteUser(userId);
    }
}

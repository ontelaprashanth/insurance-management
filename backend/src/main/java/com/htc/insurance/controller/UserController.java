
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.ChangePasswordRequest;
import com.htc.insurance.dto.UserDto;
import com.htc.insurance.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // =========================================================
    // PUBLIC - REGISTER USER
    // =========================================================

    @PostMapping("/save")
    @Operation(
            summary = "Register new user",
            description = "Public endpoint. New users automatically receive USER role."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "User registered successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid user data"
            )
    })
    public ResponseEntity<?> saveUser(
            @Valid @RequestBody UserDto userDto) {

        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(userService.saveUser(userDto));

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // USER - GET MY PROFILE
    // =========================================================

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    @Operation(
            summary = "Get logged-in user profile",
            description = "Returns the profile of the currently authenticated USER."
    )
    public ResponseEntity<UserDto> getMyProfile(
            Authentication authentication) {

        return userResponse(
                userService.getCurrentUser(authentication.getName())
        );
    }

    // =========================================================
    // USER - UPDATE MY PROFILE
    // =========================================================

    @PutMapping("/me")
    @PreAuthorize("hasRole('USER')")
    @Operation(
            summary = "Update logged-in user profile",
            description = "Allows a USER to update only their own profile."
    )
    public ResponseEntity<?> updateMyProfile(
            @Valid @RequestBody UserDto userDto,
            Authentication authentication) {

        try {
            return userResponse(
                    userService.updateCurrentUser(
                            authentication.getName(),
                            userDto
                    )
            );

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // USER - CHANGE PASSWORD
    // =========================================================

    @PutMapping("/me/password")
    @PreAuthorize("hasRole('USER')")
    @Operation(
            summary = "Change logged-in user's password",
            description = "Changes the password after verifying the current password."
    )
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        try {
            userService.changePassword(
                    authentication.getName(),
                    request
            );

            return success("Password changed successfully");

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // ADMIN - GET USER BY ID
    // =========================================================

    @GetMapping("/get/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Get user by ID",
            description = "Only ADMIN users can access this endpoint."
    )
    public ResponseEntity<UserDto> getUserById(
            @PathVariable Long userId) {

        return userResponse(userService.getUserById(userId));
    }

    // =========================================================
    // ADMIN - GET ALL USERS
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Get all users",
            description = "Only ADMIN users can access this endpoint."
    )
    public ResponseEntity<List<UserDto>> getAllUsers() {

        return ResponseEntity.ok(userService.getAllUsers());
    }

    // =========================================================
    // ADMIN - UPDATE USER
    // =========================================================

    @PutMapping("/update/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Update user",
            description = "Only ADMIN users can update users."
    )
    public ResponseEntity<?> updateUser(
            @PathVariable Long userId,
            @Valid @RequestBody UserDto userDto) {

        try {
            return userResponse(
                    userService.updateUser(userId, userDto)
            );

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // ADMIN - ACTIVATE USER
    // =========================================================

    @PutMapping("/activate/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Activate user",
            description = "Activates a user account. Expired accounts cannot be activated."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "User activated successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Account cannot be activated"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN role required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "User not found"
            )
    })
    public ResponseEntity<?> activateUser(
            @PathVariable Long userId) {

        try {
            userService.activateUser(userId);

            return success("User account activated successfully.");

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // ADMIN - DEACTIVATE USER
    // =========================================================

    @PutMapping("/deactivate/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Deactivate user",
            description = "Deactivates a user account."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "User deactivated successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid user ID"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN role required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "User not found"
            )
    })
    public ResponseEntity<?> deactivateUser(
            @PathVariable Long userId) {

        try {
            userService.deactivateUser(userId);

            return success("User account deactivated successfully.");

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // ADMIN - DELETE USER
    // =========================================================

    @DeleteMapping("/delete/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Delete user",
            description = "Only ADMIN users can delete users."
    )
    public ResponseEntity<?> deleteUser(
            @PathVariable Long userId) {

        try {
            userService.deleteUser(userId);

            return success("User deleted successfully");

        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // SHARED USER RESPONSE
    // =========================================================

    private ResponseEntity<UserDto> userResponse(UserDto user) {

        return user == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(user);
    }

    // =========================================================
    // SHARED SUCCESS RESPONSE
    // =========================================================

    private ResponseEntity<Map<String, Object>> success(
            String message) {

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", message
                )
        );
    }

    // =========================================================
    // SHARED BAD REQUEST RESPONSE
    // =========================================================

    private ResponseEntity<Map<String, Object>> badRequest(
            String message) {

        String safeMessage =
                message != null && !message.isBlank()
                        ? message
                        : "Invalid request";

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        Map.of(
                                "success", false,
                                "message", safeMessage
                        )
                );
    }
}

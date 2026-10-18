package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.ChangePasswordRequest;
import com.htc.insurance.dto.UserDto;
import com.htc.insurance.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // =========================================================
    // REGISTER USER
    // PUBLIC
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

            UserDto savedUser =
                    userService.saveUser(userDto);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(savedUser);

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // GET MY PROFILE
    // USER ONLY
    // =========================================================

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    @Operation(
            summary = "Get logged-in user profile",
            description = "Returns the profile of the currently authenticated USER."
    )
    public ResponseEntity<UserDto> getMyProfile(
            Authentication authentication) {

        UserDto user =
                userService.getCurrentUser(
                        authentication.getName()
                );

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(user);
    }

    // =========================================================
    // UPDATE MY PROFILE
    // USER ONLY
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

            UserDto updated =
                    userService.updateCurrentUser(
                            authentication.getName(),
                            userDto
                    );

            if (updated == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(updated);

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // CHANGE PASSWORD
    // USER ONLY
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

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "Password changed successfully"
                    )
            );

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // GET USER BY ID
    // ADMIN ONLY
    // =========================================================

    @GetMapping("/get/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Get user by ID",
            description = "Only ADMIN users can access this endpoint."
    )
    public ResponseEntity<UserDto> getUserById(
            @PathVariable Long userId) {

        UserDto user =
                userService.getUserById(userId);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(user);
    }

    // =========================================================
    // GET ALL USERS
    // ADMIN ONLY
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Get all users",
            description = "Only ADMIN users can access this endpoint."
    )
    public ResponseEntity<List<UserDto>> getAllUsers() {

        return ResponseEntity.ok(
                userService.getAllUsers()
        );
    }

    // =========================================================
    // UPDATE USER
    // ADMIN ONLY
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

            UserDto updatedUser =
                    userService.updateUser(
                            userId,
                            userDto
                    );

            if (updatedUser == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(updatedUser);

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // ACTIVATE USER
    // ADMIN ONLY
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

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "User account activated successfully."
                    )
            );

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // DEACTIVATE USER
    // ADMIN ONLY
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

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "User account deactivated successfully."
                    )
            );

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // DELETE USER
    // ADMIN ONLY
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

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "User deleted successfully"
                    )
            );

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());
        }
    }

    // =========================================================
    // BAD REQUEST
    // =========================================================

    private ResponseEntity<Map<String, Object>> badRequest(
            String message) {

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(
                        Map.of(
                                "success", false,
                                "message",
                                message != null
                                        && !message.isBlank()
                                        ? message
                                        : "Invalid request"
                        )
                );
    }
}
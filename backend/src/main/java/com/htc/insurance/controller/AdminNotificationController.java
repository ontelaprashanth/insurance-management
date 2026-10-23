
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.NotificationDto;
import com.htc.insurance.service.AdminNotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    // =========================================================
    // GET ALL CUSTOMERS
    // =========================================================

    @GetMapping("/customers")
    public ResponseEntity<?> getCustomers() {
        return ResponseEntity.ok(
                adminNotificationService.getCustomers()
        );
    }

    // =========================================================
    // GET NOTIFICATION HISTORY
    // =========================================================

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getHistory() {
        return ResponseEntity.ok(
                adminNotificationService.getHistory()
        );
    }

    // =========================================================
    // SEND ADMIN BROADCAST
    // =========================================================

    @PostMapping
    public ResponseEntity<?> send(
            @RequestBody Map<String, Object> request) {

        try {
            return ResponseEntity.ok(
                    adminNotificationService.send(request)
            );

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", exception.getMessage())
            );
        }
    }

    // =========================================================
    // DELETE NOTIFICATION
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {

        try {
            adminNotificationService.delete(id);

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Notification deleted successfully."
                    )
            );

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("message", exception.getMessage())
            );
        }
    }
}

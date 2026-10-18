
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.NotificationDto;
import com.htc.insurance.service.AdminNotificationService;

@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasRole('ADMIN')")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    public AdminNotificationController(
            AdminNotificationService adminNotificationService) {
        this.adminNotificationService = adminNotificationService;
    }

    // GET /api/admin/notifications/customers
    @GetMapping("/customers")
    public ResponseEntity<?> getCustomers() {
        return ResponseEntity.ok(
                adminNotificationService.getCustomers());
    }

    // GET /api/admin/notifications
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getHistory() {
        return ResponseEntity.ok(
                adminNotificationService.getHistory());
    }

    // POST /api/admin/notifications
    @PostMapping
    public ResponseEntity<?> send(
            @RequestBody Map<String, Object> request) {
        try {
            return ResponseEntity.ok(
                    adminNotificationService.send(request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", exception.getMessage()));
        }
    }

    // DELETE /api/admin/notifications/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id) {
        try {
            adminNotificationService.delete(id);

            return ResponseEntity.ok(
                    Map.of("message", "Notification deleted successfully."));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("message", exception.getMessage()));
        }
    }
}

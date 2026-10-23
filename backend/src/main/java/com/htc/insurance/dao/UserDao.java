
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.User;
import com.htc.insurance.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class UserDao {

    private final UserRepository repository;

    // =========================================================
    // SAVE USER
    // =========================================================

    public User saveUser(User user) {
        return repository.save(user);
    }

    // =========================================================
    // GET USER BY ID
    // =========================================================

    public User getUserById(Long userId) {
        return repository.findById(userId)
                .orElse(null);
    }

    // =========================================================
    // GET ALL USERS
    // =========================================================

    public List<User> getAllUsers() {
        return repository.findAll();
    }

    // =========================================================
    // UPDATE USER
    // =========================================================

    public User updateUser(User user) {
        return repository.save(user);
    }

    // =========================================================
    // DELETE USER
    // =========================================================

    public void deleteUser(Long userId) {
        repository.deleteById(userId);
    }

    // =========================================================
    // GET USER BY USERNAME
    // =========================================================

    public User getUserByUsername(String username) {
        return repository.findByUsername(username)
                .orElse(null);
    }

    // =========================================================
    // GET USER BY EMAIL
    // =========================================================

    public User getUserByEmail(String email) {
        return repository.findByEmail(email)
                .orElse(null);
    }

    // =========================================================
    // GET USER BY CONTACT NUMBER
    // =========================================================

    public User getUserByContactNumber(String contactNumber) {
        return repository.findByContactNumber(contactNumber)
                .orElse(null);
    }

    // =========================================================
    // CHECK USERNAME
    // =========================================================

    public boolean existsByUsername(String username) {
        return repository.existsByUsername(username);
    }

    // =========================================================
    // CHECK EMAIL
    // =========================================================

    public boolean existsByEmail(String email) {
        return repository.existsByEmail(email);
    }

    // =========================================================
    // CHECK CONTACT NUMBER
    // =========================================================

    public boolean existsByContactNumber(String contactNumber) {
        return repository.existsByContactNumber(contactNumber);
    }
}

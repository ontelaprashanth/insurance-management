package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.PaymentAttempt;
import com.htc.insurance.entity.PaymentAttemptStatus;

@Repository
public interface PaymentAttemptRepository
        extends JpaRepository<PaymentAttempt, Long> {

    Optional<PaymentAttempt> findByAttemptReference(
        String attemptReference
    );

    Optional<PaymentAttempt> findByRazorpayOrderId(
        String razorpayOrderId
    );

    Optional<PaymentAttempt> findByRazorpayPaymentId(
        String razorpayPaymentId
    );

    List<PaymentAttempt> findByUsernameOrderByCreatedAtDesc(
        String username
    );

    List<PaymentAttempt> findByStatusInOrderByCreatedAtAsc(
        List<PaymentAttemptStatus> statuses
    );

    boolean existsByRazorpayOrderId(String razorpayOrderId);

    boolean existsByRazorpayPaymentId(String razorpayPaymentId);
}

package com.htc.insurance.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.RefundAttempt;
import com.htc.insurance.entity.RefundAttemptStatus;

@Repository
public interface RefundAttemptRepository
        extends JpaRepository<RefundAttempt, Long> {

    Optional<RefundAttempt> findByPurchaseId(Long purchaseId);

    Optional<RefundAttempt> findByRazorpayRefundId(
            String razorpayRefundId);

    List<RefundAttempt> findByStatusInOrderByCreatedAtAsc(
            List<RefundAttemptStatus> statuses);

    boolean existsByPurchaseId(Long purchaseId);
}

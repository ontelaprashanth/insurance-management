
import { api } from './client'

/* =========================================================
   INSUREX — CENTRAL API ENDPOINTS

   Authentication
   Users
   Insurance Plans
   Policies
   Purchases & Refunds
   Payments
   Policy Holders
   Claims
   Settlements
   Reviews
   Notifications
   Admin Broadcast
========================================================= */

/* =========================================================
   COMMON HELPERS
========================================================= */

const d = (promise) =>
  promise.then((response) => response.data)

const id = (value) =>
  encodeURIComponent(String(value))

/* =========================================================
   AUTHENTICATION
========================================================= */

export const auth = {
  login: (body) =>
    d(api.post('/api/auth/login', body)),

  sendOtp: (identifier) =>
    d(
      api.post('/api/auth/send-otp', {
        identifier,
      }),
    ),

  verifyOtp: (body) =>
    d(api.post('/api/auth/verify-otp', body)),

  forgotPassword: (identifier) =>
    d(
      api.post('/api/auth/forgot-password', {
        identifier,
      }),
    ),

  resetPassword: (body) =>
    d(api.post('/api/auth/reset-password', body)),

  session: () =>
    d(api.get('/api/session')),
}

/* =========================================================
   USERS

   Customer Profile
   Admin User Management
========================================================= */

export const users = {
  // Register new user
  register: (body) =>
    d(api.post('/user/save', body)),

  // Current logged-in user
  me: () =>
    d(api.get('/user/me')),

  // Update current user
  updateMe: (body) =>
    d(api.put('/user/me', body)),

  // Change password
  changePassword: (body) =>
    d(api.put('/user/me/password', body)),

  // Admin: all users
  getAll: () =>
    d(api.get('/user/getAll')),

  // Admin: get user
  get: (userId) =>
    d(api.get(`/user/get/${id(userId)}`)),

  // Admin: update user
  update: (userId, body) =>
    d(
      api.put(
        `/user/update/${id(userId)}`,
        body,
      ),
    ),

  // Admin: activate user
  activate: (userId) =>
    d(api.put(`/user/activate/${id(userId)}`)),

  // Admin: deactivate user
  deactivate: (userId) =>
    d(api.put(`/user/deactivate/${id(userId)}`)),

  // Admin: delete user
  remove: (userId) =>
    d(api.delete(`/user/delete/${id(userId)}`)),
}

/* =========================================================
   INSURANCE PLANS

   Health
   Life
   Motor
   Other Insurance Types
========================================================= */

export const plans = {
  available: () =>
    d(api.get('/api/plans/available')),

  get: (planId) =>
    d(api.get(`/api/plans/${id(planId)}`)),
}

/* =========================================================
   POLICIES

   Customer Policies
   Admin Policy Management
========================================================= */

export const policies = {
  // Available insurance policies
  available: () =>
    d(api.get('/policy/available')),

  // Logged-in user's policies
  mine: () =>
    d(api.get('/policy/my-policies')),

  // Admin: all policies
  getAll: () =>
    d(api.get('/policy/getAll')),

  // Get policy by number
  get: (policyNumber) =>
    d(
      api.get(
        `/policy/get/${id(policyNumber)}`,
      ),
    ),

  // Admin: create policy
  save: (body) =>
    d(api.post('/policy/save', body)),

  // Admin: update policy
  update: (policyNumber, body) =>
    d(
      api.put(
        `/policy/update/${id(policyNumber)}`,
        body,
      ),
    ),

  // Admin: delete policy
  remove: (policyNumber) =>
    d(
      api.delete(
        `/policy/delete/${id(policyNumber)}`,
      ),
    ),

  // Admin: activate policy
  activate: (policyNumber) =>
    d(
      api.put(
        `/policy/activate/${id(policyNumber)}`,
      ),
    ),

  // Admin: deactivate policy
  deactivate: (policyNumber) =>
    d(
      api.put(
        `/policy/deactivate/${id(policyNumber)}`,
      ),
    ),
}

/* =========================================================
   POLICY PURCHASES AND REFUNDS

   Confirmed RefundController:
     @RequestMapping("/refund")
     @PostMapping("/request")

   Confirmed RefundRequestDto:
     Long purchaseId
     String refundReason

   Refund reason:
     Required
     Maximum 500 characters
========================================================= */

export const purchases = {
  // Customer: purchase insurance
  purchase: (body) =>
    d(api.post('/policy/purchase', body)),

  // Customer: my purchases
  mine: () =>
    d(api.get('/policy/my-purchases')),

  // Admin: all purchases
  getAll: () =>
    d(api.get('/policy/purchases')),

  // Customer: request full refund
  refund: (purchaseId, body) => {
    const parsedPurchaseId = Number(purchaseId)

    const refundReason = String(
      body?.refundReason ?? '',
    ).trim()

    // Validate purchase ID
    if (
      !Number.isSafeInteger(parsedPurchaseId) ||
      parsedPurchaseId <= 0
    ) {
      return Promise.reject(
        new Error(
          'A valid purchase ID is required.',
        ),
      )
    }

    // Match RefundRequestDto validation
    if (!refundReason) {
      return Promise.reject(
        new Error(
          'Refund reason is required.',
        ),
      )
    }

    if (refundReason.length > 500) {
      return Promise.reject(
        new Error(
          'Refund reason must not exceed 500 characters.',
        ),
      )
    }

    // Correct backend endpoint
    return d(
      api.post('/refund/request', {
        purchaseId: parsedPurchaseId,
        refundReason,
      }),
    )
  },
}

/* =========================================================
   PAYMENTS

   Razorpay Order Creation
   Payment Verification
========================================================= */

export const payment = {
  // Create Razorpay order
  createOrder: (body) =>
    d(api.post('/payment/create-order', body)),

  // Verify Razorpay payment
  verify: (body) =>
    d(api.post('/payment/verify', body)),
}

/* =========================================================
   POLICY HOLDERS
========================================================= */

export const policyHolders = {
  // Get all policy holders
  getAll: () =>
    d(api.get('/policyholder/getAll')),

  // Get policy holder by ID
  get: (policyHolderId) =>
    d(
      api.get(
        `/policyholder/get/${id(policyHolderId)}`,
      ),
    ),

  // Create policy holder
  save: (body) =>
    d(api.post('/policyholder/save', body)),

  // Update policy holder
  update: (policyHolderId, body) =>
    d(
      api.put(
        `/policyholder/update/${id(policyHolderId)}`,
        body,
      ),
    ),

  // Delete policy holder
  remove: (policyHolderId) =>
    d(
      api.delete(
        `/policyholder/delete/${id(policyHolderId)}`,
      ),
    ),
}

/* =========================================================
   CLAIMS

   Customer Claim Submission
   Admin Claim Management
========================================================= */

export const claims = {
  // Customer: submit claim
  save: (body) =>
    d(api.post('/claims/save', body)),

  // Customer: my claims
  mine: () =>
    d(api.get('/claims/my-claims')),

  // Admin: all claims
  getAll: () =>
    d(api.get('/claims/getAll')),

  // Get claim by number
  get: (claimNumber) =>
    d(
      api.get(
        `/claims/get/${id(claimNumber)}`,
      ),
    ),

  // Admin: update claim
  update: (claimNumber, body) =>
    d(
      api.put(
        `/claims/update/${id(claimNumber)}`,
        body,
      ),
    ),

  // Admin: approve claim
  approve: (claimNumber, body) =>
    d(
      api.put(
        `/claims/approve/${id(claimNumber)}`,
        body,
      ),
    ),

  // Admin: reject claim
  reject: (claimNumber, body) =>
    d(
      api.put(
        `/claims/reject/${id(claimNumber)}`,
        body,
      ),
    ),

  // Admin: delete claim
  remove: (claimNumber) =>
    d(
      api.delete(
        `/claims/delete/${id(claimNumber)}`,
      ),
    ),
}

/* =========================================================
   SETTLEMENTS

   Admin Settlement Management
========================================================= */

export const settlements = {
  // Admin: all settlements
  getAll: () =>
    d(api.get('/settlement/getAll')),

  // Get settlement by number
  get: (settlementNumber) =>
    d(
      api.get(
        `/settlement/get/${id(settlementNumber)}`,
      ),
    ),

  // Get settlements by claim
  byClaim: (claimNumber) =>
    d(
      api.get(
        `/settlement/claim/${id(claimNumber)}`,
      ),
    ),

  // Admin: create settlement
  save: (body) =>
    d(api.post('/settlement/save', body)),

  // Admin: update settlement
  update: (settlementNumber, body) =>
    d(
      api.put(
        `/settlement/update/${id(settlementNumber)}`,
        body,
      ),
    ),

  // Admin: process settlement
  process: (settlementNumber) =>
    d(
      api.put(
        `/settlement/process/${id(settlementNumber)}`,
      ),
    ),

  // Admin: reject settlement
  reject: (settlementNumber, rejectionReason) =>
    d(
      api.put(
        `/settlement/reject/${id(settlementNumber)}`,
        {
          rejectionReason,
        },
      ),
    ),

  // Admin: delete settlement
  remove: (settlementNumber) =>
    d(
      api.delete(
        `/settlement/delete/${id(settlementNumber)}`,
      ),
    ),
}

/* =========================================================
   REVIEWS

   Customer Reviews
   Admin Replies
========================================================= */

export const reviews = {
  // Customer: create review
  save: (body) =>
    d(api.post('/reviewer/save', body)),

  // Customer: my reviews
  mine: () =>
    d(api.get('/reviewer/my-reviews')),

  // Admin: all reviews
  getAll: () =>
    d(api.get('/reviewer/getAll')),

  // Get review by ID
  get: (reviewId) =>
    d(
      api.get(
        `/reviewer/get/${id(reviewId)}`,
      ),
    ),

  // Update review
  update: (reviewId, body) =>
    d(
      api.put(
        `/reviewer/update/${id(reviewId)}`,
        body,
      ),
    ),

  // Admin: reply to review
  reply: (reviewId, body) =>
    d(
      api.put(
        `/reviewer/reply/${id(reviewId)}`,
        body,
      ),
    ),

  // Delete review
  remove: (reviewId) =>
    d(
      api.delete(
        `/reviewer/delete/${id(reviewId)}`,
      ),
    ),
}

/* =========================================================
   CUSTOMER NOTIFICATIONS

   Personal Notifications
   Read / Unread
========================================================= */

export const notifications = {
  // Get my notifications
  mine: () =>
    d(api.get('/api/notifications/my')),

  // Get unread notification count
  unread: () =>
    d(api.get('/api/notifications/unread-count')),

  // Mark notification as read
  read: (notificationId) =>
    d(
      api.put(
        `/api/notifications/read/${id(notificationId)}`,
      ),
    ),

  // Mark all notifications as read
  readAll: () =>
    d(api.put('/api/notifications/read-all')),

  // Delete notification
  remove: (notificationId) =>
    d(
      api.delete(
        `/api/notifications/${id(notificationId)}`,
      ),
    ),
}

/* =========================================================
   ADMIN BROADCAST NOTIFICATIONS

   Customer List
   Broadcast Message
   Notification History
========================================================= */

export const broadcast = {
  // Admin: send broadcast
  send: (body) =>
    d(
      api.post(
        '/api/admin/notifications',
        body,
      ),
    ),

  // Admin: get customers
  customers: () =>
    d(
      api.get(
        '/api/admin/notifications/customers',
      ),
    ),

  // Admin: broadcast history
  list: () =>
    d(
      api.get(
        '/api/admin/notifications',
      ),
    ),

  // Admin: delete broadcast
  remove: (notificationId) =>
    d(
      api.delete(
        `/api/admin/notifications/${id(notificationId)}`,
      ),
    ),
}

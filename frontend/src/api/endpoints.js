
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
========================================================= */

export const users = {
  register: (body) =>
    d(api.post('/user/save', body)),

  me: () =>
    d(api.get('/user/me')),

  updateMe: (body) =>
    d(api.put('/user/me', body)),

  changePassword: (body) =>
    d(api.put('/user/me/password', body)),

  getAll: () =>
    d(api.get('/user/getAll')),

  get: (userId) =>
    d(api.get(`/user/get/${id(userId)}`)),

  update: (userId, body) =>
    d(
      api.put(
        `/user/update/${id(userId)}`,
        body,
      ),
    ),

  activate: (userId) =>
    d(api.put(`/user/activate/${id(userId)}`)),

  deactivate: (userId) =>
    d(api.put(`/user/deactivate/${id(userId)}`)),

  remove: (userId) =>
    d(api.delete(`/user/delete/${id(userId)}`)),
}

/* =========================================================
   INSURANCE PLANS
========================================================= */

export const plans = {
  available: () =>
    d(api.get('/api/plans/available')),

  get: (planId) =>
    d(api.get(`/api/plans/${id(planId)}`)),
}

/* =========================================================
   POLICIES
========================================================= */

export const policies = {
  available: () =>
    d(api.get('/policy/available')),

  mine: () =>
    d(api.get('/policy/my-policies')),

  getAll: () =>
    d(api.get('/policy/getAll')),

  get: (policyNumber) =>
    d(
      api.get(
        `/policy/get/${id(policyNumber)}`,
      ),
    ),

  save: (body) =>
    d(api.post('/policy/save', body)),

  update: (policyNumber, body) =>
    d(
      api.put(
        `/policy/update/${id(policyNumber)}`,
        body,
      ),
    ),

  remove: (policyNumber) =>
    d(
      api.delete(
        `/policy/delete/${id(policyNumber)}`,
      ),
    ),

  activate: (policyNumber) =>
    d(
      api.put(
        `/policy/activate/${id(policyNumber)}`,
      ),
    ),

  deactivate: (policyNumber) =>
    d(
      api.put(
        `/policy/deactivate/${id(policyNumber)}`,
      ),
    ),
}

/* =========================================================
   POLICY PURCHASES & REFUNDS

   Backend:
   GET  /policy/my-purchases
   GET  /policy/purchases
   POST /policy/purchase
   POST /refund/request

   RefundRequestDto:
   {
     purchaseId: Long,
     refundReason: String
   }
========================================================= */

export const purchases = {
  // Customer: purchase insurance
  purchase: (body) =>
    d(api.post('/policy/purchase', body)),

  // Customer: purchase history
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

    if (
      !Number.isSafeInteger(parsedPurchaseId) ||
      parsedPurchaseId <= 0
    ) {
      return Promise.reject(
        new Error('A valid purchase ID is required.'),
      )
    }

    if (!refundReason) {
      return Promise.reject(
        new Error('Refund reason is required.'),
      )
    }

    if (refundReason.length > 500) {
      return Promise.reject(
        new Error(
          'Refund reason must not exceed 500 characters.',
        ),
      )
    }

    return d(
      api.post('/refund/request', {
        purchaseId: parsedPurchaseId,
        refundReason,
      }),
    )
  },
}

/* =========================================================
   PAYMENTS — RAZORPAY
========================================================= */

export const payment = {
  createOrder: (body) =>
    d(api.post('/payment/create-order', body)),

  verify: (body) =>
    d(api.post('/payment/verify', body)),
}

/* =========================================================
   POLICY HOLDERS
========================================================= */

export const policyHolders = {
  getAll: () =>
    d(api.get('/policyholder/getAll')),

  get: (policyHolderId) =>
    d(
      api.get(
        `/policyholder/get/${id(policyHolderId)}`,
      ),
    ),

  save: (body) =>
    d(api.post('/policyholder/save', body)),

  update: (policyHolderId, body) =>
    d(
      api.put(
        `/policyholder/update/${id(policyHolderId)}`,
        body,
      ),
    ),

  remove: (policyHolderId) =>
    d(
      api.delete(
        `/policyholder/delete/${id(policyHolderId)}`,
      ),
    ),
}

/* =========================================================
   CLAIMS
========================================================= */

export const claims = {
  save: (body) =>
    d(api.post('/claims/save', body)),

  mine: () =>
    d(api.get('/claims/my-claims')),

  getAll: () =>
    d(api.get('/claims/getAll')),

  get: (claimNumber) =>
    d(
      api.get(
        `/claims/get/${id(claimNumber)}`,
      ),
    ),

  update: (claimNumber, body) =>
    d(
      api.put(
        `/claims/update/${id(claimNumber)}`,
        body,
      ),
    ),

  approve: (claimNumber, body) =>
    d(
      api.put(
        `/claims/approve/${id(claimNumber)}`,
        body,
      ),
    ),

  reject: (claimNumber, body) =>
    d(
      api.put(
        `/claims/reject/${id(claimNumber)}`,
        body,
      ),
    ),

  remove: (claimNumber) =>
    d(
      api.delete(
        `/claims/delete/${id(claimNumber)}`,
      ),
    ),
}

/* =========================================================
   SETTLEMENTS
========================================================= */

export const settlements = {
  getAll: () =>
    d(api.get('/settlement/getAll')),

  get: (settlementNumber) =>
    d(
      api.get(
        `/settlement/get/${id(settlementNumber)}`,
      ),
    ),

  byClaim: (claimNumber) =>
    d(
      api.get(
        `/settlement/claim/${id(claimNumber)}`,
      ),
    ),

  save: (body) =>
    d(api.post('/settlement/save', body)),

  update: (settlementNumber, body) =>
    d(
      api.put(
        `/settlement/update/${id(settlementNumber)}`,
        body,
      ),
    ),

  process: (settlementNumber) =>
    d(
      api.put(
        `/settlement/process/${id(settlementNumber)}`,
      ),
    ),

  reject: (settlementNumber, rejectionReason) =>
    d(
      api.put(
        `/settlement/reject/${id(settlementNumber)}`,
        {
          rejectionReason,
        },
      ),
    ),

  remove: (settlementNumber) =>
    d(
      api.delete(
        `/settlement/delete/${id(settlementNumber)}`,
      ),
    ),
}

/* =========================================================
   REVIEWS
========================================================= */

export const reviews = {
  save: (body) =>
    d(api.post('/reviewer/save', body)),

  mine: () =>
    d(api.get('/reviewer/my-reviews')),

  getAll: () =>
    d(api.get('/reviewer/getAll')),

  get: (reviewId) =>
    d(
      api.get(
        `/reviewer/get/${id(reviewId)}`,
      ),
    ),

  update: (reviewId, body) =>
    d(
      api.put(
        `/reviewer/update/${id(reviewId)}`,
        body,
      ),
    ),

  reply: (reviewId, body) =>
    d(
      api.put(
        `/reviewer/reply/${id(reviewId)}`,
        body,
      ),
    ),

  remove: (reviewId) =>
    d(
      api.delete(
        `/reviewer/delete/${id(reviewId)}`,
      ),
    ),
}

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

export const notifications = {
  mine: () =>
    d(api.get('/api/notifications/my')),

  unread: () =>
    d(api.get('/api/notifications/unread-count')),

  read: (notificationId) =>
    d(
      api.put(
        `/api/notifications/read/${id(notificationId)}`,
      ),
    ),

  readAll: () =>
    d(api.put('/api/notifications/read-all')),

  remove: (notificationId) =>
    d(
      api.delete(
        `/api/notifications/${id(notificationId)}`,
      ),
    ),
}

/* =========================================================
   ADMIN BROADCAST
========================================================= */

export const broadcast = {
  send: (body) =>
    d(
      api.post(
        '/api/admin/notifications',
        body,
      ),
    ),

  customers: () =>
    d(
      api.get(
        '/api/admin/notifications/customers',
      ),
    ),

  list: () =>
    d(
      api.get(
        '/api/admin/notifications',
      ),
    ),

  remove: (notificationId) =>
    d(
      api.delete(
        `/api/admin/notifications/${id(notificationId)}`,
      ),
    ),
}

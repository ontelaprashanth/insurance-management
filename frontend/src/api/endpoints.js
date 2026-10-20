import { api } from './client'

const d = (request) => request.then((response) => response.data)
const id = (value) => encodeURIComponent(String(value))

// =====================================================
// AUTHENTICATION
// =====================================================
export const auth = {
  login: (body) =>
    d(api.post('/api/auth/login', body)),

  sendOtp: (identifier) =>
    d(api.post('/api/auth/send-otp', { identifier })),

  verifyOtp: (body) =>
    d(api.post('/api/auth/verify-otp', body)),

  forgotPassword: (identifier) =>
    d(api.post('/api/auth/forgot-password', { identifier })),

  resetPassword: (body) =>
    d(api.post('/api/auth/reset-password', body)),

  session: () =>
    d(api.get('/api/session')),
}

// =====================================================
// SESSION
// =====================================================
export const session = {
  current: () =>
    d(api.get('/api/session')),
}

// =====================================================
// USERS
// =====================================================
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
    d(api.put(`/user/update/${id(userId)}`, body)),

  activate: (userId) =>
    d(api.put(`/user/activate/${id(userId)}`)),

  deactivate: (userId) =>
    d(api.put(`/user/deactivate/${id(userId)}`)),

  remove: (userId) =>
    d(api.delete(`/user/delete/${id(userId)}`)),
}

// =====================================================
// POLICIES
// =====================================================
export const policies = {
  available: () =>
    d(api.get('/policy/available')),

  mine: () =>
    d(api.get('/policy/my-policies')),

  getAll: () =>
    d(api.get('/policy/getAll')),

  get: (policyId) =>
    d(api.get(`/policy/get/${id(policyId)}`)),

  save: (body) =>
    d(api.post('/policy/save', body)),

  update: (policyId, body) =>
    d(api.put(`/policy/update/${id(policyId)}`, body)),

  remove: (policyId) =>
    d(api.delete(`/policy/delete/${id(policyId)}`)),

  activate: (policyId) =>
    d(api.put(`/policy/activate/${id(policyId)}`)),

  deactivate: (policyId) =>
    d(api.put(`/policy/deactivate/${id(policyId)}`)),
}

// =====================================================
// PLANS — REQUIRED BY CUSTOMER PLANS PAGE
// =====================================================
export const plans = {
  available: () =>
    d(api.get('/api/plans/available')),

  get: (planId) =>
    d(api.get(`/api/plans/${id(planId)}`)),
}

// =====================================================
// POLICY PURCHASES
// =====================================================
export const purchases = {
  purchase: (body) =>
    d(api.post('/policy/purchase', body)),

  mine: () =>
    d(api.get('/policy/my-purchases')),

  getAll: () =>
    d(api.get('/policy/purchases')),

  refund: (purchaseId, body = {}) =>
    d(api.post(`/policy/purchases/${id(purchaseId)}/refund`, body)),
}

// =====================================================
// PAYMENTS
// =====================================================
export const payment = {
  createOrder: (body) =>
    d(api.post('/payment/create-order', body)),

  verify: (body) =>
    d(api.post('/payment/verify', body)),
}

// =====================================================
// POLICY HOLDERS
// =====================================================
export const policyHolders = {
  getAll: () =>
    d(api.get('/policyholder/getAll')),

  get: (holderId) =>
    d(api.get(`/policyholder/get/${id(holderId)}`)),

  save: (body) =>
    d(api.post('/policyholder/save', body)),

  update: (holderId, body) =>
    d(api.put(`/policyholder/update/${id(holderId)}`, body)),

  remove: (holderId) =>
    d(api.delete(`/policyholder/delete/${id(holderId)}`)),
}

// =====================================================
// CLAIMS
// =====================================================
export const claims = {
  save: (body) =>
    d(api.post('/claims/save', body)),

  mine: () =>
    d(api.get('/claims/my-claims')),

  getAll: () =>
    d(api.get('/claims/getAll')),

  get: (claimNumber) =>
    d(api.get(`/claims/get/${id(claimNumber)}`)),

  update: (claimNumber, body) =>
    d(api.put(`/claims/update/${id(claimNumber)}`, body)),

  approve: (claimNumber, body = {}) =>
    d(api.put(`/claims/approve/${id(claimNumber)}`, body)),

  reject: (claimNumber, body = {}) =>
    d(api.put(`/claims/reject/${id(claimNumber)}`, body)),

  remove: (claimNumber) =>
    d(api.delete(`/claims/delete/${id(claimNumber)}`)),
}

// =====================================================
// SETTLEMENTS
// =====================================================
export const settlements = {
  getAll: () =>
    d(api.get('/settlement/getAll')),

  get: (settlementNumber) =>
    d(api.get(`/settlement/get/${id(settlementNumber)}`)),

  byClaim: (claimNumber) =>
    d(api.get(`/settlement/claim/${id(claimNumber)}`)),

  save: (body) =>
    d(api.post('/settlement/save', body)),

  update: (settlementNumber, body) =>
    d(api.put(`/settlement/update/${id(settlementNumber)}`, body)),

  process: (settlementNumber) =>
    d(api.put(`/settlement/process/${id(settlementNumber)}`)),

  reject: (settlementNumber, rejectionReason) =>
    d(
      api.put(`/settlement/reject/${id(settlementNumber)}`, {
        rejectionReason,
      }),
    ),

  remove: (settlementNumber) =>
    d(api.delete(`/settlement/delete/${id(settlementNumber)}`)),
}

// =====================================================
// REVIEWS
// =====================================================
export const reviews = {
  save: (body) =>
    d(api.post('/reviewer/save', body)),

  mine: () =>
    d(api.get('/reviewer/my-reviews')),

  getAll: () =>
    d(api.get('/reviewer/getAll')),

  get: (reviewId) =>
    d(api.get(`/reviewer/get/${id(reviewId)}`)),

  update: (reviewId, body) =>
    d(api.put(`/reviewer/update/${id(reviewId)}`, body)),

  reply: (reviewId, body) =>
    d(api.put(`/reviewer/reply/${id(reviewId)}`, body)),

  remove: (reviewId) =>
    d(api.delete(`/reviewer/delete/${id(reviewId)}`)),
}

// =====================================================
// CUSTOMER NOTIFICATIONS
// =====================================================
export const notifications = {
  mine: () =>
    d(api.get('/api/notifications/my')),

  unread: () =>
    d(api.get('/api/notifications/unread-count')),

  read: (notificationId) =>
    d(api.put(`/api/notifications/read/${id(notificationId)}`)),

  readAll: () =>
    d(api.put('/api/notifications/read-all')),

  remove: (notificationId) =>
    d(api.delete(`/api/notifications/${id(notificationId)}`)),
}

// =====================================================
// ADMIN BROADCAST NOTIFICATIONS
// =====================================================
export const broadcast = {
  send: (body) =>
    d(api.post('/api/admin/notifications', body)),

  customers: () =>
    d(api.get('/api/admin/notifications/customers')),

  list: () =>
    d(api.get('/api/admin/notifications')),

  getAll: () =>
    d(api.get('/api/admin/notifications')),

  remove: (notificationId) =>
    d(api.delete(`/api/admin/notifications/${id(notificationId)}`)),
}

// =====================================================
// DEFAULT EXPORT — PRESERVE EXISTING IMPORT STYLE
// =====================================================
const endpoints = {
  auth,
  session,
  users,
  policies,
  plans,
  purchases,
  payment,
  policyHolders,
  claims,
  settlements,
  reviews,
  notifications,
  broadcast,
}

export default endpoints

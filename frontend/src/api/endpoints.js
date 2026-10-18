
import { api } from './client'

const d = (p) => p.then((r) => r.data)

// =====================================================
// AUTHENTICATION
// =====================================================
export const auth = {
  login: (body) => d(api.post('/api/auth/login', body)),

  sendOtp: (identifier) =>
    d(api.post('/api/auth/send-otp', { identifier })),

  verifyOtp: (body) =>
    d(api.post('/api/auth/verify-otp', body)),

  forgotPassword: (identifier) =>
    d(api.post('/api/auth/forgot-password', { identifier })),

  resetPassword: (body) =>
    d(api.post('/api/auth/reset-password', body)),

  session: () => d(api.get('/api/session')),
}

// =====================================================
// USERS
// =====================================================
export const users = {
  register: (body) => d(api.post('/user/save', body)),

  me: () => d(api.get('/user/me')),

  updateMe: (body) => d(api.put('/user/me', body)),

  changePassword: (body) =>
    d(api.put('/user/me/password', body)),

  getAll: () => d(api.get('/user/getAll')),

  get: (id) => d(api.get(`/user/get/${id}`)),

  update: (id, body) =>
    d(api.put(`/user/update/${id}`, body)),

  activate: (id) =>
    d(api.put(`/user/activate/${id}`)),

  deactivate: (id) =>
    d(api.put(`/user/deactivate/${id}`)),

  remove: (id) =>
    d(api.delete(`/user/delete/${id}`)),
}

// =====================================================
// POLICIES
// =====================================================
export const policies = {
  available: () => d(api.get('/policy/available')),

  mine: () => d(api.get('/policy/my-policies')),

  getAll: () => d(api.get('/policy/getAll')),

  get: (n) => d(api.get(`/policy/get/${n}`)),

  save: (body) => d(api.post('/policy/save', body)),

  update: (n, body) =>
    d(api.put(`/policy/update/${n}`, body)),

  remove: (n) =>
    d(api.delete(`/policy/delete/${n}`)),

  activate: (n) =>
    d(api.put(`/policy/activate/${n}`)),

  deactivate: (n) =>
    d(api.put(`/policy/deactivate/${n}`)),
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

  get: (id) =>
    d(api.get(`/policyholder/get/${id}`)),

  save: (body) =>
    d(api.post('/policyholder/save', body)),

  update: (id, body) =>
    d(api.put(`/policyholder/update/${id}`, body)),

  remove: (id) =>
    d(api.delete(`/policyholder/delete/${id}`)),
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

  get: (n) =>
    d(api.get(`/claims/get/${n}`)),

  update: (n, body) =>
    d(api.put(`/claims/update/${n}`, body)),

  approve: (n, body) =>
    d(api.put(`/claims/approve/${n}`, body)),

  reject: (n, body) =>
    d(api.put(`/claims/reject/${n}`, body)),

  remove: (n) =>
    d(api.delete(`/claims/delete/${n}`)),
}

// =====================================================
// SETTLEMENTS
// =====================================================
export const settlements = {
  getAll: () =>
    d(api.get('/settlement/getAll')),

  get: (n) =>
    d(api.get(`/settlement/get/${n}`)),

  byClaim: (c) =>
    d(api.get(`/settlement/claim/${c}`)),

  save: (body) =>
    d(api.post('/settlement/save', body)),

  update: (n, body) =>
    d(api.put(`/settlement/update/${n}`, body)),

  process: (n) =>
    d(api.put(`/settlement/process/${n}`)),

  reject: (n, rejectionReason) =>
    d(
      api.put(`/settlement/reject/${n}`, {
        rejectionReason,
      })
    ),

  remove: (n) =>
    d(api.delete(`/settlement/delete/${n}`)),
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

  get: (id) =>
    d(api.get(`/reviewer/get/${id}`)),

  update: (id, body) =>
    d(api.put(`/reviewer/update/${id}`, body)),

  reply: (id, body) =>
    d(api.put(`/reviewer/reply/${id}`, body)),

  remove: (id) =>
    d(api.delete(`/reviewer/delete/${id}`)),
}

// =====================================================
// CUSTOMER NOTIFICATIONS
// =====================================================
export const notifications = {
  mine: () =>
    d(api.get('/api/notifications/my')),

  unread: () =>
    d(api.get('/api/notifications/unread-count')),

  read: (id) =>
    d(api.put(`/api/notifications/read/${id}`)),

  readAll: () =>
    d(api.put('/api/notifications/read-all')),

  remove: (id) =>
    d(api.delete(`/api/notifications/${id}`)),
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

  remove: (id) =>
    d(api.delete(`/api/admin/notifications/${id}`)),
}

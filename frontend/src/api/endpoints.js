import { api } from './client'

const d = (request) => request.then((response) => response.data)

/* =========================================================
   INSUREX — CENTRAL API ENDPOINTS
   Authentication • Session • Users • Policies • Claims
   Payments • Settlements • Reviews • Notifications
========================================================= */

/* ========================= AUTHENTICATION ========================= */

export const auth = {
  login: (body) =>
    d(api.post('/api/auth/login', body)),

  sendOtp: (body) =>
    d(api.post('/api/auth/send-otp', body)),

  verifyOtp: (body) =>
    d(api.post('/api/auth/verify-otp', body)),

  forgotPassword: (body) =>
    d(api.post('/api/auth/forgot-password', body)),

  resetPassword: (body) =>
    d(api.post('/api/auth/reset-password', body)),
}

/* ========================= SESSION ========================= */

export const session = {
  current: () => d(api.get('/user/me')),
}

/* ========================= USERS ========================= */

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

  get: (id) =>
    d(api.get(`/user/get/${encodeURIComponent(id)}`)),

  update: (id, body) =>
    d(api.put(`/user/update/${encodeURIComponent(id)}`, body)),

  activate: (id) =>
    d(api.put(`/user/activate/${encodeURIComponent(id)}`)),

  deactivate: (id) =>
    d(api.put(`/user/deactivate/${encodeURIComponent(id)}`)),

  remove: (id) =>
    d(api.delete(`/user/delete/${encodeURIComponent(id)}`)),
}

/* ========================= POLICIES ========================= */

export const policies = {
  available: () =>
    d(api.get('/policy/available')),

  mine: () =>
    d(api.get('/policy/my-policies')),

  getAll: () =>
    d(api.get('/policy/getAll')),

  get: (id) =>
    d(api.get(`/policy/get/${encodeURIComponent(id)}`)),

  save: (body) =>
    d(api.post('/policy/save', body)),

  update: (id, body) =>
    d(api.put(`/policy/update/${encodeURIComponent(id)}`, body)),

  activate: (id) =>
    d(api.put(`/policy/activate/${encodeURIComponent(id)}`)),

  deactivate: (id) =>
    d(api.put(`/policy/deactivate/${encodeURIComponent(id)}`)),

  remove: (id) =>
    d(api.delete(`/policy/delete/${encodeURIComponent(id)}`)),
}

/* ========================= INSURANCE PLANS ========================= */

export const plans = {
  available: () =>
    d(api.get('/api/plans/available')),

  get: (planId) =>
    d(api.get(`/api/plans/${encodeURIComponent(planId)}`)),
}

/* ========================= POLICY PURCHASES ========================= */

export const purchases = {
  purchase: (body) =>
    d(api.post('/policy/purchase', body)),

  mine: () =>
    d(api.get('/policy/my-purchases')),

  getAll: () =>
    d(api.get('/policy/purchases')),

  refund: (purchaseId, body = {}) =>
    d(
      api.post(
        `/policy/purchases/${encodeURIComponent(purchaseId)}/refund`,
        body,
      ),
    ),
}

/* ========================= POLICY HOLDERS ========================= */

export const policyHolders = {
  getAll: () =>
    d(api.get('/policyholder/getAll')),

  get: (id) =>
    d(api.get(`/policyholder/get/${encodeURIComponent(id)}`)),

  save: (body) =>
    d(api.post('/policyholder/save', body)),

  update: (id, body) =>
    d(api.put(`/policyholder/update/${encodeURIComponent(id)}`, body)),

  remove: (id) =>
    d(api.delete(`/policyholder/delete/${encodeURIComponent(id)}`)),
}

/* ========================= PAYMENTS ========================= */

export const payment = {
  createOrder: (body) =>
    d(api.post('/payment/create-order', body)),

  verify: (body) =>
    d(api.post('/payment/verify', body)),
}

/* ========================= CLAIMS ========================= */

export const claims = {
  save: (body) =>
    d(api.post('/claims/save', body)),

  mine: () =>
    d(api.get('/claims/my-claims')),

  getAll: () =>
    d(api.get('/claims/getAll')),

  get: (claimNumber) =>
    d(api.get(`/claims/get/${encodeURIComponent(claimNumber)}`)),

  update: (claimNumber, body) =>
    d(
      api.put(
        `/claims/update/${encodeURIComponent(claimNumber)}`,
        body,
      ),
    ),

  approve: (claimNumber, body = {}) =>
    d(
      api.put(
        `/claims/approve/${encodeURIComponent(claimNumber)}`,
        body,
      ),
    ),

  reject: (claimNumber, body = {}) =>
    d(
      api.put(
        `/claims/reject/${encodeURIComponent(claimNumber)}`,
        body,
      ),
    ),

  remove: (claimNumber) =>
    d(api.delete(`/claims/delete/${encodeURIComponent(claimNumber)}`)),
}

/* ========================= SETTLEMENTS ========================= */

export const settlements = {
  getAll: () =>
    d(api.get('/settlement/getAll')),

  get: (settlementNumber) =>
    d(
      api.get(
        `/settlement/get/${encodeURIComponent(settlementNumber)}`,
      ),
    ),

  byClaim: (claimNumber) =>
    d(
      api.get(
        `/settlement/claim/${encodeURIComponent(claimNumber)}`,
      ),
    ),

  save: (body) =>
    d(api.post('/settlement/save', body)),

  update: (settlementNumber, body) =>
    d(
      api.put(
        `/settlement/update/${encodeURIComponent(settlementNumber)}`,
        body,
      ),
    ),

  process: (settlementNumber) =>
    d(
      api.put(
        `/settlement/process/${encodeURIComponent(settlementNumber)}`,
      ),
    ),

  reject: (settlementNumber, rejectionReason) =>
    d(
      api.put(
        `/settlement/reject/${encodeURIComponent(settlementNumber)}`,
        { rejectionReason },
      ),
    ),

  remove: (settlementNumber) =>
    d(
      api.delete(
        `/settlement/delete/${encodeURIComponent(settlementNumber)}`,
      ),
    ),
}

/* ========================= REVIEWS ========================= */

export const reviews = {
  save: (body) =>
    d(api.post('/reviewer/save', body)),

  mine: () =>
    d(api.get('/reviewer/my-reviews')),

  getAll: () =>
    d(api.get('/reviewer/getAll')),

  get: (id) =>
    d(api.get(`/reviewer/get/${encodeURIComponent(id)}`)),

  update: (id, body) =>
    d(api.put(`/reviewer/update/${encodeURIComponent(id)}`, body)),

  reply: (id, body) =>
    d(api.put(`/reviewer/reply/${encodeURIComponent(id)}`, body)),

  remove: (id) =>
    d(api.delete(`/reviewer/delete/${encodeURIComponent(id)}`)),
}

/* ========================= CUSTOMER NOTIFICATIONS ========================= */

export const notifications = {
  mine: () =>
    d(api.get('/api/notifications/my')),

  unread: () =>
    d(api.get('/api/notifications/unread-count')),

  read: (id) =>
    d(api.put(`/api/notifications/read/${encodeURIComponent(id)}`)),

  readAll: () =>
    d(api.put('/api/notifications/read-all')),

  remove: (id) =>
    d(api.delete(`/api/notifications/${encodeURIComponent(id)}`)),
}

/* ========================= ADMIN NOTIFICATIONS ========================= */

export const broadcast = {
  send: (body) =>
    d(api.post('/api/admin/notifications', body)),

  customers: () =>
    d(api.get('/api/admin/notifications/customers')),

  getAll: () =>
    d(api.get('/api/admin/notifications')),

  remove: (id) =>
    d(api.delete(`/api/admin/notifications/${encodeURIComponent(id)}`)),
}

/* ========================= DEFAULT EXPORT ========================= */

const endpoints = {
  auth,
  session,
  users,
  policies,
  plans,
  purchases,
  policyHolders,
  payment,
  claims,
  settlements,
  reviews,
  notifications,
  broadcast,
}

export default endpoints

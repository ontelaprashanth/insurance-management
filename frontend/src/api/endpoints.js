
/* =========================================================
   INSUREX — CENTRAL API ENDPOINTS
   Authentication • Users • Policies • Claims
   Payments • Settlements • Reviews • Notifications
========================================================= */

import { api } from '../lib/api'

const d = (request) => request.then((response) => response.data)

/* AUTHENTICATION */

export const auth = {
  login: (body) => d(api.post('/api/auth/login', body)),
  signup: (body) => d(api.post('/api/auth/signup', body)),
  register: (body) => d(api.post('/api/auth/signup', body)),
  sendOtp: (body) => d(api.post('/api/auth/send-otp', body)),
  verifyOtp: (body) => d(api.post('/api/auth/verify-otp', body)),
  forgotPassword: (body) =>
    d(api.post('/api/auth/forgot-password', body)),
  resetPassword: (body) =>
    d(api.post('/api/auth/reset-password', body)),
}

/* USERS */

export const users = {
  getAll: () => d(api.get('/user/getAll')),
  get: (id) => d(api.get(`/user/get/${encodeURIComponent(id)}`)),
  save: (body) => d(api.post('/user/save', body)),
  update: (id, body) =>
    d(api.put(`/user/update/${encodeURIComponent(id)}`, body)),
  remove: (id) =>
    d(api.delete(`/user/delete/${encodeURIComponent(id)}`)),
}

/* PLANS */

export const plans = {
  getAll: () => d(api.get('/policy/getAll')),
  available: () => d(api.get('/policy/available')),
  get: (id) => d(api.get(`/policy/get/${encodeURIComponent(id)}`)),
  save: (body) => d(api.post('/policy/save', body)),
  update: (id, body) =>
    d(api.put(`/policy/update/${encodeURIComponent(id)}`, body)),
  remove: (id) =>
    d(api.delete(`/policy/delete/${encodeURIComponent(id)}`)),
}

/* POLICIES */

export const policies = {
  available: () => d(api.get('/policy/available')),
  mine: () => d(api.get('/policy/my-policies')),
  getAll: () => d(api.get('/policy/getAll')),
  get: (id) => d(api.get(`/policy/get/${encodeURIComponent(id)}`)),
  save: (body) => d(api.post('/policy/save', body)),
  update: (id, body) =>
    d(api.put(`/policy/update/${encodeURIComponent(id)}`, body)),
  remove: (id) =>
    d(api.delete(`/policy/delete/${encodeURIComponent(id)}`)),
  activate: (id) =>
    d(api.put(`/policy/activate/${encodeURIComponent(id)}`)),
  deactivate: (id) =>
    d(api.put(`/policy/deactivate/${encodeURIComponent(id)}`)),
}

/* PURCHASES */

export const purchases = {
  purchase: (body) => d(api.post('/policy/purchase', body)),
  mine: () => d(api.get('/policy/my-purchases')),
  getAll: () => d(api.get('/policy/purchases')),
  refund: (purchaseId, body) =>
    d(api.post(
      `/policy/purchases/${encodeURIComponent(purchaseId)}/refund`,
      body,
    )),
}

/* POLICY HOLDERS */

export const policyHolders = {
  getAll: () => d(api.get('/policyholder/getAll')),
  get: (id) =>
    d(api.get(`/policyholder/get/${encodeURIComponent(id)}`)),
  save: (body) => d(api.post('/policyholder/save', body)),
  update: (id, body) =>
    d(api.put(
      `/policyholder/update/${encodeURIComponent(id)}`,
      body,
    )),
  remove: (id) =>
    d(api.delete(`/policyholder/delete/${encodeURIComponent(id)}`)),
}

/* CLAIMS */

export const claims = {
  save: (body) => d(api.post('/claims/save', body)),
  mine: () => d(api.get('/claims/my-claims')),
  getAll: () => d(api.get('/claims/getAll')),
  get: (claimNumber) =>
    d(api.get(`/claims/get/${encodeURIComponent(claimNumber)}`)),
  update: (claimNumber, body) =>
    d(api.put(
      `/claims/update/${encodeURIComponent(claimNumber)}`,
      body,
    )),
  approve: (claimNumber, body = {}) =>
    d(api.put(
      `/claims/approve/${encodeURIComponent(claimNumber)}`,
      body,
    )),
  reject: (claimNumber, body = {}) =>
    d(api.put(
      `/claims/reject/${encodeURIComponent(claimNumber)}`,
      body,
    )),
  remove: (claimNumber) =>
    d(api.delete(`/claims/delete/${encodeURIComponent(claimNumber)}`)),
}

/* PAYMENTS
   Confirm these paths match your backend controller. */

export const payment = {
  createOrder: (body) =>
    d(api.post('/payment/create-order', body)),
  verify: (body) => d(api.post('/payment/verify', body)),
  pay: (body) => d(api.post('/payment/pay', body)),
  mine: () => d(api.get('/payment/my-payments')),
  getAll: () => d(api.get('/payment/getAll')),
  get: (id) => d(api.get(`/payment/get/${encodeURIComponent(id)}`)),
}

/* SETTLEMENTS */

export const settlements = {
  getAll: () => d(api.get('/settlement/getAll')),
  get: (id) =>
    d(api.get(`/settlement/get/${encodeURIComponent(id)}`)),
  save: (body) => d(api.post('/settlement/save', body)),
  update: (id, body) =>
    d(api.put(`/settlement/update/${encodeURIComponent(id)}`, body)),
  remove: (id) =>
    d(api.delete(`/settlement/delete/${encodeURIComponent(id)}`)),
}

/* REVIEWS */

export const reviews = {
  mine: () => d(api.get('/reviews/my-reviews')),
  getAll: () => d(api.get('/reviews/getAll')),
  get: (id) => d(api.get(`/reviews/get/${encodeURIComponent(id)}`)),
  save: (body) => d(api.post('/reviews/save', body)),
  update: (id, body) =>
    d(api.put(`/reviews/update/${encodeURIComponent(id)}`, body)),
  remove: (id) =>
    d(api.delete(`/reviews/delete/${encodeURIComponent(id)}`)),
}

/* NOTIFICATIONS */

export const notifications = {
  mine: () => d(api.get('/api/notifications/my')),
  unread: () => d(api.get('/api/notifications/unread-count')),
  read: (id) =>
    d(api.put(`/api/notifications/read/${encodeURIComponent(id)}`)),
  readAll: () => d(api.put('/api/notifications/read-all')),
  remove: (id) =>
    d(api.delete(`/api/notifications/${encodeURIComponent(id)}`)),
}

/* BROADCAST
   Confirm these paths match your backend controller. */

export const broadcast = {
  send: (body) =>
    d(api.post('/api/notifications/broadcast', body)),
  getAll: () => d(api.get('/api/notifications/broadcast')),
}

/* DEFAULT EXPORT */

export default {
  auth,
  users,
  plans,
  policies,
  purchases,
  policyHolders,
  claims,
  payment,
  settlements,
  reviews,
  notifications,
  broadcast,
}

import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const TOKEN_KEY = 'insurex_token'

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Any 401 outside the auth screens means the session is gone.
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/api/auth/')) onUnauthorized()
    return Promise.reject(error)
  },
)

/** Pull a readable message out of whatever shape the backend returned. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  const d = error.response?.data
  if (typeof d === 'string' && d.trim()) return d
  if (d?.message) return d.message
  if (d?.error && typeof d.error === 'string') return d.error
  if (d && typeof d === 'object') {
    // Bean-validation style: { field: "message" }
    const first = Object.values(d).find((v) => typeof v === 'string')
    if (first) return first
  }
  if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the API is running.'
  if (error.response?.status === 403) return 'You do not have permission to do that.'
  return error.message || fallback
}

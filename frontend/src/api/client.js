
import axios from 'axios'

const TOKEN_KEY = 'insurex_token'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

const normalizeApiUrl = (url) => {
  if (!url) return ''

  return url.replace(/\/+$/, '')
}

/*
 * API configuration:
 * - Local development defaults to localhost:8080.
 * - Production uses VITE_API_URL when configured.
 * - Production falls back to the deployed InsureX backend.
 */
export const API_URL = normalizeApiUrl(
  configuredApiUrl ||
    (import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://insurance-management-ke8b.onrender.com'),
)

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },

  set(token) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      }
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  },
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()

    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Handle unauthorized sessions.
let onUnauthorized = () => {}

export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = typeof fn === 'function' ? fn : () => {}
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const status = error.response?.status

    if (
      status === 401 &&
      !url.includes('/api/auth/')
    ) {
      onUnauthorized()
    }

    return Promise.reject(error)
  },
)

// Extract a readable message from backend errors.
export function errorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return fallback

  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.'
  }

  const data = error.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data?.message) {
    return data.message
  }

  if (typeof data?.error === 'string') {
    return data.error
  }

  if (data && typeof data === 'object') {
    const first = Object.values(data).find(
      (value) => typeof value === 'string' && value.trim(),
    )

    if (first) return first
  }

  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Cannot reach the InsureX server. Check the backend URL, backend status, and CORS configuration.'
  }

  if (error.response.status === 403) {
    return 'You do not have permission to do that.'
  }

  if (error.response.status === 404) {
    return 'The requested API endpoint was not found.'
  }

  return error.message || fallback
}

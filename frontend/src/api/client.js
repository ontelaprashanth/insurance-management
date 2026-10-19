
import axios from 'axios'

/* =========================================================
   INSUREX — CENTRAL API CLIENT
   Authentication • Session handling • Error handling
========================================================= */

const TOKEN_KEY = 'insurex_token'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

const normalizeApiUrl = (url) => {
  if (!url) return ''
  return url.replace(/\/+$/, '')
}

export const API_URL = normalizeApiUrl(
  configuredApiUrl ||
    (import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://insurance-management-ke8b.onrender.com'),
)

/* =========================================================
   SESSION STORAGE

   - Persists across page refreshes in the same tab.
   - Normally clears when the tab is closed.
   - Removes legacy localStorage token on initialization.
========================================================= */

const safely = (callback, fallback = null) => {
  try {
    return callback()
  } catch {
    return fallback
  }
}

safely(() => {
  localStorage.removeItem(TOKEN_KEY)
})

export const tokenStore = {
  get() {
    return safely(() => sessionStorage.getItem(TOKEN_KEY))
  },

  set(token) {
    safely(() => {
      if (typeof token === 'string' && token.trim()) {
        sessionStorage.setItem(TOKEN_KEY, token)
      } else {
        sessionStorage.removeItem(TOKEN_KEY)
      }
    })
  },

  clear() {
    safely(() => {
      sessionStorage.removeItem(TOKEN_KEY)
    })
  },
}

/* =========================================================
   AXIOS INSTANCE
========================================================= */

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
})

/* =========================================================
   AUTHENTICATION REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()

    config.headers = config.headers || {}

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else if (config.headers.Authorization) {
      delete config.headers.Authorization
    }

    return config
  },
  (error) => Promise.reject(error),
)

/* =========================================================
   SESSION EXPIRATION HANDLER

   Connect this to your existing AuthContext or auth provider.
========================================================= */

let onUnauthorized = () => {}
let unauthorizedHandled = false

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = typeof handler === 'function'
    ? handler
    : () => {}
}

export const resetUnauthorizedState = () => {
  unauthorizedHandled = false
}

/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const url = error.config?.url || ''
    const status = error.response?.status

    const isAuthenticationEndpoint =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/send-otp') ||
      url.includes('/api/auth/verify-otp') ||
      url.includes('/api/auth/forgot-password') ||
      url.includes('/api/auth/reset-password')

    if (status === 401 && !isAuthenticationEndpoint) {
      tokenStore.clear()

      if (!unauthorizedHandled) {
        unauthorizedHandled = true

        try {
          onUnauthorized()
        } catch {
          // Authentication state handler must not mask API errors.
        }
      }
    }

    return Promise.reject(error)
  },
)

/* =========================================================
   STANDARDIZED ERROR MESSAGES
========================================================= */

export function errorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return fallback

  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.'
  }

  if (error.code === 'ERR_CANCELED') {
    return 'The request was cancelled.'
  }

  const status = error.response?.status
  const data = error.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error
  }

  if (status === 400) {
    return 'The request is invalid. Please check your information.'
  }

  if (status === 401) {
    return 'Your session has expired or your credentials are invalid. Please sign in again.'
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (status === 404) {
    return 'The requested resource was not found.'
  }

  if (status === 409) {
    return 'This request conflicts with existing information.'
  }

  if (status === 422) {
    return 'Some information could not be processed. Please review your entries.'
  }

  if (status === 429) {
    return 'Too many requests. Please wait and try again.'
  }

  if (status >= 500) {
    return 'The InsureX server encountered a problem. Please try again later.'
  }

  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Cannot connect to InsureX. Check your internet connection and try again.'
  }

  return error.message || fallback
}

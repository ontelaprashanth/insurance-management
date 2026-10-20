
import axios from 'axios'

/* =========================================================
   INSUREX — CENTRAL API CLIENT
========================================================= */

const TOKEN_KEY = 'insurex_token'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

const normalizeApiUrl = (url) =>
  String(url || '').replace(/\/+$/, '')

export const API_URL = normalizeApiUrl(
  configuredApiUrl ||
    (import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://insurance-management-ke8b.onrender.com'),
)

/* =========================================================
   SESSION STORAGE
========================================================= */

const safely = (callback, fallback = null) => {
  try {
    return callback()
  } catch {
    return fallback
  }
}

// Keep the existing tab-scoped login behavior.
// Do not migrate an old localStorage token automatically.
safely(() => localStorage.removeItem(TOKEN_KEY))

export const tokenStore = {
  get() {
    return safely(() => sessionStorage.getItem(TOKEN_KEY))
  },

  set(token) {
    safely(() => {
      if (typeof token === 'string' && token.trim()) {
        sessionStorage.setItem(TOKEN_KEY, token.trim())
      } else {
        sessionStorage.removeItem(TOKEN_KEY)
      }
    })
  },

  clear() {
    safely(() => sessionStorage.removeItem(TOKEN_KEY))
  },
}

/* =========================================================
   AXIOS INSTANCE
========================================================= */

export const api = axios.create({
  baseURL: API_URL,
  timeout: 90000,
  headers: {
    Accept: 'application/json',
  },
})

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()

    config.headers = config.headers || {}

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      delete config.headers.Authorization
    }

    return config
  },
  (error) => Promise.reject(error),
)

/* =========================================================
   UNAUTHORIZED SESSION HANDLER
========================================================= */

let onUnauthorized = () => {}
let unauthorizedHandled = false

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized =
    typeof handler === 'function' ? handler : () => {}
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

    const isAuthenticationEndpoint = [
      '/api/auth/login',
      '/api/auth/send-otp',
      '/api/auth/verify-otp',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ].some((path) => url.includes(path))

    if (status === 401 && !isAuthenticationEndpoint) {
      tokenStore.clear()

      if (!unauthorizedHandled) {
        unauthorizedHandled = true

        try {
          onUnauthorized()
        } catch (handlerError) {
          console.error(
            'InsureX unauthorized handler error:',
            handlerError,
          )
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

  if (error.code === 'ERR_CANCELED') {
    return 'The request was cancelled.'
  }

  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return 'The request timed out. Check the latest status before retrying.'
  }

  const status = error.response?.status
  const data = error.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (
    typeof data?.message === 'string' &&
    data.message.trim()
  ) {
    return data.message
  }

  if (
    typeof data?.error === 'string' &&
    data.error.trim()
  ) {
    return data.error
  }

  if (status === 400) {
    return 'Invalid request. Please check your information.'
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (status === 404) {
    return 'The requested API endpoint was not found.'
  }

  if (status === 409) {
    return 'This request conflicts with an existing record.'
  }

  if (status === 422) {
    return 'The request could not be processed.'
  }

  if (status === 429) {
    return 'Too many requests. Please try again later.'
  }

  if (status >= 500) {
    return 'The InsureX server encountered an error. Check the latest status before retrying.'
  }

  if (error.code === 'ERR_NETWORK') {
    return 'The network request failed. Check the request in your browser Network tab.'
  }

  // A frontend TypeError is not a backend connection failure.
  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}

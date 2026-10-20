
import axios from 'axios'

/* =========================================================
   INSUREX — CENTRAL API CLIENT

   JWT Authentication
   Session Storage
   Render Backend
   Request / Response Interceptors
   Error Handling
========================================================= */

const TOKEN_KEY = 'insurex_token'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

const normalizeApiUrl = (url) => {
  if (!url) return ''

  return String(url).trim().replace(/\/+$/, '')
}

export const API_URL = normalizeApiUrl(
  configuredApiUrl ||
    (import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://insurance-management-ke8b.onrender.com'),
)

/* =========================================================
   SAFE STORAGE
========================================================= */

const safely = (callback, fallback = null) => {
  try {
    return callback()
  } catch {
    return fallback
  }
}

/* =========================================================
   SESSION TOKEN STORAGE

   sessionStorage:
   - Survives page refresh
   - Survives navigation
   - Usually ends with browser tab session
========================================================= */

export const tokenStore = {
  get() {
    return safely(
      () => sessionStorage.getItem(TOKEN_KEY),
      null,
    )
  },

  set(token) {
    safely(() => {
      if (typeof token === 'string' && token.trim()) {
        sessionStorage.setItem(
          TOKEN_KEY,
          token.trim(),
        )
      } else {
        sessionStorage.removeItem(TOKEN_KEY)
      }
    })

    resetUnauthorizedState()
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

  // Render free services may take time to wake up.
  timeout: 90000,

  headers: {
    Accept: 'application/json',
  },
})

/* =========================================================
   AUTHENTICATION ENDPOINT CHECK
========================================================= */

const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

const isPublicAuthEndpoint = (url = '') => {
  const path = String(url).split('?')[0]

  return PUBLIC_AUTH_ENDPOINTS.some(
    (endpoint) =>
      path === endpoint ||
      path.endsWith(endpoint),
  )
}

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()

    config.headers = config.headers || {}

    if (token && !isPublicAuthEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`

      // Used to identify the session that made this request.
      config._insurexRequestToken = token
    } else {
      delete config.headers.Authorization
      config._insurexRequestToken = null
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
    typeof handler === 'function'
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
    const config = error.config || {}

    const url = config.url || ''
    const status = error.response?.status

    const authenticationRequest =
      isPublicAuthEndpoint(url)

    if (status === 401 && !authenticationRequest) {
      const currentToken = tokenStore.get()
      const requestToken =
        config._insurexRequestToken

      // Only invalidate the same session that sent
      // the unauthorized request.
      const sameSession =
        Boolean(currentToken) &&
        Boolean(requestToken) &&
        currentToken === requestToken

      if (sameSession) {
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

  /* Cancelled request */

  if (error.code === 'ERR_CANCELED') {
    return 'The request was cancelled.'
  }

  /* Timeout */

  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return (
      'The request timed out. ' +
      'Check the latest status before retrying.'
    )
  }

  const status = error.response?.status
  const data = error.response?.data

  /* Backend text response */

  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }

  /* Backend structured response */

  if (
    typeof data?.message === 'string' &&
    data.message.trim()
  ) {
    return data.message.trim()
  }

  if (
    typeof data?.error === 'string' &&
    data.error.trim()
  ) {
    return data.error.trim()
  }

  /* Validation errors */

  if (data?.errors && typeof data.errors === 'object') {
    const messages = Array.isArray(data.errors)
      ? data.errors
      : Object.values(data.errors)

    const result = messages
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        return item?.defaultMessage ||
          item?.message ||
          ''
      })
      .filter(Boolean)
      .join(', ')

    if (result) return result
  }

  /* HTTP errors */

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
    return (
      'The InsureX server encountered an error. ' +
      'Check the latest status before retrying.'
    )
  }

  /* Network errors */

  if (error.code === 'ERR_NETWORK') {
    return (
      'Cannot connect to the InsureX server. ' +
      'Check your internet connection, backend status, ' +
      'and browser Network tab.'
    )
  }

  /* Client-side errors */

  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}

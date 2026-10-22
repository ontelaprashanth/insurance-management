// =========================================================
// INSUREX — CENTRAL API CLIENT
// File: src/api/client.js
//
// JWT Authentication
// Session Storage
// Render Free Backend
// Request / Response Interceptors
// Session-Safe 401 Handling
// Payment & Refund Request Safety
// Network / Timeout Error Handling
//
// Existing exports preserved:
// - API_URL
// - api
// - tokenStore
// - setUnauthorizedHandler
// - resetUnauthorizedState
// - errorMessage
// =========================================================

import axios from 'axios'

/* =========================================================
   CONFIGURATION
========================================================= */

const TOKEN_KEY = 'insurex_token'

const configuredApiUrl =
  import.meta.env.VITE_API_URL?.trim()

const normalizeApiUrl = (url) => {
  if (!url) return ''

  return String(url)
    .trim()
    .replace(/\/+$/, '')
}

export const API_URL = normalizeApiUrl(
  configuredApiUrl ||
    (import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://insurance-management-ke8b.onrender.com'),
)

/* =========================================================
   TIMEOUT CONFIGURATION

   Render Free can require additional startup time.

   Important:
   A longer timeout does not guarantee a request succeeded.
   Payment, purchase, renewal and refund requests must
   never be automatically repeated after uncertain results.
========================================================= */

const DEFAULT_TIMEOUT = 90000

const PAYMENT_TIMEOUT = 120000

const READ_TIMEOUT = 90000

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
   SESSION STORAGE

   sessionStorage:
   - Survives page refresh
   - Survives navigation
   - Normally lasts for the browser tab session

   No token is stored in localStorage by this client.

   Note:
   sessionStorage is not a replacement for backend
   authorization and does not eliminate XSS risk.
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
      if (
        typeof token === 'string' &&
        token.trim()
      ) {
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

  timeout: DEFAULT_TIMEOUT,

  headers: {
    Accept: 'application/json',
  },

  // Do not send browser cookies automatically.
  // JWT is sent through the Authorization header.
  withCredentials: false,
})

/* =========================================================
   ENDPOINT CLASSIFICATION
========================================================= */

const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

const PAYMENT_ENDPOINTS = [
  '/payment/create-order',
  '/payment/verify',
  '/policy/purchase',
  '/refund/request',
]

const MUTATION_METHODS = new Set([
  'post',
  'put',
  'patch',
  'delete',
])

function requestPath(url = '') {
  const raw = String(url || '')

  try {
    return new URL(
      raw,
      API_URL || 'http://localhost',
    ).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return raw.split('?')[0]
  }
}

function isPublicAuthEndpoint(url = '') {
  const path = requestPath(url)

  return PUBLIC_AUTH_ENDPOINTS.some(
    (endpoint) => path === endpoint,
  )
}

function isPaymentEndpoint(url = '') {
  const path = requestPath(url)

  if (
    PAYMENT_ENDPOINTS.some(
      (endpoint) => path === endpoint,
    )
  ) {
    return true
  }

  return /^\/api\/policy-renewals\/[^/]+\/(order|confirm)$/
    .test(path)
}

function isMutationRequest(config) {
  return MUTATION_METHODS.has(
    String(config?.method || '')
      .toLowerCase(),
  )
}

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
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()

    config.headers = config.headers || {}

    const publicRequest =
      isPublicAuthEndpoint(config.url)

    // Attach JWT only to protected requests.
    if (token && !publicRequest) {
      config.headers.Authorization =
        `Bearer ${token}`

      // Record the session that sent this request.
      // Prevent an old 401 response from logging out
      // a newer session.
      config._insurexRequestToken = token
    } else {
      delete config.headers.Authorization

      config._insurexRequestToken = null
    }

    // Mark operations whose outcomes may be uncertain.
    // This metadata is local to Axios; it is not sent
    // to the backend.
    config._insurexPaymentRequest =
      isPaymentEndpoint(config.url)

    config._insurexMutationRequest =
      isMutationRequest(config)

    // Payment endpoints may need more time on Render.
    // Do not override an explicitly configured timeout.
    if (
      config._insurexPaymentRequest &&
      (
        config.timeout == null ||
        config.timeout === DEFAULT_TIMEOUT
      )
    ) {
      config.timeout = PAYMENT_TIMEOUT
    }

    if (
      !config._insurexPaymentRequest &&
      String(config.method || '').toLowerCase() === 'get' &&
      (
        config.timeout == null ||
        config.timeout === DEFAULT_TIMEOUT
      )
    ) {
      config.timeout = READ_TIMEOUT
    }

    return config
  },

  (error) => Promise.reject(error),
)

/* =========================================================
   RESPONSE INTERCEPTOR

   - Handle expired JWT sessions
   - Ignore stale-session 401 responses
   - Do not automatically retry mutations
   - Preserve original Axios errors
========================================================= */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const config = error.config || {}

    const status = error.response?.status

    const authenticationRequest =
      isPublicAuthEndpoint(config.url)

    /* =====================================================
       SESSION EXPIRED
    ===================================================== */

    if (
      status === 401 &&
      !authenticationRequest
    ) {
      const currentToken = tokenStore.get()

      const requestToken =
        config._insurexRequestToken

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

    /* =====================================================
       UNCERTAIN PAYMENT / REFUND OUTCOME

       These flags help the UI show appropriate warnings.

       No automatic retry is performed.
    ===================================================== */

    const networkFailure =
      error.code === 'ERR_NETWORK'

    const timedOut =
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'

    const serverFailure =
      typeof status === 'number' &&
      status >= 500

    const uncertainOutcome =
      networkFailure ||
      timedOut ||
      serverFailure

    if (
      config._insurexPaymentRequest &&
      config._insurexMutationRequest &&
      uncertainOutcome
    ) {
      error.insurexPaymentOutcomeUncertain = true

      error.insurexDoNotRetryAutomatically = true
    }

    return Promise.reject(error)
  },
)

/* =========================================================
   ERROR MESSAGE HELPERS
========================================================= */

function backendErrorMessage(data) {
  if (
    typeof data === 'string' &&
    data.trim()
  ) {
    return data.trim()
  }

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

  if (
    typeof data?.detail === 'string' &&
    data.detail.trim()
  ) {
    return data.detail.trim()
  }

  if (
    data?.errors &&
    typeof data.errors === 'object'
  ) {
    const messages = Array.isArray(data.errors)
      ? data.errors
      : Object.values(data.errors)

    const result = messages
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        return (
          item?.defaultMessage ||
          item?.message ||
          ''
        )
      })
      .filter(Boolean)
      .join(', ')

    if (result) {
      return result
    }
  }

  return ''
}

/* =========================================================
   STANDARDIZED ERROR MESSAGES
========================================================= */

export function errorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) {
    return fallback
  }

  /* =======================================================
     PAYMENT / REFUND UNCERTAINTY
  ======================================================= */

  if (error.insurexPaymentOutcomeUncertain) {
    return (
      'The payment or refund request could not be ' +
      'confirmed because of a network timeout or ' +
      'server error. Check your latest transaction ' +
      'status before trying again. Do not immediately ' +
      'repeat the payment or refund request.'
    )
  }

  /* =======================================================
     CANCELLED REQUEST
  ======================================================= */

  if (error.code === 'ERR_CANCELED') {
    return 'The request was cancelled.'
  }

  /* =======================================================
     TIMEOUT
  ======================================================= */

  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return (
      'The request timed out. The InsureX server ' +
      'may be starting up. Check the latest status ' +
      'before retrying.'
    )
  }

  const status = error.response?.status

  const data = error.response?.data

  /* =======================================================
     BACKEND ERROR MESSAGE
  ======================================================= */

  const backendMessage =
    backendErrorMessage(data)

  if (backendMessage) {
    return backendMessage
  }

  /* =======================================================
     HTTP ERRORS
  ======================================================= */

  if (status === 400) {
    return (
      'Invalid request. Please check your information.'
    )
  }

  if (status === 401) {
    return (
      'Your session has expired. Please sign in again.'
    )
  }

  if (status === 403) {
    return (
      'You do not have permission to perform this action.'
    )
  }

  if (status === 404) {
    return (
      'The requested API endpoint was not found.'
    )
  }

  if (status === 409) {
    return (
      'This request conflicts with an existing record.'
    )
  }

  if (status === 422) {
    return (
      'The request could not be processed.'
    )
  }

  if (status === 429) {
    return (
      'Too many requests. Please try again later.'
    )
  }

  if (status === 502 || status === 503 || status === 504) {
    return (
      'The InsureX backend is temporarily unavailable ' +
      'or starting up. Please check again shortly.'
    )
  }

  if (
    typeof status === 'number' &&
    status >= 500
  ) {
    return (
      'The InsureX server encountered an error. ' +
      'Check the latest status before retrying.'
    )
  }

  /* =======================================================
     NETWORK ERRORS
  ======================================================= */

  if (error.code === 'ERR_NETWORK') {
    return (
      'Cannot connect to the InsureX server. ' +
      'Check your internet connection, backend status, ' +
      'API URL and browser Network tab.'
    )
  }

  /* =======================================================
     CLIENT-SIDE ERRORS
  ======================================================= */

  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}

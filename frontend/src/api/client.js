
import axios from 'axios'

/* =========================================================
   INSUREX — CENTRAL API CLIENT
   Primary Backend • Fallback • Session Handling
========================================================= */

const TOKEN_KEY = 'insurex_token'

const normalizeApiUrl = (url) =>
  url?.trim().replace(/\/+$/, '') || ''

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_URL = normalizeApiUrl(
  configuredApiUrl ||
    (import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://insurance-management-ke8b.onrender.com'),
)

const FALLBACK_API_URL = normalizeApiUrl(
  import.meta.env.VITE_API_FALLBACK_URL,
)

const hasFallback =
  Boolean(FALLBACK_API_URL) &&
  FALLBACK_API_URL !== API_URL

/* =========================================================
   BACKEND FAILOVER STATE
========================================================= */

let activeApiUrl = API_URL
let fallbackUntil = 0

const PRIMARY_RETRY_DELAY = 60_000

const getActiveApiUrl = () => {
  if (
    activeApiUrl === FALLBACK_API_URL &&
    Date.now() >= fallbackUntil
  ) {
    activeApiUrl = API_URL
  }

  return activeApiUrl
}

const switchToFallback = () => {
  if (!hasFallback) return false

  activeApiUrl = FALLBACK_API_URL
  fallbackUntil = Date.now() + PRIMARY_RETRY_DELAY

  return true
}

const switchToPrimary = () => {
  activeApiUrl = API_URL
  fallbackUntil = 0
}

/* =========================================================
   SAFE STORAGE ACCESS
========================================================= */

const safely = (callback, fallback = null) => {
  try {
    return callback()
  } catch {
    return fallback
  }
}

/*
 * Do not clear localStorage at module startup.
 * That can unexpectedly remove a legacy token.
 *
 * sessionStorage is used for the active InsureX session.
 */

export const tokenStore = {
  get() {
    return safely(() => sessionStorage.getItem(TOKEN_KEY))
  },

  set(token) {
    return safely(() => {
      if (typeof token === 'string' && token.trim()) {
        sessionStorage.setItem(TOKEN_KEY, token.trim())
        return true
      }

      sessionStorage.removeItem(TOKEN_KEY)
      return false
    }, false)
  },

  clear() {
    return safely(() => {
      sessionStorage.removeItem(TOKEN_KEY)
      return true
    }, false)
  },
}

/* =========================================================
   AXIOS INSTANCE
========================================================= */

export const api = axios.create({
  baseURL: API_URL,
  timeout: 90_000,
  headers: {
    Accept: 'application/json',
  },
})

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    config.baseURL = getActiveApiUrl()
    config.headers = config.headers || {}

    const token = tokenStore.get()

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
   FAILOVER HELPERS
========================================================= */

const isBackendAvailabilityFailure = (error) => {
  if (!error) return false

  if (!error.response) {
    return (
      [
        'ERR_NETWORK',
        'ECONNABORTED',
        'ETIMEDOUT',
        'ERR_INTERNET_DISCONNECTED',
      ].includes(error.code) ||
      error.request != null
    )
  }

  return [502, 503, 504].includes(error.response.status)
}

const isSafeToRetry = (config) => {
  const method = (config?.method || 'get').toLowerCase()

  return ['get', 'head', 'options'].includes(method)
}

/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (response) => {
    const responseBaseURL = normalizeApiUrl(
      response.config?.baseURL,
    )

    if (responseBaseURL === API_URL) {
      switchToPrimary()
    }

    return response
  },

  async (error) => {
    const config = error.config
    const url = config?.url || ''
    const status = error.response?.status

    const isAuthenticationEndpoint =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/send-otp') ||
      url.includes('/api/auth/verify-otp') ||
      url.includes('/api/auth/forgot-password') ||
      url.includes('/api/auth/reset-password')

    /*
     * Fail over only for connectivity/gateway failures.
     * Never automatically repeat POST/PUT/PATCH/DELETE requests.
     */

    if (
      hasFallback &&
      config &&
      !config._insurexFailoverRetry &&
      isBackendAvailabilityFailure(error)
    ) {
      const failedBaseURL = normalizeApiUrl(config.baseURL)

      if (failedBaseURL === API_URL) {
        const fallbackActivated = switchToFallback()

        if (fallbackActivated && isSafeToRetry(config)) {
          config._insurexFailoverRetry = true
          config.baseURL = FALLBACK_API_URL

          try {
            return await api.request(config)
          } catch (retryError) {
            throw retryError
          }
        }
      } else if (failedBaseURL === FALLBACK_API_URL) {
        fallbackUntil = Date.now() + PRIMARY_RETRY_DELAY
      }
    }

    /*
     * Clear invalid sessions on protected requests.
     * Login/OTP errors must remain visible to the login UI.
     */

    if (status === 401 && !isAuthenticationEndpoint) {
      tokenStore.clear()

      if (!unauthorizedHandled) {
        unauthorizedHandled = true

        try {
          onUnauthorized()
        } catch {
          // Preserve the original API error.
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

  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return 'InsureX is taking longer than usual to respond. Please try again.'
  }

  if (error.code === 'ERR_CANCELED') {
    return 'The request was cancelled.'
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

  if (!error.response) {
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to reach InsureX. Check the network request and backend connection.'
    }

    return 'Cannot connect to InsureX. Please check your connection and try again.'
  }

  return error.message || fallback
}

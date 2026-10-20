import axios from 'axios'

// =====================================================
// INSUREX — CENTRAL API CLIENT
// Production API • JWT Authentication • Error Handling
// =====================================================

const TOKEN_KEY = 'insurex_token'

const normalizeUrl = (url) =>
  typeof url === 'string' ? url.trim().replace(/\/+$/, '') : ''

const configuredApiUrl = normalizeUrl(import.meta.env.VITE_API_URL)

export const API_URL =
  configuredApiUrl ||
  (import.meta.env.DEV
    ? 'http://localhost:8080'
    : 'https://insurance-management-ke8b.onrender.com')

const FALLBACK_API_URL = normalizeUrl(
  import.meta.env.VITE_API_FALLBACK_URL,
)

const hasFallback =
  Boolean(FALLBACK_API_URL) &&
  FALLBACK_API_URL !== API_URL

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

const safely = (callback, fallback = null) => {
  try {
    return callback()
  } catch {
    return fallback
  }
}

// =====================================================
// TOKEN STORAGE
// Keep localStorage for compatibility with existing login
// =====================================================

export const tokenStore = {
  get: () =>
    safely(() => localStorage.getItem(TOKEN_KEY)),

  set: (token) =>
    safely(() => {
      if (typeof token !== 'string' || !token.trim()) {
        localStorage.removeItem(TOKEN_KEY)
        return false
      }

      localStorage.setItem(TOKEN_KEY, token.trim())
      return true
    }, false),

  clear: () =>
    safely(() => {
      localStorage.removeItem(TOKEN_KEY)
      return true
    }, false),
}

// =====================================================
// AXIOS INSTANCE
// =====================================================

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60_000,
  headers: {
    Accept: 'application/json',
  },
})

// =====================================================
// REQUEST INTERCEPTOR — ATTACH JWT
// =====================================================

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

// =====================================================
// SESSION EXPIRATION HANDLER
// =====================================================

let onUnauthorized = () => {}
let unauthorizedHandled = false

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized =
    typeof handler === 'function' ? handler : () => {}
}

export const resetUnauthorizedState = () => {
  unauthorizedHandled = false
}

// =====================================================
// NETWORK / FAILOVER HELPERS
// =====================================================

const isAvailabilityFailure = (error) => {
  if (!error) return false

  if (!error.response) {
    return (
      [
        'ERR_NETWORK',
        'ECONNABORTED',
        'ETIMEDOUT',
        'ERR_INTERNET_DISCONNECTED',
      ].includes(error.code) ||
      Boolean(error.request)
    )
  }

  return [502, 503, 504].includes(error.response.status)
}

const isSafeToRetry = (config) =>
  ['get', 'head', 'options'].includes(
    (config?.method || 'get').toLowerCase(),
  )

const isAuthEndpoint = (url = '') =>
  url.includes('/api/auth/')

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => {
    const responseBaseURL = normalizeUrl(response.config?.baseURL)

    if (responseBaseURL === API_URL) {
      switchToPrimary()
    }

    // A successful response confirms that the current
    // request reached a server.
    unauthorizedHandled = false

    return response
  },

  async (error) => {
    const config = error.config
    const url = config?.url || ''
    const status = error.response?.status

    // Retry only safe read requests against the optional
    // fallback server. Never blindly replay login, payments,
    // purchases, or other state-changing requests.
    if (
      hasFallback &&
      config &&
      !config._insurexFallbackRetried &&
      isAvailabilityFailure(error) &&
      isSafeToRetry(config)
    ) {
      const failedBaseURL = normalizeUrl(config.baseURL)

      if (failedBaseURL === API_URL && switchToFallback()) {
        config._insurexFallbackRetried = true
        config.baseURL = FALLBACK_API_URL

        return api.request(config)
      }

      if (failedBaseURL === FALLBACK_API_URL) {
        fallbackUntil = Date.now() + PRIMARY_RETRY_DELAY
      }
    }

    // Expired/invalid session. Preserve the token on login
    // and other authentication endpoints so failed sign-in
    // attempts do not trigger an unnecessary redirect.
    if (status === 401 && !isAuthEndpoint(url)) {
      tokenStore.clear()

      if (!unauthorizedHandled) {
        unauthorizedHandled = true

        try {
          onUnauthorized()
        } catch {
          // Do not hide the original API error.
        }
      }
    }

    return Promise.reject(error)
  },
)

// =====================================================
// USER-FRIENDLY ERROR MESSAGES
// =====================================================

export function errorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return fallback

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'InsureX is taking too long to respond. Please try again.'
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

  if (data && typeof data === 'object') {
    const firstMessage = Object.values(data).find(
      (value) => typeof value === 'string' && value.trim(),
    )

    if (firstMessage) return firstMessage
  }

  if (status === 400) {
    return 'Invalid request. Please check your information.'
  }

  if (status === 401) {
    return 'Your session has expired or your credentials are invalid. Please sign in again.'
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (status === 404) {
    return 'The requested API endpoint was not found.'
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
    if (
      error.code === 'ERR_NETWORK' ||
      error.request
    ) {
      return 'Cannot connect to InsureX. Check the deployed backend, API URL, and CORS configuration.'
    }

    return error.message || fallback
  }

  return error.message || fallback
}

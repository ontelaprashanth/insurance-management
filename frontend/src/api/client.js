import axios from 'axios'

const TOKEN_KEY = 'insurex_token'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_URL =
  configuredApiUrl ||
  (import.meta.env.DEV ? 'http://localhost:8080' : '')

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },

  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Ignore unavailable localStorage
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Ignore unavailable localStorage
    }
  },
}

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  if (!API_URL) {
    return Promise.reject(
      new Error(
        'API URL is missing. Configure VITE_API_URL in Vercel and redeploy.',
      ),
    )
  }

  const token = tokenStore.get()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Handle unauthorized sessions.
let onUnauthorized = () => {}

export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''

    if (
      error.response?.status === 401 &&
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

  const data = error.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data?.message) return data.message

  if (typeof data?.error === 'string') {
    return data.error
  }

  if (data && typeof data === 'object') {
    const first = Object.values(data).find(
      (value) => typeof value === 'string',
    )

    if (first) return first
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Check the API URL, backend status, and CORS configuration.'
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to do that.'
  }

  return error.message || fallback
}

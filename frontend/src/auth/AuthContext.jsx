
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../api/endpoints'
import {
  resetUnauthorizedState,
  setUnauthorizedHandler,
  tokenStore,
} from '../api/client'

const Ctx = createContext(null)

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const qc = useQueryClient()

  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  const mountedRef = useRef(false)
  const sessionRequestRef = useRef(null)

  // -------------------------------------------------------
  // Clear local authentication and application cache.
  // -------------------------------------------------------
  const logout = useCallback(() => {
    tokenStore.clear()
    sessionRequestRef.current = null

    setUser(null)
    qc.clear()
  }, [qc])

  // -------------------------------------------------------
  // Load the currently authenticated user from the backend.
  // -------------------------------------------------------
  const loadSession = useCallback(async () => {
    const token = tokenStore.get()

    if (!token) {
      setUser(null)
      throw new Error('No active session. Please sign in.')
    }

    // Reuse an in-flight session request to avoid duplicate calls.
    if (sessionRequestRef.current) {
      return sessionRequestRef.current
    }

    const request = (async () => {
      try {
        const session = await auth.session()

        if (!tokenStore.get()) {
          setUser(null)
          throw new Error('Your session has ended. Please sign in again.')
        }

        const normalizedUser = {
          ...session,
          role: String(session?.role || '').toUpperCase(),
        }

        setUser(normalizedUser)
        return normalizedUser
      } catch (error) {
        // Clear invalid credentials, but don't silently log out
        // on a temporary network failure.
        const status = error?.response?.status

        if (status === 401 || status === 403) {
          tokenStore.clear()
          setUser(null)
        }

        throw error
      } finally {
        if (sessionRequestRef.current === request) {
          sessionRequestRef.current = null
        }
      }
    })()

    sessionRequestRef.current = request
    return request
  }, [])

  // -------------------------------------------------------
  // Initialize authentication on application startup.
  // -------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true

    const initialize = async () => {
      if (!tokenStore.get()) {
        setUser(null)
        setBooting(false)
        return
      }

      try {
        await loadSession()
      } catch (error) {
        // A temporary network failure should not destroy a
        // potentially valid session. Protected API requests
        // can retry when the connection returns.
        const status = error?.response?.status

        if (status === 401 || status === 403) {
          logout()
        }
      } finally {
        if (mountedRef.current) {
          setBooting(false)
        }
      }
    }

    initialize()

    return () => {
      mountedRef.current = false
    }
  }, [loadSession, logout])

  // -------------------------------------------------------
  // Synchronize unauthorized API responses with auth state.
  // -------------------------------------------------------
  useEffect(() => {
    setUnauthorizedHandler(logout)

    return () => {
      setUnauthorizedHandler(() => {})
    }
  }, [logout])

  // -------------------------------------------------------
  // Login.
  // -------------------------------------------------------
  const login = useCallback(
    async (identifier, password) => {
      const response = await auth.login({ identifier, password })
      const token = response?.token

      if (!token) {
        throw new Error('Login succeeded without a session token.')
      }

      // Clear old cached information before starting a new session.
      tokenStore.clear()
      setUser(null)
      qc.clear()
      resetUnauthorizedState()

      tokenStore.set(token)

      try {
        const authenticatedUser = await loadSession()
        setBooting(false)
        return authenticatedUser
      } catch (error) {
        tokenStore.clear()
        setUser(null)
        qc.clear()
        throw error
      }
    },
    [loadSession, qc],
  )

  // -------------------------------------------------------
  // Explicit logout.
  // -------------------------------------------------------
  const logoutAndReset = useCallback(() => {
    logout()
    setBooting(false)
    resetUnauthorizedState()
  }, [logout])

  // -------------------------------------------------------
  // Expose authentication state to the application.
  // -------------------------------------------------------
  const value = useMemo(
    () => ({
      user,
      booting,
      login,
      logout: logoutAndReset,
      refresh: loadSession,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      isUser: user?.role === 'USER',
    }),
    [user, booting, login, logoutAndReset, loadSession],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

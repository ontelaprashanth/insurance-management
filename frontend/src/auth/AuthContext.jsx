
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
  const queryClient = useQueryClient()

  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  const mountedRef = useRef(false)
  const sessionRequestRef = useRef(null)
  const authVersionRef = useRef(0)

  // -------------------------------------------------------
  // Clear the local session and cached user data.
  // -------------------------------------------------------
  const logout = useCallback(() => {
    authVersionRef.current += 1
    sessionRequestRef.current = null

    tokenStore.clear()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  // -------------------------------------------------------
  // Load and validate the current user with the backend.
  // -------------------------------------------------------
  const loadSession = useCallback(async () => {
    const token = tokenStore.get()

    if (!token) {
      setUser(null)
      throw new Error('No active session. Please sign in.')
    }

    if (sessionRequestRef.current?.token === token) {
      return sessionRequestRef.current.promise
    }

    const authVersion = authVersionRef.current

    const promise = (async () => {
      try {
        const session = await auth.session()

        // Ignore responses belonging to an older session.
        if (
          authVersion !== authVersionRef.current ||
          tokenStore.get() !== token
        ) {
          throw new Error('Your session has ended. Please sign in again.')
        }

        const normalizedUser = {
          ...session,
          role: String(session?.role || '').toUpperCase(),
        }

        if (
          normalizedUser.role !== 'ADMIN' &&
          normalizedUser.role !== 'USER'
        ) {
          tokenStore.clear()
          setUser(null)
          throw new Error('Your account role could not be verified.')
        }

        setUser(normalizedUser)
        return normalizedUser
      } catch (error) {
        const status = error?.response?.status

        if (
          authVersion === authVersionRef.current &&
          (status === 401 || status === 403)
        ) {
          tokenStore.clear()
          setUser(null)
        }

        throw error
      } finally {
        if (sessionRequestRef.current?.promise === promise) {
          sessionRequestRef.current = null
        }
      }
    })()

    sessionRequestRef.current = { token, promise }

    return promise
  }, [])

  // -------------------------------------------------------
  // Initialize the session on page load or refresh.
  // -------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    const initialize = async () => {
      if (!tokenStore.get()) {
        if (!cancelled) {
          setUser(null)
          setBooting(false)
        }
        return
      }

      try {
        await loadSession()
      } catch (error) {
        const status = error?.response?.status

        // Only invalid or unauthorized sessions are cleared here.
        // Temporary network errors do not automatically destroy
        // an otherwise valid stored session.
        if (status === 401 || status === 403) {
          logout()
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setBooting(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [loadSession, logout])

  // -------------------------------------------------------
  // Synchronize API 401 responses with the auth provider.
  // -------------------------------------------------------
  useEffect(() => {
    setUnauthorizedHandler(logout)

    return () => {
      setUnauthorizedHandler(() => {})
    }
  }, [logout])

  // -------------------------------------------------------
  // Sign in using username, email or mobile number.
  // -------------------------------------------------------
  const login = useCallback(
    async (identifier, password) => {
      const response = await auth.login({
        identifier,
        password,
      })

      const token = response?.token

      if (!token) {
        throw new Error(
          'The server did not return an authentication token.',
        )
      }

      // Invalidate requests and data from any previous user.
      authVersionRef.current += 1
      sessionRequestRef.current = null

      tokenStore.clear()
      setUser(null)
      queryClient.clear()
      resetUnauthorizedState()

      tokenStore.set(token)

      try {
        const authenticatedUser = await loadSession()
        setBooting(false)
        return authenticatedUser
      } catch (error) {
        tokenStore.clear()
        setUser(null)
        queryClient.clear()
        throw error
      }
    },
    [loadSession, queryClient],
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
  // Expose authentication state to React components.
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
    [
      user,
      booting,
      login,
      logoutAndReset,
      loadSession,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  )
}

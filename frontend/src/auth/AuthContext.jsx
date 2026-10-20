
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

/* =========================================================
   INSUREX — AUTHENTICATION CONTEXT

   JWT Authentication
   Session Restoration
   Role-Based Access
   Login / Logout
   Unauthorized Handling
   React Query Cache Isolation
========================================================= */

const Ctx = createContext(null)

export function useAuth() {
  const context = useContext(Ctx)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    )
  }

  return context
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()

  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  const authVersionRef = useRef(0)
  const sessionRequestRef = useRef(null)

  /* =======================================================
     CLEAR AUTHENTICATION STATE
  ======================================================= */

  const clearSession = useCallback(() => {
    authVersionRef.current += 1
    sessionRequestRef.current = null

    tokenStore.clear()
    setUser(null)
    setBooting(false)

    queryClient.clear()
  }, [queryClient])

  /* =======================================================
     LOAD CURRENT SESSION

     Validate JWT with backend.
     Ignore responses from previous sessions.
  ======================================================= */

  const loadSession = useCallback(async () => {
    const token = tokenStore.get()

    if (!token) {
      throw new Error(
        'No active session. Please sign in.',
      )
    }

    if (
      sessionRequestRef.current?.token === token
    ) {
      return sessionRequestRef.current.promise
    }

    const version = authVersionRef.current

    const request = auth.session()
      .then((session) => {
        if (
          version !== authVersionRef.current ||
          tokenStore.get() !== token
        ) {
          throw new Error(
            'The authentication session has changed.',
          )
        }

        const role = String(
          session?.role ?? '',
        ).toUpperCase()

        if (
          role !== 'ADMIN' &&
          role !== 'USER'
        ) {
          clearSession()

          throw new Error(
            'Your account role could not be verified.',
          )
        }

        const authenticatedUser = {
          ...session,
          role,
        }

        setUser(authenticatedUser)
        setBooting(false)

        return authenticatedUser
      })
      .catch((error) => {
        const status = error?.response?.status

        if (
          version === authVersionRef.current &&
          tokenStore.get() === token &&
          (status === 401 || status === 403)
        ) {
          clearSession()
        }

        throw error
      })
      .finally(() => {
        if (
          sessionRequestRef.current?.promise === request
        ) {
          sessionRequestRef.current = null
        }
      })

    sessionRequestRef.current = {
      token,
      promise: request,
    }

    return request
  }, [clearSession])

  /* =======================================================
     INITIALIZE SESSION

     Runs when application starts.
  ======================================================= */

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      const token = tokenStore.get()

      if (!token) {
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

        if (
          status !== 401 &&
          status !== 403
        ) {
          console.warn(
            'InsureX session restoration failed:',
            error,
          )
        }
      } finally {
        if (!cancelled) {
          setBooting(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [loadSession])

  /* =======================================================
     HANDLE UNAUTHORIZED RESPONSES
  ======================================================= */

  useEffect(() => {
    setUnauthorizedHandler(clearSession)

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession])

  /* =======================================================
     LOGIN

     Username / Email / Mobile + Password
  ======================================================= */

  const login = useCallback(
    async (identifier, password) => {
      const response = await auth.login({
        identifier,
        password,
      })

      const token = response?.token

      if (
        typeof token !== 'string' ||
        !token.trim()
      ) {
        throw new Error(
          'The server did not return a valid authentication token.',
        )
      }

      // Invalidate any previous account session.
      authVersionRef.current += 1
      sessionRequestRef.current = null

      tokenStore.clear()
      setUser(null)
      queryClient.clear()

      resetUnauthorizedState()
      tokenStore.set(token)

      try {
        const authenticatedUser =
          await loadSession()

        setBooting(false)

        return authenticatedUser
      } catch (error) {
        // Only clear the token belonging to this login.
        if (tokenStore.get() === token) {
          clearSession()
        }

        throw error
      }
    },
    [clearSession, loadSession, queryClient],
  )

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(() => {
    clearSession()
    resetUnauthorizedState()
  }, [clearSession])

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo(
    () => ({
      user,
      booting,

      login,
      logout,

      refresh: loadSession,

      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      isUser: user?.role === 'USER',
    }),
    [
      user,
      booting,
      login,
      logout,
      loadSession,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  )
}

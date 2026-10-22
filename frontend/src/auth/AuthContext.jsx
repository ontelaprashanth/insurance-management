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
   Render Cold-Start Handling
   Concurrent Session Protection

   Compatible with:
   - src/api/client.js
   - src/api/endpoints.js
========================================================= */

const Ctx = createContext(null)

/* =========================================================
   HELPERS
========================================================= */

function normalizeRole(role) {
  const value = String(role ?? '')
    .trim()
    .toUpperCase()

  if (value === 'ROLE_ADMIN') return 'ADMIN'
  if (value === 'ROLE_USER') return 'USER'

  return value
}

function validRole(role) {
  return role === 'ADMIN' || role === 'USER'
}

function normalizeSession(session) {
  const payload = session?.user ?? session

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'The server returned an invalid session.',
    )
  }

  const role = normalizeRole(
    payload.role ?? session?.role,
  )

  if (!validRole(role)) {
    throw new Error(
      'Your account role could not be verified.',
    )
  }

  return {
    ...payload,
    role,
  }
}

function isUnauthorized(error) {
  return (
    error?.response?.status === 401 ||
    error?.response?.status === 403
  )
}

function isTemporaryFailure(error) {
  const status = error?.response?.status

  return (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    status === 408 ||
    status === 429 ||
    status >= 500
  )
}

/* =========================================================
   AUTH HOOK
========================================================= */

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

  /* =======================================================
     STATE
  ======================================================= */

  const [user, setUser] = useState(null)

  const [booting, setBooting] = useState(true)

  const [sessionError, setSessionError] = useState(null)

  const [sessionChecking, setSessionChecking] =
    useState(false)

  /* =======================================================
     REFS

     authVersionRef:
     Prevents stale asynchronous responses from changing
     the currently authenticated account.

     sessionRequestRef:
     Deduplicates simultaneous /api/session requests.

     mountedRef:
     Prevents state updates after provider unmount.
  ======================================================= */

  const authVersionRef = useRef(0)

  const sessionRequestRef = useRef(null)

  const mountedRef = useRef(false)

  /* =======================================================
     CLEAR AUTHENTICATION STATE

     Called on:
     - Logout
     - Confirmed session expiration
     - Invalid authenticated session

     Also removes cached account-specific data.
  ======================================================= */

  const clearSession = useCallback(() => {
    authVersionRef.current += 1

    sessionRequestRef.current = null

    tokenStore.clear()

    queryClient.cancelQueries()
    queryClient.clear()

    if (mountedRef.current) {
      setUser(null)
      setBooting(false)
      setSessionChecking(false)
      setSessionError(null)
    }
  }, [queryClient])

  /* =======================================================
     LOAD CURRENT SESSION

     Validates the JWT with the backend.

     Important:
     - An HTTP 401 means the token is no longer accepted.
     - A temporary network error does not prove the token
       is invalid.
     - Stale responses cannot replace a newer login.
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

    if (mountedRef.current) {
      setSessionChecking(true)
      setSessionError(null)
    }

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

        const authenticatedUser =
          normalizeSession(session)

        if (mountedRef.current) {
          setUser(authenticatedUser)
          setSessionError(null)
          setBooting(false)
        }

        return authenticatedUser
      })
      .catch((error) => {
        const sameSession =
          version === authVersionRef.current &&
          tokenStore.get() === token

        if (!sameSession) {
          throw error
        }

        if (isUnauthorized(error)) {
          clearSession()
        } else if (mountedRef.current) {
          setSessionError(error)
        }

        throw error
      })
      .finally(() => {
        if (
          sessionRequestRef.current?.promise === request
        ) {
          sessionRequestRef.current = null
        }

        if (
          version === authVersionRef.current &&
          mountedRef.current
        ) {
          setSessionChecking(false)
        }
      })

    sessionRequestRef.current = {
      token,
      promise: request,
    }

    return request
  }, [clearSession])

  /* =======================================================
     INITIAL SESSION RESTORATION

     On page refresh:
     - Read existing token.
     - Validate with backend.
     - Restore authenticated user.
     - Preserve token during temporary network failures.

     The app does not treat a temporary backend failure
     as a successful authentication.
  ======================================================= */

  useEffect(() => {
    mountedRef.current = true

    let cancelled = false

    async function initialize() {
      const token = tokenStore.get()

      if (!token) {
        if (!cancelled) {
          setUser(null)
          setBooting(false)
          setSessionError(null)
        }

        return
      }

      try {
        await loadSession()
      } catch (error) {
        if (cancelled) return

        if (!isUnauthorized(error)) {
          console.warn(
            'InsureX session restoration failed:',
            error,
          )

          // Keep the token for a later verification attempt.
          // Do not mark the user as authenticated.
          if (
            isTemporaryFailure(error) &&
            tokenStore.get()
          ) {
            setSessionError(error)
          }
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
      mountedRef.current = false
    }
  }, [loadSession])

  /* =======================================================
     UNAUTHORIZED HANDLER

     client.js invokes this only when a 401 belongs
     to the current JWT session.
  ======================================================= */

  useEffect(() => {
    setUnauthorizedHandler(clearSession)

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession])

  /* =======================================================
     LOGIN

     Supported identifiers:
     - Username
     - Email
     - Mobile number

     Steps:
     1. Authenticate credentials.
     2. Receive JWT.
     3. Clear previous account cache.
     4. Save JWT.
     5. Validate /api/session.
     6. Return authenticated user.

     An older login response cannot overwrite a newer
     login attempt.
  ======================================================= */

  const login = useCallback(
    async (identifier, password) => {
      const loginVersion =
        ++authVersionRef.current

      sessionRequestRef.current = null

      if (mountedRef.current) {
        setSessionError(null)
      }

      const response = await auth.login({
        identifier: String(identifier ?? '').trim(),
        password,
      })

      if (
        loginVersion !== authVersionRef.current
      ) {
        throw new Error(
          'A newer authentication action has replaced this login.',
        )
      }

      const token = response?.token

      if (
        typeof token !== 'string' ||
        !token.trim()
      ) {
        throw new Error(
          'The server did not return a valid authentication token.',
        )
      }

      // Remove any previous user's cached data.
      queryClient.cancelQueries()
      queryClient.clear()

      tokenStore.clear()

      if (mountedRef.current) {
        setUser(null)
        setBooting(true)
      }

      resetUnauthorizedState()
      tokenStore.set(token)

      try {
        const authenticatedUser =
          await loadSession()

        if (
          loginVersion !== authVersionRef.current ||
          tokenStore.get() !== token
        ) {
          throw new Error(
            'The authentication session changed during login.',
          )
        }

        if (mountedRef.current) {
          setBooting(false)
          setSessionError(null)
        }

        return authenticatedUser
      } catch (error) {
        // Login has not been completed successfully.
        // Do not retain an unverified authenticated session.
        if (
          loginVersion === authVersionRef.current &&
          tokenStore.get() === token
        ) {
          clearSession()
        }

        throw error
      }
    },
    [
      clearSession,
      loadSession,
      queryClient,
    ],
  )

  /* =======================================================
     LOGOUT

     Clears:
     - JWT
     - Authenticated user
     - Pending session reference
     - React Query cache
  ======================================================= */

  const logout = useCallback(() => {
    clearSession()
    resetUnauthorizedState()
  }, [clearSession])

  /* =======================================================
     REFRESH SESSION

     Useful after:
     - Profile updates
     - Returning to the browser tab
     - Temporary backend outages
  ======================================================= */

  const refresh = useCallback(async () => {
    const token = tokenStore.get()

    if (!token) {
      clearSession()

      throw new Error(
        'No active session. Please sign in.',
      )
    }

    return loadSession()
  }, [clearSession, loadSession])

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo(
    () => ({
      user,
      booting,

      login,
      logout,
      refresh,

      sessionChecking,
      sessionError,

      isAuthenticated: Boolean(user),

      isAdmin:
        user?.role === 'ADMIN',

      isUser:
        user?.role === 'USER',

      hasStoredSession:
        Boolean(tokenStore.get()),
    }),
    [
      user,
      booting,
      login,
      logout,
      refresh,
      sessionChecking,
      sessionError,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  )
}

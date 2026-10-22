import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import AuthShell from './AuthShell'

import {
  Button,
  PasswordInput,
  TextInput,
} from '../../components/ui'

import { useAuth } from '../../auth/AuthContext'

import { errorMessage } from '../../api/client'

/* =========================================================
   INSUREX — SECURE LOGIN PAGE

   Username / Email / Mobile Authentication
   JWT Session Initialization
   Role-Based Redirect
   Protected Route Restoration
   Duplicate Submission Protection
   Render Backend Error Handling

   Compatible with:
   - AuthContext.jsx
   - App.jsx
   - api/client.js
   - api/endpoints.js
========================================================= */

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

function roleHome(role) {
  return role === 'ADMIN'
    ? '/admin'
    : '/app'
}

/*
   Only restore destinations belonging to the
   authenticated user's role.

   This prevents redirects to:
   - External websites
   - Other user roles
   - Login / registration pages
*/

function safeDestination(from, role) {
  const fallback = roleHome(role)

  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.includes('\\')
  ) {
    return fallback
  }

  const allowedPrefix =
    role === 'ADMIN'
      ? '/admin'
      : '/app'

  if (
    from === allowedPrefix ||
    from.startsWith(`${allowedPrefix}/`) ||
    from.startsWith(`${allowedPrefix}?`) ||
    from.startsWith(`${allowedPrefix}#`)
  ) {
    return from
  }

  return fallback
}

/* =========================================================
   LOGIN COMPONENT
========================================================= */

export default function Login() {
  const { login } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [identifier, setIdentifier] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  /* =======================================================
     REFS

     submissionLock:
     Prevents duplicate login requests before React
     finishes updating the loading state.

     mountedRef:
     Prevents form state updates after navigation.
  ======================================================= */

  const submissionLock = useRef(false)

  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  /* =======================================================
     CLEAR ERROR WHEN EDITING
  ======================================================= */

  function updateIdentifier(event) {
    setIdentifier(event.target.value)

    if (error) {
      setError('')
    }
  }

  function updatePassword(event) {
    setPassword(event.target.value)

    if (error) {
      setError('')
    }
  }

  /* =======================================================
     LOGIN SUBMISSION
  ======================================================= */

  async function submit(event) {
    event.preventDefault()

    if (
      submissionLock.current ||
      loading
    ) {
      return
    }

    setError('')

    const cleanIdentifier =
      identifier.trim()

    if (!cleanIdentifier) {
      setError(
        'Enter your username, email or mobile number.',
      )
      return
    }

    if (!password) {
      setError(
        'Enter your password.',
      )
      return
    }

    submissionLock.current = true
    setLoading(true)

    try {
      /* ===============================================
         AUTHENTICATE WITH BACKEND
      =============================================== */

      const session = await login(
        cleanIdentifier,
        password,
      )

      const role = normalizeRole(
        session?.role,
      )

      if (
        role !== 'ADMIN' &&
        role !== 'USER'
      ) {
        throw new Error(
          'Your account role could not be verified. Please contact support.',
        )
      }

      /* ===============================================
         RESTORE REQUESTED PROTECTED ROUTE

         Example:

         Guest opens:
         /app/purchases

         App redirects to:
         /login

         After login:
         /app/purchases

         If the requested route belongs to another
         role, redirect to the correct dashboard.
      =============================================== */

      const destination = safeDestination(
        location.state?.from,
        role,
      )

      navigate(destination, {
        replace: true,
      })
    } catch (err) {
      if (mountedRef.current) {
        setError(
          errorMessage(
            err,
            'Sign-in failed. Check your details and try again.',
          ),
        )
      }
    } finally {
      submissionLock.current = false

      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <AuthShell
      headline="Welcome back."
      text="Sign in to manage your policies, track claims and see what is due."
    >
      <h1>Sign in</h1>

      <p className="sub">
        Use your username, email or mobile number.
      </p>

      <form
        className="stack"
        onSubmit={submit}
        noValidate
      >
        {/* =============================================
            ERROR MESSAGE
        ============================================= */}

        {error && (
          <div
            className="alert error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* =============================================
            USERNAME / EMAIL / MOBILE
        ============================================= */}

        <TextInput
          label="Username, email or mobile"
          value={identifier}
          onChange={updateIdentifier}
          autoComplete="username"
          autoFocus
          disabled={loading}
        />

        {/* =============================================
            PASSWORD
        ============================================= */}

        <PasswordInput
          label="Password"
          value={password}
          onChange={updatePassword}
          autoComplete="current-password"
          disabled={loading}
        />

        {/* =============================================
            FORGOT PASSWORD
        ============================================= */}

        <div className="row spread">
          <span />

          <Link
            to="/forgot-password"
            aria-disabled={loading}
            onClick={(event) => {
              if (loading) {
                event.preventDefault()
              }
            }}
          >
            Forgot password?
          </Link>
        </div>

        {/* =============================================
            LOGIN BUTTON
        ============================================= */}

        <Button
          variant="dark"
          size="lg"
          block
          loading={loading}
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Signing in…'
            : 'Sign in'}
        </Button>

        {/* =============================================
            REGISTER LINK
        ============================================= */}

        <p
          className="muted"
          style={{
            textAlign: 'center',
          }}
        >
          New here?{' '}

          <Link
            to="/register"
            onClick={(event) => {
              if (loading) {
                event.preventDefault()
              }
            }}
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

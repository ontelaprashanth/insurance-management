
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

function normalizeRole(role) {
  const value = String(role ?? '')
    .trim()
    .toUpperCase()

  if (value === 'ROLE_ADMIN') return 'ADMIN'
  if (value === 'ROLE_USER') return 'USER'

  return value
}

function roleHome(role) {
  return role === 'ADMIN' ? '/admin' : '/app'
}

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
    role === 'ADMIN' ? '/admin' : '/app'

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

export default function Login() {
  const { login } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submissionLock = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

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

  async function submit(event) {
    event.preventDefault()

    if (submissionLock.current || loading) {
      return
    }

    setError('')

    const cleanIdentifier = identifier.trim()

    if (!cleanIdentifier) {
      setError(
        'Enter your username, email or mobile number.',
      )
      return
    }

    if (!password) {
      setError('Enter your password.')
      return
    }

    submissionLock.current = true
    setLoading(true)

    try {
      const session = await login(
        cleanIdentifier,
        password,
      )

      const role = normalizeRole(session?.role)

      if (role !== 'ADMIN' && role !== 'USER') {
        throw new Error(
          'Your account role could not be verified. Please contact support.',
        )
      }

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

  return (
    <AuthShell
      headline="Welcome back."
      text="Sign in to manage your policies, track claims and see what is due."
    >
      <style>{`
        .ix-login {
          --login-green: #087f5b;
          --login-dark: #07563e;
          width: 100%;
          color: #183b2c;
          animation: ix-login-enter 650ms cubic-bezier(.2,.7,.2,1) both;
        }

        .ix-login *,
        .ix-login *::before,
        .ix-login *::after {
          box-sizing: border-box;
        }

        .ix-login-heading {
          margin: 0;
          color: #153b2c;
          font-size: clamp(27px, 3vw, 33px);
          font-weight: 850;
          letter-spacing: -1.1px;
          line-height: 1.25;
          animation: ix-login-item 550ms ease both;
          animation-delay: 80ms;
        }

        .ix-login-subtitle {
          margin: 9px 0 27px;
          color: #718178;
          font-size: 13px;
          line-height: 1.8;
          animation: ix-login-item 550ms ease both;
          animation-delay: 150ms;
        }

        .ix-login-form {
          display: flex;
          flex-direction: column;
          gap: 19px;
          width: 100%;
        }

        .ix-login-field {
          min-width: 0;
          animation: ix-login-item 550ms ease both;
        }

        .ix-login-field:nth-of-type(1) {
          animation-delay: 200ms;
        }

        .ix-login-field:nth-of-type(2) {
          animation-delay: 280ms;
        }

        .ix-login-form input {
          max-width: 100%;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .ix-login-form input:focus {
          outline-color: #0c996b;
        }

        .ix-login-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 14px;
          border: 1px solid #f2caca;
          border-radius: 10px;
          color: #a52b2b;
          background: #fff5f5;
          font-size: 12px;
          line-height: 1.65;
          overflow-wrap: anywhere;
          animation:
            ix-login-error-in 350ms ease both,
            ix-login-shake 380ms ease 120ms both;
        }

        .ix-login-error-icon {
          display: grid;
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          place-items: center;
          border-radius: 50%;
          color: #ffffff;
          background: #c74747;
          font-size: 12px;
          font-weight: 850;
        }

        .ix-login-options {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: -5px;
          animation: ix-login-item 550ms ease both;
          animation-delay: 340ms;
        }

        .ix-login-link {
          color: var(--login-green) !important;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          transition:
            color 180ms ease,
            transform 180ms ease;
        }

        .ix-login-link:hover {
          color: var(--login-dark) !important;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .ix-login-link:active {
          transform: scale(.98);
        }

        .ix-login-link[aria-disabled="true"] {
          pointer-events: none;
          opacity: 0.6;
        }

        .ix-login-submit {
          width: 100%;
          margin-top: 2px;
          animation: ix-login-item 550ms ease both;
          animation-delay: 400ms;
        }

        .ix-login-submit button {
          width: 100%;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .ix-login-submit button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 9px 22px rgba(8, 127, 91, .2);
        }

        .ix-login-submit button:active:not(:disabled) {
          transform: translateY(0) scale(.99);
        }

        .ix-login-submit button:disabled {
          cursor: not-allowed;
        }

        .ix-login-register {
          margin: 3px 0 0;
          color: #718178;
          font-size: 12px;
          line-height: 1.8;
          text-align: center;
          animation: ix-login-item 550ms ease both;
          animation-delay: 470ms;
        }

        .ix-login-register a {
          color: var(--login-green);
          font-weight: 800;
          text-decoration: none;
          transition: color 180ms ease;
        }

        .ix-login-register a:hover {
          color: var(--login-dark);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .ix-login-bottom-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 25px;
          color: #89968e;
          font-size: 10px;
          line-height: 1.6;
          text-align: center;
          animation: ix-login-item 600ms ease both;
          animation-delay: 520ms;
        }

        .ix-login-bottom-note span {
          color: var(--login-green);
          font-size: 13px;
        }

        @keyframes ix-login-enter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-login-item {
          from {
            opacity: 0;
            transform: translateY(9px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-login-error-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-login-shake {
          0%, 100% { translate: 0 0; }
          25% { translate: -3px 0; }
          50% { translate: 3px 0; }
          75% { translate: -2px 0; }
        }

        @media (max-width: 680px) {
          .ix-login-heading {
            font-size: 28px;
          }

          .ix-login-subtitle {
            margin-bottom: 23px;
            font-size: 12px;
          }

          .ix-login-form {
            gap: 17px;
          }

          .ix-login-bottom-note {
            margin-top: 21px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-login,
          .ix-login *,
          .ix-login *::before,
          .ix-login *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <section className="ix-login">
        <h1 className="ix-login-heading">
          Sign in
        </h1>

        <p className="ix-login-subtitle">
          Use your username, email or mobile number to access your account.
        </p>

        <form
          className="ix-login-form"
          onSubmit={submit}
          noValidate
        >
          {error && (
            <div
              className="ix-login-error"
              role="alert"
              aria-live="polite"
            >
              <span
                className="ix-login-error-icon"
                aria-hidden="true"
              >
                !
              </span>

              <span>{error}</span>
            </div>
          )}

          <div className="ix-login-field">
            <TextInput
              label="Username, email or mobile"
              value={identifier}
              onChange={updateIdentifier}
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="ix-login-field">
            <PasswordInput
              label="Password"
              value={password}
              onChange={updatePassword}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div className="ix-login-options">
            <Link
              className="ix-login-link"
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

          <div className="ix-login-submit">
            <Button
              variant="dark"
              size="lg"
              block
              loading={loading}
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>

          <p className="ix-login-register">
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

        <div className="ix-login-bottom-note">
          <span aria-hidden="true">✓</span>
          Your insurance account, all in one place
        </div>
      </section>
    </AuthShell>
  )
}


import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AuthShell from './AuthShell'
import { Button, PasswordInput, TextInput } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { errorMessage } from '../../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()

    if (loading) return

    setError('')

    const cleanIdentifier = identifier.trim()

    if (!cleanIdentifier || !password) {
      setError(
        'Enter your username, email or mobile number and your password.',
      )
      return
    }

    setLoading(true)

    try {
      const session = await login(cleanIdentifier, password)

      const role = String(session?.role || '').toUpperCase()

      if (role !== 'ADMIN' && role !== 'USER') {
        setError('Your account role could not be verified. Please contact support.')
        return
      }

      navigate(role === 'ADMIN' ? '/admin' : '/app', {
        replace: true,
      })
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Sign-in failed. Check your details and try again.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

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
        {error && (
          <div className="alert error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <TextInput
          label="Username, email or mobile"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value)
            if (error) setError('')
          }}
          autoComplete="username"
          autoFocus
          disabled={loading}
        />

        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (error) setError('')
          }}
          autoComplete="current-password"
          disabled={loading}
        />

        <div className="row spread">
          <span />
          <Link to="/forgot-password">
            Forgot password?
          </Link>
        </div>

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

        <p className="muted" style={{ textAlign: 'center' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  )
}

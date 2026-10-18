import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { Button, PasswordInput, TextInput } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { errorMessage } from '../../api/client'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError('Enter your username, email or mobile number and your password.')
      return
    }
    setLoading(true)
    try {
      const s = await login(identifier.trim(), password)
      nav(String(s.role).toUpperCase() === 'ADMIN' ? '/admin' : '/app', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed. Check your details and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell headline="Welcome back." text="Sign in to manage your policies, track claims and see what is due.">
      <h1>Sign in</h1>
      <p className="sub">Use your username, email or mobile number.</p>
      <form className="stack" onSubmit={submit} noValidate>
        {error && <div className="alert error" role="alert">{error}</div>}
        <TextInput label="Username, email or mobile" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus />
        <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <div className="row spread">
          <span />
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button variant="dark" size="lg" block loading={loading} type="submit">Sign in</Button>
        <p className="muted" style={{ textAlign: 'center' }}>New here? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { Button, PasswordInput, TextInput, useToast } from '../../components/ui'
import { auth } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

const PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

export default function ForgotPassword() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode(e) {
    e?.preventDefault()
    if (!identifier.trim()) return setError('Enter your username, email or mobile number.')
    setError(''); setLoading(true)
    try {
      await auth.forgotPassword(identifier.trim())
      toast.success('Code sent. It may take a minute to arrive.')
      setStep(1)
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code.'))
    } finally { setLoading(false) }
  }

  async function reset(e) {
    e.preventDefault()
    if (!/^\d{4,8}$/.test(otp.trim())) return setError('Enter the code you received.')
    if (!PW.test(password)) return setError('Password needs 8+ characters with upper and lower case, a number and one of @$!%*?&')
    if (password !== confirm) return setError('The two passwords do not match.')
    setError(''); setLoading(true)
    try {
      await auth.resetPassword({ identifier: identifier.trim(), otp: otp.trim(), newPassword: password })
      toast.success('Password updated. Sign in with the new one.')
      nav('/login', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password.'))
    } finally { setLoading(false) }
  }

  return (
    <AuthShell headline="Locked out? It happens." text="We will send a one-time code to the contact on your account.">
      <h1>Reset password</h1>
      <p className="sub">{step === 0 ? 'Tell us which account to reset.' : `Enter the code sent for ${identifier} and choose a new password.`}</p>
      <form className="stack" onSubmit={step === 0 ? sendCode : reset} noValidate>
        {error && <div className="alert error" role="alert">{error}</div>}
        {step === 0 ? (
          <>
            <TextInput label="Username, email or mobile" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus />
            <Button variant="dark" size="lg" block loading={loading} type="submit">Send code</Button>
          </>
        ) : (
          <>
            <TextInput label="One-time code" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} autoComplete="one-time-code" autoFocus />
            <PasswordInput label="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <PasswordInput label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            <Button variant="dark" size="lg" block loading={loading} type="submit">Update password</Button>
            <button type="button" className="link-btn" onClick={sendCode}>Send a new code</button>
          </>
        )}
        <p className="muted" style={{ textAlign: 'center' }}><Link to="/login">Back to sign in</Link></p>
      </form>
    </AuthShell>
  )
}

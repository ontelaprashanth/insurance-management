import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { Button, PasswordInput, TextInput, useToast } from '../../components/ui'
import { users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

// Same rules the backend enforces on UserDto.
const RULES = {
  username: (v) => (v.trim().length < 3 ? 'Use at least 3 characters.' : ''),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address.'),
  password: (v) => (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v) ? '' : 'Min 8 characters with upper and lower case, a number and one of @$!%*?&'),
  contactNumber: (v) => (/^[6-9]\d{9}$/.test(v) ? '' : 'Enter a 10-digit mobile number starting with 6–9.'),
  occupation: (v) => (v.trim() ? '' : 'Enter your occupation.'),
  income: (v) => (v !== '' && Number(v) >= 0 ? '' : 'Enter your yearly income.'),
  aadharNumber: (v) => (/^\d{12}$/.test(v) ? '' : 'Aadhaar must be exactly 12 digits.'),
  bankName: (v) => (v.trim() ? '' : 'Enter your bank name.'),
  accountNumber: (v) => (/^\d{9,18}$/.test(v) ? '' : 'Account number must be 9–18 digits.'),
  ifscCode: (v) => (/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) ? '' : 'Enter a valid IFSC code, like HDFC0001234.'),
}

const EMPTY = { username: '', email: '', password: '', contactNumber: '', occupation: '', income: '', aadharNumber: '', bankName: '', accountNumber: '', ifscCode: '' }

export default function Register() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }))
    if (errors[k]) setErrors((s) => ({ ...s, [k]: '' }))
  }
  const groups = [
    ['username', 'email', 'password', 'contactNumber'],
    ['occupation', 'income', 'aadharNumber', 'bankName', 'accountNumber', 'ifscCode'],
  ]

  function validate(keys) {
    const next = {}
    keys.forEach((k) => { const m = RULES[k](f[k]); if (m) next[k] = m })
    setErrors((s) => ({ ...s, ...next }))
    return Object.keys(next).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (step === 0) {
      if (validate(groups[0])) setStep(1)
      return
    }
    if (!validate(groups[1])) return
    setServerError('')
    setLoading(true)
    try {
      await users.register({ ...f, username: f.username.trim(), email: f.email.trim(), income: Number(f.income), ifscCode: f.ifscCode.toUpperCase() })
      toast.success('Account created. Sign in to continue.')
      nav('/login', { replace: true })
    } catch (err) {
      setServerError(errorMessage(err, 'Could not create your account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell headline="Cover starts with an account." text="Two short steps. Your bank details are used to pay out approved claims.">
      <h1>Create your account</h1>
      <p className="sub">Step {step + 1} of 2 — {step === 0 ? 'Sign-in details' : 'Profile and payout account'}</p>
      <form className="stack" onSubmit={submit} noValidate>
        {serverError && <div className="alert error" role="alert">{serverError}</div>}
        {step === 0 ? (
          <>
            <TextInput label="Username" value={f.username} onChange={set('username')} error={errors.username} autoComplete="username" autoFocus />
            <TextInput label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" />
            <TextInput label="Mobile number" inputMode="numeric" maxLength={10} value={f.contactNumber} onChange={set('contactNumber')} error={errors.contactNumber} autoComplete="tel" />
            <PasswordInput label="Password" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="8+ characters with upper and lower case, a number and a symbol (@$!%*?&)" />
          </>
        ) : (
          <>
            <div className="form-grid">
              <TextInput label="Occupation" value={f.occupation} onChange={set('occupation')} error={errors.occupation} />
              <TextInput label="Yearly income (₹)" type="number" min="0" value={f.income} onChange={set('income')} error={errors.income} />
              <div className="full"><TextInput label="Aadhaar number" inputMode="numeric" maxLength={12} value={f.aadharNumber} onChange={set('aadharNumber')} error={errors.aadharNumber} /></div>
              <TextInput label="Bank name" value={f.bankName} onChange={set('bankName')} error={errors.bankName} />
              <TextInput label="Account number" inputMode="numeric" maxLength={18} value={f.accountNumber} onChange={set('accountNumber')} error={errors.accountNumber} />
              <div className="full"><TextInput label="IFSC code" value={f.ifscCode} onChange={set('ifscCode')} error={errors.ifscCode} maxLength={11} style={{ textTransform: 'uppercase' }} /></div>
            </div>
          </>
        )}
        <div className="row">
          {step === 1 && <Button type="button" onClick={() => setStep(0)}>Back</Button>}
          <Button variant="dark" size="lg" className="grow" loading={loading} type="submit">{step === 0 ? 'Continue' : 'Create account'}</Button>
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  )
}

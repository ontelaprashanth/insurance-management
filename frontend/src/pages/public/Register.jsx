import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react'
import AuthShell from './AuthShell'
import { Button, PasswordInput, TextInput, useToast } from '../../components/ui'
import { users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

// Common Indian banks. "Other bank" supports banks not listed here.
const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
  'Bank of India', 'Indian Bank', 'Central Bank of India', 'UCO Bank',
  'Indian Overseas Bank', 'Bank of Maharashtra', 'Punjab & Sind Bank',
  'IDBI Bank', 'Kotak Mahindra Bank', 'IndusInd Bank', 'YES Bank',
  'Federal Bank', 'South Indian Bank', 'Karnataka Bank', 'Karur Vysya Bank',
  'City Union Bank', 'Tamilnad Mercantile Bank', 'DCB Bank', 'RBL Bank',
  'Bandhan Bank', 'IDFC FIRST Bank', 'CSB Bank', 'Jammu & Kashmir Bank',
  'Nainital Bank', 'Dhanlaxmi Bank', 'AU Small Finance Bank',
  'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank', 'Suryoday Small Finance Bank',
  'ESAF Small Finance Bank', 'Utkarsh Small Finance Bank',
  'North East Small Finance Bank', 'Shivalik Small Finance Bank',
  'India Post Payments Bank', 'Airtel Payments Bank', 'Fino Payments Bank',
  'NSDL Payments Bank', 'Telangana Grameena Bank', 'Andhra Pradesh Grameena Bank',
  'Other bank',
]

const RULES = {
  username: (v) => v.trim().length >= 3 ? '' : 'Use at least 3 characters.',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.',
  password: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v)
    ? '' : 'Use 8+ characters with uppercase, lowercase, a number and a symbol (@$!%*?&).',
  contactNumber: (v) => /^[6-9]\d{9}$/.test(v.trim()) ? '' : 'Enter a 10-digit mobile number starting with 6–9.',
  occupation: (v) => v.trim() ? '' : 'Enter your occupation.',
  income: (v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? '' : 'Enter a valid yearly income.',
  aadharNumber: (v) => /^\d{12}$/.test(v.trim()) ? '' : 'Aadhaar must be exactly 12 digits.',
  bankName: (v) => v.trim() ? '' : 'Select or enter your bank name.',
  accountNumber: (v) => /^\d{9,18}$/.test(v.trim()) ? '' : 'Account number must be 9–18 digits.',
  ifscCode: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v.trim()) ? '' : 'Enter a valid 11-character IFSC code.',
}

const EMPTY = {
  username: '', email: '', password: '', contactNumber: '',
  occupation: '', income: '', aadharNumber: '', bankName: '',
  accountNumber: '', ifscCode: '',
}

const GROUPS = [
  ['username', 'email', 'password', 'contactNumber'],
  ['occupation', 'income', 'aadharNumber', 'bankName', 'accountNumber', 'ifscCode'],
]

function BankSelector({ value, onChange, error, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState(false)
  const matches = useMemo(() => BANKS.filter((bank) =>
    bank.toLowerCase().includes(query.trim().toLowerCase()),
  ), [query])

  function choose(bank) {
    if (bank === 'Other bank') {
      setCustom(true)
      onChange('')
    } else {
      setCustom(false)
      onChange(bank)
    }
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="ix-bank-field">
      <label className="ix-bank-label" htmlFor="ix-bank-select">Bank name</label>
      {custom ? (
        <div className="ix-bank-custom">
          <input id="ix-bank-select" className="ix-bank-input" value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your bank name" disabled={disabled} autoComplete="organization" />
          <button type="button" className="ix-bank-reset" onClick={() => { setCustom(false); onChange(''); setOpen(true) }} disabled={disabled}>
            Choose bank
          </button>
        </div>
      ) : (
        <>
          <button id="ix-bank-select" type="button" className="ix-bank-trigger"
            aria-expanded={open} aria-haspopup="listbox" disabled={disabled}
            onClick={() => setOpen((s) => !s)}>
            <Building2 size={18} aria-hidden="true" />
            <span className={value ? '' : 'ix-bank-placeholder'}>{value || 'Select your bank'}</span>
            <ChevronDown size={17} aria-hidden="true" />
          </button>
          {open && (
            <div className="ix-bank-menu">
              <div className="ix-bank-search">
                <Search size={16} aria-hidden="true" />
                <input autoFocus aria-label="Search banks" value={query}
                  onChange={(e) => setQuery(e.target.value)} placeholder="Search bank name" />
                <button type="button" aria-label="Close bank list" onClick={() => setOpen(false)}><X size={16} /></button>
              </div>
              <div className="ix-bank-options" role="listbox" aria-label="Indian banks">
                {matches.length ? matches.map((bank) => (
                  <button key={bank} type="button" role="option" aria-selected={value === bank}
                    className="ix-bank-option" onClick={() => choose(bank)}>
                    <Building2 size={17} aria-hidden="true" />
                    <span>{bank}</span>
                    {value === bank && <Check size={16} aria-hidden="true" />}
                  </button>
                )) : <div className="ix-bank-empty">No matching bank. Choose “Other bank” to enter it manually.</div>}
              </div>
              {!matches.includes('Other bank') && (
                <button type="button" className="ix-bank-other" onClick={() => choose('Other bank')}>
                  Other bank — enter manually
                </button>
              )}
            </div>
          )}
        </>
      )}
      {error && <small className="ix-bank-error" role="alert">{error}</small>}
    </div>
  )
}

export default function Register() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (event) => {
    const value = event.target.value
    setF((s) => ({ ...s, [key]: value }))
    setErrors((s) => ({ ...s, [key]: '' }))
    setServerError('')
  }

  function setBank(value) {
    setF((s) => ({ ...s, bankName: value }))
    setErrors((s) => ({ ...s, bankName: '' }))
    setServerError('')
  }

  function validate(keys) {
    const next = {}
    keys.forEach((key) => {
      const message = RULES[key](String(f[key] ?? ''))
      if (message) next[key] = message
    })
    setErrors((prev) => {
      const result = { ...prev }
      keys.forEach((key) => { delete result[key] })
      return { ...result, ...next }
    })
    return Object.keys(next).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    if (loading) return
    if (step === 0) {
      if (validate(GROUPS[0])) setStep(1)
      return
    }
    if (!validate(GROUPS[0])) { setStep(0); return }
    if (!validate(GROUPS[1])) return
    setServerError('')
    setLoading(true)
    try {
      await users.register({
        ...f,
        username: f.username.trim(),
        email: f.email.trim(),
        contactNumber: f.contactNumber.trim(),
        occupation: f.occupation.trim(),
        income: Number(f.income),
        aadharNumber: f.aadharNumber.trim(),
        bankName: f.bankName.trim(),
        accountNumber: f.accountNumber.trim(),
        ifscCode: f.ifscCode.trim().toUpperCase(),
      })
      toast.success('Account created. Sign in to continue.')
      nav('/login', { replace: true })
    } catch (error) {
      setServerError(errorMessage(error, 'Could not create your account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell headline="Cover starts with an account." text="Two short steps. Your bank details are used to pay out approved claims.">
      <style>{`
        .ix-bank-field { position: relative; min-width: 0; }
        .ix-bank-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; }
        .ix-bank-trigger, .ix-bank-input { width: 100%; min-height: 44px; border: 1px solid #cbd5e1; border-radius: 10px; background: var(--surface, #fff); color: var(--text, #0f172a); padding: 10px 12px; font: inherit; }
        .ix-bank-trigger { display: flex; align-items: center; gap: 9px; text-align: left; cursor: pointer; }
        .ix-bank-trigger span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ix-bank-placeholder { color: #64748b; }
        .ix-bank-menu { position: absolute; z-index: 30; top: calc(100% - 1px); left: 0; right: 0; min-width: min(280px, 90vw); border: 1px solid #cbd5e1; border-radius: 12px; background: var(--surface, #fff); box-shadow: 0 14px 30px rgba(15,23,42,.15); overflow: hidden; }
        .ix-bank-search { display: flex; align-items: center; gap: 8px; padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .ix-bank-search input { flex: 1; min-width: 0; border: 0; outline: 0; font: inherit; background: transparent; color: inherit; }
        .ix-bank-search button { border: 0; background: transparent; cursor: pointer; display: flex; }
        .ix-bank-options { max-height: 240px; overflow-y: auto; }
        .ix-bank-option, .ix-bank-other { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; padding: 10px 12px; text-align: left; font: inherit; cursor: pointer; }
        .ix-bank-option:hover, .ix-bank-other:hover { background: rgba(100,116,139,.1); }
        .ix-bank-option span { flex: 1; }
        .ix-bank-other { border-top: 1px solid #e2e8f0; font-weight: 600; }
        .ix-bank-empty { padding: 12px; font-size: 13px; color: #64748b; }
        .ix-bank-custom { display: flex; gap: 8px; align-items: center; }
        .ix-bank-custom input { min-width: 0; flex: 1; }
        .ix-bank-reset { border: 0; background: transparent; color: #2563eb; cursor: pointer; font: inherit; white-space: nowrap; }
        .ix-bank-error { display: block; color: #dc2626; margin-top: 5px; }
        @media(max-width:480px) { .ix-bank-custom { flex-wrap: wrap; } }
      `}</style>
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
          <div className="form-grid">
            <TextInput label="Occupation" value={f.occupation} onChange={set('occupation')} error={errors.occupation} />
            <TextInput label="Yearly income (₹)" type="number" min="0" value={f.income} onChange={set('income')} error={errors.income} />
            <div className="full"><TextInput label="Aadhaar number" inputMode="numeric" maxLength={12} value={f.aadharNumber} onChange={set('aadharNumber')} error={errors.aadharNumber} /></div>
            <BankSelector value={f.bankName} onChange={setBank} error={errors.bankName} disabled={loading} />
            <TextInput label="Account number" inputMode="numeric" maxLength={18} value={f.accountNumber} onChange={set('accountNumber')} error={errors.accountNumber} />
            <div className="full"><TextInput label="IFSC code (enter manually)" value={f.ifscCode} onChange={set('ifscCode')} error={errors.ifscCode} maxLength={11} autoCapitalize="characters" style={{ textTransform: 'uppercase' }} /></div>
          </div>
        )}
        <div className="row">
          {step === 1 && <Button type="button" onClick={() => setStep(0)} disabled={loading}>Back</Button>}
          <Button variant="dark" size="lg" className="grow" loading={loading} disabled={loading} type="submit">
            {step === 0 ? 'Continue' : 'Create account'}
          </Button>
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  )
}

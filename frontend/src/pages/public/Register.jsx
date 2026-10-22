
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Check,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'

import AuthShell from './AuthShell'
import {
  Button,
  PasswordInput,
  TextInput,
  useToast,
} from '../../components/ui'

import { users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

/* =========================================================
   INSUREX — REGISTRATION

   Two-step registration
   Searchable Indian bank selector
   Mobile-responsive bank dropdown
   Existing backend API preserved
========================================================= */

/* =========================================================
   INDIAN BANKS
========================================================= */

const BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'UCO Bank',
  'Indian Overseas Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
  'IDBI Bank',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'YES Bank',
  'Federal Bank',
  'South Indian Bank',
  'Karnataka Bank',
  'Karur Vysya Bank',
  'City Union Bank',
  'Tamilnad Mercantile Bank',
  'DCB Bank',
  'RBL Bank',
  'Bandhan Bank',
  'IDFC FIRST Bank',
  'CSB Bank',
  'Jammu & Kashmir Bank',
  'Nainital Bank',
  'Dhanlaxmi Bank',
  'AU Small Finance Bank',
  'Equitas Small Finance Bank',
  'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank',
  'Suryoday Small Finance Bank',
  'ESAF Small Finance Bank',
  'Utkarsh Small Finance Bank',
  'North East Small Finance Bank',
  'Shivalik Small Finance Bank',
  'India Post Payments Bank',
  'Airtel Payments Bank',
  'Fino Payments Bank',
  'NSDL Payments Bank',
  'Telangana Grameena Bank',
  'Andhra Pradesh Grameena Bank',
  'Other bank',
]

/* =========================================================
   BANK DISPLAY

   These are visual initials, not official bank logos.
========================================================= */

const BANK_INITIALS = {
  'State Bank of India': 'SBI',
  'HDFC Bank': 'HDFC',
  'ICICI Bank': 'ICICI',
  'Axis Bank': 'AXIS',
  'Punjab National Bank': 'PNB',
  'Bank of Baroda': 'BOB',
  'Canara Bank': 'CB',
  'Union Bank of India': 'UBI',
  'Bank of India': 'BOI',
  'Indian Bank': 'IB',
  'Central Bank of India': 'CBI',
  'UCO Bank': 'UCO',
  'Indian Overseas Bank': 'IOB',
  'Bank of Maharashtra': 'BOM',
  'Punjab & Sind Bank': 'PSB',
  'IDBI Bank': 'IDBI',
  'Kotak Mahindra Bank': 'KMB',
  'IndusInd Bank': 'IIB',
  'YES Bank': 'YES',
  'Federal Bank': 'FB',
  'South Indian Bank': 'SIB',
  'Karnataka Bank': 'KB',
  'Karur Vysya Bank': 'KVB',
  'City Union Bank': 'CUB',
  'Tamilnad Mercantile Bank': 'TMB',
  'DCB Bank': 'DCB',
  'RBL Bank': 'RBL',
  'Bandhan Bank': 'BB',
  'IDFC FIRST Bank': 'IDFC',
  'CSB Bank': 'CSB',
  'Jammu & Kashmir Bank': 'J&K',
  'Nainital Bank': 'NB',
  'Dhanlaxmi Bank': 'DB',
  'AU Small Finance Bank': 'AU',
  'Equitas Small Finance Bank': 'ESF',
  'Ujjivan Small Finance Bank': 'USF',
  'Jana Small Finance Bank': 'JSF',
  'Suryoday Small Finance Bank': 'SSF',
  'ESAF Small Finance Bank': 'ESAF',
  'Utkarsh Small Finance Bank': 'USFB',
  'North East Small Finance Bank': 'NESF',
  'Shivalik Small Finance Bank': 'SSFB',
  'India Post Payments Bank': 'IPPB',
  'Airtel Payments Bank': 'APB',
  'Fino Payments Bank': 'FPB',
  'NSDL Payments Bank': 'NSDL',
  'Telangana Grameena Bank': 'TGB',
  'Andhra Pradesh Grameena Bank': 'APGB',
  'Other bank': 'OTHER',
}

function bankInitials(bank) {
  if (BANK_INITIALS[bank]) {
    return BANK_INITIALS[bank]
  }

  return bank
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

/* =========================================================
   VALIDATION
========================================================= */

const RULES = {
  username: (v) =>
    v.trim().length >= 3
      ? ''
      : 'Use at least 3 characters.',

  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
      ? ''
      : 'Enter a valid email address.',

  password: (v) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v)
      ? ''
      : 'Use 8+ characters with uppercase, lowercase, a number and a symbol (@$!%*?&).',

  contactNumber: (v) =>
    /^[6-9]\d{9}$/.test(v.trim())
      ? ''
      : 'Enter a 10-digit mobile number starting with 6–9.',

  occupation: (v) =>
    v.trim()
      ? ''
      : 'Enter your occupation.',

  income: (v) =>
    v.trim() !== '' &&
    Number.isFinite(Number(v)) &&
    Number(v) >= 0
      ? ''
      : 'Enter a valid yearly income.',

  aadharNumber: (v) =>
    /^\d{12}$/.test(v.trim())
      ? ''
      : 'Aadhaar must be exactly 12 digits.',

  bankName: (v) =>
    v.trim()
      ? ''
      : 'Select or enter your bank name.',

  accountNumber: (v) =>
    /^\d{9,18}$/.test(v.trim())
      ? ''
      : 'Account number must be 9–18 digits.',

  ifscCode: (v) =>
    /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v.trim())
      ? ''
      : 'Enter a valid 11-character IFSC code.',
}

/* =========================================================
   INITIAL FORM STATE
========================================================= */

const EMPTY = {
  username: '',
  email: '',
  password: '',
  contactNumber: '',
  occupation: '',
  income: '',
  aadharNumber: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
}

const GROUPS = [
  [
    'username',
    'email',
    'password',
    'contactNumber',
  ],
  [
    'occupation',
    'income',
    'aadharNumber',
    'bankName',
    'accountNumber',
    'ifscCode',
  ],
]

/* =========================================================
   BANK SELECTOR

   Uses a portal so parent containers cannot clip the menu.
========================================================= */

function BankSelector({
  value,
  onChange,
  error,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})

  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return BANKS
    }

    return BANKS.filter((bank) =>
      bank.toLowerCase().includes(normalized)
    )
  }, [query])

  function updatePosition() {
    const trigger = triggerRef.current

    if (!trigger) return

    const rect = trigger.getBoundingClientRect()

    const gap = 6
    const margin = 12
    const availableBelow =
      window.innerHeight - rect.bottom - margin

    const availableAbove =
      rect.top - margin

    const showAbove =
      availableBelow < 240 &&
      availableAbove > availableBelow

    const menuHeight = Math.min(
      350,
      Math.max(
        150,
        showAbove ? availableAbove - gap : availableBelow - gap
      )
    )

    const width = Math.min(
      rect.width,
      window.innerWidth - margin * 2
    )

    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - width - margin)
    )

    setMenuStyle({
      position: 'fixed',
      left,
      top: showAbove
        ? Math.max(margin, rect.top - menuHeight - gap)
        : rect.bottom + gap,
      width,
      maxHeight: menuHeight,
      zIndex: 100000,
    })
  }

  useEffect(() => {
    if (!open) return

    updatePosition()

    const handleResize = () => updatePosition()

    const handleScroll = (event) => {
      if (
        menuRef.current &&
        menuRef.current.contains(event.target)
      ) {
        return
      }

      updatePosition()
    }

    const handleOutside = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return
      }

      setOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleKeyDown)

    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)

      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (disabled) {
      setOpen(false)
    }
  }, [disabled])

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

  function resetBank() {
    setCustom(false)
    onChange('')
    setQuery('')
    setOpen(true)
  }

  const menu = (
    <div
      ref={menuRef}
      className="ix-bank-menu"
      style={menuStyle}
    >
      <div className="ix-bank-search">
        <Search size={17} aria-hidden="true" />

        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search bank name..."
          aria-label="Search banks"
          autoComplete="off"
        />

        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              searchRef.current?.focus()
            }}
          >
            <X size={16} />
          </button>
        )}

        <button
          type="button"
          aria-label="Close bank list"
          onClick={() => setOpen(false)}
        >
          <X size={17} />
        </button>
      </div>

      <div
        className="ix-bank-options"
        role="listbox"
        aria-label="Indian banks"
      >
        {matches.length > 0 ? (
          matches.map((bank) => (
            <button
              key={bank}
              type="button"
              role="option"
              aria-selected={value === bank}
              className="ix-bank-option"
              onClick={() => choose(bank)}
            >
              <span
                className="ix-bank-avatar"
                aria-hidden="true"
              >
                {bankInitials(bank)}
              </span>

              <span className="ix-bank-option-name">
                {bank}
              </span>

              {value === bank && (
                <Check
                  size={17}
                  className="ix-bank-selected"
                  aria-hidden="true"
                />
              )}
            </button>
          ))
        ) : (
          <div className="ix-bank-empty">
            <Building2 size={22} />

            <span>
              No matching bank found.
            </span>

            <button
              type="button"
              onClick={() => choose('Other bank')}
            >
              Enter bank manually
            </button>
          </div>
        )}
      </div>

      {!matches.includes('Other bank') && (
        <button
          type="button"
          className="ix-bank-other"
          onClick={() => choose('Other bank')}
        >
          <Building2 size={17} />
          Other bank — enter manually
        </button>
      )}
    </div>
  )

  return (
    <div className="ix-bank-field">
      <label
        className="ix-bank-label"
        htmlFor="ix-bank-select"
      >
        Bank name
      </label>

      {custom ? (
        <div className="ix-bank-custom">
          <input
            id="ix-bank-select"
            className="ix-bank-input"
            type="text"
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder="Enter your bank name"
            disabled={disabled}
            autoComplete="organization"
          />

          <button
            type="button"
            className="ix-bank-reset"
            onClick={resetBank}
            disabled={disabled}
          >
            Choose bank
          </button>
        </div>
      ) : (
        <>
          <button
            ref={triggerRef}
            id="ix-bank-select"
            type="button"
            className="ix-bank-trigger"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            onClick={() => {
              if (!open) setQuery('')
              setOpen((current) => !current)
            }}
          >
            {value ? (
              <span className="ix-bank-trigger-avatar">
                {bankInitials(value)}
              </span>
            ) : (
              <Building2
                size={19}
                className="ix-bank-trigger-icon"
                aria-hidden="true"
              />
            )}

            <span
              className={
                value
                  ? 'ix-bank-value'
                  : 'ix-bank-placeholder'
              }
            >
              {value || 'Select your bank'}
            </span>

            <ChevronDown
              size={18}
              className={
                open
                  ? 'ix-bank-chevron is-open'
                  : 'ix-bank-chevron'
              }
              aria-hidden="true"
            />
          </button>

          {open &&
            typeof document !== 'undefined' &&
            createPortal(menu, document.body)}
        </>
      )}

      {error && (
        <small
          className="ix-bank-error"
          role="alert"
        >
          {error}
        </small>
      )}
    </div>
  )
}

/* =========================================================
   REGISTER PAGE
========================================================= */

export default function Register() {
  const nav = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  /* =======================================================
     FORM FIELD UPDATE
  ======================================================= */

  const set = (key) => (event) => {
    const value = event.target.value

    setF((previous) => ({
      ...previous,
      [key]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [key]: '',
    }))

    setServerError('')
  }

  /* =======================================================
     BANK UPDATE
  ======================================================= */

  function setBank(value) {
    setF((previous) => ({
      ...previous,
      bankName: value,
    }))

    setErrors((previous) => ({
      ...previous,
      bankName: '',
    }))

    setServerError('')
  }

  /* =======================================================
     VALIDATE FIELDS
  ======================================================= */

  function validate(keys) {
    const next = {}

    keys.forEach((key) => {
      const message = RULES[key](
        String(f[key] ?? '')
      )

      if (message) {
        next[key] = message
      }
    })

    setErrors((previous) => {
      const result = { ...previous }

      keys.forEach((key) => {
        delete result[key]
      })

      return {
        ...result,
        ...next,
      }
    })

    return Object.keys(next).length === 0
  }

  /* =======================================================
     REGISTRATION SUBMIT
  ======================================================= */

  async function submit(event) {
    event.preventDefault()

    if (loading) return

    if (step === 0) {
      if (validate(GROUPS[0])) {
        setStep(1)
      }

      return
    }

    if (!validate(GROUPS[0])) {
      setStep(0)
      return
    }

    if (!validate(GROUPS[1])) {
      return
    }

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

      toast.success(
        'Account created. Sign in to continue.'
      )

      nav('/login', {
        replace: true,
      })
    } catch (error) {
      setServerError(
        errorMessage(
          error,
          'Could not create your account.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AuthShell
      headline="Cover starts with an account."
      text="Two short steps. Your bank details are used to pay out approved claims."
    >
      <style>{`
        /* ================================================
           BANK FIELD
        ================================================ */

        .ix-bank-field {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .ix-bank-label {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        /* ================================================
           BANK TRIGGER
        ================================================ */

        .ix-bank-trigger,
        .ix-bank-input {
          width: 100%;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: #ffffff;
          color: #0f172a;
          font: inherit;
        }

        .ix-bank-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          transition:
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .ix-bank-trigger:hover {
          border-color: #94a3b8;
        }

        .ix-bank-trigger:focus-visible,
        .ix-bank-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow:
            0 0 0 3px rgba(99,102,241,.12);
        }

        .ix-bank-trigger:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .ix-bank-trigger-icon {
          flex-shrink: 0;
          color: #64748b;
        }

        .ix-bank-trigger-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 43px;
          height: 29px;
          padding: 2px 4px;
          border-radius: 7px;
          background: #e0e7ff;
          color: #3730a3;
          font-size: 10px;
          font-weight: 800;
        }

        .ix-bank-value,
        .ix-bank-placeholder {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ix-bank-value {
          color: #0f172a;
        }

        .ix-bank-placeholder {
          color: #64748b;
        }

        .ix-bank-chevron {
          flex-shrink: 0;
          color: #64748b;
          transition: transform .2s ease;
        }

        .ix-bank-chevron.is-open {
          transform: rotate(180deg);
        }

        /* ================================================
           DROPDOWN MENU

           Portal renders this under document.body.
        ================================================ */

        .ix-bank-menu {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          box-shadow:
            0 18px 45px rgba(15,23,42,.2);
          font-family: inherit;
        }

        /* ================================================
           SEARCH BAR
        ================================================ */

        .ix-bank-search {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 9px;
          padding: 11px 12px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
        }

        .ix-bank-search > svg {
          flex-shrink: 0;
          color: #64748b;
        }

        .ix-bank-search input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          box-shadow: none;
          background: transparent;
          color: #0f172a;
          font: inherit;
          font-size: 13px;
        }

        .ix-bank-search input::placeholder {
          color: #94a3b8;
        }

        .ix-bank-search button {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 3px;
          border: none;
          border-radius: 5px;
          background: transparent;
          color: #475569;
          cursor: pointer;
        }

        .ix-bank-search button:hover {
          background: #e2e8f0;
        }

        /* ================================================
           BANK OPTIONS
        ================================================ */

        .ix-bank-options {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          background: #ffffff;
        }

        .ix-bank-option {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          min-height: 46px;
          padding: 9px 12px;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          border-radius: 0;
          background: #ffffff;
          color: #0f172a;
          text-align: left;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background .15s ease;
        }

        .ix-bank-option:hover,
        .ix-bank-option:focus-visible {
          outline: none;
          background: #eff6ff;
        }

        .ix-bank-option[aria-selected="true"] {
          background: #eef2ff;
          color: #3730a3;
          font-weight: 700;
        }

        .ix-bank-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 46px;
          width: 46px;
          height: 32px;
          padding: 2px 3px;
          border-radius: 8px;
          background: #e0e7ff;
          color: #3730a3;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: -.2px;
          text-align: center;
        }

        .ix-bank-option-name {
          flex: 1;
          min-width: 0;
          color: #1e293b;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .ix-bank-selected {
          flex-shrink: 0;
          color: #2563eb;
        }

        /* ================================================
           OTHER BANK
        ================================================ */

        .ix-bank-other {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 10px;
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: none;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          color: #2563eb;
          text-align: left;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .ix-bank-other:hover {
          background: #eff6ff;
        }

        /* ================================================
           EMPTY SEARCH RESULTS
        ================================================ */

        .ix-bank-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          padding: 22px 12px;
          color: #64748b;
          font-size: 13px;
          text-align: center;
        }

        .ix-bank-empty button {
          border: none;
          background: transparent;
          color: #2563eb;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        /* ================================================
           CUSTOM BANK INPUT
        ================================================ */

        .ix-bank-custom {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ix-bank-custom input {
          flex: 1;
          min-width: 0;
        }

        .ix-bank-reset {
          border: none;
          background: transparent;
          color: #2563eb;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
        }

        .ix-bank-error {
          display: block;
          margin-top: 6px;
          color: #dc2626;
          font-size: 12px;
        }

        /* ================================================
           MOBILE
        ================================================ */

        @media (max-width: 480px) {
          .ix-bank-custom {
            flex-wrap: wrap;
          }

          .ix-bank-reset {
            padding: 5px 0;
          }

          .ix-bank-option {
            min-height: 48px;
          }

          .ix-bank-avatar {
            flex-basis: 42px;
            width: 42px;
          }
        }
      `}</style>

      <h1>Create your account</h1>

      <p className="sub">
        Step {step + 1} of 2 —{' '}
        {step === 0
          ? 'Sign-in details'
          : 'Profile and payout account'}
      </p>

      <form
        className="stack"
        onSubmit={submit}
        noValidate
      >
        {serverError && (
          <div
            className="alert error"
            role="alert"
          >
            {serverError}
          </div>
        )}

        {/* ==========================================
            STEP 1 — SIGN-IN DETAILS
        ========================================== */}

        {step === 0 ? (
          <>
            <TextInput
              label="Username"
              value={f.username}
              onChange={set('username')}
              error={errors.username}
              autoComplete="username"
              autoFocus
            />

            <TextInput
              label="Email"
              type="email"
              value={f.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />

            <TextInput
              label="Mobile number"
              inputMode="numeric"
              maxLength={10}
              value={f.contactNumber}
              onChange={set('contactNumber')}
              error={errors.contactNumber}
              autoComplete="tel"
            />

            <PasswordInput
              label="Password"
              value={f.password}
              onChange={set('password')}
              error={errors.password}
              autoComplete="new-password"
              hint="8+ characters with upper and lower case, a number and a symbol (@$!%*?&)"
            />
          </>
        ) : (
          /* ========================================
             STEP 2 — PROFILE AND PAYOUT DETAILS
          ======================================== */

          <div className="form-grid">
            <TextInput
              label="Occupation"
              value={f.occupation}
              onChange={set('occupation')}
              error={errors.occupation}
            />

            <TextInput
              label="Yearly income (₹)"
              type="number"
              min="0"
              value={f.income}
              onChange={set('income')}
              error={errors.income}
            />

            <div className="full">
              <TextInput
                label="Aadhaar number"
                inputMode="numeric"
                maxLength={12}
                value={f.aadharNumber}
                onChange={set('aadharNumber')}
                error={errors.aadharNumber}
              />
            </div>

            <BankSelector
              value={f.bankName}
              onChange={setBank}
              error={errors.bankName}
              disabled={loading}
            />

            <TextInput
              label="Account number"
              inputMode="numeric"
              maxLength={18}
              value={f.accountNumber}
              onChange={set('accountNumber')}
              error={errors.accountNumber}
            />

            <div className="full">
              <TextInput
                label="IFSC code (enter manually)"
                value={f.ifscCode}
                onChange={set('ifscCode')}
                error={errors.ifscCode}
                maxLength={11}
                autoCapitalize="characters"
                style={{
                  textTransform: 'uppercase',
                }}
              />
            </div>
          </div>
        )}

        {/* ==========================================
            NAVIGATION BUTTONS
        ========================================== */}

        <div className="row">
          {step === 1 && (
            <Button
              type="button"
              onClick={() => setStep(0)}
              disabled={loading}
            >
              Back
            </Button>
          )}

          <Button
            variant="dark"
            size="lg"
            className="grow"
            loading={loading}
            disabled={loading}
            type="submit"
          >
            {step === 0
              ? 'Continue'
              : 'Create account'}
          </Button>
        </div>

        <p
          className="muted"
          style={{ textAlign: 'center' }}
        >
          Already registered?{' '}
          <Link to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

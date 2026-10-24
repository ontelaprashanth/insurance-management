
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
   Responsive emerald-green styling
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
   BANK DISPLAY INITIALS
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
        showAbove
          ? availableAbove - gap
          : availableBelow - gap
      )
    )

    const width = Math.min(
      rect.width,
      window.innerWidth - margin * 2
    )

    const left = Math.max(
      margin,
      Math.min(
        rect.left,
        window.innerWidth - width - margin
      )
    )

    setMenuStyle({
      position: 'fixed',
      left,
      top: showAbove
        ? Math.max(
            margin,
            rect.top - menuHeight - gap
          )
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
          onChange={(event) => setQuery(event.target.value)}
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

            <span>No matching bank found.</span>

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
            onChange={(event) => onChange(event.target.value)}
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
        <small className="ix-bank-error" role="alert">
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

  /* FORM FIELD UPDATE */

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

  /* BANK UPDATE */

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

  /* VALIDATION */

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

  /* REGISTRATION SUBMIT */

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

  return (
    <AuthShell
      headline="Cover starts with an account."
      text="Two short steps. Your bank details are used to pay out approved claims."
    >
      <style>{`
        /* ================================================
           INSUREX REGISTRATION — INLINE CSS
        ================================================ */

        .ix-auth-card > h1 {
          color: #153b2c;
          letter-spacing: -0.8px;
          animation: ix-reg-heading .55s ease both;
        }

        .ix-auth-card > .sub {
          color: #718178;
          animation: ix-reg-heading .55s ease both;
          animation-delay: 80ms;
        }

        .ix-auth-card .stack {
          animation: ix-reg-form .6s cubic-bezier(.2,.7,.2,1) both;
          animation-delay: 100ms;
        }

        .ix-auth-card .stack > * {
          animation: ix-reg-field .4s ease both;
        }

        .ix-auth-card .stack > :nth-child(1) {
          animation-delay: 60ms;
        }

        .ix-auth-card .stack > :nth-child(2) {
          animation-delay: 110ms;
        }

        .ix-auth-card .stack > :nth-child(3) {
          animation-delay: 160ms;
        }

        .ix-auth-card .stack > :nth-child(4) {
          animation-delay: 210ms;
        }

        /* RESPONSIVE FORM GRID */

        .ix-auth-card .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
        }

        .ix-auth-card .form-grid > * {
          min-width: 0;
          animation: ix-reg-field .4s ease both;
        }

        .ix-auth-card .form-grid > :nth-child(1) {
          animation-delay: 40ms;
        }

        .ix-auth-card .form-grid > :nth-child(2) {
          animation-delay: 90ms;
        }

        .ix-auth-card .form-grid > :nth-child(3) {
          animation-delay: 140ms;
        }

        .ix-auth-card .form-grid > :nth-child(4) {
          animation-delay: 190ms;
        }

        .ix-auth-card .form-grid > :nth-child(5) {
          animation-delay: 240ms;
        }

        .ix-auth-card .form-grid > :nth-child(6) {
          animation-delay: 290ms;
        }

        .ix-auth-card .form-grid .full {
          grid-column: 1 / -1;
          min-width: 0;
        }

        /* BANK FIELD */

        .ix-bank-field {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .ix-bank-label {
          display: block;
          margin-bottom: 7px;
          color: #294c3b;
          font-size: 13px;
          font-weight: 700;
        }

        .ix-bank-trigger,
        .ix-bank-input {
          box-sizing: border-box;
          width: 100%;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid #d5e3da;
          border-radius: 11px;
          background: #fff;
          color: #173b2c;
          font: inherit;
          transition: border-color .2s ease, box-shadow .2s ease,
            background .2s ease;
        }

        .ix-bank-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          cursor: pointer;
        }

        .ix-bank-trigger:hover {
          border-color: #78b99a;
          background: #fbfefc;
        }

        .ix-bank-trigger:focus-visible,
        .ix-bank-input:focus {
          outline: none;
          border-color: #087f5b;
          box-shadow: 0 0 0 3px rgba(8,127,91,.12);
        }

        .ix-bank-trigger:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .ix-bank-trigger-icon {
          flex-shrink: 0;
          color: #087f5b;
        }

        .ix-bank-trigger-avatar,
        .ix-bank-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 44px;
          min-height: 30px;
          padding: 3px 4px;
          border-radius: 8px;
          background: #e5f5eb;
          color: #087f5b;
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
          color: #173b2c;
        }

        .ix-bank-placeholder {
          color: #819087;
        }

        .ix-bank-chevron {
          flex-shrink: 0;
          color: #087f5b;
          transition: transform .2s ease;
        }

        .ix-bank-chevron.is-open {
          transform: rotate(180deg);
        }

        /* SEARCHABLE DROPDOWN */

        .ix-bank-menu {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
          border: 1px solid #dcebe1;
          border-radius: 14px;
          background: #fff;
          color: #173b2c;
          box-shadow: 0 20px 55px rgba(12,62,41,.18);
          font-family: inherit;
          transform-origin: top center;
          animation: ix-reg-menu .2s cubic-bezier(.2,.7,.2,1) both;
        }

        .ix-bank-search {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 9px;
          padding: 11px 12px;
          border-bottom: 1px solid #e2eee6;
          background: #f6fbf7;
          color: #087f5b;
        }

        .ix-bank-search > svg {
          flex-shrink: 0;
        }

        .ix-bank-search input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          box-shadow: none;
          background: transparent;
          color: #173b2c;
          font: inherit;
          font-size: 13px;
        }

        .ix-bank-search input::placeholder {
          color: #94a39a;
        }

        .ix-bank-search button {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 4px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #52695c;
          cursor: pointer;
          transition: background .15s ease, color .15s ease;
        }

        .ix-bank-search button:hover {
          background: #e5f5eb;
          color: #07563e;
        }

        .ix-bank-options {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          background: #fff;
          scrollbar-width: thin;
          scrollbar-color: #b9d8c5 #f7fbf8;
        }

        .ix-bank-options::-webkit-scrollbar {
          width: 6px;
        }

        .ix-bank-options::-webkit-scrollbar-thumb {
          border-radius: 10px;
          background: #b9d8c5;
        }

        .ix-bank-option {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          min-height: 46px;
          padding: 9px 12px;
          border: none;
          border-bottom: 1px solid #f0f5f1;
          border-radius: 0;
          background: #fff;
          color: #173b2c;
          text-align: left;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background .16s ease, padding-left .16s ease;
        }

        .ix-bank-option:hover,
        .ix-bank-option:focus-visible {
          outline: none;
          background: #f0faf4;
        }

        .ix-bank-option:hover {
          padding-left: 16px;
        }

        .ix-bank-option[aria-selected="true"] {
          background: #eaf7ef;
          color: #07563e;
          font-weight: 700;
        }

        .ix-bank-option-name {
          flex: 1;
          min-width: 0;
          color: #294c3b;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .ix-bank-option[aria-selected="true"] .ix-bank-option-name {
          color: #07563e;
        }

        .ix-bank-selected {
          flex-shrink: 0;
          color: #087f5b;
          animation: ix-reg-check .22s ease both;
        }

        /* OTHER BANK */

        .ix-bank-other {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 10px;
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: none;
          border-top: 1px solid #e2eee6;
          background: #fff;
          color: #087f5b;
          text-align: left;
          font: inherit;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: background .18s ease;
        }

        .ix-bank-other:hover {
          background: #effaf3;
        }

        /* EMPTY RESULTS */

        .ix-bank-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          padding: 22px 12px;
          color: #718178;
          font-size: 13px;
          text-align: center;
        }

        .ix-bank-empty button,
        .ix-bank-reset {
          border: none;
          background: transparent;
          color: #087f5b;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        /* CUSTOM BANK */

        .ix-bank-custom {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ix-bank-custom input {
          flex: 1;
          min-width: 0;
        }

        .ix-bank-error {
          display: block;
          margin-top: 6px;
          color: #c53030;
          font-size: 12px;
          animation: ix-reg-field .25s ease both;
        }

        /* ERROR MESSAGE */

        .ix-auth-card .alert.error {
          border-radius: 11px;
          animation: ix-reg-error .3s ease both,
            ix-reg-shake .35s ease .1s both;
        }

        /* NAVIGATION BUTTONS */

        .ix-auth-card .stack .row {
          display: flex;
          gap: 12px;
          animation: ix-reg-field .45s ease both;
          animation-delay: 220ms;
        }

        .ix-auth-card .stack .row button {
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .ix-auth-card .stack .row button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(8,127,91,.14);
        }

        .ix-auth-card .stack .row button:active:not(:disabled) {
          transform: translateY(0) scale(.99);
        }

        .ix-auth-card .stack .row button:disabled {
          cursor: not-allowed;
        }

        .ix-auth-card .stack .muted {
          color: #718178;
          font-size: 13px;
        }

        .ix-auth-card .stack .muted a {
          color: #087f5b;
          font-weight: 750;
          text-decoration: none;
          transition: color .18s ease;
        }

        .ix-auth-card .stack .muted a:hover {
          color: #07563e;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* ANIMATIONS */

        @keyframes ix-reg-heading {
          from { opacity: 0; transform: translateY(9px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes ix-reg-form {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes ix-reg-field {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes ix-reg-menu {
          from { opacity: 0; transform: translateY(-5px) scale(.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes ix-reg-check {
          from { opacity: 0; transform: scale(.75); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes ix-reg-error {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes ix-reg-shake {
          0%, 100% { translate: 0 0; }
          25% { translate: -3px 0; }
          50% { translate: 3px 0; }
          75% { translate: -2px 0; }
        }

        /* RESPONSIVE */

        @media (max-width: 680px) {
          .ix-auth-card > h1 {
            font-size: 25px;
          }

          .ix-auth-card .stack .row {
            gap: 9px;
          }

          .ix-bank-menu {
            border-radius: 12px;
          }
        }

        @media (max-width: 480px) {
          .ix-auth-card .form-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .ix-auth-card .form-grid .full {
            grid-column: auto;
          }

          .ix-bank-custom {
            flex-wrap: wrap;
          }

          .ix-bank-reset {
            padding: 5px 0;
          }

          .ix-bank-option {
            min-height: 48px;
          }

          .ix-bank-avatar,
          .ix-bank-trigger-avatar {
            width: 42px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-auth-card *,
          .ix-auth-card *::before,
          .ix-auth-card *::after,
          .ix-bank-menu,
          .ix-bank-menu * {
            animation-duration: .01ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
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

        {/* STEP 1 — SIGN-IN DETAILS */}

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
          /* STEP 2 — PROFILE AND PAYOUT DETAILS */

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

        {/* NAVIGATION BUTTONS */}

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

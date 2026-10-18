
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { errorMessage } from '../api/client'

/* ───────── Icons ───────── */
const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  shield: 'M12 3l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V6z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  claim: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M9 14h6M9 18h4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  bell: 'M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M16 4.5a3.5 3.5 0 010 6.6M18 14a7 7 0 013.5 6',
  badge: 'M12 2l2.4 2 3.1-.2.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.2L12 22l-2.4-2-3.1.2-.9-3L3 15.5l-1-3 1-3-2.6-1.7.9-3 3.1.2z',
  cash: 'M3 7h18v10H3zM12 14a2 2 0 100-4 2 2 0 000 4zM6 10v.01M18 14v.01',
  megaphone: 'M3 11v3a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 8a5 5 0 010 8M18 5a9 9 0 010 14',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 13l4 4L19 7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4',
  power: 'M12 3v9M6.3 6.3a8 8 0 1011.4 0',
}

export function Icon({ name, size = 18, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name] || ''} />
    </svg>
  )
}

export function Logo({ size = 32 }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#1f5b5d" />
      <path
        d="M16 6l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V9z"
        fill="#E9A23B"
      />
      <path
        d="M12.5 15.5l2.6 2.6 4.6-5"
        stroke="#0F3D3E"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ───────── Buttons ───────── */
export function Button({
  variant,
  size,
  block,
  loading,
  children,
  className = '',
  icon,
  ...rest
}) {
  const cls = [
    'btn',
    variant,
    size,
    block && 'block',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      className={cls}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={16} />
      ) : null}
      {children}
    </button>
  )
}

/* ───────── Form fields ───────── */
export function TextInput({ label, hint, error, ...rest }) {
  const id = useId()

  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        className={`input ${error ? 'invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  )
}

export function PasswordInput({ label, hint, error, ...rest }) {
  const id = useId()
  const [show, setShow] = useState(false)

  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <div className="input-wrap">
        <input
          id={id}
          className={`input ${error ? 'invalid' : ''}`}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          style={{ paddingRight: 64 }}
          {...rest}
        />
        <button
          type="button"
          className="btn ghost sm adorn"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  )
}

export function SelectInput({
  label,
  hint,
  error,
  options = [],
  placeholder,
  ...rest
}) {
  const id = useId()

  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        className={`select ${error ? 'invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          )
        ))}
      </select>
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  )
}

export function TextArea({ label, hint, error, ...rest }) {
  const id = useId()

  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <textarea
        id={id}
        className={`textarea ${error ? 'invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  )
}

/* ───────── Status badges ───────── */
const TONES = {
  APPROVED: 'green',
  SETTLED: 'green',
  ACTIVE: 'green',
  SUCCESS: 'green',
  PAID: 'green',
  CAPTURED: 'green',
  REPLIED: 'green',
  COMPLETED: 'green',
  PENDING: 'amber',
  CREATED: 'amber',
  OPEN: 'amber',
  NOT_REFUNDED: 'gray',
  REJECTED: 'red',
  INACTIVE: 'red',
  FAILED: 'red',
  REFUNDED: 'blue',
  BLUE: 'blue',
  GRAY: 'gray',
}

export function StatusBadge({ value, label }) {
  const v = String(value ?? '').toUpperCase()

  if (!v) return <span className="faint">—</span>

  const text = label || (
    v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ')
  )

  return <span className={`badge ${TONES[v] || 'gray'}`}>{text}</span>
}

export function Stars({ value = 0, onChange, size = 20 }) {
  return (
    <span
      className="stars"
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            type="button"
            key={n}
            className={n <= value ? 'on' : ''}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Icon
              name="star"
              size={size}
              fill={n <= value ? 'currentColor' : 'none'}
            />
          </button>
        ) : (
          <span
            key={n}
            className={n <= value ? 'on' : ''}
            style={{ color: n <= value ? undefined : '#cdd8d5' }}
          >
            <Icon
              name="star"
              size={size}
              fill={n <= value ? 'currentColor' : 'none'}
            />
          </span>
        ),
      )}
    </span>
  )
}

/* ───────── Layout bits ───────── */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  )
}

export function Panel({ title, actions, children, flush, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="panel-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="row wrap">{actions}</div>}
        </div>
      )}
      {flush ? children : <div className="panel-body">{children}</div>}
    </section>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h4>{title}</h4>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ rows = 4 }) {
  return (
    <div
      className="panel-body stack-sm"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 38, opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  )
}

/** Renders loading / error / empty / data for a react-query result. */
export function DataState({ query, empty, emptyAction, children, rows }) {
  if (query.isLoading) return <Skeleton rows={rows} />

  if (query.isError) {
    return (
      <div className="panel-body">
        <div className="alert error">
          {errorMessage(query.error, 'Could not load this data.')}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const data = query.data

  if (
    empty &&
    (!data || (Array.isArray(data) && data.length === 0))
  ) {
    return (
      <Empty title={empty.title} action={emptyAction}>
        {empty.text}
      </Empty>
    )
  }

  return children(data)
}

/** Simple responsive table. columns: [{ key, header, render, align }] */
export function Table({ columns, rows, rowKey, onRowClick }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={c.align === 'right' ? 'right' : ''}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r[rowKey]}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={c.align === 'right' ? 'right' : ''}
                >
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search',
}) {
  return (
    <div className="search">
      <Icon name="search" size={16} />
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="pill-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          type="button"
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Details({ items }) {
  return (
    <dl className="detail-grid" style={{ margin: 0 }}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ───────── Modal ───────── */
export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)

  // Keep the latest close handler without restarting the modal effect.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Set up the modal once when it mounts.
  // Typing and ordinary parent re-renders will not restart this effect.
  useEffect(() => {
    const previousActiveElement = document.activeElement
    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus the first form field once, not the close button on every render.
    const firstField = ref.current?.querySelector(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
    )

    if (firstField) {
      firstField.focus()
    } else {
      ref.current
        ?.querySelector('button:not([disabled])')
        ?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow

      if (
        previousActiveElement &&
        typeof previousActiveElement.focus === 'function' &&
        previousActiveElement.isConnected
      ) {
        previousActiveElement.focus()
      }
    }
  }, [])

  const closeModal = () => {
    onCloseRef.current?.()
  }

  return (
    <div
      className="modal-back"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal()
        }
      }}
    >
      <div
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <h3>{title}</h3>

          <button
            type="button"
            className="btn ghost icon-btn"
            onClick={closeModal}
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-foot">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Confirm({
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onClose,
  loading,
  children,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'dark'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
      {children}
    </Modal>
  )
}

/* ───────── Toasts ───────── */
const ToastCtx = createContext(() => {})

export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)

    setItems((s) => [...s, { id, message, type }])

    setTimeout(() => {
      setItems((s) => s.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const api = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (e) => push(
      typeof e === 'string' ? e : errorMessage(e),
      'error'
    ),
  }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ───────── Small helpers ───────── */
export function useFilter(rows, fields) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()

    if (!s) return rows || []

    return (rows || []).filter((r) =>
      fields.some((f) =>
        String(r[f] ?? '').toLowerCase().includes(s)
      )
    )
  }, [rows, q, fields])

  return [q, setQ, filtered]
}

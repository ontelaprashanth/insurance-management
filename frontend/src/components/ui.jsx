
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

/* =========================================================
   INSUREX — SHARED UI COMPONENTS

   Icons & Branding
   Buttons & Forms
   Status Badges
   Tables & Search
   Panels & Layout
   Modals & Confirmations
   Toast Notifications
   Filtering

   Compatible with:
   Customer Dashboard
   Payments & Refunds
   Policies & Claims
   Admin Management
========================================================= */

/* =========================================================
   ICONS
========================================================= */

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  shield: 'M12 3l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-11V6z',
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

  /* Additional icons */

  refresh: 'M20 7v5h-5M4 17v-5h5M5.5 9A7 7 0 0118 7l2 5M4 12l2 5a7 7 0 0012.5-2',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  info: 'M12 17v-5M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2.2 18a2 2 0 001.7 3h16.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',
  calendar: 'M3 5h18v16H3zM7 3v4M17 3v4M3 10h18',
  wallet: 'M3 6h16a2 2 0 012 2v12H5a2 2 0 01-2-2V6zM3 9h18M16 14h5v4h-5a2 2 0 010-4z',
}

export function Icon({
  name,
  size = 18,
  ...rest
}) {
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

/* =========================================================
   LOGO
========================================================= */

export function Logo({ size = 32 }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="8"
        fill="#1f5b5d"
      />

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

/* =========================================================
   BUTTON
========================================================= */

export function Button({
  variant,
  size,
  block,
  loading = false,
  children,
  className = '',
  icon,
  disabled = false,
  type = 'button',
  ...rest
}) {
  const cls = [
    'btn',
    variant,
    size,
    block && 'block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...rest}
      type={type}
      className={cls}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span
          className="spinner"
          aria-hidden="true"
        />
      ) : icon ? (
        <Icon
          name={icon}
          size={16}
        />
      ) : null}

      {children}
    </button>
  )
}

/* =========================================================
   TEXT INPUT
========================================================= */

export function TextInput({
  label,
  hint,
  error,
  ...rest
}) {
  const id = useId()

  return (
    <div className="field">
      {label && (
        <label htmlFor={id}>
          {label}
        </label>
      )}

      <input
        {...rest}
        id={id}
        className={`input ${error ? 'invalid' : ''}`}
        aria-invalid={Boolean(error)}
      />

      {hint && !error && (
        <span className="hint">
          {hint}
        </span>
      )}

      {error && (
        <span
          className="err"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  )
}

/* =========================================================
   PASSWORD INPUT
========================================================= */

export function PasswordInput({
  label,
  hint,
  error,
  ...rest
}) {
  const id = useId()
  const [show, setShow] = useState(false)

  return (
    <div className="field">
      {label && (
        <label htmlFor={id}>
          {label}
        </label>
      )}

      <div className="input-wrap">
        <input
          {...rest}
          id={id}
          className={`input ${error ? 'invalid' : ''}`}
          type={show ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          style={{
            paddingRight: 64,
            ...rest.style,
          }}
        />

        <button
          type="button"
          className="btn ghost sm adorn"
          onClick={() =>
            setShow((current) => !current)
          }
          aria-label={
            show
              ? 'Hide password'
              : 'Show password'
          }
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      {hint && !error && (
        <span className="hint">
          {hint}
        </span>
      )}

      {error && (
        <span
          className="err"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  )
}

/* =========================================================
   SELECT INPUT
========================================================= */

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
      {label && (
        <label htmlFor={id}>
          {label}
        </label>
      )}

      <select
        {...rest}
        id={id}
        className={`select ${error ? 'invalid' : ''}`}
        aria-invalid={Boolean(error)}
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map((option) =>
          typeof option === 'string' ? (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ) : (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ),
        )}
      </select>

      {hint && !error && (
        <span className="hint">
          {hint}
        </span>
      )}

      {error && (
        <span
          className="err"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  )
}

/* =========================================================
   TEXT AREA
========================================================= */

export function TextArea({
  label,
  hint,
  error,
  ...rest
}) {
  const id = useId()

  return (
    <div className="field">
      {label && (
        <label htmlFor={id}>
          {label}
        </label>
      )}

      <textarea
        {...rest}
        id={id}
        className={`textarea ${error ? 'invalid' : ''}`}
        aria-invalid={Boolean(error)}
      />

      {hint && !error && (
        <span className="hint">
          {hint}
        </span>
      )}

      {error && (
        <span
          className="err"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  )
}

/* =========================================================
   STATUS BADGES

   Payments
   Refunds
   Claims
   Policies
   Settlements
========================================================= */

const TONES = {
  APPROVED: 'green',
  SETTLED: 'green',
  ACTIVE: 'green',
  SUCCESS: 'green',
  PAID: 'green',
  CAPTURED: 'green',
  REPLIED: 'green',
  COMPLETED: 'green',

  REFUNDED: 'blue',
  FULLY_REFUNDED: 'blue',

  PENDING: 'amber',
  CREATED: 'amber',
  OPEN: 'amber',
  SUBMITTED: 'amber',
  UNDER_REVIEW: 'amber',
  PROCESSING: 'amber',

  REFUND_PENDING: 'amber',
  REFUND_PROCESSING: 'amber',
  REFUND_REQUIRES_RECONCILIATION: 'amber',
  REQUIRES_RECONCILIATION: 'amber',
  REQUESTED: 'amber',

  NOT_REFUNDED: 'gray',
  GRAY: 'gray',

  REJECTED: 'red',
  INACTIVE: 'red',
  FAILED: 'red',
  REFUND_FAILED: 'red',

  BLUE: 'blue',
}

export function StatusBadge({
  value,
  label,
}) {
  const status = String(
    value ?? '',
  )
    .trim()
    .toUpperCase()

  if (!status) {
    return (
      <span className="faint">
        —
      </span>
    )
  }

  const text =
    label ||
    status
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      )

  return (
    <span
      className={`badge ${TONES[status] || 'gray'}`}
    >
      {text}
    </span>
  )
}

/* =========================================================
   STAR RATING
========================================================= */

export function Stars({
  value = 0,
  onChange,
  size = 20,
}) {
  return (
    <span
      className="stars"
      role={onChange ? 'group' : 'img'}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((number) =>
        onChange ? (
          <button
            type="button"
            key={number}
            className={
              number <= value
                ? 'on'
                : ''
            }
            aria-pressed={number === value}
            onClick={() =>
              onChange(number)
            }
            aria-label={`${number} star${number > 1 ? 's' : ''}`}
          >
            <Icon
              name="star"
              size={size}
              fill={
                number <= value
                  ? 'currentColor'
                  : 'none'
              }
            />
          </button>
        ) : (
          <span
            key={number}
            className={
              number <= value
                ? 'on'
                : ''
            }
            style={{
              color:
                number <= value
                  ? undefined
                  : '#cdd8d5',
            }}
          >
            <Icon
              name="star"
              size={size}
              fill={
                number <= value
                  ? 'currentColor'
                  : 'none'
              }
            />
          </span>
        ),
      )}
    </span>
  )
}

/* =========================================================
   PAGE HEADER
========================================================= */

export function PageHeader({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>

        {subtitle && (
          <p>{subtitle}</p>
        )}
      </div>

      {children && (
        <div className="row wrap">
          {children}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   PANEL
========================================================= */

export function Panel({
  title,
  actions,
  children,
  flush = false,
  className = '',
}) {
  return (
    <section
      className={`panel ${className}`}
    >
      {(title || actions) && (
        <div className="panel-head">
          {title && (
            <h3>{title}</h3>
          )}

          {actions && (
            <div className="row wrap">
              {actions}
            </div>
          )}
        </div>
      )}

      {flush ? (
        children
      ) : (
        <div className="panel-body">
          {children}
        </div>
      )}
    </section>
  )
}

/* =========================================================
   EMPTY STATE
========================================================= */

export function Empty({
  title,
  children,
  action,
}) {
  return (
    <div className="empty">
      <h4>{title}</h4>

      {children && (
        <p>{children}</p>
      )}

      {action}
    </div>
  )
}

/* =========================================================
   SKELETON LOADING
========================================================= */

export function Skeleton({
  rows = 4,
}) {
  return (
    <div
      className="panel-body stack-sm"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({
        length: rows,
      }).map((_, index) => (
        <div
          key={index}
          className="skeleton"
          style={{
            height: 38,
            opacity: Math.max(
              0.35,
              1 - index * 0.12,
            ),
          }}
        />
      ))}
    </div>
  )
}

/* =========================================================
   DATA STATE

   React Query:
   Loading
   Error
   Empty
   Success
========================================================= */

export function DataState({
  query,
  empty,
  emptyAction,
  children,
  rows,
}) {
  if (query.isLoading) {
    return (
      <Skeleton rows={rows} />
    )
  }

  if (query.isError) {
    return (
      <div className="panel-body">
        <div
          className="alert error"
          role="alert"
        >
          {errorMessage(
            query.error,
            'Could not load this data.',
          )}

          {' '}

          <button
            type="button"
            className="link-btn"
            onClick={() =>
              query.refetch()
            }
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
    (
      data == null ||
      (
        Array.isArray(data) &&
        data.length === 0
      )
    )
  ) {
    return (
      <Empty
        title={empty.title}
        action={emptyAction}
      >
        {empty.text}
      </Empty>
    )
  }

  return children(data)
}

/* =========================================================
   RESPONSIVE TABLE
========================================================= */

export function Table({
  columns = [],
  rows = [],
  rowKey,
  onRowClick,
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') {
      return rowKey(row)
    }

    if (rowKey && row?.[rowKey] != null) {
      return row[rowKey]
    }

    return index
  }

  return (
    <div className="table-wrap">
      <table className="tbl">

        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={
                  column.align === 'right'
                    ? 'right'
                    : ''
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              onClick={
                onRowClick
                  ? () => onRowClick(row)
                  : undefined
              }
              style={
                onRowClick
                  ? { cursor: 'pointer' }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    column.align === 'right'
                      ? 'right'
                      : ''
                  }
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  )
}

/* =========================================================
   SEARCH BOX
========================================================= */

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search',
}) {
  return (
    <div className="search">
      <Icon
        name="search"
        size={16}
      />

      <input
        className="input"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        aria-label={placeholder}
        type="search"
      />
    </div>
  )
}

/* =========================================================
   SEGMENTED CONTROL
========================================================= */

export function Segmented({
  value,
  onChange,
  options = [],
}) {
  return (
    <div
      className="seg"
      role="group"
    >
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={
            value === option.value
          }
          className={
            value === option.value
              ? 'active'
              : ''
          }
          onClick={() =>
            onChange(option.value)
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* =========================================================
   TABS
========================================================= */

export function Tabs({
  value,
  onChange,
  tabs = [],
}) {
  return (
    <div
      className="pill-tabs"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.value}
          role="tab"
          aria-selected={
            value === tab.value
          }
          tabIndex={
            value === tab.value
              ? 0
              : -1
          }
          onClick={() =>
            onChange(tab.value)
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* =========================================================
   DETAILS GRID
========================================================= */

export function Details({
  items = [],
}) {
  return (
    <dl
      className="detail-grid"
      style={{ margin: 0 }}
    >
      {items.map(
        ([label, value], index) => (
          <div
            key={`${label}-${index}`}
          >
            <dt>{label}</dt>

            <dd>
              {value ?? '—'}
            </dd>
          </div>
        ),
      )}
    </dl>
  )
}

/* =========================================================
   MODAL

   Escape Key
   Backdrop Close
   Body Scroll Lock
   Initial Focus
   Focus Trap
   Restore Focus
========================================================= */

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}) {
  const modalRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousActiveElement =
      document.activeElement

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    const modal = modalRef.current

    const getFocusableElements = () =>
      Array.from(
        modal?.querySelectorAll(
          [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
          ].join(','),
        ) || [],
      ).filter(
        (element) =>
          element.getAttribute('aria-hidden') !==
          'true',
      )

    const initialFocus =
      modal?.querySelector(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ) ||
      getFocusableElements()[0]

    initialFocus?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable =
        getFocusableElements()

      if (focusable.length === 0) {
        event.preventDefault()
        modal?.focus()
        return
      }

      const first = focusable[0]
      const last =
        focusable[focusable.length - 1]

      if (
        event.shiftKey &&
        (
          document.activeElement === first ||
          !modal?.contains(
            document.activeElement,
          )
        )
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (
          document.activeElement === last ||
          !modal?.contains(
            document.activeElement,
          )
        )
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )

      document.body.style.overflow =
        previousOverflow

      if (
        previousActiveElement?.isConnected &&
        typeof previousActiveElement.focus ===
          'function'
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
        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal()
        }
      }}
    >
      <div
        ref={modalRef}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >

        {/* MODAL HEADER */}

        <div className="modal-head">
          <h3 id={titleId}>
            {title}
          </h3>

          <button
            type="button"
            className="btn ghost icon-btn"
            onClick={closeModal}
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>

        {/* MODAL CONTENT */}

        <div className="modal-body">
          {children}
        </div>

        {/* MODAL FOOTER */}

        {footer && (
          <div className="modal-foot">
            {footer}
          </div>
        )}

      </div>
    </div>
  )
}

/* =========================================================
   CONFIRM DIALOG
========================================================= */

export function Confirm({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
  loading = false,
  children,
}) {
  return (
    <Modal
      title={title}
      onClose={loading ? () => {} : onClose}
      footer={
        <>
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant={
              danger
                ? 'danger'
                : 'dark'
            }
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

/* =========================================================
   TOAST NOTIFICATIONS
========================================================= */

const ToastCtx = createContext(null)

export function useToast() {
  const context = useContext(ToastCtx)

  if (!context) {
    throw new Error(
      'useToast must be used inside ToastProvider.',
    )
  }

  return context
}

export function ToastProvider({
  children,
}) {
  const [items, setItems] = useState([])

  const timersRef = useRef(new Map())
  const nextIdRef = useRef(0)

  const dismiss = useCallback((id) => {
    const timer =
      timersRef.current.get(id)

    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setItems((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    )
  }, [])

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++nextIdRef.current

      setItems((current) => [
        ...current,
        {
          id,
          message,
          type,
        },
      ])

      const timer = setTimeout(() => {
        dismiss(id)
      }, 4200)

      timersRef.current.set(id, timer)

      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current

    return () => {
      timers.forEach((timer) =>
        clearTimeout(timer),
      )

      timers.clear()
    }
  }, [])

  const api = useMemo(
    () => ({
      success: (message) =>
        push(message, 'success'),

      error: (error) =>
        push(
          typeof error === 'string'
            ? error
            : errorMessage(error),
          'error',
        ),

      info: (message) =>
        push(message, 'info'),

      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastCtx.Provider value={api}>
      {children}

      <div
        className="toasts"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast ${item.type}`}
          >
            <span>
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* =========================================================
   FILTER HOOK
========================================================= */

export function useFilter(
  rows,
  fields,
) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const search =
      q.trim().toLowerCase()

    const list = Array.isArray(rows)
      ? rows
      : []

    if (!search) {
      return list
    }

    return list.filter((row) =>
      fields.some((field) =>
        String(
          row?.[field] ?? '',
        )
          .toLowerCase()
          .includes(search),
      ),
    )
  }, [rows, q, fields])

  return [
    q,
    setQ,
    filtered,
  ]
}

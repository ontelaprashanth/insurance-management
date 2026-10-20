const IST_TIME_ZONE = 'Asia/Kolkata'

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrFmt2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const inr = (n) =>
  n == null || n === '' || Number.isNaN(Number(n))
    ? '—'
    : inrFmt.format(Number(n))

export const inr2 = (n) =>
  n == null || n === '' || Number.isNaN(Number(n))
    ? '—'
    : inrFmt2.format(Number(n))

/** ₹10L, ₹2.5Cr style label for big coverage amounts */
export function inrShort(n) {
  const v = Number(n)

  if (!Number.isFinite(v) || !v) return '—'
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)} L`

  return inr(v)
}

/** Checks whether a value is a date-only ISO string. */
function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * Parses backend timestamps.
 * Timezone-less date-times are interpreted as UTC.
 * Explicit Z or timezone offsets are respected.
 */
function parseTimestamp(value) {
  if (value == null || value === '') return null

  const text = String(value).trim()

  if (!text || isDateOnly(text)) return null

  // Java LocalDateTime may include nanoseconds.
  // JavaScript Date supports millisecond precision.
  const normalizedFraction = text.replace(
    /(\.\d{3})\d+(?=(?:Z|[+-]\d{2}:\d{2})?$)/i,
    '$1',
  )

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(
    normalizedFraction,
  )

  const normalized = hasTimezone
    ? normalizedFraction
    : `${normalizedFraction}Z`

  const parsed = new Date(normalized)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formats dates in Indian Standard Time.
 * Date-only values retain their calendar date.
 */
export function date(v) {
  if (v == null || v === '') return '—'

  const value = String(v).trim()

  if (isDateOnly(value)) {
    const [year, month, day] = value.split('-')

    const d = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
    )

    if (Number.isNaN(d.getTime())) return value

    return dateFormatter.format(d)
  }

  const d = parseTimestamp(value)

  if (!d) return value

  return dateFormatter.format(d)
}

/**
 * Formats timestamps in Asia/Kolkata.
 * Timezone-less backend timestamps are interpreted as UTC.
 */
export function dateTime(v) {
  if (v == null || v === '') return '—'

  const value = String(v).trim()

  if (isDateOnly(value)) {
    const d = new Date(`${value}T00:00:00Z`)

    if (Number.isNaN(d.getTime())) return value

    return dateTimeFormatter.format(d)
  }

  const d = parseTimestamp(value)

  if (!d) return value

  return dateTimeFormatter.format(d)
}

/**
 * Calculates relative time from the actual timestamp.
 * Timezone-less backend timestamps are interpreted as UTC.
 */
export function timeAgo(v) {
  if (v == null || v === '') return ''

  const value = String(v).trim()

  const d = isDateOnly(value)
    ? new Date(`${value}T00:00:00Z`)
    : parseTimestamp(value)

  if (!d || Number.isNaN(d.getTime())) return value

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 0) return dateTime(v)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} d ago`

  return date(v)
}

/** Returns today's date in India as YYYY-MM-DD. */
export const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

/** Returns initials for a name. */
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

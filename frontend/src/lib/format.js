const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const inr = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '—' : inrFmt.format(Number(n)))
export const inr2 = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '—' : inrFmt2.format(Number(n)))

/** ₹10L, ₹2.5Cr style label for big coverage amounts */
export function inrShort(n) {
  const v = Number(n)
  if (!v) return '—'
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)} L`
  return inr(v)
}

export function date(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function dateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(v) {
  if (!v) return ''
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return date(v)
}

export const today = () => new Date().toISOString().slice(0, 10)
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

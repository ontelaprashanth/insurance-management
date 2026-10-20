import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
  FileText,
  ShieldCheck,
  WalletCards,
  CircleAlert,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react'

import {
  claims,
  notifications,
  policies,
  purchases,
} from '../../api/endpoints'

import {
  PageHeader,
  Panel,
  StatusBadge,
} from '../../components/ui'

import { date, inr, inrShort } from '../../lib/format'

/* =========================================================
   SAFE DATA HELPERS
========================================================= */

const asArray = (response) => {
  const value = response?.data ?? response

  if (Array.isArray(value)) return value
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.results)) return value.results

  return []
}

const text = (value, fallback = '—') =>
  value === null || value === undefined || value === ''
    ? fallback
    : String(value)

const upper = (value) => String(value ?? '').toUpperCase()

const getClaimNumber = (item) =>
  item?.claimNumber ?? item?.id ?? 'Claim'

const getClaimDate = (item) =>
  item?.claimDate ?? item?.createdAt ?? item?.date

const getClaimAmount = (item) =>
  Number(item?.amount ?? item?.claimAmount ?? 0)

const getNotificationDate = (item) =>
  item?.createdAt ?? item?.notificationDate ?? item?.date

const isUnread = (item) =>
  item?.isRead === false ||
  item?.read === false ||
  upper(item?.status) === 'UNREAD'

const isActive = (item) => {
  if (item?.isActive !== undefined && item?.isActive !== null) {
    return (
      item.isActive === true ||
      item.isActive === 1 ||
      upper(item.isActive) === 'TRUE'
    )
  }

  return ['ACTIVE', 'APPROVED', 'SUCCESS'].includes(
    upper(item?.status ?? item?.policyStatus),
  )
}

const sortNewest = (items, getDate) =>
  [...items].sort((a, b) => {
    const first = new Date(getDate(a) ?? 0).getTime() || 0
    const second = new Date(getDate(b) ?? 0).getTime() || 0
    return second - first
  })

const safeFormatDate = (value) => {
  if (!value) return 'Date unavailable'

  try {
    return date(value) || 'Date unavailable'
  } catch {
    return 'Date unavailable'
  }
}

const safeMoney = (value) => {
  try {
    return inr(value)
  } catch {
    return `₹${Number(value || 0).toLocaleString('en-IN')}`
  }
}

const getCustomerName = () => {
  if (typeof window === 'undefined') return 'Customer'

  try {
    for (const key of [
      'insurex_user',
      'insurexUser',
      'currentUser',
      'user',
    ]) {
      const value = localStorage.getItem(key)
      if (!value) continue

      try {
        const parsed = JSON.parse(value)
        const name =
          parsed?.username ??
          parsed?.fullName ??
          parsed?.name

        if (typeof name === 'string' && name.trim()) {
          return name.trim()
        }
      } catch {
        // Ignore values that aren't JSON.
      }
    }
  } catch {
    // Storage may be unavailable.
  }

  return 'Customer'
}

/* =========================================================
   STATISTIC
========================================================= */

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  to,
  loading,
}) {
  return (
    <div>
      <div className="row" style={{ gap: 8 }}>
        <Icon size={18} color="var(--lagoon)" />
        <span className="label">{label}</span>
      </div>

      <Link
        to={to}
        style={{
          display: 'block',
          color: 'var(--ink)',
          textDecoration: 'none',
        }}
      >
        <div className="value" style={{ fontWeight: 800 }}>
          {loading ? '…' : value}
        </div>

        <div className="sub">{detail}</div>
      </Link>
    </div>
  )
}

/* =========================================================
   CUSTOMER DASHBOARD
========================================================= */

export default function Dashboard() {
  const customerName = useMemo(() => getCustomerName(), [])

  // Fetch only the logged-in customer's records.
  const p = useQuery({
    queryKey: ['my-policies'],
    queryFn: () => policies.mine(),
    retry: 1,
  })

  const pu = useQuery({
    queryKey: ['my-purchases'],
    queryFn: () => purchases.mine(),
    retry: 1,
  })

  const c = useQuery({
    queryKey: ['my-claims'],
    queryFn: () => claims.mine(),
    retry: 1,
  })

  const n = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifications.mine(),
    retry: 1,
  })

  const policyItems = asArray(p.data)
  const purchaseItems = asArray(pu.data)
  const claimItems = asArray(c.data)
  const notificationItems = asArray(n.data)

  const activePolicies = policyItems.filter(isActive)

  const totalCover = activePolicies.reduce(
    (total, item) =>
      total +
      Number(
        item?.sumInsured ??
        item?.coverageAmount ??
        item?.coverAmount ??
        item?.policy?.sumInsured ??
        item?.policy?.coverageAmount ??
        item?.policy?.coverAmount ??
        0,
      ),
    0,
  )

  const unreadNotifications = notificationItems.filter(isUnread)

  const recentClaims = sortNewest(
    claimItems,
    getClaimDate,
  ).slice(0, 4)

  const recentNotifications = sortNewest(
    notificationItems,
    getNotificationDate,
  ).slice(0, 4)

  const isLoading =
    p.isLoading ||
    pu.isLoading ||
    c.isLoading ||
    n.isLoading

  const hasError =
    p.isError ||
    pu.isError ||
    c.isError ||
    n.isError

  const refresh = () => {
    void p.refetch()
    void pu.refetch()
    void c.refetch()
    void n.refetch()
  }

  return (
    <div className="stack">
      <PageHeader
        title={`Good day, ${customerName}`}
        subtitle="Your insurance at a glance. Manage your coverage, track claims, and stay protected."
        actions={
          <button
            type="button"
            className="btn"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {hasError && (
        <div className="alert warn">
          <div className="row">
            <CircleAlert size={18} />

            <div className="grow">
              Some dashboard information could not be loaded.
              Check your connection and try refreshing.
            </div>

            <button
              type="button"
              className="btn sm"
              onClick={refresh}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY STATISTICS */}
      <section className="ledger">
        <Stat
          icon={ShieldCheck}
          label="Active policies"
          value={activePolicies.length}
          detail="Your active protection"
          to="/app/my-policies"
          loading={p.isLoading}
        />

        <Stat
          icon={FileText}
          label="My claims"
          value={claimItems.length}
          detail="Claims submitted"
          to="/app/my-claims"
          loading={c.isLoading}
        />

        <Stat
          icon={WalletCards}
          label="Total cover"
          value={totalCover > 0 ? inrShort(totalCover) : '₹0'}
          detail="Available policy cover"
          to="/app/my-policies"
          loading={p.isLoading}
        />

        <Stat
          icon={Bell}
          label="Notifications"
          value={unreadNotifications.length}
          detail="Unread updates"
          to="/app/notifications"
          loading={n.isLoading}
        />
      </section>

      {/* COVERAGE AND QUICK ACTIONS */}
      <section className="two-col">
        <Panel>
          <div className="panel-head">
            <div>
              <h3>Your protection</h3>
              <p
                className="muted"
                style={{ marginTop: 5, fontSize: 13 }}
              >
                An overview of your active insurance
              </p>
            </div>

            <Link
              to="/app/my-policies"
              className="btn sm"
            >
              View policies <ArrowRight size={15} />
            </Link>
          </div>

          <div className="panel-body stack">
            <div className="row">
              <div
                className="dot-icon"
                style={{ width: 46, height: 46 }}
              >
                <ShieldCheck size={23} />
              </div>

              <div className="grow">
                <div
                  className="muted"
                  style={{ fontSize: 13 }}
                >
                  Total insured amount
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.3,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {p.isLoading ? 'Loading…' : safeMoney(totalCover)}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="row spread">
              <span className="muted">Active policies</span>
              <b>{p.isLoading ? '—' : activePolicies.length}</b>
            </div>

            <div className="row spread">
              <span className="muted">Other policies</span>
              <b>
                {p.isLoading
                  ? '—'
                  : Math.max(
                      0,
                      policyItems.length - activePolicies.length,
                    )}
              </b>
            </div>

            <div className="row spread">
              <span className="muted">Purchases recorded</span>
              <b>{pu.isLoading ? '—' : purchaseItems.length}</b>
            </div>

            {activePolicies.length === 0 &&
              !p.isLoading &&
              !p.isError && (
                <div className="alert info">
                  You do not have an active policy listed yet.
                  Explore available plans to find the right protection.
                </div>
              )}

            <Link
              to="/app/plans"
              className="btn primary block"
            >
              <Plus size={17} />
              Explore insurance plans
            </Link>
          </div>
        </Panel>

        <Panel>
          <div className="panel-head">
            <div>
              <h3>Quick actions</h3>
              <p
                className="muted"
                style={{ marginTop: 5, fontSize: 13 }}
              >
                Common tasks in one place
              </p>
            </div>
          </div>

          <div className="panel-body stack-sm">
            <Link
              to="/app/plans"
              className="list-item"
              style={{ padding: '12px 0', textDecoration: 'none' }}
            >
              <div className="dot-icon">
                <ShieldCheck size={19} />
              </div>

              <div className="grow">
                <b style={{ color: 'var(--ink)' }}>Explore plans</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  Compare available insurance
                </div>
              </div>

              <ArrowRight size={17} />
            </Link>

            <Link
              to="/app/claim-submit"
              className="list-item"
              style={{ padding: '12px 0', textDecoration: 'none' }}
            >
              <div
                className="dot-icon"
                style={{
                  background: 'var(--marigold-soft)',
                  color: 'var(--marigold-deep)',
                }}
              >
                <FileText size={19} />
              </div>

              <div className="grow">
                <b style={{ color: 'var(--ink)' }}>Submit a claim</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  Start a new claim request
                </div>
              </div>

              <ArrowRight size={17} />
            </Link>

            <Link
              to="/app/my-policies"
              className="list-item"
              style={{ padding: '12px 0', textDecoration: 'none' }}
            >
              <div className="dot-icon">
                <WalletCards size={19} />
              </div>

              <div className="grow">
                <b style={{ color: 'var(--ink)' }}>My policies</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  Review your policy details
                </div>
              </div>

              <ArrowRight size={17} />
            </Link>

            <Link
              to="/app/notifications"
              className="list-item"
              style={{ padding: '12px 0', textDecoration: 'none' }}
            >
              <div
                className="dot-icon"
                style={{
                  background: 'var(--blue-soft)',
                  color: 'var(--blue)',
                }}
              >
                <Bell size={19} />
              </div>

              <div className="grow">
                <b style={{ color: 'var(--ink)' }}>Notifications</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  {unreadNotifications.length > 0
                    ? `${unreadNotifications.length} unread update(s)`
                    : 'View your latest updates'}
                </div>
              </div>

              <ArrowRight size={17} />
            </Link>
          </div>
        </Panel>
      </section>

      {/* RECENT CLAIMS */}
      <Panel>
        <div className="panel-head">
          <div>
            <h3>Recent claims</h3>
            <p
              className="muted"
              style={{ marginTop: 5, fontSize: 13 }}
            >
              Track the latest claim activity
            </p>
          </div>

          <Link to="/app/my-claims" className="btn sm">
            All claims <ArrowRight size={15} />
          </Link>
        </div>

        {c.isLoading ? (
          <div className="panel-body">
            <div
              className="skeleton"
              style={{ height: 16, width: '45%' }}
            />
            <div
              className="skeleton"
              style={{ height: 16, marginTop: 16, width: '75%' }}
            />
            <div
              className="skeleton"
              style={{ height: 16, marginTop: 16, width: '60%' }}
            />
          </div>
        ) : c.isError ? (
          <div className="empty">
            <CircleAlert
              size={30}
              color="var(--ink-3)"
              style={{ marginBottom: 10 }}
            />
            <h4>Claims could not be loaded</h4>
            <p>Refresh the dashboard to try again.</p>
          </div>
        ) : recentClaims.length === 0 ? (
          <div className="empty">
            <FileText
              size={30}
              color="var(--ink-3)"
              style={{ marginBottom: 10 }}
            />
            <h4>No claims yet</h4>
            <p>Your submitted claims will appear here when available.</p>
            <Link to="/app/claim-submit" className="btn dark">
              Submit a claim <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          recentClaims.map((item, index) => (
            <div
              className="list-item"
              key={`${getClaimNumber(item)}-${index}`}
            >
              <div className="dot-icon">
                <FileText size={18} />
              </div>

              <div className="grow">
                <div className="row wrap spread">
                  <b>{text(getClaimNumber(item))}</b>
                  <StatusBadge
                    status={text(
                      item?.claimStatus ?? item?.status,
                      'PENDING',
                    )}
                  />
                </div>

                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 4 }}
                >
                  {safeFormatDate(getClaimDate(item))}
                  {' · '}
                  {text(
                    item?.claimType ?? item?.type,
                    'Insurance claim',
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', flex: 'none' }}>
                <b>{safeMoney(getClaimAmount(item))}</b>
                <div className="faint" style={{ fontSize: 12 }}>
                  Claim amount
                </div>
              </div>
            </div>
          ))
        )}
      </Panel>

      {/* RECENT NOTIFICATIONS */}
      <Panel>
        <div className="panel-head">
          <div>
            <h3>Recent notifications</h3>
            <p
              className="muted"
              style={{ marginTop: 5, fontSize: 13 }}
            >
              Important updates about your account
            </p>
          </div>

          <Link to="/app/notifications" className="btn sm">
            View all <ArrowRight size={15} />
          </Link>
        </div>

        {n.isLoading ? (
          <div className="panel-body">
            <div
              className="skeleton"
              style={{ height: 16, width: '55%' }}
            />
            <div
              className="skeleton"
              style={{ height: 16, marginTop: 16, width: '80%' }}
            />
          </div>
        ) : n.isError ? (
          <div className="empty">
            <CircleAlert
              size={30}
              color="var(--ink-3)"
              style={{ marginBottom: 10 }}
            />
            <h4>Notifications could not be loaded</h4>
            <p>Refresh the dashboard to try again.</p>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="empty">
            <Bell
              size={30}
              color="var(--ink-3)"
              style={{ marginBottom: 10 }}
            />
            <h4>You're all caught up</h4>
            <p>New account and policy updates will appear here.</p>
          </div>
        ) : (
          recentNotifications.map((item, index) => (
            <div
              className={`list-item ${isUnread(item) ? 'unread' : ''}`}
              key={String(
                item?.id ??
                item?.notificationId ??
                index,
              )}
            >
              <div
                className="dot-icon"
                style={
                  isUnread(item)
                    ? {
                        background: 'var(--marigold-soft)',
                        color: 'var(--marigold-deep)',
                      }
                    : undefined
                }
              >
                {isUnread(item) ? (
                  <Bell size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
              </div>

              <div className="grow">
                <b>
                  {text(
                    item?.title ?? item?.subject,
                    'Account update',
                  )}
                </b>

                <p
                  className="muted"
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {text(
                    item?.message ??
                    item?.description ??
                    item?.content,
                    'You have a new account notification.',
                  )}
                </p>

                <div
                  className="faint"
                  style={{ marginTop: 6, fontSize: 12 }}
                >
                  {safeFormatDate(getNotificationDate(item))}
                </div>
              </div>

              {isUnread(item) && (
                <span className="badge amber">New</span>
              )}
            </div>
          ))
        )}
      </Panel>
    </div>
  )
}

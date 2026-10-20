
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
  policies,
  purchases,
  claims,
  notifications,
} from '../../api/endpoints'

import {
  PageHeader,
  Panel,
  StatusBadge,
} from '../../components/ui'

import { date, inr, inrShort } from '../../lib/format'

/* =====================================================
   HELPERS
===================================================== */

function asArray(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.content)) return response.content
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.content)) return response.data.content
  return []
}

function displayName() {
  if (typeof window === 'undefined') return 'Customer'

  try {
    for (const key of [
      'insurex_user',
      'insurexUser',
      'currentUser',
      'user',
    ]) {
      const stored = localStorage.getItem(key)
      if (!stored) continue

      try {
        const user = JSON.parse(stored)
        const name = user?.username || user?.fullName || user?.name

        if (typeof name === 'string' && name.trim()) {
          return name.trim()
        }
      } catch {
        if (stored.trim() && !stored.startsWith('{')) {
          return stored.trim()
        }
      }
    }
  } catch {
    // Continue with the default.
  }

  return 'Customer'
}

function statusOf(item) {
  return String(
    item?.status ??
    item?.policyStatus ??
    item?.claimStatus ??
    '',
  ).toUpperCase()
}

function activePolicy(item) {
  if (item?.isActive !== undefined && item?.isActive !== null) {
    return item.isActive === true ||
      item.isActive === 1 ||
      item.isActive === '1'
  }

  return ['ACTIVE', 'APPROVED', 'SUCCESS'].includes(statusOf(item))
}

function money(value) {
  try {
    return inr(Number(value || 0))
  } catch {
    return `₹${Number(value || 0).toLocaleString('en-IN')}`
  }
}

function formattedDate(value) {
  if (!value) return 'Date unavailable'

  try {
    return date(value) || 'Date unavailable'
  } catch {
    return 'Date unavailable'
  }
}

function claimDate(item) {
  return item?.claimDate ?? item?.createdAt ?? item?.date
}

function notificationDate(item) {
  return item?.createdAt ?? item?.notificationDate ?? item?.date
}

function newest(items, getDate) {
  return [...items]
    .sort((a, b) => {
      const aTime = new Date(getDate(a) || 0).getTime() || 0
      const bTime = new Date(getDate(b) || 0).getTime() || 0
      return bTime - aTime
    })
    .slice(0, 4)
}

function unread(item) {
  if (typeof item?.isRead === 'boolean') return !item.isRead
  if (typeof item?.read === 'boolean') return !item.read

  return String(item?.status || '').toUpperCase() === 'UNREAD'
}

/* =====================================================
   DASHBOARD STATISTIC
===================================================== */

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
        <div className="value">
          {loading ? '…' : value}
        </div>
        <div className="sub">{detail}</div>
      </Link>
    </div>
  )
}

/* =====================================================
   CUSTOMER DASHBOARD
===================================================== */

export default function Dashboard() {
  const customerName = useMemo(() => displayName(), [])

  // Customer-owned policies only.
  const policyQuery = useQuery({
    queryKey: ['dashboard', 'my-policies'],
    queryFn: () => policies.mine(),
    retry: 1,
  })

  // Customer's own purchases only.
  const purchaseQuery = useQuery({
    queryKey: ['dashboard', 'my-purchases'],
    queryFn: () => purchases.mine(),
    retry: 1,
  })

  // Customer's own claims only.
  const claimQuery = useQuery({
    queryKey: ['dashboard', 'my-claims'],
    queryFn: () => claims.mine(),
    retry: 1,
  })

  // Customer notifications only.
  const notificationQuery = useQuery({
    queryKey: ['dashboard', 'my-notifications'],
    queryFn: () => notifications.mine(),
    retry: 1,
  })

  const policyItems = asArray(policyQuery.data)
  const purchaseItems = asArray(purchaseQuery.data)
  const claimItems = asArray(claimQuery.data)
  const notificationItems = asArray(notificationQuery.data)

  const activePolicies = policyItems.filter(activePolicy)

  const totalCover = activePolicies.reduce((total, item) => {
    const amount =
      item?.sumInsured ??
      item?.coverageAmount ??
      item?.coverAmount ??
      item?.policy?.sumInsured ??
      item?.policy?.coverageAmount ??
      0

    return total + (Number(amount) || 0)
  }, 0)

  const unreadCount = notificationItems.filter(unread).length

  const recentClaims = newest(claimItems, claimDate)
  const recentNotifications = newest(
    notificationItems,
    notificationDate,
  )

  const loadingPolicies = Boolean(policyQuery.isLoading)
  const loadingPurchases = Boolean(purchaseQuery.isLoading)
  const loadingClaims = Boolean(claimQuery.isLoading)
  const loadingNotifications = Boolean(notificationQuery.isLoading)

  const isLoading =
    loadingPolicies ||
    loadingPurchases ||
    loadingClaims ||
    loadingNotifications

  const hasError =
    policyQuery.isError ||
    purchaseQuery.isError ||
    claimQuery.isError ||
    notificationQuery.isError

  function refresh() {
    void policyQuery.refetch()
    void purchaseQuery.refetch()
    void claimQuery.refetch()
    void notificationQuery.refetch()
  }

  return (
    <div className="stack">
      {/* PAGE HEADER */}
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
          <div className="row wrap">
            <CircleAlert size={18} />
            <span className="grow">
              Some information could not be loaded. Your other dashboard
              sections remain available.
            </span>
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

      {/* FOUR SUMMARY CARDS — ORIGINAL LEDGER CSS */}
      <section className="ledger">
        <Stat
          icon={ShieldCheck}
          label="Active policies"
          value={activePolicies.length}
          detail="Your active protection"
          to="/app/my-policies"
          loading={loadingPolicies}
        />

        <Stat
          icon={FileText}
          label="My claims"
          value={claimItems.length}
          detail="Claims submitted"
          to="/app/my-claims"
          loading={loadingClaims}
        />

        <Stat
          icon={WalletCards}
          label="Total cover"
          value={totalCover > 0 ? inrShort(totalCover) : '₹0'}
          detail="Active policy coverage"
          to="/app/my-policies"
          loading={loadingPolicies}
        />

        <Stat
          icon={Bell}
          label="Notifications"
          value={unreadCount}
          detail="Unread updates"
          to="/app/notifications"
          loading={loadingNotifications}
        />
      </section>

      {/* MAIN DASHBOARD COLUMNS */}
      <section className="two-col">
        {/* COVERAGE OVERVIEW */}
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

            <Link to="/app/my-policies" className="btn sm">
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
                <div className="muted" style={{ fontSize: 13 }}>
                  Total insured amount
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {loadingPolicies ? 'Loading…' : money(totalCover)}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="row spread">
              <span className="muted">Active policies</span>
              <b>{loadingPolicies ? '—' : activePolicies.length}</b>
            </div>

            <div className="row spread">
              <span className="muted">Other policies</span>
              <b>
                {loadingPolicies
                  ? '—'
                  : Math.max(0, policyItems.length - activePolicies.length)}
              </b>
            </div>

            <div className="row spread">
              <span className="muted">Purchases recorded</span>
              <b>{loadingPurchases ? '—' : purchaseItems.length}</b>
            </div>

            {!loadingPolicies && activePolicies.length === 0 && (
              <div className="alert info">
                You do not have an active policy listed yet. Explore
                available plans to find the right protection.
              </div>
            )}

            <Link to="/app/plans" className="btn primary block">
              <Plus size={17} />
              Explore insurance plans
            </Link>
          </div>
        </Panel>

        {/* QUICK ACTIONS */}
        <Panel>
          <div className="panel-head">
            <div>
              <h3>Quick actions</h3>
              <p
                className="muted"
                style={{ marginTop: 5, fontSize: 13 }}
              >
                Your common tasks in one place
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
                  Compare insurance options
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
                  Review your coverage
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
                  {unreadCount
                    ? `${unreadCount} unread update(s)`
                    : 'View account updates'}
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

        {loadingClaims ? (
          <div className="panel-body stack-sm">
            <div className="skeleton" style={{ height: 16, width: '45%' }} />
            <div className="skeleton" style={{ height: 16, width: '75%' }} />
            <div className="skeleton" style={{ height: 16, width: '60%' }} />
          </div>
        ) : recentClaims.length === 0 ? (
          <div className="empty">
            <FileText
              size={30}
              color="var(--ink-3)"
              style={{ marginBottom: 10 }}
            />
            <h4>No claims yet</h4>
            <p>Your submitted claims will appear here.</p>
            <Link to="/app/claim-submit" className="btn dark">
              Submit a claim <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          recentClaims.map((item, index) => {
            const claimNumber =
              item?.claimNumber ?? item?.id ?? `Claim ${index + 1}`

            const amount = Number(
              item?.amount ?? item?.claimAmount ?? 0,
            )

            return (
              <div
                className="list-item"
                key={`${claimNumber}-${index}`}
              >
                <div className="dot-icon">
                  <FileText size={18} />
                </div>

                <div className="grow">
                  <div className="row wrap spread">
                    <b>{claimNumber}</b>
                    <StatusBadge
                      status={String(
                        item?.claimStatus ?? item?.status ?? 'PENDING',
                      )}
                    />
                  </div>

                  <div
                    className="muted"
                    style={{ fontSize: 13, marginTop: 4 }}
                  >
                    {formattedDate(claimDate(item))}
                    {' · '}
                    {item?.claimType ?? item?.type ?? 'Insurance claim'}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <b>{money(amount)}</b>
                  <div className="faint" style={{ fontSize: 12 }}>
                    Claim amount
                  </div>
                </div>
              </div>
            )
          })
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

        {loadingNotifications ? (
          <div className="panel-body stack-sm">
            <div className="skeleton" style={{ height: 16, width: '55%' }} />
            <div className="skeleton" style={{ height: 16, width: '80%' }} />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="empty">
            <Bell
              size={30}
              color="var(--ink-3)"
              style={{ marginBottom: 10 }}
            />
            <h4>You're all caught up</h4>
            <p>New policy and account updates will appear here.</p>
          </div>
        ) : (
          recentNotifications.map((item, index) => {
            const notificationId =
              item?.id ?? item?.notificationId ?? index

            const title =
              item?.title ?? item?.subject ?? 'Account update'

            const message =
              item?.message ??
              item?.description ??
              item?.content ??
              'You have a new account notification.'

            const isNew = unread(item)

            return (
              <div
                className={`list-item ${isNew ? 'unread' : ''}`}
                key={notificationId}
              >
                <div
                  className="dot-icon"
                  style={
                    isNew
                      ? {
                          background: 'var(--marigold-soft)',
                          color: 'var(--marigold-deep)',
                        }
                      : undefined
                  }
                >
                  {isNew ? (
                    <Bell size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                </div>

                <div className="grow">
                  <b>{title}</b>

                  <p
                    className="muted"
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {message}
                  </p>

                  <div
                    className="faint"
                    style={{ marginTop: 6, fontSize: 12 }}
                  >
                    {formattedDate(notificationDate(item))}
                  </div>
                </div>

                {isNew && <span className="badge amber">New</span>}
              </div>
            )
          })
        )}
      </Panel>
    </div>
  )
}

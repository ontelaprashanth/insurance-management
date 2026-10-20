import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
  CalendarClock,
  FileText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

import {
  claims,
  notifications,
  policies,
  purchases,
} from '../../api/endpoints'

import {
  DataState,
  Icon,
  PageHeader,
  Panel,
  StatusBadge,
} from '../../components/ui'

import { useAuth } from '../../auth/AuthContext'
import { date, inr, inrShort, timeAgo } from '../../lib/format'

function asArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.data?.content)) return value.data.content
  return []
}

function isActive(value) {
  return (
    value === true ||
    value === 1 ||
    ['true', '1', 'yes', 'active'].includes(
      String(value ?? '').trim().toLowerCase(),
    )
  )
}

function isUnread(notification) {
  return !isActive(notification?.isRead)
}

function safeDate(value) {
  if (!value) return Number.POSITIVE_INFINITY

  const timestamp = new Date(value).getTime()

  return Number.isFinite(timestamp)
    ? timestamp
    : Number.POSITIVE_INFINITY
}

function getClaimDate(claim) {
  return claim?.claimDate ? date(claim.claimDate) : 'Date unavailable'
}

function getExpiryDate(policy) {
  return policy?.expiryDate ? date(policy.expiryDate) : 'Not available'
}

function getClaimAmount(claim) {
  const status = String(claim?.status || '').toUpperCase()

  return inr(
    status === 'APPROVED'
      ? claim?.approvedAmount ?? claim?.amount ?? 0
      : claim?.amount ?? 0,
  )
}

function StatCard({ label, value, description, icon, to }) {
  const content = (
    <div className="panel" style={{ height: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="label">{label}</div>

          <div
            className="value"
            style={{
              marginTop: 8,
              overflowWrap: 'anywhere',
            }}
          >
            {value}
          </div>

          <div className="sub" style={{ marginTop: 5 }}>
            {description}
          </div>
        </div>

        <div className="dot-icon" aria-hidden="true">
          {icon}
        </div>
      </div>

      {to && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 14,
            fontSize: 12.5,
            fontWeight: 650,
          }}
        >
          View details <ArrowRight size={14} />
        </div>
      )}
    </div>
  )

  return to ? (
    <Link
      to={to}
      style={{
        color: 'inherit',
        textDecoration: 'none',
        display: 'block',
        minWidth: 0,
      }}
    >
      {content}
    </Link>
  ) : (
    content
  )
}

function QueryError({ query, label }) {
  if (!query.isError) return null

  return (
    <div
      className="alert error"
      role="alert"
      style={{ marginBottom: 12 }}
    >
      Could not load {label}. Please refresh the page or try again.

      <button
        type="button"
        className="btn sm"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
        style={{ marginLeft: 10 }}
      >
        {query.isFetching ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const pol = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
    retry: 1,
  })

  const pur = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    retry: 1,
  })

  const clm = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
    retry: 1,
  })

  const ntf = useQuery({
    queryKey: ['notifications'],
    queryFn: notifications.mine,
    retry: 1,
  })

  const policyRows = useMemo(() => asArray(pol.data), [pol.data])
  const purchaseRows = useMemo(() => asArray(pur.data), [pur.data])
  const claimRows = useMemo(() => asArray(clm.data), [clm.data])
  const notificationRows = useMemo(() => asArray(ntf.data), [ntf.data])

  const activePolicies = useMemo(
    () => policyRows.filter((policy) => isActive(policy?.isActive)),
    [policyRows],
  )

  const totalCover = useMemo(
    () =>
      purchaseRows
        .filter(
          (purchase) =>
            ['PAID', 'SUCCESS', 'COMPLETED'].includes(
              String(purchase?.paymentStatus || '').toUpperCase(),
            ) &&
            String(purchase?.refundStatus || '').toUpperCase() !==
              'REFUNDED',
        )
        .reduce(
          (sum, purchase) =>
            sum + Math.max(0, Number(purchase?.coverageAmount) || 0),
          0,
        ),
    [purchaseRows],
  )

  const pendingClaims = useMemo(
    () =>
      claimRows.filter(
        (claim) =>
          String(claim?.status || '').toUpperCase() === 'PENDING',
      ),
    [claimRows],
  )

  const unreadNotifications = useMemo(
    () => notificationRows.filter(isUnread),
    [notificationRows],
  )

  const recentClaims = useMemo(
    () =>
      [...claimRows]
        .sort(
          (a, b) =>
            (Number(b?.claimNumber) || 0) -
            (Number(a?.claimNumber) || 0),
        )
        .slice(0, 5),
    [claimRows],
  )

  const recentNotifications = useMemo(
    () =>
      [...notificationRows]
        .sort(
          (a, b) =>
            safeDate(b?.createdAt) - safeDate(a?.createdAt),
        )
        .slice(0, 5),
    [notificationRows],
  )

  const expiringPolicies = useMemo(
    () =>
      [...policyRows]
        .sort(
          (a, b) =>
            safeDate(a?.expiryDate) - safeDate(b?.expiryDate),
        )
        .slice(0, 4),
    [policyRows],
  )

  const firstName = user?.username?.trim() || 'Customer'

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle="Here is where your cover and claims stand today."
      >
        <Link className="btn primary" to="/app/plans">
          <ShieldCheck size={16} />
          Buy insurance
        </Link>
      </PageHeader>

      <QueryError query={pol} label="your policies" />
      <QueryError query={pur} label="your purchases" />
      <QueryError query={clm} label="your claims" />
      <QueryError query={ntf} label="your notifications" />

      <div
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Active policies"
          value={
            pol.isPending
              ? '…'
              : pol.isError
                ? '—'
                : activePolicies.length
          }
          description={
            pol.isError
              ? 'Unable to load policies'
              : `of ${policyRows.length} total`
          }
          icon={<ShieldCheck size={20} />}
          to="/app/policies"
        />

        <StatCard
          label="Total cover"
          value={
            pur.isPending
              ? '…'
              : pur.isError
                ? '—'
                : inrShort(totalCover)
          }
          description="Across eligible paid purchases"
          icon={<WalletCards size={20} />}
          to="/app/purchases"
        />

        <StatCard
          label="Claims in review"
          value={
            clm.isPending
              ? '…'
              : clm.isError
                ? '—'
                : pendingClaims.length
          }
          description={
            clm.isError
              ? 'Unable to load claims'
              : `${claimRows.length} filed in all`
          }
          icon={<FileText size={20} />}
          to="/app/claims"
        />

        <StatCard
          label="Unread alerts"
          value={
            ntf.isPending
              ? '…'
              : ntf.isError
                ? '—'
                : unreadNotifications.length
          }
          description="Notifications and updates"
          icon={<Bell size={20} />}
          to="/app/notifications"
        />
      </div>

      <div className="two-col">
        <Panel
          title="Recent claims"
          flush
          actions={
            <Link className="btn sm" to="/app/claims">
              View all
            </Link>
          }
        >
          <DataState
            query={clm}
            empty={{
              title: 'No claims yet',
              text: 'If something happens, file a claim from any active policy.',
            }}
            emptyAction={
              <Link className="btn dark" to="/app/policies">
                Go to my policies
              </Link>
            }
          >
            {() =>
              recentClaims.map((claim, index) => (
                <div
                  className="list-item"
                  key={claim.claimNumber ?? `claim-${index}`}
                >
                  <div className="dot-icon">
                    <Icon name="claim" />
                  </div>

                  <div className="grow">
                    <b>
                      Claim #{claim.claimNumber ?? '—'}
                    </b>

                    <span className="muted">
                      {' '}
                      · {claim.claimType || 'Insurance claim'}
                    </span>

                    <div className="faint" style={{ fontSize: 13 }}>
                      Policy #{claim.policyNumber ?? '—'} · filed{' '}
                      {getClaimDate(claim)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge value={claim.status || 'UNKNOWN'} />

                    <div
                      className="num"
                      style={{ fontSize: 13.5, marginTop: 4 }}
                    >
                      {getClaimAmount(claim)}
                    </div>
                  </div>
                </div>
              ))
            }
          </DataState>
        </Panel>

        <Panel
          title="Latest alerts"
          flush
          actions={
            <Link className="btn sm" to="/app/notifications">
              View all
            </Link>
          }
        >
          <DataState
            query={ntf}
            empty={{
              title: 'Nothing new',
              text: 'Offers, payment receipts and claim updates show up here.',
            }}
          >
            {() =>
              recentNotifications.map((notification, index) => (
                <div
                  className={`list-item ${
                    isUnread(notification) ? 'unread' : ''
                  }`}
                  key={
                    notification.notificationId ??
                    `notification-${index}`
                  }
                >
                  <div className="dot-icon">
                    <Icon name="bell" />
                  </div>

                  <div className="grow">
                    <b>
                      {notification.title || 'InsureX update'}
                    </b>

                    <div
                      className="muted"
                      style={{ fontSize: 13, marginTop: 4 }}
                    >
                      {notification.message ||
                        notification.description ||
                        'You have a new InsureX notification.'}
                    </div>

                    <div
                      className="faint"
                      style={{ fontSize: 12, marginTop: 5 }}
                    >
                      {notification.createdAt
                        ? timeAgo(notification.createdAt)
                        : 'Recent update'}
                    </div>
                  </div>

                  {isUnread(notification) && (
                    <span
                      className="status-badge"
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
              ))
            }
          </DataState>
        </Panel>
      </div>

      <div style={{ marginTop: 22 }}>
        <Panel
          title="Policies nearing expiry"
          flush
          actions={
            <Link className="btn sm" to="/app/policies">
              View policies
            </Link>
          }
        >
          <DataState
            query={pol}
            empty={{
              title: 'No policies available',
              text: 'Your policy expiry information will appear here.',
            }}
          >
            {() =>
              expiringPolicies.map((policy, index) => (
                <div
                  className="list-item"
                  key={policy.policyNumber ?? `policy-${index}`}
                >
                  <div className="dot-icon">
                    <CalendarClock size={19} />
                  </div>

                  <div className="grow">
                    <b>
                      Policy #{policy.policyNumber ?? '—'}
                    </b>

                    <div
                      className="muted"
                      style={{ fontSize: 13, marginTop: 4 }}
                    >
                      {policy.coveredTypes ||
                        policy.coverageType ||
                        'Insurance policy'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge
                      value={
                        isActive(policy.isActive)
                          ? 'ACTIVE'
                          : 'INACTIVE'
                      }
                    />

                    <div
                      className="faint"
                      style={{ fontSize: 12, marginTop: 5 }}
                    >
                      Expires {getExpiryDate(policy)}
                    </div>
                  </div>
                </div>
              ))
            }
          </DataState>
        </Panel>
      </div>
    </>
  )
}

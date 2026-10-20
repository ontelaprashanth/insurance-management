
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
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
  if (!value) return Number.NEGATIVE_INFINITY

  const timestamp = new Date(value).getTime()

  return Number.isFinite(timestamp)
    ? timestamp
    : Number.NEGATIVE_INFINITY
}

function getClaimDate(claim) {
  return claim?.claimDate ? date(claim.claimDate) : 'Date unavailable'
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
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div
          className="label"
          style={{
            minWidth: 0,
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {label}
        </div>

        <div
          className="dot-icon"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>

      <div
        className="value"
        style={{
          marginTop: 12,
          lineHeight: 1.25,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>

      <div
        className="sub"
        style={{
          marginTop: 7,
          lineHeight: 1.5,
          overflowWrap: 'anywhere',
        }}
      >
        {description}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginTop: 'auto',
          paddingTop: 14,
          fontSize: 12.5,
          fontWeight: 650,
        }}
      >
        View details <ArrowRight size={14} />
      </div>
    </>
  )

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: 0,
    minHeight: 168,
    boxSizing: 'border-box',
    padding: 18,
    color: 'inherit',
    textDecoration: 'none',
    overflowWrap: 'anywhere',
  }

  return (
    <Link
      to={to}
      className="panel"
      style={cardStyle}
    >
      {content}
    </Link>
  )
}

function QueryError({ query, label }) {
  if (!query.isError) return null

  return (
    <div
      className="alert error"
      role="alert"
      style={{
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
      }}
    >
      <span>Could not load {label}. Please try again.</span>

      <button
        type="button"
        className="btn sm"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
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
          (a, b) => safeDate(b?.createdAt) - safeDate(a?.createdAt),
        )
        .slice(0, 5),
    [notificationRows],
  )

  const firstName = user?.username?.trim() || 'Customer'

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
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

      {/* Four consistently sized statistics cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 215px), 1fr))',
          gap: 16,
          alignItems: 'stretch',
          marginBottom: 24,
          width: '100%',
          minWidth: 0,
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
              : `${policyRows.length} in total`
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

      {/* Aligned claims and alerts panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: 20,
          alignItems: 'stretch',
          width: '100%',
          minWidth: 0,
        }}
      >
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
                  style={{
                    minWidth: 0,
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div className="dot-icon" style={{ flexShrink: 0 }}>
                    <Icon name="claim" />
                  </div>

                  <div className="grow" style={{ minWidth: 0 }}>
                    <b>Claim #{claim.claimNumber ?? '—'}</b>

                    <span className="muted">
                      {' '}
                      · {claim.claimType || 'Insurance claim'}
                    </span>

                    <div
                      className="faint"
                      style={{
                        fontSize: 13,
                        marginTop: 5,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      Policy #{claim.policyNumber ?? '—'} · filed{' '}
                      {getClaimDate(claim)}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: 'right',
                      flexShrink: 0,
                      maxWidth: '42%',
                    }}
                  >
                    <StatusBadge value={claim.status || 'UNKNOWN'} />

                    <div
                      className="num"
                      style={{ fontSize: 13.5, marginTop: 5 }}
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
                  style={{
                    minWidth: 0,
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div className="dot-icon" style={{ flexShrink: 0 }}>
                    <Icon name="bell" />
                  </div>

                  <div className="grow" style={{ minWidth: 0 }}>
                    <b>{notification.title || 'InsureX update'}</b>

                    <div
                      className="muted"
                      style={{
                        fontSize: 13,
                        marginTop: 5,
                        lineHeight: 1.5,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {notification.message ||
                        notification.description ||
                        'You have a new InsureX notification.'}
                    </div>

                    <div
                      className="faint"
                      style={{ fontSize: 12, marginTop: 6 }}
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
                        flexShrink: 0,
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
    </div>
  )
}

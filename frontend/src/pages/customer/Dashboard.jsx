
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
  PageHeader,
  Panel,
  StatusBadge,
} from '../../components/ui'

import { date, inr, inrShort, timeAgo } from '../../lib/format'

const asArray = (value) => Array.isArray(value) ? value : []

const upper = (value) => String(value ?? '').trim().toUpperCase()

const isActive = (value) =>
  value === true ||
  value === 1 ||
  upper(value) === 'TRUE' ||
  upper(value) === 'ACTIVE'

const isUnread = (item) =>
  item?.isRead === false ||
  item?.read === false ||
  item?.isRead === 0 ||
  upper(item?.status) === 'UNREAD'

const safeDate = (value) => {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const getClaimDate = (item) =>
  item?.claimDate ?? item?.createdAt ?? item?.date

const getClaimAmount = (item) =>
  Number(item?.amount ?? item?.claimAmount ?? 0)

const getNotificationDate = (item) =>
  item?.createdAt ?? item?.notificationDate ?? item?.date

const getPolicyNumber = (item) =>
  item?.policyNumber ?? item?.policy?.policyNumber ?? '—'

const getClaimNumber = (item) =>
  item?.claimNumber ?? item?.id ?? '—'

const sum = (items, getValue) =>
  items.reduce((total, item) => total + Number(getValue(item) || 0), 0)

function getCustomerName() {
  try {
    const keys = [
      'insurex_user',
      'insurexUser',
      'user',
      'currentUser',
    ]

    for (const key of keys) {
      const stored = localStorage.getItem(key)
      if (!stored) continue

      try {
        const parsed = JSON.parse(stored)
        const name =
          parsed?.username ??
          parsed?.name ??
          parsed?.fullName

        if (typeof name === 'string' && name.trim()) {
          return name.trim()
        }
      } catch {
        if (!stored.startsWith('{') && !stored.startsWith('[')) {
          return stored.trim()
        }
      }
    }
  } catch {
    // Storage may be unavailable.
  }

  return 'Customer'
}

function Stat({ icon: StatIcon, label, value, detail, to, loading }) {
  return (
    <div className="customer-stat">
      <div className="customer-stat-heading">
        <StatIcon size={19} strokeWidth={2} />
        <span className="label">{label}</span>
      </div>

      <Link className="customer-stat-link" to={to}>
        <div className="customer-stat-value">
          {loading ? '…' : value}
        </div>

        <div className="sub customer-stat-detail">
          {detail}
        </div>
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const customerName = getCustomerName()

  const p = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.getAll,
  })

  const pu = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.getAll,
  })

  const c = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.getAll,
  })

  const n = useQuery({
    queryKey: ['notifications'],
    queryFn: notifications.getAll,
  })

  const P = asArray(p.data)
  const PU = asArray(pu.data)
  const C = asArray(c.data)
  const N = asArray(n.data)

  const activePolicies = useMemo(
    () => P.filter((item) => isActive(item?.isActive)),
    [P],
  )

  const paidPurchases = useMemo(
    () =>
      PU.filter((item) =>
        ['PAID', 'SUCCESS', 'COMPLETED'].includes(
          upper(item?.paymentStatus ?? item?.status),
        ),
      ),
    [PU],
  )

  const validPurchases = useMemo(
    () =>
      paidPurchases.filter(
        (item) => upper(item?.refundStatus) !== 'REFUNDED',
      ),
    [paidPurchases],
  )

  const totalCover = useMemo(
    () =>
      sum(
        validPurchases,
        (item) =>
          item?.coverageAmount ??
          item?.sumInsured ??
          item?.totalCoverage ??
          item?.policy?.coverageAmount ??
          0,
      ),
    [validPurchases],
  )

  const pendingClaims = useMemo(
    () => C.filter((item) => upper(item?.status) === 'PENDING'),
    [C],
  )

  const unreadNotifications = useMemo(
    () => N.filter(isUnread),
    [N],
  )

  const recentClaims = useMemo(
    () =>
      [...C]
        .sort(
          (a, b) =>
            safeDate(getClaimDate(b)) - safeDate(getClaimDate(a)),
        )
        .slice(0, 5),
    [C],
  )

  const recentNotifications = useMemo(
    () =>
      [...N]
        .sort(
          (a, b) =>
            safeDate(getNotificationDate(b)) -
            safeDate(getNotificationDate(a)),
        )
        .slice(0, 5),
    [N],
  )

  const anyError =
    p.isError || pu.isError || c.isError || n.isError

  const refreshAll = () => {
    p.refetch()
    pu.refetch()
    c.refetch()
    n.refetch()
  }

  return (
    <>
      <PageHeader
        title={`Hello, ${customerName}`}
        subtitle="Your insurance overview, claims, and account updates."
        actions={
          <Link className="btn dark" to="/app/plans">
            Buy insurance <ArrowRight size={16} />
          </Link>
        }
      />

      {anyError && (
        <div style={{ marginBottom: 16 }}>
          <DataState
            title="Some dashboard information could not be loaded"
            description="Refresh to try loading your latest information."
            action={
              <button className="btn sm" onClick={refreshAll}>
                Refresh dashboard
              </button>
            }
          />
        </div>
      )}

      <div className="ledger customer-dashboard-ledger">
        <Stat
          icon={ShieldCheck}
          label="Active policies"
          value={activePolicies.length}
          detail={`${P.length} policies in total`}
          to="/app/my-policies"
          loading={p.isLoading}
        />

        <Stat
          icon={FileText}
          label="My claims"
          value={C.length}
          detail={`${pendingClaims.length} awaiting review`}
          to="/app/my-claims"
          loading={c.isLoading}
        />

        <Stat
          icon={WalletCards}
          label="Total cover"
          value={inrShort(totalCover)}
          detail={`${validPurchases.length} paid purchases`}
          to="/app/my-policies"
          loading={pu.isLoading}
        />

        <Stat
          icon={Bell}
          label="Notifications"
          value={unreadNotifications.length}
          detail={`${N.length} notifications in total`}
          to="/app/notifications"
          loading={n.isLoading}
        />
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <Panel
          title="Recent claims"
          flush
          actions={
            <Link className="btn sm" to="/app/my-claims">
              View all
            </Link>
          }
        >
          {c.isLoading ? (
            <DataState loading title="Loading claims..." />
          ) : recentClaims.length === 0 ? (
            <div className="empty">
              <h4>No claims yet</h4>
              <p>Your submitted claims will appear here.</p>
              <Link className="btn sm" to="/app/claim-submit">
                Submit a claim
              </Link>
            </div>
          ) : (
            recentClaims.map((item, index) => (
              <div
                className="list-item"
                key={item?.claimNumber ?? item?.id ?? index}
              >
                <div className="grow" style={{ minWidth: 0 }}>
                  <b>Claim #{getClaimNumber(item)}</b>
                  <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>
                    Policy #{getPolicyNumber(item)}
                    {' · '}
                    {date(getClaimDate(item))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <b className="num">
                    {inr(getClaimAmount(item))}
                  </b>
                  <StatusBadge value={item?.status || 'PENDING'} />
                </div>
              </div>
            ))
          )}
        </Panel>

        <Panel
          title="Latest notifications"
          flush
          actions={
            <Link className="btn sm" to="/app/notifications">
              View all
            </Link>
          }
        >
          {n.isLoading ? (
            <DataState loading title="Loading notifications..." />
          ) : recentNotifications.length === 0 ? (
            <div className="empty">
              <h4>You're all caught up</h4>
              <p>New account updates will appear here.</p>
            </div>
          ) : (
            recentNotifications.map((item, index) => (
              <div
                className="list-item"
                key={item?.notificationId ?? item?.id ?? index}
              >
                <div className="grow" style={{ minWidth: 0 }}>
                  <b
                    style={{
                      fontWeight: isUnread(item) ? 800 : 600,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item?.title || item?.message || 'Account update'}
                  </b>

                  {item?.title && item?.message && (
                    <div
                      className="faint"
                      style={{
                        fontSize: 13,
                        marginTop: 4,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {item.message}
                    </div>
                  )}

                  <div className="faint" style={{ fontSize: 12, marginTop: 5 }}>
                    {timeAgo(getNotificationDate(item))}
                  </div>
                </div>

                {isUnread(item) && (
                  <span
                    title="Unread notification"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: '#2563eb',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                )}
              </div>
            ))
          )}
        </Panel>
      </div>

      <Panel title="Quick actions">
        <div className="customer-quick-actions">
          <Link className="btn" to="/app/plans">
            <ShieldCheck size={17} /> Browse policies
          </Link>

          <Link className="btn" to="/app/my-policies">
            <WalletCards size={17} /> My policies
          </Link>

          <Link className="btn" to="/app/claim-submit">
            <FileText size={17} /> Submit a claim
          </Link>

          <Link className="btn" to="/app/notifications">
            <Bell size={17} /> Notifications
          </Link>
        </div>
      </Panel>
    </>
  )
}

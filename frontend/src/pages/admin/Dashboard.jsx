import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import {
  claims,
  policies,
  purchases,
  settlements,
  users,
} from '../../api/endpoints'

import {
  Button,
  PageHeader,
  Panel,
  StatusBadge,
} from '../../components/ui'

import {
  date,
  inr,
  inrShort,
  today,
} from '../../lib/format'

/* =========================================================
   INSUREX — ADMIN DASHBOARD
========================================================= */

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }
  return []
}

function amount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function sum(rows, getValue) {
  return rows.reduce(
    (total, row) => total + amount(getValue(row)),
    0,
  )
}

function statusOf(value) {
  return String(value ?? '').trim().toUpperCase()
}

function isActive(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  )
}

function isCurrentPolicy(policy) {
  const expiry = String(policy?.expiryDate ?? '').slice(0, 10)
  return isActive(policy?.isActive) && (!expiry || expiry >= today())
}

function getClaimNumber(record) {
  return record?.claimNumber ?? record?.claim?.claimNumber ?? null
}

function isSuccessfulPayment(purchase) {
  return ['PAID', 'SUCCESS', 'CAPTURED', 'COMPLETED'].includes(
    statusOf(purchase.paymentStatus),
  )
}

/*
 * Revenue is based on successful payments.
 *
 * Fully refunded purchases are excluded.
 * Partially refunded amounts are subtracted only when
 * the backend supplies an actual refunded amount.
 *
 * This is an operational estimate, not an accounting ledger.
 */
function netPremium(purchase) {
  if (!isSuccessfulPayment(purchase)) return 0

  const premium = Math.max(0, amount(purchase.totalPremium))
  const refundStatus = statusOf(purchase.refundStatus)

  if (refundStatus === 'REFUNDED') return 0

  const refundedAmount =
    purchase.refundedAmount ??
    purchase.refundAmountPaid ??
    purchase.actualRefundAmount

  if (refundedAmount != null) {
    return Math.max(0, premium - Math.max(0, amount(refundedAmount)))
  }

  return premium
}

function SummaryCard({ label, value, sub, to }) {
  const content = (
    <div className="ix-admin-stat">
      <div className="ix-admin-stat-label">{label}</div>
      <div className="ix-admin-stat-value">{value}</div>
      <div className="ix-admin-stat-sub">{sub}</div>
    </div>
  )

  return to ? (
    <Link className="ix-admin-stat-link" to={to}>
      {content}
    </Link>
  ) : (
    content
  )
}

function QueryNotice({ query, label }) {
  if (!query.isError) return null

  return (
    <div className="alert error" role="alert">
      Could not load {label}. The figures or queues that depend on
      this data may be unavailable.
      <Button
        type="button"
        size="sm"
        onClick={() => query.refetch()}
      >
        Retry
      </Button>
    </div>
  )
}

function QueueState({ loading, error, emptyTitle, emptyText, children }) {
  if (loading) {
    return (
      <div className="ix-admin-queue-state muted">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="ix-admin-queue-state muted">
        Data is currently unavailable.
      </div>
    )
  }

  if (!children) {
    return (
      <div className="empty">
        <h4>{emptyTitle}</h4>
        <p>{emptyText}</p>
      </div>
    )
  }

  return children
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const usersQuery = useQuery({
    queryKey: ['a-users'],
    queryFn: users.getAll,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const policiesQuery = useQuery({
    queryKey: ['a-policies'],
    queryFn: policies.getAll,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const purchasesQuery = useQuery({
    queryKey: ['a-purchases'],
    queryFn: purchases.getAll,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const claimsQuery = useQuery({
    queryKey: ['a-claims'],
    queryFn: claims.getAll,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const settlementsQuery = useQuery({
    queryKey: ['a-settlements'],
    queryFn: settlements.getAll,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const U = useMemo(
    () => normalizeRows(usersQuery.data),
    [usersQuery.data],
  )

  const P = useMemo(
    () => normalizeRows(policiesQuery.data),
    [policiesQuery.data],
  )

  const PU = useMemo(
    () => normalizeRows(purchasesQuery.data),
    [purchasesQuery.data],
  )

  const C = useMemo(
    () => normalizeRows(claimsQuery.data),
    [claimsQuery.data],
  )

  const S = useMemo(
    () => normalizeRows(settlementsQuery.data),
    [settlementsQuery.data],
  )

  /* =======================================================
     CUSTOMERS AND POLICIES
  ======================================================= */

  const customers = U.filter(
    (user) => statusOf(user.role) === 'USER',
  )

  const activeCustomers = customers.filter(
    (user) => isActive(user.isActive),
  )

  const activePolicies = P.filter(isCurrentPolicy)

  /* =======================================================
     PURCHASES / REFUNDS
  ======================================================= */

  const paidPurchases = PU.filter(isSuccessfulPayment)

  const premiumCollected = sum(
    paidPurchases,
    netPremium,
  )

  const refundedPurchases = paidPurchases.filter(
    (purchase) =>
      statusOf(purchase.refundStatus) === 'REFUNDED',
  )

  const processingRefunds = PU.filter((purchase) =>
    ['REQUESTED', 'PROCESSING', 'PENDING'].includes(
      statusOf(purchase.refundStatus),
    ),
  )

  /* =======================================================
     CLAIMS
  ======================================================= */

  const pendingClaims = C.filter(
    (claim) => statusOf(claim.status) === 'PENDING',
  )

  const approvedClaims = C.filter(
    (claim) => statusOf(claim.status) === 'APPROVED',
  )

  const rejectedClaims = C.filter(
    (claim) => statusOf(claim.status) === 'REJECTED',
  )

  const claimStatusCounts = [
    {
      key: 'PENDING',
      label: 'Pending',
      count: pendingClaims.length,
      color: '#E9A23B',
    },
    {
      key: 'APPROVED',
      label: 'Approved',
      count: approvedClaims.length,
      color: '#2F8A57',
    },
    {
      key: 'REJECTED',
      label: 'Rejected',
      count: rejectedClaims.length,
      color: '#D4503C',
    },
  ]

  const maxBar = Math.max(
    1,
    ...claimStatusCounts.map((item) => item.count),
  )

  const reviewQueue = pendingClaims
    .slice()
    .sort(
      (a, b) =>
        Number(b.claimNumber || 0) -
        Number(a.claimNumber || 0),
    )
    .slice(0, 6)

  /* =======================================================
     SETTLEMENTS
  ======================================================= */

  const pendingSettlements = S.filter(
    (settlement) =>
      statusOf(settlement.settlementStatus) === 'PENDING',
  )

  const completedSettlements = S.filter(
    (settlement) =>
      statusOf(settlement.settlementStatus) === 'SETTLED',
  )

  const pendingPayoutAmount = sum(
    pendingSettlements,
    (settlement) => settlement.amount,
  )

  const settledAmount = sum(
    completedSettlements,
    (settlement) => settlement.amount,
  )

  const claimsNeedingSettlement = approvedClaims.filter(
    (claim) =>
      !S.some(
        (settlement) =>
          String(getClaimNumber(settlement)) ===
            String(claim.claimNumber) &&
          statusOf(settlement.settlementStatus) !== 'REJECTED',
      ),
  )

  const latestSettlement = S.slice().sort(
    (a, b) =>
      Number(b.settlementNumber || 0) -
      Number(a.settlementNumber || 0),
  )[0]

  /* =======================================================
     REFRESH
  ======================================================= */

  const queries = [
    usersQuery,
    policiesQuery,
    purchasesQuery,
    claimsQuery,
    settlementsQuery,
  ]

  const refreshing = queries.some(
    (query) => query.isFetching,
  )

  function refreshAll() {
    queries.forEach((query) => query.refetch())
  }

  function metric(query, value) {
    return query.isPending
      ? '…'
      : query.isError
        ? '—'
        : value
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>{`
        .ix-admin-dashboard-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-admin-stat-link {
          display: block;
          min-width: 0;
          color: inherit;
          text-decoration: none;
        }

        .ix-admin-stat {
          height: 100%;
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 16px;
          background: var(--surface, #fff);
          transition: border-color .2s ease, transform .2s ease;
        }

        .ix-admin-stat-link:hover .ix-admin-stat {
          transform: translateY(-2px);
          border-color: #94a3b8;
        }

        .ix-admin-stat-label {
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        .ix-admin-stat-value {
          margin-top: 9px;
          font-size: 27px;
          font-weight: 750;
          line-height: 1.2;
        }

        .ix-admin-stat-sub {
          margin-top: 8px;
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        .ix-admin-dashboard-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ix-admin-dashboard-queue {
          display: grid;
          gap: 0;
        }

        .ix-admin-dashboard-queue-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          border-top: 1px solid var(--line, #e2e8f0);
        }

        .ix-admin-dashboard-queue-item:first-child {
          border-top: 0;
        }

        .ix-admin-dashboard-queue-main {
          flex: 1;
          min-width: 0;
        }

        .ix-admin-dashboard-queue-amount {
          font-weight: 700;
          white-space: nowrap;
        }

        .ix-admin-queue-state {
          padding: 26px 18px;
          text-align: center;
        }

        .ix-admin-dashboard-bars {
          display: grid;
          gap: 18px;
        }

        .ix-admin-dashboard-bar-row {
          display: grid;
          grid-template-columns: 76px minmax(0, 1fr) 35px;
          gap: 12px;
          align-items: center;
        }

        .ix-admin-dashboard-bar-track {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--line, #e2e8f0);
        }

        .ix-admin-dashboard-bar-fill {
          height: 100%;
          border-radius: inherit;
          transition: width .25s ease;
        }

        .ix-admin-dashboard-settlements {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
        }

        .ix-admin-dashboard-settlement-stat {
          min-width: 0;
          padding: 20px;
          border-right: 1px solid var(--line, #e2e8f0);
        }

        .ix-admin-dashboard-settlement-stat:last-child {
          border-right: 0;
        }

        .ix-admin-dashboard-settlement-stat .label {
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        .ix-admin-dashboard-settlement-stat .value {
          margin-top: 9px;
          font-size: 24px;
          font-weight: 750;
        }

        .ix-admin-dashboard-settlement-stat .sub {
          margin-top: 8px;
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        @media (max-width: 1000px) {
          .ix-admin-dashboard-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ix-admin-dashboard-settlements {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ix-admin-dashboard-settlement-stat:nth-child(2) {
            border-right: 0;
          }

          .ix-admin-dashboard-settlement-stat:nth-child(n+3) {
            border-top: 1px solid var(--line, #e2e8f0);
          }
        }

        @media (max-width: 600px) {
          .ix-admin-dashboard-summary {
            gap: 10px;
          }

          .ix-admin-stat {
            padding: 15px;
          }

          .ix-admin-stat-value {
            font-size: 22px;
          }

          .ix-admin-dashboard-queue-item {
            flex-wrap: wrap;
          }

          .ix-admin-dashboard-queue-main {
            flex-basis: 100%;
          }

          .ix-admin-dashboard-settlement-stat {
            padding: 15px;
          }

          .ix-admin-dashboard-settlement-stat .value {
            font-size: 21px;
          }
        }

        @media (max-width: 360px) {
          .ix-admin-dashboard-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageHeader
        title="Admin dashboard"
        subtitle="Monitor customers, policies, premium collections, claims, and settlements."
      >
        <div className="ix-admin-dashboard-header-actions">
          <Button
            type="button"
            disabled={refreshing}
            onClick={refreshAll}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </PageHeader>

      <QueryNotice query={usersQuery} label="users" />
      <QueryNotice query={policiesQuery} label="policies" />
      <QueryNotice query={purchasesQuery} label="purchases" />
      <QueryNotice query={claimsQuery} label="claims" />
      <QueryNotice query={settlementsQuery} label="settlements" />

      {/* MAIN SUMMARY */}

      <div className="ix-admin-dashboard-summary">
        <SummaryCard
          label="Customers"
          value={metric(usersQuery, customers.length)}
          sub={`${activeCustomers.length} active customers`}
          to="/admin/users"
        />

        <SummaryCard
          label="Active policies"
          value={metric(policiesQuery, activePolicies.length)}
          sub={`${P.length} policies in total`}
          to="/admin/policies"
        />

        <SummaryCard
          label="Net premium estimate"
          value={metric(
            purchasesQuery,
            inrShort(premiumCollected),
          )}
          sub={`${paidPurchases.length} paid purchases · ${refundedPurchases.length} refunded`}
          to="/admin/purchases"
        />

        <SummaryCard
          label="Claims awaiting review"
          value={metric(claimsQuery, pendingClaims.length)}
          sub={`${C.length} total claims`}
          to="/admin/claims"
        />
      </div>

      {/* CLAIMS AND STATUS */}

      <div className="two-col" style={{ marginBottom: 20 }}>
        <Panel
          title="Claims review queue"
          flush
          actions={
            <Link className="btn sm" to="/admin/claims">
              Open claims
            </Link>
          }
        >
          <QueueState
            loading={claimsQuery.isPending}
            error={claimsQuery.isError}
            emptyTitle="Queue is clear"
            emptyText="New claims will appear here for review."
          >
            {reviewQueue.length > 0 ? (
              <div className="ix-admin-dashboard-queue">
                {reviewQueue.map((claim) => (
                  <div
                    className="ix-admin-dashboard-queue-item"
                    key={claim.claimNumber}
                  >
                    <div className="ix-admin-dashboard-queue-main">
                      <strong>
                        Claim #{claim.claimNumber}
                      </strong>

                      <span className="muted">
                        {' '}· {claim.claimType || 'Claim'}
                      </span>

                      <div
                        className="faint"
                        style={{ fontSize: 12, marginTop: 4 }}
                      >
                        Policy #{claim.policyNumber}
                        {' '}· Filed {date(claim.claimDate)}
                      </div>
                    </div>

                    <div className="ix-admin-dashboard-queue-amount">
                      {inr(claim.amount)}
                    </div>

                    <Link
                      className="btn sm dark"
                      to="/admin/claims"
                      state={{ open: claim.claimNumber }}
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            ) : null}
          </QueueState>
        </Panel>

        <Panel title="Claims by status">
          {claimsQuery.isPending ? (
            <div className="ix-admin-queue-state muted">
              Loading claim statistics…
            </div>
          ) : claimsQuery.isError ? (
            <div className="ix-admin-queue-state muted">
              Claim statistics unavailable.
            </div>
          ) : (
            <div className="ix-admin-dashboard-bars">
              {claimStatusCounts.map((item) => (
                <div
                  className="ix-admin-dashboard-bar-row"
                  key={item.key}
                >
                  <span>{item.label}</span>

                  <div className="ix-admin-dashboard-bar-track">
                    <div
                      className="ix-admin-dashboard-bar-fill"
                      style={{
                        width: `${(item.count / maxBar) * 100}%`,
                        background: item.color,
                      }}
                    />
                  </div>

                  <strong
                    className="num"
                    style={{ textAlign: 'right' }}
                  >
                    {item.count}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* SETTLEMENTS */}

      <Panel
        title="Settlements"
        flush
        actions={
          <Link
            className="btn sm"
            to="/admin/settlements"
          >
            Open settlements
          </Link>
        }
      >
        <div className="ix-admin-dashboard-settlements">
          <div className="ix-admin-dashboard-settlement-stat">
            <div className="label">Pending payouts</div>

            <div className="value">
              {metric(
                settlementsQuery,
                pendingSettlements.length,
              )}
            </div>

            <div className="sub">
              {settlementsQuery.isError
                ? 'Unavailable'
                : inr(pendingPayoutAmount)}{' '}
              to pay
            </div>
          </div>

          <div className="ix-admin-dashboard-settlement-stat">
            <div className="label">Settled</div>

            <div className="value">
              {metric(
                settlementsQuery,
                completedSettlements.length,
              )}
            </div>

            <div className="sub">
              {settlementsQuery.isError
                ? 'Unavailable'
                : inr(settledAmount)}{' '}
              paid out
            </div>
          </div>

          <div className="ix-admin-dashboard-settlement-stat">
            <div className="label">
              Approved, needing settlement
            </div>

            <div className="value">
              {claimsQuery.isPending ||
              settlementsQuery.isPending
                ? '…'
                : claimsQuery.isError ||
                    settlementsQuery.isError
                  ? '—'
                  : claimsNeedingSettlement.length}
            </div>

            <div className="sub">
              Claims without an active settlement
            </div>
          </div>

          <div className="ix-admin-dashboard-settlement-stat">
            <div className="label">
              Latest settlement
            </div>

            <div
              className="value"
              style={{ fontSize: 19 }}
            >
              {settlementsQuery.isPending
                ? '…'
                : settlementsQuery.isError
                  ? '—'
                  : latestSettlement
                    ? date(latestSettlement.settlementDate)
                    : '—'}
            </div>

            <div className="sub">
              {latestSettlement && !settlementsQuery.isError ? (
                <StatusBadge
                  value={latestSettlement.settlementStatus}
                />
              ) : (
                'None yet'
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* REFUND ATTENTION */}

      {!purchasesQuery.isPending &&
        !purchasesQuery.isError &&
        processingRefunds.length > 0 && (
          <Panel
            title="Refunds needing attention"
            actions={
              <Link
                className="btn sm"
                to="/admin/purchases"
              >
                View purchases
              </Link>
            }
          >
            <div className="row spread wrap">
              <div>
                <strong>
                  {processingRefunds.length} refund
                  {processingRefunds.length === 1
                    ? ''
                    : 's'}{' '}
                  awaiting final status
                </strong>

                <p className="muted" style={{ marginTop: 6 }}>
                  Confirm the latest refund status with the
                  backend before treating these payments as
                  refunded.
                </p>
              </div>

              <StatusBadge
                value="PENDING"
                label="Needs reconciliation"
              />
            </div>
          </Panel>
        )}
    </>
  )
}

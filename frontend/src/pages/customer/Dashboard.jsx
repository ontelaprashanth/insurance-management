
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { claims, notifications, policies, purchases } from '../../api/endpoints'
import { DataState, Icon, PageHeader, StatusBadge } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { date, inr, inrShort, timeAgo } from '../../lib/format'

const normalize = (value) => String(value ?? '').trim().toUpperCase()

function rowsOf(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.data?.content)) return value.data.content
  return []
}

function policyNumberOf(row) {
  return row?.policyNumber ?? row?.policy?.policyNumber ?? null
}

function renewalSourceOf(row) {
  return row?.renewedFromPolicyNumber ??
    row?.renewalSourcePolicyNumber ??
    row?.renewedFromPurchase?.policyNumber ??
    row?.renewedFromPurchase?.policy?.policyNumber ?? null
}

function settlementAmountOf(claim) {
  const directAmount =
    claim?.settlementAmount ??
    claim?.settledAmount ??
    claim?.actualSettlementAmount ??
    claim?.settlement?.settlementAmount ??
    claim?.settlement?.settledAmount

  if (directAmount != null && directAmount !== '') {
    const amount = Number(directAmount)
    if (Number.isFinite(amount) && amount >= 0) return amount
  }

  const settlements = Array.isArray(claim?.settlements)
    ? claim.settlements
    : claim?.settlement
      ? [claim.settlement]
      : []

  const completedSettlements = settlements.filter((settlement) =>
    ['SETTLED', 'COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'PAID']
      .includes(normalize(settlement?.status))
  )

  if (completedSettlements.length > 0) {
    return completedSettlements.reduce((total, settlement) => {
      const amount = Number(settlement?.amount)
      return total + (
        Number.isFinite(amount) && amount > 0 ? amount : 0
      )
    }, 0)
  }

  return null
}

function claimAmountOf(claim) {
  const status = normalize(claim?.status)
  const settlementAmount = settlementAmountOf(claim)

  if (
    settlementAmount != null &&
    ['SETTLED', 'SETTLEMENT_COMPLETED', 'COMPLETED', 'PAID']
      .includes(status)
  ) {
    return settlementAmount
  }

  if (
    ['APPROVED', 'SETTLED', 'SETTLEMENT_COMPLETED', 'COMPLETED', 'PAID']
      .includes(status)
  ) {
    const approvedAmount =
      claim?.approvedAmount ??
      claim?.approvedSettlementAmount

    if (approvedAmount != null && approvedAmount !== '') {
      const amount = Number(approvedAmount)
      if (Number.isFinite(amount) && amount >= 0) return amount
    }
  }

  const requestedAmount = Number(claim?.amount)

  return Number.isFinite(requestedAmount) && requestedAmount >= 0
    ? requestedAmount
    : 0
}

function effectiveStatus(policy, relatedClaims, relatedPurchase, renewedSources) {
  const number = String(policy.policyNumber)
  const status = normalize(policy.status)
  const lifecycle = normalize(policy.lifecycleStatus)
  const refund = normalize(relatedPurchase?.refundStatus || policy.refundStatus)

  if (
    ['REFUNDED', 'FULLY_REFUNDED', 'PROCESSED'].includes(refund) ||
    lifecycle === 'REFUNDED'
  ) return 'REFUNDED'

  if (
    [
      'REFUND_PENDING',
      'PENDING',
      'REFUND_PROCESSING',
      'PROCESSING',
      'REFUND_REQUIRES_RECONCILIATION',
      'REQUIRES_RECONCILIATION',
    ].includes(refund)
  ) {
    return refund.startsWith('REFUND_') ? refund : `REFUND_${refund}`
  }

  if (
    ['REFUND_FAILED', 'FAILED'].includes(refund) ||
    lifecycle === 'REFUND_FAILED'
  ) return 'REFUND_FAILED'

  if (
    renewedSources.has(number) ||
    status === 'RENEWED' ||
    lifecycle === 'RENEWED'
  ) return 'RENEWED'

  const claimed =
    policy.hasSuccessfulClaim === true ||
    policy.claimApproved === true ||
    ['APPROVED', 'SETTLED'].includes(normalize(policy.claimStatus)) ||
    (
      Array.isArray(policy.claims) &&
      policy.claims.some((c) =>
        ['APPROVED', 'SETTLED'].includes(normalize(c.status))
      )
    ) ||
    relatedClaims.some((c) =>
      ['APPROVED', 'SETTLED'].includes(normalize(c.status))
    )

  if (claimed || status === 'CLAIMED' || lifecycle === 'CLAIMED') {
    return 'CLAIMED'
  }

  if (lifecycle && !['ACTIVE', 'INACTIVE', 'NEW'].includes(lifecycle)) {
    return lifecycle
  }

  if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
    return status
  }

  if (
    policy.expiryDate &&
    String(policy.expiryDate).slice(0, 10) <
      new Date().toLocaleDateString('en-CA')
  ) {
    return 'EXPIRED'
  }

  if (
    policy.isActive === false ||
    status === 'INACTIVE' ||
    lifecycle === 'INACTIVE'
  ) return 'INACTIVE'

  return policy.isActive === true ||
    status === 'ACTIVE' ||
    lifecycle === 'ACTIVE'
    ? 'ACTIVE'
    : 'INACTIVE'
}

const settledStatuses = [
  'SETTLED',
  'SETTLEMENT_COMPLETED',
  'COMPLETED',
  'PAID',
]

const dashboardStyles = `
  @keyframes ixDashReveal {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes ixDashShimmer {
    from { transform: translateX(-140%); }
    to { transform: translateX(140%); }
  }

  @keyframes ixDashIcon {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .ix-dash {
    --ix-deep: #103e2d;
    --ix-green: #17814f;
    --ix-line: #d5e8dc;
    --ix-muted: #587165;
    width: 100%;
    min-width: 0;
    color: var(--ix-deep);
  }

  .ix-dash,
  .ix-dash * {
    box-sizing: border-box;
  }

  .ix-dash a {
    color: #126b42;
    text-decoration: none;
    font-weight: 700;
    text-underline-offset: 3px;
  }

  .ix-dash a:hover {
    color: #0b5030;
    text-decoration: underline;
  }

  .ix-dash .ix-dash-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 0 0 16px;
  }

  .ix-dash .ix-dash-stat {
    min-width: 0;
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 36px;
    align-items: start;
    column-gap: 10px;
    row-gap: 7px;
    padding: 15px 16px;
    border: 1px solid var(--ix-line);
    border-radius: 14px;
    background: linear-gradient(140deg, #fff 40%, #f1faf4);
    box-shadow: 0 3px 12px rgba(16, 62, 45, .045);
    animation: ixDashReveal .45s ease both;
    transition: transform .22s ease, box-shadow .22s ease,
      border-color .22s ease;
  }

  .ix-dash .ix-dash-stat:nth-child(2) { animation-delay: 60ms; }
  .ix-dash .ix-dash-stat:nth-child(3) { animation-delay: 120ms; }
  .ix-dash .ix-dash-stat:nth-child(4) { animation-delay: 180ms; }

  .ix-dash .ix-dash-stat::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    z-index: -1;
    width: 40%;
    background: linear-gradient(
      100deg,
      transparent,
      rgba(53, 179, 103, .08),
      transparent
    );
    transform: translateX(-140%);
    pointer-events: none;
  }

  .ix-dash .ix-dash-stat:hover::after {
    animation: ixDashShimmer .8s ease;
  }

  .ix-dash .ix-dash-stat:hover {
    transform: translateY(-3px);
    border-color: #8bcaa4;
    box-shadow: 0 9px 22px rgba(16, 62, 45, .09);
  }

  .ix-dash-stat-label {
    align-self: center;
    min-width: 0;
    color: var(--ix-muted);
    font-size: 12.5px;
    line-height: 1.4;
    font-weight: 650;
  }

  .ix-dash-stat-icon,
  .ix-dash-item-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    color: #137346;
    background: #e4f6eb;
    border: 1px solid #d0ecda;
    border-radius: 10px;
  }

  .ix-dash-stat-icon {
    grid-column: 2;
    grid-row: 1 / span 2;
    animation: ixDashIcon 4s ease-in-out infinite;
  }

  .ix-dash-stat-value {
    grid-column: 1;
    min-width: 0;
    color: var(--ix-deep);
    font-size: clamp(23px, 2vw, 30px);
    line-height: 1.15;
    letter-spacing: -.035em;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .ix-dash-stat-sub {
    grid-column: 1 / -1;
    min-width: 0;
    color: var(--ix-muted);
    font-size: 11.5px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .ix-dash .ix-dash-sections {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 14px;
    margin-bottom: 14px;
  }

  .ix-dash .ix-dash-section {
    min-width: 0;
    padding: 15px;
    border: 1px solid var(--ix-line);
    border-radius: 15px;
    background: #fff;
    box-shadow: 0 3px 13px rgba(16, 62, 45, .045);
    animation: ixDashReveal .5s ease both;
    transition: border-color .22s ease, box-shadow .22s ease;
  }

  .ix-dash .ix-dash-section:hover {
    border-color: #b6dac4;
    box-shadow: 0 7px 19px rgba(16, 62, 45, .065);
  }

  .ix-dash .ix-dash-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 0 0 12px;
    padding: 0 0 10px;
    border-bottom: 1px solid #e7f0ea;
  }

  .ix-dash .ix-dash-section-head h2 {
    min-width: 0;
    margin: 0;
    color: var(--ix-deep);
    font-size: 16px;
    line-height: 1.35;
    font-weight: 800;
  }

  .ix-dash .ix-dash-section-head .btn {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .ix-dash .ix-dash-list {
    display: grid;
    gap: 8px;
  }

  .ix-dash .ix-dash-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    padding: 10px;
    border: 1px solid #e0ede4;
    border-radius: 11px;
    background: #f8fcf9;
    animation: ixDashReveal .4s ease both;
    transition: background .2s ease, border-color .2s ease,
      transform .2s ease;
  }

  .ix-dash .ix-dash-item:hover {
    transform: translateY(-2px);
    border-color: #b6dec4;
    background: #f0faf3;
  }

  .ix-dash .ix-dash-item-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .ix-dash .ix-dash-item-main {
    flex: 1;
    min-width: 0;
  }

  .ix-dash .ix-dash-item-title {
    margin: 1px 0 4px;
    color: var(--ix-deep);
    font-size: 12.5px;
    line-height: 1.45;
    font-weight: 750;
    overflow-wrap: anywhere;
  }

  .ix-dash .ix-dash-item-meta {
    color: var(--ix-muted);
    font-size: 11.5px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .ix-dash .ix-dash-item-right {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    max-width: 42%;
    text-align: right;
  }

  .ix-dash .ix-dash-amount {
    color: var(--ix-deep);
    font-size: 12px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .ix-dash .ix-dash-policies {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .ix-dash .ix-dash-policy {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: 12px;
    border: 1px solid #d8e9dd;
    border-radius: 12px;
    background: linear-gradient(145deg, #fff, #f5fbf7);
    animation: ixDashReveal .45s ease both;
    transition: transform .22s ease, border-color .22s ease,
      box-shadow .22s ease;
  }

  .ix-dash .ix-dash-policy:hover {
    transform: translateY(-3px);
    border-color: #92cba6;
    box-shadow: 0 8px 19px rgba(16, 62, 45, .08);
  }

  .ix-dash .ix-dash-policy-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
  }

  .ix-dash .ix-dash-policy-number {
    color: var(--ix-deep);
    font-size: 13px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .ix-dash .ix-dash-policy-cover {
    color: #36594a;
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .ix-dash .ix-dash-policy-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
    padding-top: 9px;
    border-top: 1px solid #e0ece4;
    color: var(--ix-muted);
    font-size: 11px;
  }

  .ix-dash .ix-dash-policy-foot a {
    font-size: 11px;
  }

  .ix-dash .btn {
    transition: transform .2s ease, box-shadow .2s ease;
  }

  .ix-dash .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 11px rgba(16, 62, 45, .10);
  }

  .ix-dash a:focus-visible,
  .ix-dash button:focus-visible {
    outline: 3px solid #83cda0;
    outline-offset: 3px;
  }

  @media (max-width: 1200px) {
    .ix-dash .ix-dash-policies {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .ix-dash .ix-dash-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ix-dash .ix-dash-sections {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 520px) {
    .ix-dash .ix-dash-stats {
      gap: 8px;
      margin-bottom: 12px;
    }

    .ix-dash .ix-dash-stat {
      grid-template-columns: minmax(0, 1fr) 30px;
      padding: 11px;
      column-gap: 7px;
      row-gap: 6px;
      border-radius: 12px;
    }

    .ix-dash .ix-dash-stat-icon {
      width: 30px;
      height: 30px;
    }

    .ix-dash .ix-dash-stat-label {
      font-size: 11px;
    }

    .ix-dash .ix-dash-stat-value {
      font-size: clamp(20px, 6vw, 27px);
    }

    .ix-dash .ix-dash-stat-sub {
      font-size: 10.5px;
    }

    .ix-dash .ix-dash-section {
      padding: 12px;
      border-radius: 13px;
    }

    .ix-dash .ix-dash-section-head h2 {
      font-size: 15px;
    }

    .ix-dash .ix-dash-item {
      gap: 8px;
      padding: 9px;
    }

    .ix-dash .ix-dash-item-icon {
      width: 29px;
      height: 29px;
    }

    .ix-dash .ix-dash-item-title {
      font-size: 12px;
    }

    .ix-dash .ix-dash-item-meta {
      font-size: 11px;
    }

    .ix-dash .ix-dash-policies {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (hover: none) {
    .ix-dash .ix-dash-stat:hover,
    .ix-dash .ix-dash-section:hover,
    .ix-dash .ix-dash-item:hover,
    .ix-dash .ix-dash-policy:hover {
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ix-dash *,
    .ix-dash *::before,
    .ix-dash *::after {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
  }
`

export default function Dashboard() {
  const { user } = useAuth()

  const pol = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const pur = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const clm = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
    refetchOnWindowFocus: true,
  })

  const ntf = useQuery({
    queryKey: ['notifications'],
    queryFn: notifications.mine,
  })

  const policyRows = useMemo(() => rowsOf(pol.data), [pol.data])
  const purchaseRows = useMemo(() => rowsOf(pur.data), [pur.data])
  const claimRows = useMemo(() => rowsOf(clm.data), [clm.data])
  const notificationRows = useMemo(() => rowsOf(ntf.data), [ntf.data])

  const displayedPolicies = useMemo(() => {
    const purchasesByPolicy = new Map()
    const claimsByPolicy = new Map()
    const renewedSources = new Set()

    for (const purchase of purchaseRows) {
      const number = policyNumberOf(purchase)

      if (number != null) {
        const key = String(number)
        const existing = purchasesByPolicy.get(key)

        if (
          !existing ||
          Number(purchase.purchaseId || 0) >
            Number(existing.purchaseId || 0)
        ) {
          purchasesByPolicy.set(key, purchase)
        }
      }

      const source = renewalSourceOf(purchase)

      if (source != null && normalize(purchase.paymentStatus) === 'PAID') {
        renewedSources.add(String(source))
      }
    }

    for (const policy of policyRows) {
      const source = renewalSourceOf(policy)

      if (source != null) {
        const childPurchase = purchasesByPolicy.get(
          String(policy.policyNumber)
        )

        if (childPurchase && normalize(childPurchase.paymentStatus) === 'PAID') {
          renewedSources.add(String(source))
        }
      }
    }

    for (const claim of claimRows) {
      const number = policyNumberOf(claim)
      if (number == null) continue

      const key = String(number)

      if (!claimsByPolicy.has(key)) claimsByPolicy.set(key, [])
      claimsByPolicy.get(key).push(claim)
    }

    return policyRows.map((policy) => ({
      ...policy,
      displayStatus: effectiveStatus(
        policy,
        claimsByPolicy.get(String(policy.policyNumber)) || [],
        purchasesByPolicy.get(String(policy.policyNumber)),
        renewedSources,
      ),
    }))
  }, [policyRows, purchaseRows, claimRows])

  const active = displayedPolicies.filter(
    (policy) => policy.displayStatus === 'ACTIVE'
  ).length

  const totalCover = purchaseRows
    .filter((purchase) =>
      normalize(purchase.paymentStatus) === 'PAID' &&
      !['REFUNDED', 'FULLY_REFUNDED', 'PROCESSED'].includes(
        normalize(purchase.refundStatus)
      )
    )
    .reduce(
      (sum, purchase) => sum + Number(purchase.coverageAmount || 0),
      0
    )

  const open = claimRows.filter((claim) =>
    ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(
      normalize(claim.status)
    )
  ).length

  const unread = notificationRows.filter(
    (notification) => !notification.isRead
  ).length

  const recentClaims = claimRows
    .slice()
    .sort((a, b) => Number(b.claimNumber) - Number(a.claimNumber))
    .slice(0, 5)

  const latestAlerts = notificationRows
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )
    .slice(0, 5)

  const expiringPolicies = displayedPolicies
    .slice()
    .sort(
      (a, b) =>
        new Date(a.expiryDate || '9999-12-31') -
        new Date(b.expiryDate || '9999-12-31')
    )
    .slice(0, 4)

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.username || 'there'}`}
        subtitle="Here is where your cover and claims stand today."
      >
        <Link className="btn primary" to="/app/plans">
          Buy insurance
        </Link>
      </PageHeader>

      <style>{dashboardStyles}</style>

      <div className="ix-dash">
        <div className="ix-dash-stats">
          <div className="ix-dash-stat">
            <span className="ix-dash-stat-label">Active policies</span>
            <span className="ix-dash-stat-icon">
              <Icon name="claim" />
            </span>
            <div className="ix-dash-stat-value">
              {pol.isLoading || pur.isLoading || clm.isLoading ? '…' : active}
            </div>
            <div className="ix-dash-stat-sub">
              Of {policyRows.length} total policy records
            </div>
          </div>

          <div className="ix-dash-stat">
            <span className="ix-dash-stat-label">Total cover</span>
            <span className="ix-dash-stat-icon">
              <Icon name="claim" />
            </span>
            <div className="ix-dash-stat-value">
              {pur.isLoading ? '…' : inrShort(totalCover)}
            </div>
            <div className="ix-dash-stat-sub">
              Across paid, non-refunded purchases
            </div>
          </div>

          <div className="ix-dash-stat">
            <span className="ix-dash-stat-label">Claims in review</span>
            <span className="ix-dash-stat-icon">
              <Icon name="claim" />
            </span>
            <div className="ix-dash-stat-value">
              {clm.isLoading ? '…' : open}
            </div>
            <div className="ix-dash-stat-sub">
              {claimRows.length} claims filed in all
            </div>
          </div>

          <div className="ix-dash-stat">
            <span className="ix-dash-stat-label">Unread alerts</span>
            <span className="ix-dash-stat-icon">
              <Icon name="bell" />
            </span>
            <div className="ix-dash-stat-value">
              {ntf.isLoading ? '…' : unread}
            </div>
            <div className="ix-dash-stat-sub">
              <Link to="/app/notifications">Open notifications →</Link>
            </div>
          </div>
        </div>

        <div className="ix-dash-sections">
          <section className="ix-dash-section">
            <div className="ix-dash-section-head">
              <h2>Recent claims</h2>
              <Link className="btn sm" to="/app/claims">View all</Link>
            </div>

            <DataState
              query={clm}
              empty={{
                title: 'No claims yet',
                text: 'File a claim from an eligible policy.',
              }}
              emptyAction={
                <Link className="btn dark" to="/app/policies">
                  Go to my policies
                </Link>
              }
            >
              {() => (
                <div className="ix-dash-list">
                  {recentClaims.map((claim) => {
                    const status = normalize(claim.status)
                    const amount = claimAmountOf(claim)
                    const settled = settledStatuses.includes(status)

                    return (
                      <div className="ix-dash-item" key={claim.claimNumber}>
                        <span className="ix-dash-item-icon">
                          <Icon name="claim" />
                        </span>

                        <div className="ix-dash-item-main">
                          <div className="ix-dash-item-title">
                            Claim #{claim.claimNumber} · {claim.claimType || 'Insurance claim'}
                          </div>
                          <div className="ix-dash-item-meta">
                            Policy #{policyNumberOf(claim) ?? '—'} · Filed {date(claim.claimDate)}
                          </div>
                          {settled && (
                            <div className="ix-dash-item-meta">
                              Settlement amount
                            </div>
                          )}
                          {status === 'APPROVED' && (
                            <div className="ix-dash-item-meta">
                              Approved claim amount
                            </div>
                          )}
                        </div>

                        <div className="ix-dash-item-right">
                          <StatusBadge value={claim.status} />
                          <span className="ix-dash-amount">{inr(amount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </DataState>
          </section>

          <section className="ix-dash-section">
            <div className="ix-dash-section-head">
              <h2>Latest alerts</h2>
              <Link className="btn sm" to="/app/notifications">View all</Link>
            </div>

            <DataState
              query={ntf}
              empty={{
                title: 'Nothing new',
                text: 'Your updates and receipts will appear here.',
              }}
            >
              {() => (
                <div className="ix-dash-list">
                  {latestAlerts.map((notification) => (
                    <div
                      className="ix-dash-item"
                      key={notification.notificationId}
                    >
                      <span className="ix-dash-item-icon">
                        <Icon name="bell" />
                      </span>

                      <div className="ix-dash-item-main">
                        <div className="ix-dash-item-title">
                          {notification.title || 'Notification'}
                        </div>
                        <div className="ix-dash-item-meta">
                          {notification.message}
                        </div>
                        <div
                          className="ix-dash-item-meta"
                          style={{ marginTop: 4 }}
                        >
                          {timeAgo(notification.createdAt)}
                          {!notification.isRead ? ' · Unread' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataState>
          </section>
        </div>

        <section className="ix-dash-section">
          <div className="ix-dash-section-head">
            <h2>Policies by expiry date</h2>
            <Link className="btn sm" to="/app/policies">All policies</Link>
          </div>

          <DataState
            query={pol}
            empty={{
              title: 'No policies yet',
              text: 'Choose an insurance plan and complete your purchase.',
            }}
            emptyAction={
              <Link className="btn primary" to="/app/plans">
                Browse plans
              </Link>
            }
          >
            {() => (
              <div className="ix-dash-policies">
                {expiringPolicies.map((policy) => (
                  <article
                    className="ix-dash-policy"
                    key={policy.policyNumber}
                  >
                    <div className="ix-dash-policy-head">
                      <span className="ix-dash-policy-number">
                        Policy #{policy.policyNumber}
                      </span>
                      <StatusBadge value={policy.displayStatus} />
                    </div>

                    <div className="ix-dash-policy-cover">
                      {policy.coveredTypes || 'Insurance cover'}
                    </div>

                    <div className="ix-dash-policy-foot">
                      <span>Expires {date(policy.expiryDate)}</span>
                      <Link to="/app/policies">View →</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </DataState>
        </section>
      </div>
    </>
  )
}

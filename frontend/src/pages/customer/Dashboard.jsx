
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

/*
 * Resolve the actual settlement amount when the claims API exposes it.
 * Supports common settlement DTO field names and nested settlement records.
 */
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
    [
      'SETTLED',
      'COMPLETED',
      'SUCCESS',
      'SUCCESSFUL',
      'PAID',
    ].includes(normalize(settlement?.status))
  )

  if (completedSettlements.length > 0) {
    return completedSettlements.reduce((total, settlement) => {
      const amount = Number(settlement?.amount)
      return total + (Number.isFinite(amount) && amount > 0 ? amount : 0)
    }, 0)
  }

  return null
}

/*
 * Amount displayed in Recent claims:
 * 1. Settled claim with a settlement amount -> actual settlement amount.
 * 2. Approved claim -> approved amount.
 * 3. Otherwise -> requested claim amount.
 *
 * A requested claim amount must not be mistaken for the settlement amount.
 */
function claimAmountOf(claim) {
  const status = normalize(claim?.status)
  const settlementAmount = settlementAmountOf(claim)

  if (
    settlementAmount != null &&
    [
      'SETTLED',
      'SETTLEMENT_COMPLETED',
      'COMPLETED',
      'PAID',
    ].includes(status)
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

  // A completed renewal changes the original policy's display status.
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

        if (
          childPurchase &&
          normalize(childPurchase.paymentStatus) === 'PAID'
        ) {
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
    (p) => p.displayStatus === 'ACTIVE'
  ).length

  const totalCover = purchaseRows
    .filter(
      (p) =>
        normalize(p.paymentStatus) === 'PAID' &&
        !['REFUNDED', 'FULLY_REFUNDED', 'PROCESSED'].includes(
          normalize(p.refundStatus)
        )
    )
    .reduce((sum, p) => sum + Number(p.coverageAmount || 0), 0)

  const open = claimRows.filter((c) =>
    ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(normalize(c.status))
  ).length

  const unread = notificationRows.filter((n) => !n.isRead).length

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

      <style>{`
        .ix-dash { --ix-line:#cfe6d9; --ix-soft:#f2fbf5; --ix-deep:#103e2d; --ix-green:#17814f; --ix-muted:#48665a; color:var(--ix-deep); }
        .ix-dash * { box-sizing:border-box; }
        .ix-dash-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:20px; }
        .ix-dash-stat { display:flex; flex-direction:column; gap:10px; min-width:0; padding:20px; border:1px solid var(--ix-line); border-radius:20px; background:linear-gradient(145deg,#fff 30%,#f0faf4 100%); box-shadow:0 7px 22px rgba(16,62,45,.055); }
        .ix-dash-stat-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .ix-dash-stat-label { color:var(--ix-muted); font-size:14px; font-weight:600; }
        .ix-dash-stat-icon,.ix-dash-item-icon { width:38px; height:38px; flex:0 0 38px; display:grid; place-items:center; border-radius:12px; background:linear-gradient(145deg,#d6f5e3,#e9fbf0); color:#137344; border:1px solid #c3e8d1; }
        .ix-dash-stat-value { color:var(--ix-deep); font-size:clamp(26px,2.2vw,35px); font-weight:800; letter-spacing:-.04em; line-height:1.15; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
        .ix-dash-stat-sub { color:var(--ix-muted); font-size:12.5px; line-height:1.5; }
        .ix-dash-stat-sub a,.ix-dash a { color:#116a40; font-weight:700; text-decoration:none; text-underline-offset:3px; }
        .ix-dash-sections { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-bottom:20px; align-items:start; }
        .ix-dash-section { min-width:0; padding:18px; border:1px solid var(--ix-line); border-radius:18px; background:#fff; box-shadow:0 7px 22px rgba(16,62,45,.055); }
        .ix-dash-section-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:15px; }
        .ix-dash-section-head h2 { margin:0; color:var(--ix-deep); font-size:18px; font-weight:800; }
        .ix-dash-section-head .btn { white-space:nowrap; }
        .ix-dash-list { display:grid; gap:10px; }
        .ix-dash-item { display:flex; align-items:flex-start; gap:12px; min-width:0; padding:14px; border:1px solid #dbece1; border-radius:13px; background:#f5fbf7; }
        .ix-dash-item-icon { width:36px; height:36px; flex:0 0 36px; border-radius:11px; }
        .ix-dash-item-main { flex:1; min-width:0; }
        .ix-dash-item-title { margin:0 0 4px; color:var(--ix-deep); font-size:14px; font-weight:750; overflow-wrap:anywhere; }
        .ix-dash-item-meta { color:var(--ix-muted); font-size:12.5px; line-height:1.5; overflow-wrap:anywhere; }
        .ix-dash-item-right { display:flex; align-items:flex-end; flex-direction:column; gap:6px; text-align:right; flex-shrink:0; }
        .ix-dash-amount { color:var(--ix-deep); font-weight:750; font-size:13px; font-variant-numeric:tabular-nums; }
        .ix-dash-policies { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .ix-dash-policy { display:flex; flex-direction:column; gap:14px; min-width:0; border:1px solid #cfe6d9; border-radius:15px; padding:16px; background:linear-gradient(135deg,#fff,#f1fbf5); }
        .ix-dash-policy-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
        .ix-dash-policy-number { font-size:17px; font-weight:800; color:var(--ix-deep); }
        .ix-dash-policy-cover { font-size:14px; font-weight:650; color:#2a4947; overflow-wrap:anywhere; }
        .ix-dash-policy-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-top:11px; border-top:1px solid #dfe9e6; font-size:12.5px; color:var(--ix-muted); }
        @keyframes ixDashReveal { from { opacity:0; transform:translateY(20px) scale(.974); filter:blur(3px); } to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); } }
        @keyframes ixDashIconFloat { 0%,100% { transform:translateY(0) rotate(0); } 50% { transform:translateY(-4px) rotate(-5deg); } }
        .ix-dash-stat,.ix-dash-section,.ix-dash-item,.ix-dash-policy { position:relative; isolation:isolate; overflow:hidden; transition:transform .32s cubic-bezier(.2,.8,.2,1),box-shadow .32s,border-color .32s,background .32s; animation:ixDashReveal .65s cubic-bezier(.2,.8,.2,1) both; }
        .ix-dash-stat:nth-child(1) { animation-delay:50ms; }
        .ix-dash-stat:nth-child(2) { animation-delay:125ms; }
        .ix-dash-stat:nth-child(3) { animation-delay:200ms; }
        .ix-dash-stat:nth-child(4) { animation-delay:275ms; }
        .ix-dash-sections > .ix-dash-section:nth-child(1) { animation-delay:320ms; }
        .ix-dash-sections > .ix-dash-section:nth-child(2) { animation-delay:400ms; }
        .ix-dash > .ix-dash-section { animation-delay:460ms; }
        .ix-dash-item:nth-child(1),.ix-dash-policy:nth-child(1) { animation-delay:90ms; }
        .ix-dash-item:nth-child(2),.ix-dash-policy:nth-child(2) { animation-delay:150ms; }
        .ix-dash-item:nth-child(3),.ix-dash-policy:nth-child(3) { animation-delay:210ms; }
        .ix-dash-item:nth-child(4),.ix-dash-policy:nth-child(4) { animation-delay:270ms; }
        .ix-dash-item:nth-child(5) { animation-delay:330ms; }
        .ix-dash-stat::before,.ix-dash-section::before,.ix-dash-policy::before { content:''; position:absolute; z-index:-1; pointer-events:none; inset:0; background:linear-gradient(105deg,transparent 25%,rgba(71,199,124,.095) 49%,transparent 72%); transform:translateX(-130%); transition:transform .75s ease; }
        .ix-dash-stat:hover::before,.ix-dash-section:hover::before,.ix-dash-policy:hover::before { transform:translateX(130%); }
        .ix-dash-stat:hover,.ix-dash-section:hover,.ix-dash-policy:hover { transform:translateY(-5px); border-color:#79c89a; box-shadow:0 18px 38px rgba(15,91,49,.15); }
        .ix-dash-item:hover { transform:translateY(-3px) translateX(2px); background:#e9f8ee; border-color:#a5d8b8; box-shadow:0 10px 22px rgba(16,62,45,.09); }
        .ix-dash-stat-icon,.ix-dash-item-icon { animation:ixDashIconFloat 4s ease-in-out infinite; }
        .ix-dash-stat:nth-child(2) .ix-dash-stat-icon { animation-delay:.6s; }
        .ix-dash-stat:nth-child(3) .ix-dash-stat-icon { animation-delay:1.2s; }
        .ix-dash-stat:nth-child(4) .ix-dash-stat-icon { animation-delay:1.8s; }
        .ix-dash-stat:hover .ix-dash-stat-icon,.ix-dash-item:hover .ix-dash-item-icon { animation-play-state:paused; transform:rotate(-8deg) scale(1.1); }
        .ix-dash .btn { transition:transform .23s,box-shadow .23s,background .23s,border-color .23s; }
        .ix-dash .btn:hover { transform:translateY(-2px); box-shadow:0 7px 16px rgba(19,110,62,.14); }
        .ix-dash .btn:active { transform:scale(.97); }
        .ix-dash .btn:focus-visible,.ix-dash a:focus-visible { outline:3px solid #7dd4a3; outline-offset:3px; }
        @media(max-width:1150px) { .ix-dash-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:850px) { .ix-dash-sections { grid-template-columns:minmax(0,1fr); } }
        @media(max-width:640px) {
          .ix-dash-stats { gap:10px; }
          .ix-dash-stat { padding:14px; gap:9px; }
          .ix-dash-stat-icon { width:32px; height:32px; flex-basis:32px; }
          .ix-dash-stat-label { font-size:12px; }
          .ix-dash-stat-value { font-size:clamp(21px,6vw,29px); }
          .ix-dash-stat-sub { font-size:11.5px; }
          .ix-dash-section { padding:13px; }
          .ix-dash-policies { grid-template-columns:minmax(0,1fr); }
          .ix-dash-item { padding:11px; gap:9px; }
          .ix-dash-item-icon { width:30px; height:30px; flex-basis:30px; }
          .ix-dash-item-right { max-width:43%; }
        }
        @media(max-width:360px) { .ix-dash-stats { grid-template-columns:minmax(0,1fr); } }
        @media(hover:none) { .ix-dash-stat:hover,.ix-dash-section:hover,.ix-dash-item:hover,.ix-dash-policy:hover { transform:none; } }
        @media(prefers-reduced-motion:reduce) {
          .ix-dash *, .ix-dash *::before,.ix-dash *::after {
            animation:none !important;
            transition:none !important;
            transform:none !important;
            filter:none !important;
          }
        }
      `}</style>

      <div className="ix-dash">
        <div className="ix-dash-stats">
          <div className="ix-dash-stat">
            <div className="ix-dash-stat-head">
              <span className="ix-dash-stat-label">Active policies</span>
              <span className="ix-dash-stat-icon"><Icon name="claim" /></span>
            </div>
            <div className="ix-dash-stat-value">
              {pol.isLoading || pur.isLoading || clm.isLoading ? '…' : active}
            </div>
            <div className="ix-dash-stat-sub">
              Of {policyRows.length} total policy records
            </div>
          </div>

          <div className="ix-dash-stat">
            <div className="ix-dash-stat-head">
              <span className="ix-dash-stat-label">Total cover</span>
              <span className="ix-dash-stat-icon"><Icon name="claim" /></span>
            </div>
            <div className="ix-dash-stat-value">
              {pur.isLoading ? '…' : inrShort(totalCover)}
            </div>
            <div className="ix-dash-stat-sub">
              Across paid, non-refunded purchases
            </div>
          </div>

          <div className="ix-dash-stat">
            <div className="ix-dash-stat-head">
              <span className="ix-dash-stat-label">Claims in review</span>
              <span className="ix-dash-stat-icon"><Icon name="claim" /></span>
            </div>
            <div className="ix-dash-stat-value">
              {clm.isLoading ? '…' : open}
            </div>
            <div className="ix-dash-stat-sub">
              {claimRows.length} claims filed in all
            </div>
          </div>

          <div className="ix-dash-stat">
            <div className="ix-dash-stat-head">
              <span className="ix-dash-stat-label">Unread alerts</span>
              <span className="ix-dash-stat-icon"><Icon name="bell" /></span>
            </div>
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
                  {recentClaims.map((c) => {
                    const status = normalize(c.status)
                    const amount = claimAmountOf(c)
                    const settled = [
                      'SETTLED',
                      'SETTLEMENT_COMPLETED',
                      'COMPLETED',
                      'PAID',
                    ].includes(status)

                    return (
                      <div className="ix-dash-item" key={c.claimNumber}>
                        <span className="ix-dash-item-icon">
                          <Icon name="claim" />
                        </span>

                        <div className="ix-dash-item-main">
                          <div className="ix-dash-item-title">
                            Claim #{c.claimNumber} · {c.claimType || 'Insurance claim'}
                          </div>
                          <div className="ix-dash-item-meta">
                            Policy #{policyNumberOf(c) ?? '—'} · Filed {date(c.claimDate)}
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
                          <StatusBadge value={c.status} />
                          <span className="ix-dash-amount">
                            {inr(amount)}
                          </span>
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
                  {latestAlerts.map((n) => (
                    <div className="ix-dash-item" key={n.notificationId}>
                      <span className="ix-dash-item-icon">
                        <Icon name="bell" />
                      </span>
                      <div className="ix-dash-item-main">
                        <div className="ix-dash-item-title">
                          {n.title || 'Notification'}
                        </div>
                        <div className="ix-dash-item-meta">{n.message}</div>
                        <div className="ix-dash-item-meta" style={{ marginTop: 6 }}>
                          {timeAgo(n.createdAt)}{!n.isRead ? ' · Unread' : ''}
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
                {expiringPolicies.map((p) => (
                  <article className="ix-dash-policy" key={p.policyNumber}>
                    <div className="ix-dash-policy-head">
                      <span className="ix-dash-policy-number">
                        Policy #{p.policyNumber}
                      </span>
                      <StatusBadge value={p.displayStatus} />
                    </div>
                    <div className="ix-dash-policy-cover">
                      {p.coveredTypes || 'Insurance cover'}
                    </div>
                    <div className="ix-dash-policy-foot">
                      <span>Expires {date(p.expiryDate)}</span>
                      <Link to="/app/policies">View policies →</Link>
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

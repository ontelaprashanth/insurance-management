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
                        <div className="ix-dash-item-meta ix-dash-item-time">
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

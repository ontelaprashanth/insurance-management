import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { claims, notifications, policies, purchases } from '../../api/endpoints'
import { DataState, Icon, PageHeader, Panel, StatusBadge } from '../../components/ui'
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

function effectiveStatus(policy, relatedClaims, relatedPurchase, renewedSources) {
  const number = String(policy.policyNumber)
  const status = normalize(policy.status)
  const lifecycle = normalize(policy.lifecycleStatus)
  const refund = normalize(relatedPurchase?.refundStatus || policy.refundStatus)

  if (['REFUNDED', 'FULLY_REFUNDED', 'PROCESSED'].includes(refund) || lifecycle === 'REFUNDED') return 'REFUNDED'
  if (['REFUND_PENDING', 'PENDING', 'REFUND_PROCESSING', 'PROCESSING', 'REFUND_REQUIRES_RECONCILIATION', 'REQUIRES_RECONCILIATION'].includes(refund)) {
    return refund.startsWith('REFUND_') ? refund : `REFUND_${refund}`
  }
  if (['REFUND_FAILED', 'FAILED'].includes(refund) || lifecycle === 'REFUND_FAILED') return 'REFUND_FAILED'

  // A completed renewal changes the ORIGINAL policy's display status,
  // not the status of its newly purchased replacement.
  if (renewedSources.has(number) || status === 'RENEWED' || lifecycle === 'RENEWED') return 'RENEWED'

  const claimed = policy.hasSuccessfulClaim === true || policy.claimApproved === true ||
    ['APPROVED', 'SETTLED'].includes(normalize(policy.claimStatus)) ||
    (Array.isArray(policy.claims) && policy.claims.some((c) => ['APPROVED', 'SETTLED'].includes(normalize(c.status)))) ||
    relatedClaims.some((c) => ['APPROVED', 'SETTLED'].includes(normalize(c.status)))
  if (claimed || status === 'CLAIMED' || lifecycle === 'CLAIMED') return 'CLAIMED'

  if (lifecycle && !['ACTIVE', 'INACTIVE', 'NEW'].includes(lifecycle)) return lifecycle
  if (status && !['ACTIVE', 'INACTIVE'].includes(status)) return status
  if (policy.expiryDate && String(policy.expiryDate).slice(0, 10) < new Date().toLocaleDateString('en-CA')) return 'EXPIRED'
  if (policy.isActive === false || status === 'INACTIVE' || lifecycle === 'INACTIVE') return 'INACTIVE'
  return policy.isActive === true || status === 'ACTIVE' || lifecycle === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
}

export default function Dashboard() {
  const { user } = useAuth()
  const pol = useQuery({ queryKey: ['my-policies'], queryFn: policies.mine, refetchOnMount: 'always', refetchOnWindowFocus: true })
  const pur = useQuery({ queryKey: ['my-purchases'], queryFn: purchases.mine, refetchOnMount: 'always', refetchOnWindowFocus: true })
  const clm = useQuery({ queryKey: ['my-claims'], queryFn: claims.mine, refetchOnWindowFocus: true })
  const ntf = useQuery({ queryKey: ['notifications'], queryFn: notifications.mine })

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
        if (!existing || Number(purchase.purchaseId || 0) > Number(existing.purchaseId || 0)) purchasesByPolicy.set(key, purchase)
      }
      const source = renewalSourceOf(purchase)
      if (source != null && normalize(purchase.paymentStatus) === 'PAID') renewedSources.add(String(source))
    }
    for (const policy of policyRows) {
      const source = renewalSourceOf(policy)
      if (source != null) {
        const childPurchase = purchasesByPolicy.get(String(policy.policyNumber))
        if (childPurchase && normalize(childPurchase.paymentStatus) === 'PAID') renewedSources.add(String(source))
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

  const active = displayedPolicies.filter((p) => p.displayStatus === 'ACTIVE').length
  const totalCover = purchaseRows
    .filter((p) => normalize(p.paymentStatus) === 'PAID' && !['REFUNDED', 'FULLY_REFUNDED', 'PROCESSED'].includes(normalize(p.refundStatus)))
    .reduce((sum, p) => sum + Number(p.coverageAmount || 0), 0)
  const open = claimRows.filter((c) => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(normalize(c.status))).length
  const unread = notificationRows.filter((n) => !n.isRead).length

  return (
    <>
      <PageHeader title={`Hello, ${user?.username || 'there'}`} subtitle="Here is where your cover and claims stand today.">
        <Link className="btn primary" to="/app/plans">Buy insurance</Link>
      </PageHeader>

      <div className="ledger" style={{ marginBottom: 20 }}>
        <div><div className="label">Active policies</div><div className="value">{pol.isLoading || pur.isLoading || clm.isLoading ? '…' : active}</div><div className="sub">of {policyRows.length} total</div></div>
        <div><div className="label">Total cover</div><div className="value">{pur.isLoading ? '…' : inrShort(totalCover)}</div><div className="sub">across paid, non-refunded purchases</div></div>
        <div><div className="label">Claims in review</div><div className="value">{clm.isLoading ? '…' : open}</div><div className="sub">{claimRows.length} filed in all</div></div>
        <div><div className="label">Unread alerts</div><div className="value">{ntf.isLoading ? '…' : unread}</div><div className="sub"><Link to="/app/notifications">Open notifications</Link></div></div>
      </div>

      <div className="two-col">
        <Panel title="Recent claims" flush actions={<Link className="btn sm" to="/app/claims">View all</Link>}>
          <DataState query={clm} empty={{ title: 'No claims yet', text: 'If something happens, file a claim from any active policy.' }} emptyAction={<Link className="btn dark" to="/app/policies">Go to my policies</Link>}>
            {(rows) => rows.slice().sort((a, b) => Number(b.claimNumber) - Number(a.claimNumber)).slice(0, 5).map((c) => (
              <div className="list-item" key={c.claimNumber}>
                <div className="dot-icon"><Icon name="claim" /></div>
                <div className="grow">
                  <b>Claim #{c.claimNumber}</b> <span className="muted">· {c.claimType}</span>
                  <div className="faint" style={{ fontSize: 13 }}>Policy #{policyNumberOf(c) ?? '—'} · filed {date(c.claimDate)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge value={c.status} />
                  <div className="num" style={{ fontSize: 13.5, marginTop: 4 }}>{inr(normalize(c.status) === 'APPROVED' ? (c.approvedAmount ?? c.amount) : c.amount)}</div>
                </div>
              </div>
            ))}
          </DataState>
        </Panel>

        <Panel title="Latest alerts" flush actions={<Link className="btn sm" to="/app/notifications">View all</Link>}>
          <DataState query={ntf} empty={{ title: 'Nothing new', text: 'Offers, payment receipts and claim updates show up here.' }}>
            {(rows) => rows.slice(0, 5).map((n) => (
              <div className={`list-item ${n.isRead ? '' : 'unread'}`} key={n.notificationId}>
                <div className="dot-icon"><Icon name="bell" /></div>
                <div className="grow">
                  <b>{n.title}</b>
                  <div className="muted" style={{ fontSize: 13.5 }}>{n.message}</div>
                  <div className="faint" style={{ fontSize: 12.5 }}>{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </DataState>
        </Panel>
      </div>

      <Panel title="Policies by expiry date" flush className="" actions={<Link className="btn sm" to="/app/policies">All policies</Link>}>
        <DataState query={pol} empty={{ title: 'No policies yet', text: 'Pick a cover, set the amount and pay securely online.' }} emptyAction={<Link className="btn primary" to="/app/plans">Browse plans</Link>}>
          {() => (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Policy</th><th>Cover</th><th>Expires</th><th>Status</th></tr></thead>
                <tbody>
                  {displayedPolicies.slice().sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)).slice(0, 4).map((p) => (
                    <tr key={p.policyNumber}>
                      <td>#{p.policyNumber}</td><td>{p.coveredTypes}</td><td>{date(p.expiryDate)}</td>
                      <td><StatusBadge value={p.displayStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </Panel>
    </>
  )
}

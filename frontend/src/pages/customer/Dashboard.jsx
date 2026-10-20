import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { claims, policies, purchases, settlements, users } from '../../api/endpoints'
import { Button, Panel, PageHeader, StatusBadge } from '../../components/ui'
import { date, inr, inrShort } from '../../lib/format'

const sum = (rows, f) => rows.reduce((s, r) => s + Number(f(r) || 0), 0)

export default function Dashboard() {
  const u = useQuery({ queryKey: ['a-users'], queryFn: users.getAll })
  const p = useQuery({ queryKey: ['a-policies'], queryFn: policies.getAll })
  const pu = useQuery({ queryKey: ['a-purchases'], queryFn: purchases.getAll })
  const c = useQuery({ queryKey: ['a-claims'], queryFn: claims.getAll })
  const s = useQuery({ queryKey: ['a-settlements'], queryFn: settlements.getAll })

  const U = u.data || [], P = p.data || [], PU = pu.data || [], C = c.data || [], S = s.data || []
  const customers = U.filter((x) => x.role === 'USER')
  const paid = PU.filter((x) => String(x.paymentStatus).toUpperCase() !== 'FAILED')
  const revenue = sum(paid.filter((x) => String(x.refundStatus).toUpperCase() !== 'REFUNDED'), (x) => x.totalPremium)
  const pending = C.filter((x) => x.status === 'PENDING')
  const byStatus = { PENDING: pending.length, APPROVED: C.filter((x) => x.status === 'APPROVED').length, REJECTED: C.filter((x) => x.status === 'REJECTED').length }
  const maxBar = Math.max(1, ...Object.values(byStatus))
  const pendingSettle = S.filter((x) => x.settlementStatus === 'PENDING')
  const settled = S.filter((x) => x.settlementStatus === 'SETTLED')
  const ld = (q) => q.isLoading

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="What needs a decision today, and how the book looks." />

      <div className="ledger" style={{ marginBottom: 20 }}>
        <div><div className="label">Customers</div><div className="value">{ld(u) ? '…' : customers.length}</div><div className="sub">{customers.filter((x) => x.isActive).length} active</div></div>
        <div><div className="label">Active policies</div><div className="value">{ld(p) ? '…' : P.filter((x) => x.isActive).length}</div><div className="sub">{P.length} in total</div></div>
        <div><div className="label">Premium collected</div><div className="value">{ld(pu) ? '…' : inrShort(revenue)}</div><div className="sub">{paid.length} purchases</div></div>
        <div><div className="label">Claims awaiting review</div><div className="value">{ld(c) ? '…' : pending.length}</div><div className="sub">{C.length} claims in all</div></div>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <Panel title="Claims review queue" flush actions={<Link className="btn sm" to="/admin/claims">Open claims</Link>}>
          {pending.length === 0 ? (
            <div className="empty"><h4>Queue is clear</h4><p>New claims will show up here for review.</p></div>
          ) : pending.slice().sort((a, b) => a.claimNumber - b.claimNumber).slice(0, 6).map((x) => (
            <div className="list-item" key={x.claimNumber}>
              <div className="grow"><b>Claim #{x.claimNumber}</b> <span className="muted">· {x.claimType}</span><div className="faint" style={{ fontSize: 13 }}>Policy #{x.policyNumber} · filed {date(x.claimDate)}</div></div>
              <b className="num">{inr(x.amount)}</b>
              <Link className="btn sm dark" to="/admin/claims" state={{ open: x.claimNumber }}>Review</Link>
            </div>
          ))}
        </Panel>

        <Panel title="Claims by status">
          <div className="bars">
            {[['PENDING', 'Pending', '#E9A23B'], ['APPROVED', 'Approved', '#2f8a57'], ['REJECTED', 'Rejected', '#D4503C']].map(([k, label, color]) => (
              <div className="bar-row" key={k}>
                <span>{label}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(byStatus[k] / maxBar) * 100}%`, background: color }} /></div>
                <b className="num" style={{ textAlign: 'right' }}>{byStatus[k]}</b>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Settlements" flush actions={<Link className="btn sm" to="/admin/settlements">Open settlements</Link>}>
        <div className="ledger" style={{ border: 0, borderRadius: 0 }}>
          <div><div className="label">Pending payouts</div><div className="value">{ld(s) ? '…' : pendingSettle.length}</div><div className="sub">{inr(sum(pendingSettle, (x) => x.amount))} to pay</div></div>
          <div><div className="label">Settled</div><div className="value">{ld(s) ? '…' : settled.length}</div><div className="sub">{inr(sum(settled, (x) => x.amount))} paid out</div></div>
          <div><div className="label">Approved, not yet settled</div><div className="value">{ld(c) || ld(s) ? '…' : C.filter((x) => x.status === 'APPROVED' && !S.some((t) => t.claimNumber === x.claimNumber)).length}</div><div className="sub">claims needing a settlement</div></div>
          <div><div className="label">Latest settlement</div><div className="value" style={{ fontSize: 20 }}>{S.length ? date(S.slice().sort((a, b) => b.settlementNumber - a.settlementNumber)[0].settlementDate) : '—'}</div><div className="sub">{S.length ? <StatusBadge value={S.slice().sort((a, b) => b.settlementNumber - a.settlementNumber)[0].settlementStatus} /> : 'none yet'}</div></div>
        </div>
      </Panel>
    </>
  )
}

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { claims, notifications, policies, purchases } from '../../api/endpoints'
import { DataState, Icon, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { date, inr, inrShort, timeAgo } from '../../lib/format'

export default function Dashboard() {
  const { user } = useAuth()
  const pol = useQuery({ queryKey: ['my-policies'], queryFn: policies.mine })
  const pur = useQuery({ queryKey: ['my-purchases'], queryFn: purchases.mine })
  const clm = useQuery({ queryKey: ['my-claims'], queryFn: claims.mine })
  const ntf = useQuery({ queryKey: ['notifications'], queryFn: notifications.mine })

  const active = (pol.data || []).filter((p) => p.isActive).length
  const totalCover = (pur.data || []).filter((p) => String(p.paymentStatus || '').toUpperCase() !== 'FAILED').reduce((s, p) => s + Number(p.coverageAmount || 0), 0)
  const open = (clm.data || []).filter((c) => c.status === 'PENDING').length
  const unread = (ntf.data || []).filter((n) => !n.isRead).length

  return (
    <>
      <PageHeader title={`Hello, ${user?.username}`} subtitle="Here is where your cover and claims stand today.">
        <Link className="btn primary" to="/app/plans">Buy insurance</Link>
      </PageHeader>

      <div className="ledger" style={{ marginBottom: 20 }}>
        <div><div className="label">Active policies</div><div className="value">{pol.isLoading ? '…' : active}</div><div className="sub">of {(pol.data || []).length} total</div></div>
        <div><div className="label">Total cover</div><div className="value">{pur.isLoading ? '…' : inrShort(totalCover)}</div><div className="sub">across purchases</div></div>
        <div><div className="label">Claims in review</div><div className="value">{clm.isLoading ? '…' : open}</div><div className="sub">{(clm.data || []).length} filed in all</div></div>
        <div><div className="label">Unread alerts</div><div className="value">{ntf.isLoading ? '…' : unread}</div><div className="sub"><Link to="/app/notifications">Open notifications</Link></div></div>
      </div>

      <div className="two-col">
        <Panel title="Recent claims" flush actions={<Link className="btn sm" to="/app/claims">View all</Link>}>
          <DataState query={clm} empty={{ title: 'No claims yet', text: 'If something happens, file a claim from any active policy.' }} emptyAction={<Link className="btn dark" to="/app/policies">Go to my policies</Link>}>
            {(rows) => rows.slice().sort((a, b) => b.claimNumber - a.claimNumber).slice(0, 5).map((c) => (
              <div className="list-item" key={c.claimNumber}>
                <div className="dot-icon"><Icon name="claim" /></div>
                <div className="grow">
                  <b>Claim #{c.claimNumber}</b> <span className="muted">· {c.claimType}</span>
                  <div className="faint" style={{ fontSize: 13 }}>Policy #{c.policyNumber} · filed {date(c.claimDate)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge value={c.status} />
                  <div className="num" style={{ fontSize: 13.5, marginTop: 4 }}>{inr(c.status === 'APPROVED' ? c.approvedAmount : c.amount)}</div>
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
          {(rows) => (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Policy</th><th>Cover</th><th>Expires</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.slice().sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)).slice(0, 4).map((p) => (
                    <tr key={p.policyNumber}>
                      <td>#{p.policyNumber}</td><td>{p.coveredTypes}</td><td>{date(p.expiryDate)}</td>
                      <td><StatusBadge value={p.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
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

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { purchases } from '../../api/endpoints'
import { Button, DataState, PageHeader, Panel, SearchBox, Segmented, StatusBadge, Table, useFilter } from '../../components/ui'
import { dateTime, inr, inr2, inrShort } from '../../lib/format'
import { PurchaseDetail } from '../customer/MyPurchases'

const FIELDS = ['purchaseId', 'username', 'coveredTypes', 'transactionId', 'paymentStatus', 'policyNumber']

export default function Purchases() {
  const q = useQuery({ queryKey: ['a-purchases'], queryFn: purchases.getAll })
  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch, searched] = useFilter(q.data, FIELDS)
  const rows = searched.filter((p) => filter === 'all' || String(p.refundStatus).toUpperCase() === 'REFUNDED' === (filter === 'refunded'))
  const collected = (q.data || []).filter((p) => String(p.refundStatus).toUpperCase() !== 'REFUNDED').reduce((s, p) => s + Number(p.totalPremium || 0), 0)

  return (
    <>
      <PageHeader title="Purchases" subtitle="Every policy purchase with its payment and refund state." />
      <div className="ledger" style={{ marginBottom: 20 }}>
        <div><div className="label">Purchases</div><div className="value">{(q.data || []).length}</div></div>
        <div><div className="label">Premium collected</div><div className="value">{inr(collected)}</div><div className="sub">excluding refunds</div></div>
        <div><div className="label">Total cover sold</div><div className="value">{inrShort((q.data || []).reduce((s, p) => s + Number(p.coverageAmount || 0), 0))}</div></div>
        <div><div className="label">Refunded</div><div className="value">{(q.data || []).filter((p) => String(p.refundStatus).toUpperCase() === 'REFUNDED').length}</div></div>
      </div>
      <Panel flush>
        <div className="toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search customer, plan, transaction" />
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'refunded', label: 'Refunded' }, { value: 'kept', label: 'Not refunded' }]} />
        </div>
        <DataState query={q} empty={{ title: 'No purchases yet', text: 'Purchases appear here after customers pay.' }}>
          {() => rows.length === 0 ? <div className="empty"><h4>No matches</h4></div> : (
            <Table rowKey="purchaseId" rows={rows.slice().sort((a, b) => b.purchaseId - a.purchaseId)} onRowClick={setOpen} columns={[
              { key: 'purchaseId', header: 'Ref', render: (p) => <b>#{p.purchaseId}</b> },
              { key: 'username', header: 'Customer' },
              { key: 'coveredTypes', header: 'Plan' },
              { key: 'coverageAmount', header: 'Cover', render: (p) => inrShort(p.coverageAmount) },
              { key: 'totalPremium', header: 'Paid', render: (p) => inr2(p.totalPremium) },
              { key: 'paymentDateTime', header: 'Paid at', render: (p) => dateTime(p.paymentDateTime) },
              { key: 'paymentStatus', header: 'Payment', render: (p) => <StatusBadge value={p.paymentStatus} /> },
              { key: 'refundStatus', header: 'Refund', render: (p) => <StatusBadge value={p.refundStatus} /> },
              { key: 'a', header: '', align: 'right', render: (p) => <Button size="sm" onClick={(e) => { e.stopPropagation(); setOpen(p) }}>Details</Button> },
            ]} />
          )}
        </DataState>
      </Panel>
      {open && <PurchaseDetail p={open} onClose={() => setOpen(null)} />}
    </>
  )
}

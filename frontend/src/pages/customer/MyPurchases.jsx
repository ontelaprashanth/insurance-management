import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { purchases } from '../../api/endpoints'
import { Button, DataState, Details, Modal, PageHeader, Panel, SearchBox, StatusBadge, Table, useFilter } from '../../components/ui'
import { date, dateTime, inr, inr2, inrShort } from '../../lib/format'

const FIELDS = ['purchaseId', 'policyNumber', 'coveredTypes', 'transactionId', 'paymentStatus']

export function PurchaseDetail({ p, onClose }) {
  return (
    <Modal title={`Purchase #${p.purchaseId}`} onClose={onClose} wide footer={<Button onClick={onClose}>Close</Button>}>
      <div className="stack">
        <Details items={[
          ['Plan', p.coveredTypes], ['Policy', p.policyNumber ? `#${p.policyNumber}` : '—'], ['Customer', p.username],
          ['Coverage', inr(p.coverageAmount)], ['Term', `${p.durationYears} yr`], ['Purchased', date(p.purchaseDate)],
        ]} />
        <div className="divider" />
        <h4>Premium</h4>
        <dl className="kv">
          <dt>Base premium</dt><dd>{inr2(p.basePremium)}</dd>
          <dt>Discount</dt><dd>−{inr2(p.discountAmount)}</dd>
          <dt>Taxable amount</dt><dd>{inr2(p.taxableAmount)}</dd>
          <dt>GST ({p.gstRate ?? 0}%)</dt><dd>{inr2(p.gstAmount)}</dd>
          <dt className="total">Total paid</dt><dd className="total">{inr2(p.totalPremium)}</dd>
        </dl>
        <div className="divider" />
        <h4>Payment</h4>
        <Details items={[
          ['Status', <StatusBadge value={p.paymentStatus} />], ['Method', p.paymentMethod], ['Paid at', dateTime(p.paymentDateTime)],
          ['Transaction', p.transactionId], ['Razorpay order', p.razorpayOrderId], ['Razorpay payment', p.razorpayPaymentId],
        ]} />
        <div className="divider" />
        <h4>Nominee</h4>
        <Details items={[['Name', p.nomineeName], ['Relationship', p.nomineeRelation], ['Contact', p.nomineeContact]]} />
        <div className="divider" />
        <h4>Refund</h4>
        <Details items={[
          ['Refund status', <StatusBadge value={p.refundStatus} />],
          ['Refund window ends', dateTime(p.refundDeadline)],
          ['Eligible now', p.refundEligible ? 'Yes' : 'No'],
          ['Refunded amount', p.refundAmount > 0 ? inr2(p.refundAmount) : '—'],
          ['Refund reason', p.refundReason],
        ]} />
        {p.refundEligible && (
          <div className="alert info">Refunds are available for 24 hours after payment. To request one before the window ends, contact support with your transaction ID.</div>
        )}
      </div>
    </Modal>
  )
}

export default function MyPurchases() {
  const q = useQuery({ queryKey: ['my-purchases'], queryFn: purchases.mine })
  const [open, setOpen] = useState(null)
  const [search, setSearch, rows] = useFilter(q.data, FIELDS)
  return (
    <>
      <PageHeader title="Payments" subtitle="Receipts, premium breakdowns and refund status for each purchase." />
      <Panel flush>
        <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search payments" /></div>
        <DataState query={q} empty={{ title: 'No payments yet', text: 'Your purchases and receipts will be listed here.' }}>
          {() => (
            <Table rowKey="purchaseId" rows={rows.slice().sort((a, b) => b.purchaseId - a.purchaseId)} onRowClick={setOpen} columns={[
              { key: 'purchaseId', header: 'Ref', render: (p) => <b>#{p.purchaseId}</b> },
              { key: 'coveredTypes', header: 'Plan' },
              { key: 'coverageAmount', header: 'Cover', render: (p) => inrShort(p.coverageAmount) },
              { key: 'totalPremium', header: 'Paid', render: (p) => inr2(p.totalPremium) },
              { key: 'paymentDateTime', header: 'Date', render: (p) => dateTime(p.paymentDateTime) },
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { claims } from '../../api/endpoints'
import { Button, DataState, Details, Modal, PageHeader, Panel, SearchBox, Segmented, StatusBadge, Table, useFilter } from '../../components/ui'
import { date, inr } from '../../lib/format'
import ClaimForm from './ClaimForm'

const FIELDS = ['claimNumber', 'policyNumber', 'claimType', 'status']

export function ClaimDetail({ c, onClose, customerView = true }) {
  return (
    <Modal title={`Claim #${c.claimNumber}`} onClose={onClose} wide footer={
      <>
        {customerView && c.status !== 'PENDING' && <Link className="btn" to="/app/reviews" state={{ claimNumber: c.claimNumber }}>Review this claim</Link>}
        <Button onClick={onClose}>Close</Button>
      </>
    }>
      <div className="stack">
        <div className="row spread"><StatusBadge value={c.status} /><span className="muted">Filed {date(c.claimDate)}</span></div>
        <Details items={[
          ['Policy', `#${c.policyNumber}`], ['Claim type', c.claimType], ['Amount claimed', inr(c.amount)],
          ['Incident date', date(c.incidentDate)], ['Location', c.incidentLocation], ['Document ref', c.nFilepo],
        ]} />
        <div><h4 style={{ marginBottom: 6 }}>What happened</h4><p className="muted">{c.description || '—'}</p></div>
        {c.status === 'APPROVED' && (
          <div className="alert ok"><b>Approved for {inr(c.approvedAmount)}</b> on {date(c.reviewedDate)}.{c.adminRemarks && <> Note from the reviewer: {c.adminRemarks}</>}</div>
        )}
        {c.status === 'REJECTED' && (
          <div className="alert error"><b>Not approved</b> on {date(c.reviewedDate)}. Reason: {c.rejectionReason || 'Not given'}.{c.adminRemarks && <> {c.adminRemarks}</>}</div>
        )}
        {c.status === 'PENDING' && <div className="alert info">A reviewer is looking at this claim. You will get a notification as soon as there is a decision.</div>}
      </div>
    </Modal>
  )
}

export default function MyClaims() {
  const q = useQuery({ queryKey: ['my-claims'], queryFn: claims.mine })
  const [open, setOpen] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('all')
  const [search, setSearch, searched] = useFilter(q.data, FIELDS)
  const rows = searched.filter((c) => status === 'all' || c.status === status)

  return (
    <>
      <PageHeader title="My claims" subtitle="Track each claim from filing to decision.">
        <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>File a claim</Button>
      </PageHeader>
      <Panel flush>
        <div className="toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search claims" />
          <Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} />
        </div>
        <DataState query={q} empty={{ title: 'No claims filed', text: 'If you need to make a claim, choose a policy and describe what happened.' }} emptyAction={<Button variant="dark" onClick={() => setShowForm(true)}>File a claim</Button>}>
          {() => rows.length === 0 ? <div className="empty"><h4>No matches</h4><p>Try another search or filter.</p></div> : (
            <Table rowKey="claimNumber" rows={rows.slice().sort((a, b) => b.claimNumber - a.claimNumber)} onRowClick={setOpen} columns={[
              { key: 'claimNumber', header: 'Claim', render: (c) => <b>#{c.claimNumber}</b> },
              { key: 'policyNumber', header: 'Policy', render: (c) => `#${c.policyNumber}` },
              { key: 'claimType', header: 'Type' },
              { key: 'claimDate', header: 'Filed', render: (c) => date(c.claimDate) },
              { key: 'amount', header: 'Claimed', render: (c) => inr(c.amount) },
              { key: 'approvedAmount', header: 'Approved', render: (c) => (c.status === 'APPROVED' ? inr(c.approvedAmount) : '—') },
              { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
            ]} />
          )}
        </DataState>
      </Panel>
      {open && <ClaimDetail c={open} onClose={() => setOpen(null)} />}
      {showForm && <ClaimForm onClose={() => setShowForm(false)} />}
    </>
  )
}

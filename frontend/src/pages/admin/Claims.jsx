import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claims, settlements } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, Confirm, DataState, Details, Modal, PageHeader, Panel, SearchBox, Segmented, StatusBadge, Table, TextArea, TextInput, useFilter, useToast } from '../../components/ui'
import { date, inr } from '../../lib/format'
import { SettlementForm } from './Settlements'

function Decision({ claim, mode, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const approve = mode === 'approve'
  const [amount, setAmount] = useState(claim.amount ?? '')
  const [remarks, setRemarks] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const m = useMutation({
    mutationFn: (b) => (approve ? claims.approve(claim.claimNumber, b) : claims.reject(claim.claimNumber, b)),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['a-claims'] })
      toast.success(approve ? `Claim #${claim.claimNumber} approved` : `Claim #${claim.claimNumber} rejected`)
      onClose(approve ? c || { ...claim, status: 'APPROVED', approvedAmount: Number(amount) } : null)
    },
    onError: (e) => setError(errorMessage(e, 'Could not record the decision.')),
  })
  function submit() {
    if (approve) {
      if (!(Number(amount) > 0)) return setError('Enter the approved amount.')
      if (Number(amount) > Number(claim.amount)) return setError(`The approved amount cannot exceed the ${inr(claim.amount)} claimed.`)
      setError(''); m.mutate({ approvedAmount: Number(amount), adminRemarks: remarks.trim() || undefined })
    } else {
      if (reason.trim().length < 5) return setError('Give the customer a reason for the rejection.')
      setError(''); m.mutate({ rejectionReason: reason.trim(), adminRemarks: remarks.trim() || undefined })
    }
  }
  return (
    <Modal title={`${approve ? 'Approve' : 'Reject'} claim #${claim.claimNumber}`} onClose={() => onClose(null)} footer={<><Button onClick={() => onClose(null)}>Cancel</Button><Button variant={approve ? 'dark' : 'danger'} loading={m.isPending} onClick={submit}>{approve ? 'Approve claim' : 'Reject claim'}</Button></>}>
      <div className="stack">
        {error && <div className="alert error" role="alert">{error}</div>}
        <div className="muted">Claimed {inr(claim.amount)} for {claim.claimType} on policy #{claim.policyNumber}.</div>
        {approve
          ? <TextInput label="Approved amount (₹)" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          : <TextArea label="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} hint="The customer sees this." />}
        <TextArea label="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
    </Modal>
  )
}

function ClaimView({ claim, onClose, onDecide, onSettle }) {
  const st = useQuery({ queryKey: ['a-settlement-claim', claim.claimNumber], queryFn: () => settlements.byClaim(claim.claimNumber), enabled: claim.status === 'APPROVED' })
  const existing = st.data || []
  return (
    <Modal title={`Claim #${claim.claimNumber}`} wide onClose={onClose} footer={
      <>
        {claim.status === 'PENDING' && <><Button variant="danger" onClick={() => onDecide('reject')}>Reject</Button><Button variant="dark" onClick={() => onDecide('approve')}>Approve</Button></>}
        {claim.status === 'APPROVED' && existing.length === 0 && !st.isLoading && <Button variant="primary" onClick={onSettle}>Create settlement</Button>}
        <Button onClick={onClose}>Close</Button>
      </>
    }>
      <div className="stack">
        <div className="row spread"><StatusBadge value={claim.status} /><span className="muted">Filed {date(claim.claimDate)}</span></div>
        <Details items={[
          ['Policy', `#${claim.policyNumber}`], ['Claim type', claim.claimType], ['Amount claimed', inr(claim.amount)],
          ['Incident date', date(claim.incidentDate)], ['Location', claim.incidentLocation], ['Document ref', claim.nFilepo],
        ]} />
        <div><h4 style={{ marginBottom: 6 }}>Customer’s account</h4><p className="muted">{claim.description || '—'}</p></div>
        {claim.status === 'APPROVED' && <div className="alert ok"><b>Approved for {inr(claim.approvedAmount)}</b> on {date(claim.reviewedDate)}.{claim.adminRemarks && <> Remarks: {claim.adminRemarks}</>}</div>}
        {claim.status === 'REJECTED' && <div className="alert error"><b>Rejected</b> on {date(claim.reviewedDate)}. Reason: {claim.rejectionReason}.{claim.adminRemarks && <> Remarks: {claim.adminRemarks}</>}</div>}
        {claim.status === 'APPROVED' && (
          existing.length ? (
            <div><h4 style={{ marginBottom: 8 }}>Settlements</h4>
              {existing.map((s) => <div key={s.settlementNumber} className="row spread" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}><span>#{s.settlementNumber} · {inr(s.amount)} · {date(s.settlementDate)}</span><StatusBadge value={s.settlementStatus} /></div>)}
            </div>
          ) : !st.isLoading && <div className="alert warn">This claim is approved but has no settlement yet.</div>
        )}
      </div>
    </Modal>
  )
}

export default function Claims() {
  const loc = useLocation()
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['a-claims'], queryFn: claims.getAll })
  const [status, setStatus] = useState('all')
  const [view, setView] = useState(null)
  const [decide, setDecide] = useState(null)
  const [settle, setSettle] = useState(null)
  const [del, setDel] = useState(null)
  const [search, setSearch, searched] = useFilter(q.data, ['claimNumber', 'policyNumber', 'claimType', 'incidentLocation'])
  const rows = searched.filter((c) => status === 'all' || c.status === status)

  useEffect(() => {
    if (loc.state?.open && q.data) { const c = q.data.find((x) => x.claimNumber === loc.state.open); if (c) setView(c) }
  }, [loc.state, q.data])

  const remove = useMutation({
    mutationFn: (c) => claims.remove(c.claimNumber),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-claims'] }); toast.success('Claim deleted'); setDel(null) },
    onError: (e) => { toast.error(e); setDel(null) },
  })
  const count = (s) => (q.data || []).filter((c) => c.status === s).length
  const fresh = (c) => (q.data || []).find((x) => x.claimNumber === c.claimNumber) || c

  return (
    <>
      <PageHeader title="Claims" subtitle="Review what customers have filed. Approving a claim lets you create its settlement right away." />
      <Panel flush>
        <div className="toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search claims" />
          <Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'PENDING', label: `Pending (${count('PENDING')})` }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} />
        </div>
        <DataState query={q} empty={{ title: 'No claims yet', text: 'Claims customers file will appear here for review.' }}>
          {() => rows.length === 0 ? <div className="empty"><h4>No matches</h4></div> : (
            <Table rowKey="claimNumber" rows={rows.slice().sort((a, b) => b.claimNumber - a.claimNumber)} onRowClick={setView} columns={[
              { key: 'claimNumber', header: 'Claim', render: (c) => <b>#{c.claimNumber}</b> },
              { key: 'policyNumber', header: 'Policy', render: (c) => `#${c.policyNumber}` },
              { key: 'claimType', header: 'Type' },
              { key: 'claimDate', header: 'Filed', render: (c) => date(c.claimDate) },
              { key: 'amount', header: 'Claimed', render: (c) => inr(c.amount) },
              { key: 'approvedAmount', header: 'Approved', render: (c) => (c.status === 'APPROVED' ? inr(c.approvedAmount) : '—') },
              { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
              { key: 'a', header: '', align: 'right', render: (c) => {
                const stop = (fn) => (e) => { e.stopPropagation(); fn() }
                return (
                  <div className="actions">
                    {c.status === 'PENDING' ? <Button size="sm" variant="dark" onClick={stop(() => setView(c))}>Review</Button> : <Button size="sm" onClick={stop(() => setView(c))}>View</Button>}
                    <Button size="sm" variant="ghost" onClick={stop(() => setDel(c))}>Delete</Button>
                  </div>
                )
              } },
            ]} />
          )}
        </DataState>
      </Panel>

      {view && !decide && !settle && <ClaimView claim={fresh(view)} onClose={() => setView(null)} onDecide={setDecide} onSettle={() => setSettle(fresh(view))} />}
      {decide && view && (
        <Decision claim={view} mode={decide} onClose={(approved) => {
          setDecide(null); setView(null)
          if (approved) setSettle(approved)
        }} />
      )}
      {settle && <SettlementForm claim={settle} onClose={() => { setSettle(null); qc.invalidateQueries({ queryKey: ['a-settlement-claim'] }) }} />}
      {del && <Confirm danger title="Delete this claim?" message={`Claim #${del.claimNumber} will be removed. Any settlement linked to it may be affected.`} confirmLabel="Delete claim" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} />}
    </>
  )
}

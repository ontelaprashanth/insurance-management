import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviews } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, Confirm, DataState, PageHeader, Panel, Segmented, Stars, StatusBadge, TextArea, Modal, useToast } from '../../components/ui'

function ReplyModal({ r, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [text, setText] = useState(r.adminReply || '')
  const [error, setError] = useState('')
  const m = useMutation({
    mutationFn: () => reviews.reply(r.reviewerId, { ...r, adminReply: text.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-reviews'] }); toast.success('Reply sent'); onClose() },
    onError: (e) => setError(errorMessage(e, 'Could not send the reply.')),
  })
  return (
    <Modal title={`Reply to ${r.name || 'customer'}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="dark" loading={m.isPending} onClick={() => text.trim().length < 3 ? setError('Write a reply first.') : m.mutate()}>Send reply</Button></>}>
      <div className="stack">
        {error && <div className="alert error" role="alert">{error}</div>}
        <div><Stars value={r.rating} /><p className="muted" style={{ marginTop: 6 }}>{r.review}</p></div>
        <TextArea label="Your reply" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </Modal>
  )
}

export default function Reviews() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['a-reviews'], queryFn: reviews.getAll })
  const [filter, setFilter] = useState('all')
  const [reply, setReply] = useState(null)
  const [del, setDel] = useState(null)
  const remove = useMutation({
    mutationFn: (r) => reviews.remove(r.reviewerId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-reviews'] }); toast.success('Review deleted'); setDel(null) },
    onError: (e) => { toast.error(e); setDel(null) },
  })
  const all = q.data || []
  const avg = all.length ? (all.reduce((s, r) => s + Number(r.rating || 0), 0) / all.length).toFixed(1) : '—'
  const rows = all.filter((r) => filter === 'all' || (filter === 'open') === !r.adminReply)

  return (
    <>
      <PageHeader title="Reviews" subtitle="What customers say about their claims. Reply to close the loop." />
      <div className="ledger" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div><div className="label">Average rating</div><div className="value">{avg}<span className="faint" style={{ fontSize: 16 }}> / 5</span></div></div>
        <div><div className="label">Total reviews</div><div className="value">{all.length}</div></div>
        <div><div className="label">Awaiting reply</div><div className="value">{all.filter((r) => !r.adminReply).length}</div></div>
      </div>
      <div style={{ marginBottom: 16 }}><Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Awaiting reply' }, { value: 'replied', label: 'Replied' }]} /></div>
      <DataState query={q} empty={{ title: 'No reviews yet', text: 'Customer reviews will be listed here.' }}>
        {() => rows.length === 0 ? <Panel><div className="empty"><h4>Nothing here</h4></div></Panel> : (
          <div className="stack">
            {rows.slice().sort((a, b) => b.reviewerId - a.reviewerId).map((r) => (
              <Panel key={r.reviewerId}>
                <div className="row spread wrap">
                  <div className="row"><Stars value={r.rating} /><b>{r.name}</b><span className="muted">{r.email}</span></div>
                  <div className="row">{r.claimNumber && <span className="muted">Claim #{r.claimNumber}</span>}<StatusBadge value={r.adminReply ? 'REPLIED' : 'PENDING'} label={r.adminReply ? 'Replied' : 'Awaiting reply'} /></div>
                </div>
                <p style={{ marginTop: 10 }}>{r.review}</p>
                {r.adminReply && <div className="alert info" style={{ marginTop: 12 }}><b>Your reply</b><br />{r.adminReply}</div>}
                <div className="row" style={{ marginTop: 14 }}>
                  <Button size="sm" variant="dark" onClick={() => setReply(r)}>{r.adminReply ? 'Edit reply' : 'Reply'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDel(r)}>Delete</Button>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </DataState>
      {reply && <ReplyModal r={reply} onClose={() => setReply(null)} />}
      {del && <Confirm danger title="Delete this review?" message="The review and any reply will be removed." confirmLabel="Delete review" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} />}
    </>
  )
}

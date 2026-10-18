import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claims, reviews } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, DataState, Empty, Icon, Modal, PageHeader, Panel, SelectInput, StatusBadge, Stars, TextArea, useToast } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'

function ReviewForm({ presetClaim, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const clm = useQuery({ queryKey: ['my-claims'], queryFn: claims.mine })
  const [claimNumber, setClaimNumber] = useState(presetClaim ?? '')
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: reviews.save,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-reviews'] }); toast.success('Thanks. Your review was sent.'); onClose() },
    onError: (e) => setError(errorMessage(e, 'Could not send your review.')),
  })

  function submit() {
    if (!rating) return setError('Choose a star rating.')
    if (review.trim().length < 5) return setError('Write a few words about your experience.')
    setError('')
    save.mutate({
      name: user?.username, email: user?.email, contactNumber: user?.contactNumber, userId: user?.userId,
      rating, review: review.trim(), claimNumber: claimNumber ? Number(claimNumber) : undefined,
    })
  }

  const decided = (clm.data || []).filter((c) => c.status !== 'PENDING')
  return (
    <Modal title="Review your experience" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="dark" loading={save.isPending} onClick={submit}>Send review</Button></>}>
      <div className="stack">
        {error && <div className="alert error" role="alert">{error}</div>}
        <SelectInput label="About which claim?" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} placeholder="Choose a claim…"
          options={decided.map((c) => ({ value: c.claimNumber, label: `#${c.claimNumber} · ${c.claimType} · ${c.status.toLowerCase()}` }))}
          hint={decided.length === 0 && !clm.isLoading ? 'You can review a claim once it has a decision.' : undefined} />
        <div className="field"><label>Rating</label><Stars value={rating} onChange={setRating} size={28} /></div>
        <TextArea label="Your review" value={review} onChange={(e) => setReview(e.target.value)} />
      </div>
    </Modal>
  )
}

export default function MyReviews() {
  const loc = useLocation()
  const q = useQuery({ queryKey: ['my-reviews'], queryFn: reviews.mine })
  const [show, setShow] = useState(false)
  useEffect(() => { if (loc.state?.claimNumber) setShow(true) }, [loc.state])

  return (
    <>
      <PageHeader title="Reviews" subtitle="Tell us how a claim went. Replies from the team show up here.">
        <Button variant="primary" icon="plus" onClick={() => setShow(true)}>Write a review</Button>
      </PageHeader>
      <DataState query={q} empty={{ title: 'No reviews yet', text: 'Once a claim has a decision, you can rate how it was handled.' }}>
        {(rows) => (
          <div className="stack">
            {rows.slice().sort((a, b) => b.reviewerId - a.reviewerId).map((r) => (
              <Panel key={r.reviewerId}>
                <div className="row spread wrap">
                  <Stars value={r.rating} />
                  <div className="row">{r.claimNumber && <span className="muted">Claim #{r.claimNumber}</span>}<StatusBadge value={r.adminReply ? 'REPLIED' : r.status || 'PENDING'} label={r.adminReply ? 'Replied' : undefined} /></div>
                </div>
                <p style={{ marginTop: 10 }}>{r.review}</p>
                {r.adminReply && (
                  <div className="alert info" style={{ marginTop: 14 }}><b>Reply from InsureX</b><br />{r.adminReply}</div>
                )}
              </Panel>
            ))}
          </div>
        )}
      </DataState>
      {show && <ReviewForm presetClaim={loc.state?.claimNumber} onClose={() => setShow(false)} />}
    </>
  )
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, ShieldCheck, Sparkles, Star, Send, MessageCircle, CheckCircle2 } from 'lucide-react'
import { claims, reviews } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, DataState, Modal, PageHeader, SelectInput, StatusBadge, Stars, TextArea, useToast } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'

function rowsOf(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  return []
}

const norm = (value) => String(value ?? '').trim().toUpperCase()

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-reviews'] })
      toast.success('Thanks. Your review was sent.')
      onClose()
    },
    onError: (e) => setError(errorMessage(e, 'Could not send your review.')),
  })

  function submit() {
    if (save.isPending) return
    if (!rating) return setError('Choose a star rating.')
    if (review.trim().length < 5) return setError('Write a few words about your experience.')
    setError('')
    save.mutate({
      name: user?.username,
      email: user?.email,
      contactNumber: user?.contactNumber,
      userId: user?.userId,
      rating,
      review: review.trim(),
      claimNumber: claimNumber ? Number(claimNumber) : undefined,
    })
  }

  const decided = rowsOf(clm.data).filter((c) => !['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(norm(c.status)))

  return (
    <Modal
      title="Review your experience"
      onClose={onClose}
      footer={
        <div className="ix-review-modal-actions">
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button variant="dark" loading={save.isPending} disabled={save.isPending} onClick={submit}>
            <Send size={15} /> Send review
          </Button>
        </div>
      }
    >
      <div className="ix-review-form">
        <div className="ix-review-form-intro">
          <span className="ix-review-form-icon"><Sparkles size={22} /></span>
          <div>
            <strong>We value your feedback</strong>
            <p>Tell us about your claim experience. Your feedback helps improve InsureX.</p>
          </div>
        </div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <SelectInput
          label="About which claim?"
          value={claimNumber}
          onChange={(e) => { setClaimNumber(e.target.value); setError('') }}
          placeholder="Choose a claim…"
          options={decided.map((c) => ({
            value: c.claimNumber,
            label: `#${c.claimNumber} · ${c.claimType || 'Claim'} · ${String(c.status || '').toLowerCase()}`,
          }))}
          hint={decided.length === 0 && !clm.isLoading ? 'You can review a claim once it has a decision.' : undefined}
        />
        <div className="ix-review-rating-field">
          <label>How would you rate your experience?</label>
          <div className="ix-review-rating-row">
            <Stars value={rating} onChange={(value) => { setRating(value); setError('') }} size={30} />
            <span>{rating ? `${rating} / 5 stars` : 'Select a rating'}</span>
          </div>
        </div>
        <TextArea label="Your review" value={review} onChange={(e) => { setReview(e.target.value); setError('') }} />
        <p className="ix-review-form-hint">Share at least a few words about the service you received.</p>
      </div>
    </Modal>
  )
}

export default function MyReviews() {
  const loc = useLocation()
  const q = useQuery({ queryKey: ['my-reviews'], queryFn: reviews.mine })
  const [show, setShow] = useState(false)
  useEffect(() => { if (loc.state?.claimNumber) setShow(true) }, [loc.state])

  const allReviews = rowsOf(q.data)
  const replied = allReviews.filter((r) => Boolean(r.adminReply)).length
  const average = allReviews.length
    ? (allReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / allReviews.length).toFixed(1)
    : '—'

  return (
    <>
      <PageHeader title="Reviews" subtitle="Share your claim experience and see replies from the InsureX team.">
        <Button variant="primary" icon="plus" onClick={() => setShow(true)}>Write a review</Button>
      </PageHeader>

      <div className="ix-reviews">
        <div className="ix-review-stats">
          <div className="ix-review-stat"><span className="ix-review-stat-icon"><MessageSquareText size={21} /></span><div><span className="ix-review-stat-label">Your reviews</span><strong>{q.isLoading ? '…' : allReviews.length}</strong></div></div>
          <div className="ix-review-stat"><span className="ix-review-stat-icon"><Star size={21} /></span><div><span className="ix-review-stat-label">Average rating</span><strong>{q.isLoading ? '…' : average}</strong></div></div>
          <div className="ix-review-stat"><span className="ix-review-stat-icon"><CheckCircle2 size={21} /></span><div><span className="ix-review-stat-label">Team replies</span><strong>{q.isLoading ? '…' : replied}</strong></div></div>
        </div>

        <DataState query={q} empty={{ title: 'No reviews yet', text: 'Once a claim has a decision, you can rate how it was handled.' }}>
          {() => (
            <div className="ix-review-grid" aria-label="My reviews">
              {allReviews.slice().sort((a, b) => Number(b.reviewerId || 0) - Number(a.reviewerId || 0)).map((r) => (
                <article className="ix-review-card" key={String(r.reviewerId)}>
                  <div className="ix-review-card-head">
                    <div className="ix-review-card-heading">
                      <span className="ix-review-card-icon"><ShieldCheck size={20} /></span>
                      <div><strong>My experience</strong><small>{r.claimNumber ? `Claim #${r.claimNumber}` : 'Insurance service review'}</small></div>
                    </div>
                    <StatusBadge value={r.adminReply ? 'REPLIED' : r.status || 'PENDING'} label={r.adminReply ? 'Replied' : undefined} />
                  </div>
                  <div className="ix-review-stars"><Stars value={r.rating} /><span>{r.rating ? `${r.rating} / 5` : 'Not rated'}</span></div>
                  <p className="ix-review-text">{r.review || '—'}</p>
                  {r.adminReply ? (
                    <div className="ix-review-reply"><div className="ix-review-reply-head"><MessageCircle size={16} /> Reply from InsureX</div><p>{r.adminReply}</p></div>
                  ) : (
                    <div className="ix-review-awaiting"><MessageCircle size={15} /> Team reply not yet available</div>
                  )}
                </article>
              ))}
            </div>
          )}
        </DataState>
      </div>
      {show && <ReviewForm presetClaim={loc.state?.claimNumber} onClose={() => setShow(false)} />}
    </>
  )
}

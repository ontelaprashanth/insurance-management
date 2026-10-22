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

      <style>{`
        .ix-reviews { --ix-review-green:#157b50; --ix-review-ink:#133e2d; --ix-review-muted:#456b5a; color:var(--ix-review-ink); }
        .ix-reviews * { box-sizing:border-box; }
        .ix-review-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:13px; margin-bottom:18px; }
        .ix-review-stat { position:relative; isolation:isolate; overflow:hidden; display:flex; align-items:center; gap:13px; min-width:0; padding:18px; border-radius:17px; border:1px solid #c4e5d1; background:linear-gradient(140deg,#fff 5%,#effaf3 100%); box-shadow:0 5px 20px rgba(19,111,67,.06); animation:ixReviewEnter .55s cubic-bezier(.2,.8,.2,1) both; transition:transform .25s ease,box-shadow .25s ease; }
        .ix-review-stat:nth-child(2) { animation-delay:90ms; }
        .ix-review-stat:nth-child(3) { animation-delay:180ms; }
        .ix-review-stat:hover { transform:translateY(-5px); box-shadow:0 14px 28px rgba(16,105,62,.14); }
        .ix-review-stat-icon { display:grid; place-items:center; flex:0 0 43px; width:43px; height:43px; border-radius:13px; background:#d8f4e4; color:#157b50; animation:ixReviewFloat 3.5s ease-in-out infinite; }
        .ix-review-stat-label { display:block; color:#4a6d5d; font-size:12px; font-weight:650; }
        .ix-review-stat strong { display:block; color:#103d2b; font-size:26px; line-height:1.2; margin-top:4px; font-weight:800; }
        .ix-review-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr)); gap:15px; }
        .ix-review-card { position:relative; isolation:isolate; overflow:hidden; display:flex; flex-direction:column; gap:15px; min-width:0; padding:20px; border:1px solid #c8e5d4; border-radius:19px; background:linear-gradient(155deg,#fff,#f5fcf7); box-shadow:0 5px 18px rgba(13,86,58,.06); animation:ixReviewEnter .55s cubic-bezier(.2,.8,.2,1) both; animation-delay:calc(min(var(--ix-review-index,0),8) * 65ms); transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease; }
        .ix-review-card::before { content:''; position:absolute; top:0; bottom:0; left:-55%; width:30%; transform:skewX(-18deg); background:linear-gradient(90deg,transparent,rgba(57,189,114,.13),transparent); pointer-events:none; }
        .ix-review-card:hover::before { animation:ixReviewShimmer .85s ease-out; }
        .ix-review-card:hover { transform:translateY(-6px); border-color:#3aa875; box-shadow:0 20px 36px rgba(16,101,62,.16); }
        .ix-review-card-head { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
        .ix-review-card-heading { display:flex; align-items:center; gap:10px; min-width:0; }
        .ix-review-card-icon { display:grid; place-items:center; width:39px; height:39px; flex:0 0 39px; border-radius:12px; color:#137749; background:#dff5e8; transition:transform .25s ease; }
        .ix-review-card:hover .ix-review-card-icon { transform:rotate(-7deg) scale(1.1); }
        .ix-review-card-heading strong { display:block; font-size:15px; color:#123d2c; }
        .ix-review-card-heading small { display:block; margin-top:3px; font-size:12px; color:#507260; }
        .ix-review-stars { display:flex; align-items:center; flex-wrap:wrap; gap:9px; }
        .ix-review-stars span { font-size:12px; font-weight:700; color:#486c58; }
        .ix-review-text { margin:0; font-size:14px; line-height:1.7; color:#244c38; overflow-wrap:anywhere; white-space:pre-wrap; }
        .ix-review-reply { margin-top:auto; padding:14px; border:1px solid #bce3cd; border-radius:13px; background:#eaf8ef; }
        .ix-review-reply-head { display:flex; align-items:center; gap:8px; color:#126b44; font-size:13px; font-weight:800; margin-bottom:7px; }
        .ix-review-reply p { margin:0; color:#244e39; font-size:13px; line-height:1.6; white-space:pre-wrap; overflow-wrap:anywhere; }
        .ix-review-awaiting { display:flex; align-items:center; gap:8px; margin-top:auto; padding-top:12px; border-top:1px solid #dcefe2; font-size:12px; color:#547363; }
        .ix-review-form { display:grid; gap:17px; color:#173d2b; }
        .ix-review-form-intro { display:flex; gap:12px; align-items:flex-start; padding:16px; border:1px solid #c5e8d3; border-radius:15px; background:linear-gradient(130deg,#effaf3,#fff); }
        .ix-review-form-icon { display:grid; place-items:center; width:40px; height:40px; flex:0 0 40px; border-radius:12px; background:#d7f2e3; color:#15794d; }
        .ix-review-form-intro strong { display:block; font-size:15px; color:#123e2b; }
        .ix-review-form-intro p { margin:5px 0 0; font-size:13px; line-height:1.55; color:#456b59; }
        .ix-review-rating-field { display:grid; gap:10px; }
        .ix-review-rating-field label { font-weight:700; font-size:13px; color:#244a36; }
        .ix-review-rating-row { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:12px 14px; border:1px solid #cfe7d8; border-radius:12px; background:#f6fcf8; }
        .ix-review-rating-row span { font-size:12px; font-weight:700; color:#527360; }
        .ix-review-form-hint { margin:-10px 0 0; color:#597365; font-size:12px; }
        .ix-review-modal-actions { display:flex; justify-content:flex-end; gap:9px; flex-wrap:wrap; }
        .ix-review-modal-actions button { display:inline-flex; align-items:center; justify-content:center; gap:7px; }
        .ix-review-empty { padding:24px; text-align:center; border:1px dashed #badfc9; border-radius:15px; background:#f6fcf8; color:#496b57; }
        @keyframes ixReviewEnter { from { opacity:0; transform:translateY(16px) scale(.975); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes ixReviewFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
        @keyframes ixReviewShimmer { from { left:-55%; } to { left:135%; } }
        @media(max-width:760px) { .ix-review-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .ix-review-stat { padding:14px; } .ix-review-stat strong { font-size:23px; } }
        @media(max-width:480px) { .ix-review-grid { gap:11px; } .ix-review-card { padding:16px; } .ix-review-stat-icon { width:35px; height:35px; flex-basis:35px; } .ix-review-stat { gap:9px; } .ix-review-modal-actions > * { flex:1; } }
        @media(prefers-reduced-motion:reduce) { .ix-review-stat,.ix-review-card,.ix-review-stat-icon,.ix-review-card::before { animation:none !important; transition:none !important; } .ix-review-stat:hover,.ix-review-card:hover,.ix-review-card:hover .ix-review-card-icon { transform:none !important; } }
      `}</style>

      <div className="ix-reviews">
        <div className="ix-review-stats">
          <div className="ix-review-stat"><span className="ix-review-stat-icon"><MessageSquareText size={21} /></span><div><span className="ix-review-stat-label">Your reviews</span><strong>{q.isLoading ? '…' : allReviews.length}</strong></div></div>
          <div className="ix-review-stat"><span className="ix-review-stat-icon"><Star size={21} /></span><div><span className="ix-review-stat-label">Average rating</span><strong>{q.isLoading ? '…' : average}</strong></div></div>
          <div className="ix-review-stat"><span className="ix-review-stat-icon"><CheckCircle2 size={21} /></span><div><span className="ix-review-stat-label">Team replies</span><strong>{q.isLoading ? '…' : replied}</strong></div></div>
        </div>

        <DataState query={q} empty={{ title: 'No reviews yet', text: 'Once a claim has a decision, you can rate how it was handled.' }}>
          {() => (
            <div className="ix-review-grid" aria-label="My reviews">
              {allReviews.slice().sort((a, b) => Number(b.reviewerId || 0) - Number(a.reviewerId || 0)).map((r, index) => (
                <article className="ix-review-card" key={String(r.reviewerId)} style={{ '--ix-review-index': index }}>
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

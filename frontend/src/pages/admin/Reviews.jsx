import { useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { reviews } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  Confirm,
  DataState,
  PageHeader,
  Panel,
  Segmented,
  Stars,
  StatusBadge,
  TextArea,
  Modal,
  useToast,
} from '../../components/ui'

function ReplyModal({ r, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()

  const [text, setText] = useState(r.adminReply || '')
  const [error, setError] = useState('')

  const m = useMutation({
    mutationFn: () =>
      reviews.reply(r.reviewerId, {
        ...r,
        adminReply: text.trim(),
      }),

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['a-reviews'],
      })

      toast.success('Reply sent')
      onClose()
    },

    onError: (e) => {
      setError(
        errorMessage(e, 'Could not send the reply.'),
      )
    },
  })

  function submitReply() {
    const replyText = text.trim()

    if (replyText.length < 3) {
      setError('Write a reply with at least 3 characters.')
      return
    }

    setError('')
    m.mutate()
  }

  function closeModal() {
    if (m.isPending) return
    onClose()
  }

  return (
    <Modal
      title={`Reply to ${r.name || 'customer'}`}
      onClose={closeModal}
      footer={
        <>
          <Button
            type="button"
            onClick={closeModal}
            disabled={m.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="dark"
            loading={m.isPending}
            onClick={submitReply}
            disabled={text.trim().length < 3 || m.isPending}
          >
            Send reply
          </Button>
        </>
      }
    >
      <div className="stack">
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}

        <div>
          <Stars value={r.rating} />

          <p
            className="muted"
            style={{ marginTop: 6 }}
          >
            {r.review}
          </p>
        </div>

        <TextArea
          label="Your reply"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError('')
          }}
        />

        <p className="hint">
          Keep your response professional, clear, and helpful.
        </p>
      </div>
    </Modal>
  )
}

export default function Reviews() {
  const qc = useQueryClient()
  const toast = useToast()

  const q = useQuery({
    queryKey: ['a-reviews'],
    queryFn: reviews.getAll,
  })

  const [filter, setFilter] = useState('all')
  const [reply, setReply] = useState(null)
  const [del, setDel] = useState(null)

  const all = Array.isArray(q.data) ? q.data : []

  const isReplied = (r) =>
    Boolean(String(r.adminReply ?? '').trim())

  const openCount = all.filter(
    (r) => !isReplied(r),
  ).length

  const avg = all.length
    ? (
        all.reduce(
          (sum, r) => sum + Number(r.rating || 0),
          0,
        ) / all.length
      ).toFixed(1)
    : '—'

  const rows = all.filter((r) => {
    if (filter === 'open') return !isReplied(r)
    if (filter === 'replied') return isReplied(r)
    return true
  })

  const remove = useMutation({
    mutationFn: (r) =>
      reviews.remove(r.reviewerId),

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['a-reviews'],
      })

      toast.success('Review deleted')
      setDel(null)
    },

    onError: (e) => {
      toast.error(
        errorMessage(e, 'Could not delete the review.'),
      )
      setDel(null)
    },
  })

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="What customers say about their claims. Reply to close the loop."
      />

      {/* Review summary */}
      <div
        className="ledger"
        style={{
          marginBottom: 20,
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}
      >
        <div>
          <div className="label">Average rating</div>

          <div className="value">
            {q.isLoading ? '…' : avg}
            <span
              className="faint"
              style={{ fontSize: 16 }}
            >
              {' '} / 5
            </span>
          </div>
        </div>

        <div>
          <div className="label">Total reviews</div>

          <div className="value">
            {q.isLoading ? '…' : all.length}
          </div>
        </div>

        <div>
          <div className="label">Awaiting reply</div>

          <div className="value">
            {q.isLoading ? '…' : openCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            {
              value: 'open',
              label: `Awaiting reply (${openCount})`,
            },
            { value: 'replied', label: 'Replied' },
          ]}
        />
      </div>

      {/* Review list */}
      <DataState
        query={q}
        empty={{
          title: 'No reviews yet',
          text: 'Customer reviews will be listed here.',
        }}
      >
        {() =>
          rows.length === 0 ? (
            <Panel>
              <div className="empty">
                <h4>
                  {filter === 'open'
                    ? 'No reviews awaiting a reply'
                    : filter === 'replied'
                      ? 'No replied reviews yet'
                      : 'Nothing here'}
                </h4>

                <p>
                  {filter === 'open'
                    ? 'You have responded to all available reviews.'
                    : filter === 'replied'
                      ? 'Your replies will appear here.'
                      : 'Customer reviews will be listed here.'}
                </p>
              </div>
            </Panel>
          ) : (
            <div className="stack">
              {rows
                .slice()
                .sort(
                  (a, b) =>
                    Number(b.reviewerId) -
                    Number(a.reviewerId),
                )
                .map((r) => {
                  const replied = isReplied(r)

                  return (
                    <Panel key={r.reviewerId}>
                      <div className="row spread wrap">
                        <div
                          className="row wrap"
                          style={{ gap: 10 }}
                        >
                          <Stars value={r.rating} />

                          <b>{r.name || 'Customer'}</b>

                          {r.email && (
                            <span className="muted">
                              {r.email}
                            </span>
                          )}
                        </div>

                        <div
                          className="row wrap"
                          style={{ gap: 8 }}
                        >
                          {r.claimNumber != null && (
                            <span className="muted">
                              Claim #{r.claimNumber}
                            </span>
                          )}

                          <StatusBadge
                            value={replied ? 'REPLIED' : 'PENDING'}
                            label={
                              replied
                                ? 'Replied'
                                : 'Awaiting reply'
                            }
                          />
                        </div>
                      </div>

                      <p style={{ marginTop: 10 }}>
                        {r.review}
                      </p>

                      {replied && (
                        <div
                          className="alert info"
                          style={{ marginTop: 12 }}
                        >
                          <b>Your reply</b>

                          <p style={{ marginTop: 6 }}>
                            {r.adminReply}
                          </p>
                        </div>
                      )}

                      <div
                        className="row wrap"
                        style={{ marginTop: 14 }}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="dark"
                          onClick={() => setReply(r)}
                        >
                          {replied ? 'Edit reply' : 'Reply'}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDel(r)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Panel>
                  )
                })}
            </div>

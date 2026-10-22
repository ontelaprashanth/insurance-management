import { useMemo, useRef, useState } from 'react'

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
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  Segmented,
  Stars,
  StatusBadge,
  TextArea,
  useFilter,
  useToast,
} from '../../components/ui'

/* =========================================================
   INSUREX — ADMIN REVIEWS
========================================================= */

const SEARCH_FIELDS = [
  'reviewerId',
  'name',
  'email',
  'claimNumber',
  'review',
  'adminReply',
]

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }

  return []
}

function isReplied(review) {
  return Boolean(
    String(review?.adminReply ?? '').trim(),
  )
}

function isUncertainError(error) {
  const status = error?.response?.status

  return (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    !error?.response ||
    status >= 500
  )
}

function getRating(review) {
  const rating = Number(review?.rating)

  if (!Number.isFinite(rating)) return 0

  return Math.min(5, Math.max(0, rating))
}

/* =========================================================
   REPLY MODAL
========================================================= */

function ReplyModal({
  review,
  onClose,
}) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const submitLock = useRef(false)

  const [text, setText] = useState(
    review.adminReply || '',
  )

  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)

  const originalReply = String(
    review.adminReply ?? '',
  ).trim()

  const replyText = text.trim()

  const unchanged =
    replyText === originalReply

  const reply = useMutation({
    mutationFn: (body) =>
      reviews.reply(review.reviewerId, body),

    retry: false,

    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-reviews'],
        })
      } catch {
        // Reply succeeded even if refreshing failed.
      }

      toast.success(
        originalReply
          ? 'Reply updated successfully.'
          : 'Reply sent successfully.',
      )

      onClose()
    },

    onError: async (requestError) => {
      if (isUncertainError(requestError)) {
        setUncertain(true)

        setError(
          'The server did not confirm whether your reply was saved. Close this window and refresh the reviews before trying again.',
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-reviews'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      setError(
        errorMessage(
          requestError,
          'Could not send the reply.',
        ),
      )
    },

    onSettled: () => {
      submitLock.current = false
    },
  })

  function submitReply(event) {
    event?.preventDefault?.()

    if (
      reply.isPending ||
      submitLock.current ||
      uncertain
    ) {
      return
    }

    if (replyText.length < 3) {
      setError(
        'Write a reply with at least 3 characters.',
      )
      return
    }

    if (replyText.length > 1000) {
      setError(
        'The reply cannot exceed 1000 characters.',
      )
      return
    }

    if (unchanged) {
      setError(
        'Change your reply before saving.',
      )
      return
    }

    setError('')
    submitLock.current = true

    /*
     * Preserve the existing request contract.
     *
     * If your backend Reply DTO only accepts adminReply,
     * this payload should be changed to:
     *
     * { adminReply: replyText }
     *
     * Verify the controller before changing it.
     */
    reply.mutate({
      ...review,
      adminReply: replyText,
    })
  }

  function closeModal() {
    if (reply.isPending) return
    onClose()
  }

  return (
    <Modal
      title={
        originalReply
          ? `Edit reply to ${review.name || 'customer'}`
          : `Reply to ${review.name || 'customer'}`
      }
      onClose={closeModal}
      footer={
        <div className="ix-reviews-modal-actions">
          <Button
            type="button"
            disabled={reply.isPending}
            onClick={closeModal}
          >
            Cancel
          </Button>

          {!uncertain && (
            <Button
              type="button"
              variant="dark"
              loading={reply.isPending}
              disabled={
                reply.isPending ||
                replyText.length < 3 ||
                replyText.length > 1000 ||
                unchanged
              }
              onClick={submitReply}
            >
              {originalReply
                ? 'Save reply'
                : 'Send reply'}
            </Button>
          )}
        </div>
      }
    >
      <form
        className="stack"
        onSubmit={submitReply}
        noValidate
      >
        {error && (
          <div
            className="alert error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="ix-reviews-original">
          <div className="ix-reviews-original-header">
            <strong>
              {review.name || 'Customer'}
            </strong>

            <Stars value={getRating(review)} />
          </div>

          {review.claimNumber != null && (
            <div className="faint">
              Claim #{review.claimNumber}
            </div>
          )}

          <p className="ix-reviews-message">
            {review.review ||
              'No review text provided.'}
          </p>
        </div>

        <TextArea
          label="Your reply"
          value={text}
          disabled={reply.isPending || uncertain}
          onChange={(event) => {
            setText(event.target.value)
            setError('')
          }}
          hint="Your reply will be visible to the customer."
        />

        <div className="ix-reviews-character-count">
          {replyText.length} / 1000 characters
        </div>

        <p className="muted">
          Keep your response professional,
          clear, and helpful.
        </p>
      </form>
    </Modal>
  )
}

/* =========================================================
   ADMIN REVIEWS PAGE
========================================================= */

export default function Reviews() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const deleteLock = useRef(false)

  const query = useQuery({
    queryKey: ['a-reviews'],
    queryFn: reviews.getAll,
    retry: 1,
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const [filter, setFilter] = useState('all')
  const [replyId, setReplyId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [pageError, setPageError] = useState('')
  const [uncertainDeleteId, setUncertainDeleteId] =
    useState(null)

  /* =======================================================
     DATA
  ======================================================= */

  const all = useMemo(
    () => normalizeRows(query.data),
    [query.data],
  )

  const [search, setSearch, searched] = useFilter(
    all,
    SEARCH_FIELDS,
  )

  const rows = useMemo(
    () =>
      (searched || [])
        .filter((review) => {
          if (filter === 'open') {
            return !isReplied(review)
          }

          if (filter === 'replied') {
            return isReplied(review)
          }

          return true
        })
        .slice()
        .sort(
          (a, b) =>
            Number(b.reviewerId || 0) -
            Number(a.reviewerId || 0),
        ),
    [searched, filter],
  )

  const openCount = all.filter(
    (review) => !isReplied(review),
  ).length

  const repliedCount = all.length - openCount

  const averageRating = all.length
    ? (
        all.reduce(
          (sum, review) =>
            sum + getRating(review),
          0,
        ) / all.length
      ).toFixed(1)
    : '—'

  const selectedReply = all.find(
    (review) =>
      String(review.reviewerId) ===
      String(replyId),
  )

  const selectedDelete = all.find(
    (review) =>
      String(review.reviewerId) ===
      String(deleteId),
  )

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshReviews() {
    setPageError('')

    try {
      const result = await query.refetch()

      if (result.error) {
        throw result.error
      }
    } catch (requestError) {
      setPageError(
        errorMessage(
          requestError,
          'Could not refresh reviews.',
        ),
      )
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  const remove = useMutation({
    mutationFn: (reviewId) =>
      reviews.remove(reviewId),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setUncertainDeleteId(null)

      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-reviews'],
        })
      } catch {
        // Delete succeeded even if refresh failed.
      }

      toast.success(
        'Review deleted successfully.',
      )
    },

    onError: async (requestError, reviewId) => {
      setDeleteId(null)

      if (isUncertainError(requestError)) {
        setUncertainDeleteId(reviewId)

        setPageError(
          `Deletion of review #${reviewId} could not be confirmed. Refresh the reviews before trying again.`,
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-reviews'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not delete the review.',
        ),
      )
    },

    onSettled: () => {
      deleteLock.current = false
    },
  })

  function confirmDelete() {
    if (
      !selectedDelete ||
      remove.isPending ||
      deleteLock.current ||
      String(selectedDelete.reviewerId) ===
        String(uncertainDeleteId)
    ) {
      return
    }

    deleteLock.current = true

    remove.mutate(selectedDelete.reviewerId)
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>{`
        .ix-reviews-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-reviews-summary-card {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 14px;
          background: var(--surface, #fff);
        }

        .ix-reviews-summary-card .label {
          color: var(--muted, #64748b);
          font-size: 12px;
        }

        .ix-reviews-summary-card .value {
          margin-top: 7px;
          font-size: 26px;
          font-weight: 750;
        }

        .ix-reviews-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
        }

        .ix-reviews-list {
          display: grid;
          gap: 14px;
        }

        .ix-reviews-card {
          min-width: 0;
        }

        .ix-reviews-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ix-reviews-person {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .ix-reviews-person-email {
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .ix-reviews-message {
          margin-top: 10px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          line-height: 1.65;
        }

        .ix-reviews-reply {
          margin-top: 14px;
          padding: 14px 16px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 12px;
          background: var(--surface-2, #f8fafc);
        }

        .ix-reviews-reply p {
          margin: 7px 0 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          line-height: 1.6;
        }

        .ix-reviews-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .ix-reviews-original {
          padding: 14px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 12px;
          background: var(--surface-2, #f8fafc);
        }

        .ix-reviews-original-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ix-reviews-character-count {
          text-align: right;
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        .ix-reviews-modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 850px) {
          .ix-reviews-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .ix-reviews-summary {
            gap: 10px;
          }

          .ix-reviews-summary-card {
            padding: 14px;
          }

          .ix-reviews-summary-card .value {
            font-size: 22px;
          }

          .ix-reviews-card-top {
            flex-direction: column;
          }

          .ix-reviews-actions {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .ix-reviews-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageHeader
        title="Reviews"
        subtitle="Read customer feedback, respond to reviews, and manage your claim-review history."
      />

      {pageError && (
        <div
          className="alert error"
          role="alert"
        >
          {pageError}
        </div>
      )}

      {/* SUMMARY */}

      <div className="ix-reviews-summary">
        <div className="ix-reviews-summary-card">
          <div className="label">
            Average rating
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : averageRating}

            <span
              className="faint"
              style={{ fontSize: 15 }}
            >
              {' '}/ 5
            </span>
          </div>
        </div>

        <div className="ix-reviews-summary-card">
          <div className="label">
            Total reviews
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : all.length}
          </div>
        </div>

        <div className="ix-reviews-summary-card">
          <div className="label">
            Awaiting reply
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : openCount}
          </div>
        </div>

        <div className="ix-reviews-summary-card">
          <div className="label">
            Replied
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : repliedCount}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}

      <div className="ix-reviews-toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search customer, claim, review"
        />

        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            {
              value: 'all',
              label: 'All',
            },
            {
              value: 'open',
              label: `Awaiting reply (${openCount})`,
            },
            {
              value: 'replied',
              label: `Replied (${repliedCount})`,
            },
          ]}
        />

        <Button
          type="button"
          disabled={query.isFetching}
          onClick={refreshReviews}
        >
          {query.isFetching
            ? 'Refreshing…'
            : 'Refresh'}
        </Button>
      </div>

      {/* REVIEW LIST */}

      <DataState
        query={query}
        empty={{
          title: 'No reviews yet',
          text: 'Customer reviews will appear here.',
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
                      ? 'No replied reviews'
                      : 'No matching reviews'}
                </h4>

                <p className="muted">
                  {filter === 'open'
                    ? 'All available reviews have received a reply.'
                    : filter === 'replied'
                      ? 'Your replies will appear here.'
                      : 'Try changing the search or filter.'}
                </p>

                <Button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </Panel>
          ) : (
            <div className="ix-reviews-list">
              {rows.map((review) => {
                const replied = isReplied(review)

                return (
                  <Panel
                    key={review.reviewerId}
                  >
                    <div className="ix-reviews-card">
                      <div className="ix-reviews-card-top">
                        <div className="ix-reviews-person">
                          <Stars
                            value={getRating(review)}
                          />

                          <strong>
                            {review.name || 'Customer'}
                          </strong>

                          {review.email && (
                            <span className="muted ix-reviews-person-email">
                              {review.email}
                            </span>
                          )}
                        </div>

                        <div
                          className="row wrap"
                          style={{ gap: 8 }}
                        >
                          {review.claimNumber != null && (
                            <span className="muted">
                              Claim #{review.claimNumber}
                            </span>
                          )}

                          <StatusBadge
                            value={
                              replied
                                ? 'REPLIED'
                                : 'PENDING'
                            }
                            label={
                              replied
                                ? 'Replied'
                                : 'Awaiting reply'
                            }
                          />
                        </div>
                      </div>

                      <p className="ix-reviews-message">
                        {review.review ||
                          'No review text provided.'}
                      </p>

                      {replied && (
                        <div className="ix-reviews-reply">
                          <strong>
                            Admin reply
                          </strong>

                          <p>
                            {review.adminReply}
                          </p>
                        </div>
                      )}

                      <div className="ix-reviews-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="dark"
                          onClick={() =>
                            setReplyId(review.reviewerId)
                          }
                        >
                          {replied
                            ? 'Edit reply'
                            : 'Reply'}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={remove.isPending}
                          onClick={() =>
                            setDeleteId(review.reviewerId)
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Panel>
                )
              })}
            </div>
          )
        }
      </DataState>

      {/* REPLY MODAL */}

      {selectedReply && (
        <ReplyModal
          key={selectedReply.reviewerId}
          review={selectedReply}
          onClose={() => setReplyId(null)}
        />
      )}

      {/* DELETE CONFIRMATION */}

      {selectedDelete && (
        <Confirm
          danger
          title="Delete this review?"
          message={
            `Delete the review from ` +
            `${selectedDelete.name || 'this customer'}? ` +
            'This action cannot be undone.'
          }
          confirmLabel="Delete review"
          loading={remove.isPending}
          onClose={() => {
            if (!remove.isPending) {
              setDeleteId(null)
            }
          }}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

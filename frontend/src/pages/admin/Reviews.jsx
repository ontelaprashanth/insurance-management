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

function ReplyModal({ review, onClose }) {
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
  const unchanged = replyText === originalReply

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
        <div>
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

        <div>
          <div>
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

          <p>
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

        <div>
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

      <div>
        <div>
          <div className="label">
            Average rating
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : averageRating}

            <span
              className="faint"
            >
              {' '}/ 5
            </span>
          </div>
        </div>

        <div>
          <div className="label">
            Total reviews
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : all.length}
          </div>
        </div>

        <div>
          <div className="label">
            Awaiting reply
          </div>

          <div className="value">
            {query.isPending
              ? '…'
              : openCount}
          </div>
        </div>

        <div>
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

      <div>
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
            <div>
              {rows.map((review) => {
                const replied = isReplied(review)

                return (
                  <Panel
                    key={review.reviewerId}
                  >
                    <div>
                      <div>
                        <div>
                          <Stars
                            value={getRating(review)}
                          />

                          <strong>
                            {review.name || 'Customer'}
                          </strong>

                          {review.email && (
                            <span className="muted">
                              {review.email}
                            </span>
                          )}
                        </div>

                        <div className="row wrap">
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

                      <p>
                        {review.review ||
                          'No review text provided.'}
                      </p>

                      {replied && (
                        <div>
                          <strong>
                            Admin reply
                          </strong>

                          <p>
                            {review.adminReply}
                          </p>
                        </div>
                      )}

                      <div>
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

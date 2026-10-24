import { useEffect, useMemo, useState } from 'react'

import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

import { purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  DataState,
  Details,
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  StatusBadge,
  Table,
} from '../../components/ui'

import {
  dateTime,
  inr2,
} from '../../lib/format'

/* =========================================================
   INSUREX — CUSTOMER REFUNDS

   Refund Request Tracking
   Pending / Processing / Reconciliation
   Completed / Failed Refunds
   Automatic Status Synchronization
   Manual Refresh
   Live Refund Details
   Responsive Desktop / Mobile UI

   Backend:
   GET /policy/my-purchases

   No additional backend endpoints required.
========================================================= */

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  const amount = Number(value)

  return inr2(
    Number.isFinite(amount)
      ? amount
      : 0,
  )
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizeRows(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(value?.content)) {
    return value.content
  }

  if (Array.isArray(value?.data)) {
    return value.data
  }

  if (Array.isArray(value?.data?.content)) {
    return value.data.content
  }

  if (Array.isArray(value?.purchases)) {
    return value.purchases
  }

  return []
}

/* =========================================================
   REFUND STATUS

   Purchase refundStatus is authoritative.

   Do not treat Razorpay's intermediate PROCESSING
   status as a completed refund.

   A backend-confirmed REFUNDED status is required.
========================================================= */

function getRefundStatus(purchase) {
  const status = normalize(
    purchase?.refundStatus,
  )

  switch (status) {
    case 'REFUNDED':
    case 'FULLY_REFUNDED':
      return 'REFUNDED'

    case 'REFUND_FAILED':
    case 'FAILED':
      return 'FAILED'

    case 'REFUND_REQUIRES_RECONCILIATION':
    case 'REQUIRES_RECONCILIATION':
      return 'RECONCILIATION'

    case 'REFUND_PROCESSING':
    case 'PROCESSING':
      return 'PROCESSING'

    case 'REFUND_PENDING':
    case 'PENDING':
    case 'REQUESTED':
      return 'PENDING'

    default:
      return 'NONE'
  }
}

function isActiveRefund(purchase) {
  return [
    'PENDING',
    'PROCESSING',
    'RECONCILIATION',
  ].includes(getRefundStatus(purchase))
}

function hasRefundActivity(purchase) {
  const status = getRefundStatus(purchase)

  return (
    status !== 'NONE' ||
    Boolean(purchase?.refundId) ||
    Boolean(purchase?.refundReason) ||
    Boolean(purchase?.refundDateTime) ||
    Boolean(purchase?.refundRequestedAt)
  )
}

function refundTimestamp(purchase) {
  return (
    purchase?.refundDateTime ||
    purchase?.refundProcessedAt ||
    purchase?.refundRequestedAt ||
    null
  )
}

function refundTimestampLabel(purchase) {
  const status = getRefundStatus(purchase)

  if (status === 'REFUNDED') {
    return 'Refund completed'
  }

  if (status === 'FAILED') {
    return 'Refund updated'
  }

  return 'Refund activity'
}

/* =========================================================
   REFUND STATUS BADGE
========================================================= */

function RefundBadge({ purchase }) {
  const status = getRefundStatus(purchase)

  const badges = {
    REFUNDED: {
      value: 'REFUNDED',
      label: 'Refunded',
    },

    FAILED: {
      value: 'FAILED',
      label: 'Refund failed',
    },

    RECONCILIATION: {
      value: 'PENDING',
      label: 'Under verification',
    },

    PROCESSING: {
      value: 'PENDING',
      label: 'Processing',
    },

    PENDING: {
      value: 'PENDING',
      label: 'Pending',
    },
  }

  const badge = badges[status]

  if (!badge) {
    return (
      <StatusBadge
        value="NOT_REFUNDED"
        label="Not refunded"
      />
    )
  }

  return (
    <StatusBadge
      value={badge.value}
      label={badge.label}
    />
  )
}

/* =========================================================
   REFUND DETAILS MODAL
========================================================= */

function RefundDetails({
  purchase,
  onClose,
  onRefresh,
  refreshing,
}) {
  if (!purchase) {
    return null
  }

  const status = getRefundStatus(purchase)

  return (
    <Modal
      title={`Refund · Purchase #${purchase.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <div className="ix-refunds-modal-actions">
          <Button
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RotateCcw
              size={15}
              className={
                refreshing
                  ? 'ix-refunds-spin'
                  : ''
              }
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh status'}
          </Button>

          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="stack ix-refunds-detail-stack">
        {/* ===============================================
            POLICY SUMMARY
        =============================================== */}

        <div className="ix-refunds-detail-header">
          <ShieldCheck size={24} />

          <div className="ix-refunds-detail-main">
            <h3>
              {purchase.coveredTypes ||
                'Insurance policy'}
            </h3>

            <div className="muted">
              Purchase #{purchase.purchaseId}
            </div>
          </div>

          <RefundBadge purchase={purchase} />
        </div>

        {/* ===============================================
            REFUND DETAILS
        =============================================== */}

        <Details
          items={[
            [
              'Purchase ID',
              `#${purchase.purchaseId}`,
            ],
            [
              'Policy number',
              purchase.policyNumber
                ? `#${purchase.policyNumber}`
                : '—',
            ],
            [
              'Insurance plan',
              purchase.coveredTypes || '—',
            ],
            [
              'Payment status',
              <StatusBadge
                value={
                  purchase.paymentStatus ||
                  'UNKNOWN'
                }
              />,
            ],
            [
              'Amount paid',
              money(purchase.totalPremium),
            ],
            [
              'Refund status',
              <RefundBadge
                purchase={purchase}
              />,
            ],
            [
              'Refund amount',
              purchase.refundAmount != null
                ? money(purchase.refundAmount)
                : '—',
            ],
            [
              'Refund ID',
              purchase.refundId || '—',
            ],
            [
              'Refund reason',
              purchase.refundReason || '—',
            ],
            [
              refundTimestampLabel(purchase),
              refundTimestamp(purchase)
                ? dateTime(
                    refundTimestamp(purchase),
                  )
                : '—',
            ],
            [
              'Transaction ID',
              purchase.transactionId || '—',
            ],
            [
              'Razorpay payment ID',
              purchase.razorpayPaymentId ||
                '—',
            ],
          ]}
        />

        {/* ===============================================
            COMPLETED
        =============================================== */}

        {status === 'REFUNDED' && (
          <div
            className="alert success"
            role="status"
          >
            <CheckCircle2 size={18} />

            <span>
              Your refund is marked as completed
              in the InsureX backend. The
              corresponding payment provider
              processing has been reconciled.
            </span>
          </div>
        )}

        {/* ===============================================
            PENDING
        =============================================== */}

        {status === 'PENDING' && (
          <div
            className="alert info"
            role="status"
          >
            <Clock3 size={18} />

            <span>
              Your refund request has been
              recorded and is waiting for
              further processing.
            </span>
          </div>
        )}

        {/* ===============================================
            PROCESSING
        =============================================== */}

        {status === 'PROCESSING' && (
          <div
            className="alert info"
            role="status"
          >
            <Clock3 size={18} />

            <span>
              Your refund is being processed.
              The final result has not yet
              been confirmed by the backend.
            </span>
          </div>
        )}

        {/* ===============================================
            RECONCILIATION
        =============================================== */}

        {status === 'RECONCILIATION' && (
          <div
            className="alert info"
            role="status"
          >
            <ShieldCheck size={18} />

            <span>
              Your refund requires verification
              against the payment provider.
              Do not submit another refund
              request for this purchase.
            </span>
          </div>
        )}

        {/* ===============================================
            FAILED
        =============================================== */}

        {status === 'FAILED' && (
          <div
            className="alert error"
            role="alert"
          >
            <AlertCircle size={18} />

            <span>
              The backend reports that this
              refund failed. Contact support
              before attempting another request.
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* =========================================================
   CUSTOMER REFUNDS PAGE
========================================================= */

export default function Refunds() {
  const location = useLocation()
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  /* =======================================================
     STATE
  ======================================================= */

  const [search, setSearch] = useState('')

  const [filter, setFilter] = useState('ALL')

  const [selectedPurchaseId, setSelectedPurchaseId] =
    useState(null)

  const [pageError, setPageError] = useState('')

  const [successMessage, setSuccessMessage] =
    useState(
      location.state?.refundRequested
        ? location.state.message ||
            'Your refund request was accepted.'
        : '',
    )

  const [requestedPurchaseId] = useState(
    location.state?.refundRequested
      ? location.state.purchaseId
      : null,
  )

  /* =======================================================
     CLEAR NAVIGATION STATE

     Prevents a refund request success message from
     reappearing after refreshing the browser.
  ======================================================= */

  useEffect(() => {
    if (!location.state?.refundRequested) {
      return
    }

    navigate(
      location.pathname +
        location.search,
      {
        replace: true,
        state: null,
      },
    )
  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
  ])

  /* =======================================================
     PURCHASES QUERY

     Refund information comes from the backend.

     Poll every 15 seconds only when there are
     refunds that are not yet in a final state.

     Polling does not initiate any refund.
     It only reads the latest purchase statuses.
  ======================================================= */

  const q = useQuery({
    queryKey: ['my-purchases'],

    queryFn: purchases.mine,

    staleTime: 0,

    refetchOnMount: 'always',

    refetchOnWindowFocus: true,

    refetchOnReconnect: true,

    refetchInterval: (query) => {
      const rows = normalizeRows(
        query.state.data,
      )

      return rows.some(isActiveRefund)
        ? 15_000
        : false
    },

    refetchIntervalInBackground: false,
  })

  /* =======================================================
     NORMALIZE PURCHASE DATA
  ======================================================= */

  const allPurchases = useMemo(
    () => normalizeRows(q.data),
    [q.data],
  )

  /* =======================================================
     REFUND ROWS
  ======================================================= */

  const refundRows = useMemo(() => {
    return allPurchases
      .filter(hasRefundActivity)
      .slice()
      .sort(
        (a, b) =>
          Number(b.purchaseId || 0) -
          Number(a.purchaseId || 0),
      )
  }, [allPurchases])

  /* =======================================================
     SELECTED REFUND

     Look up the selected purchase from the current
     query result rather than storing an old object.

     This ensures the modal updates when polling or
     manual refresh returns a new refund status.
  ======================================================= */

  const selectedPurchase = useMemo(() => {
    if (selectedPurchaseId == null) {
      return null
    }

    return (
      refundRows.find(
        (purchase) =>
          String(purchase.purchaseId) ===
          String(selectedPurchaseId),
      ) || null
    )
  }, [
    refundRows,
    selectedPurchaseId,
  ])

  /* =======================================================
     FILTER REFUNDS
  ======================================================= */

  const filteredRows = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase()

    return refundRows.filter((purchase) => {
      const status = getRefundStatus(purchase)

      if (
        filter !== 'ALL' &&
        status !== filter
      ) {
        return false
      }

      if (!term) {
        return true
      }

      return [
        purchase.purchaseId,
        purchase.policyNumber,
        purchase.coveredTypes,
        purchase.refundId,
        purchase.refundReason,
        purchase.transactionId,
        purchase.razorpayPaymentId,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term),
      )
    })
  }, [
    refundRows,
    search,
    filter,
  ])

  /* =======================================================
     REFUND SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let pending = 0
    let refunded = 0
    let failed = 0

    for (const purchase of refundRows) {
      const status = getRefundStatus(purchase)

      if (
        status === 'PENDING' ||
        status === 'PROCESSING' ||
        status === 'RECONCILIATION'
      ) {
        pending += 1
      }

      if (status === 'REFUNDED') {
        refunded += 1
      }

      if (status === 'FAILED') {
        failed += 1
      }
    }

    return {
      total: refundRows.length,
      pending,
      refunded,
      failed,
    }
  }, [refundRows])

  /* =======================================================
     REFRESH REFUNDS

     Refetch the backend's purchase data.

     Invalidate related policy information after
     receiving the latest refund statuses.
  ======================================================= */

  async function refreshRefunds() {
    setPageError('')

    try {
      const result = await q.refetch()

      if (result.error) {
        throw result.error
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['my-policies'],
          refetchType: 'active',
        }),

        queryClient.invalidateQueries({
          queryKey: ['insurance-plans'],
          refetchType: 'active',
        }),
      ])
    } catch (error) {
      setPageError(
        errorMessage(
          error,
          'Unable to refresh refund statuses.',
        ),
      )
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <PageHeader
        title="Refunds"
        subtitle="Track your insurance refund requests and their latest verified status."
      >
        <Button
          onClick={() =>
            navigate('/app/purchases')
          }
        >
          <CreditCard size={16} />
          Payments
        </Button>
      </PageHeader>

      {/* ===================================================
          REFUND REQUEST SUCCESS
      =================================================== */}

      {successMessage && (
        <div
          className="alert success"
          role="status"
        >
          <CheckCircle2 size={18} />

          <span>
            {successMessage}
          </span>

          <Button
            size="sm"
            onClick={() =>
              setSuccessMessage('')
            }
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ===================================================
          REQUESTED PURCHASE INFORMATION
      =================================================== */}

      {requestedPurchaseId != null &&
        !q.isPending &&
        isActiveRefund(
          allPurchases.find(
            (purchase) =>
              String(purchase.purchaseId) ===
              String(requestedPurchaseId),
          ),
        ) && (
          <div className="alert info">
            <Clock3 size={17} />

            <span>
              Refund request submitted for purchase
              #{requestedPurchaseId}. Its current status
              is shown below and will update when the
              backend confirms the result.
            </span>
          </div>
        )}

      {/* ===================================================
          PAGE ERROR
      =================================================== */}

      {pageError && (
        <div
          className="alert error"
          role="alert"
        >
          <AlertCircle size={17} />

          <span>
            {pageError}
          </span>
        </div>
      )}

      {/* ===================================================
          SUMMARY CARDS
      =================================================== */}

      <div className="ix-refunds-summary">
        <Panel>
          <div className="payment-summary">
            <RotateCcw size={23} />

            <div>
              <div className="muted">
                Total requests
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.total}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <Clock3 size={23} />

            <div>
              <div className="muted">
                Pending
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.pending}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <CheckCircle2 size={23} />

            <div>
              <div className="muted">
                Refunded
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.refunded}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <AlertCircle size={23} />

            <div>
              <div className="muted">
                Failed
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.failed}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* ===================================================
          REFUND TABLE
      =================================================== */}

      <Panel flush>
        <div className="toolbar ix-refunds-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search refund requests"
          />

          <select
            className="ix-refunds-filter-select"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
            aria-label="Filter refunds"
          >
            <option value="ALL">
              All refunds
            </option>

            <option value="PENDING">
              Pending
            </option>

            <option value="PROCESSING">
              Processing
            </option>

            <option value="RECONCILIATION">
              Under verification
            </option>

            <option value="REFUNDED">
              Refunded
            </option>

            <option value="FAILED">
              Failed
            </option>
          </select>

          <Button
            onClick={refreshRefunds}
            disabled={q.isFetching}
          >
            <RotateCcw
              size={15}
              className={
                q.isFetching
                  ? 'ix-refunds-spin'
                  : ''
              }
            />

            {q.isFetching
              ? 'Refreshing'
              : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No refund requests yet',
            text: 'Once you submit a refund request from Payments, you can track it here.',
          }}
        >
          {() =>
            refundRows.length === 0 ? (
              <div className="ix-refunds-empty">
                <RotateCcw
                  size={28}
                  className="ix-refunds-empty-icon"
                />

                <h3>
                  No refund requests yet
                </h3>

                <p className="muted">
                  Submit a refund request from
                  Payments to see it here.
                </p>

                <Button
                  variant="dark"
                  onClick={() =>
                    navigate('/app/purchases')
                  }
                >
                  Go to Payments
                </Button>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="ix-refunds-empty">
                <h3>
                  No matching refunds
                </h3>

                <p className="muted">
                  Try a different search or
                  refund status filter.
                </p>

                <Button
                  onClick={() => {
                    setSearch('')
                    setFilter('ALL')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className="ix-refunds-table"
                role="region"
                aria-label="Refund requests table"
                tabIndex={0}
              >
                <Table
                  rowKey="purchaseId"
                  rows={filteredRows}
                  onRowClick={(purchase) =>
                    setSelectedPurchaseId(
                      purchase.purchaseId,
                    )
                  }
                  columns={[
                    {
                      key: 'purchaseId',
                      header: 'Purchase',
                      render: (p) => (
                        <span className="ix-refunds-purchase">
                          #{p.purchaseId}
                        </span>
                      ),
                    },

                    {
                      key: 'coveredTypes',
                      header: 'Insurance plan',
                      render: (p) => (
                        <div className="ix-refunds-plan">
                          <strong>
                            {p.coveredTypes ||
                              'Insurance'}
                          </strong>

                          <span className="muted">
                            {p.policyNumber
                              ? `Policy #${p.policyNumber}`
                              : '—'}
                          </span>
                        </div>
                      ),
                    },

                    {
                      key: 'totalPremium',
                      header: 'Amount paid',
                      render: (p) => (
                        <span className="ix-refunds-amount">
                          {money(
                            p.totalPremium,
                          )}
                        </span>
                      ),
                    },

                    {
                      key: 'refundAmount',
                      header: 'Refund amount',
                      render: (p) => (
                        <span className="ix-refunds-amount">
                          {p.refundAmount != null
                            ? money(
                                p.refundAmount,
                              )
                            : '—'}
                        </span>
                      ),
                    },

                    {
                      key: 'refundStatus',
                      header: 'Status',
                      render: (p) => (
                        <span className="ix-refunds-status">
                          <RefundBadge
                            purchase={p}
                          />
                        </span>
                      ),
                    },

                    {
                      key: 'refundDateTime',
                      header: 'Refund activity',
                      render: (p) => (
                        <span className="ix-refunds-updated">
                          {refundTimestamp(p)
                            ? dateTime(
                                refundTimestamp(p),
                              )
                            : '—'}
                        </span>
                      ),
                    },

                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      render: (p) => (
                        <span className="ix-refunds-action">
                          <Button
                            size="sm"
                            onClick={(event) => {
                              event?.stopPropagation?.()

                              setSelectedPurchaseId(
                                p.purchaseId,
                              )
                            }}
                          >
                            Details
                          </Button>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            )
          }
        </DataState>
      </Panel>

      {/* ===================================================
          REFUND DETAILS MODAL

          Reads from the latest query data.
      =================================================== */}

      {selectedPurchase && (
        <RefundDetails
          purchase={selectedPurchase}
          onClose={() =>
            setSelectedPurchaseId(null)
          }
          onRefresh={refreshRefunds}
          refreshing={q.isFetching}
        />
      )}
    </>
  )
}

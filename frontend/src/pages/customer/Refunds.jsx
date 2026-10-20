
import { useEffect, useMemo, useState } from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

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

   Submitted Refund Requests
   Pending Refunds
   Processing Refunds
   Completed Refunds
   Failed Refunds

   Backend:
   GET /policy/my-purchases
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
  return String(value || '')
    .trim()
    .toUpperCase()
}

function getRefundStatus(purchase) {
  const status = normalize(
    purchase?.refundStatus,
  )

  if (
    status === 'REFUNDED' ||
    status === 'FULLY_REFUNDED' ||
    status === 'PROCESSED'
  ) {
    return 'REFUNDED'
  }

  if (
    status === 'REFUND_FAILED' ||
    status === 'FAILED'
  ) {
    return 'FAILED'
  }

  if (
    status ===
      'REFUND_REQUIRES_RECONCILIATION' ||
    status === 'REQUIRES_RECONCILIATION'
  ) {
    return 'RECONCILIATION'
  }

  if (
    status === 'REFUND_PROCESSING' ||
    status === 'PROCESSING'
  ) {
    return 'PROCESSING'
  }

  if (
    status === 'REFUND_PENDING' ||
    status === 'PENDING'
  ) {
    return 'PENDING'
  }

  return 'NONE'
}

function hasRefundActivity(purchase) {
  const status = getRefundStatus(purchase)

  return (
    status !== 'NONE' ||
    Boolean(purchase?.refundId) ||
    Boolean(purchase?.refundReason) ||
    Boolean(purchase?.refundDateTime)
  )
}

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
   REFUND DETAILS
========================================================= */

function RefundDetails({
  purchase,
  onClose,
}) {
  if (!purchase) return null

  return (
    <Modal
      title={`Refund · Purchase #${purchase.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <Button onClick={onClose}>
          Close
        </Button>
      }
    >
      <div
        className="stack"
        style={{ gap: 18 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: 16,
            border:
              '1px solid var(--line, #e3e9e8)',
            borderRadius: 14,
          }}
        >
          <ShieldCheck
            size={24}
            color="var(--fjord, #0f3d3e)"
          />

          <div
            style={{
              flex: 1,
              minWidth: 150,
            }}
          >
            <h3
              style={{
                margin: '0 0 5px',
              }}
            >
              {purchase.coveredTypes ||
                'Insurance policy'}
            </h3>

            <div className="muted">
              Purchase #{purchase.purchaseId}
            </div>
          </div>

          <RefundBadge purchase={purchase} />
        </div>

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
                value={purchase.paymentStatus}
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
              'Refund date',
              dateTime(
                purchase.refundDateTime,
              ),
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

        {getRefundStatus(purchase) ===
          'REFUNDED' && (
          <div className="alert success">
            <CheckCircle2 size={17} />

            <span>
              The backend reports this refund
              as completed.
            </span>
          </div>
        )}

        {[
          'PENDING',
          'PROCESSING',
          'RECONCILIATION',
        ].includes(
          getRefundStatus(purchase),
        ) && (
          <div className="alert info">
            <Clock3 size={17} />

            <span>
              Your refund is still being
              processed or verified.
              Please check again later.
            </span>
          </div>
        )}

        {getRefundStatus(purchase) ===
          'FAILED' && (
          <div className="alert error">
            <AlertCircle size={17} />

            <span>
              This refund is marked as failed.
              Contact support for assistance.
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

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [pageError, setPageError] = useState('')

  const [successMessage, setSuccessMessage] =
    useState(
      location.state?.refundRequested
        ? location.state.message ||
            'Your refund request was accepted.'
        : '',
    )

  const requestedPurchaseId =
    location.state?.refundRequested
      ? location.state.purchaseId
      : null

  /* Clear navigation state after arrival */

  useEffect(() => {
    if (!location.state?.refundRequested) {
      return
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [
    location.pathname,
    location.state,
    navigate,
  ])

  /* =======================================================
     FETCH REFUNDS
  ======================================================= */

  const q = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  })

  const allPurchases = useMemo(
    () =>
      Array.isArray(q.data)
        ? q.data
        : [],
    [q.data],
  )

  const refundRows = useMemo(() => {
    const rows = allPurchases
      .filter(hasRefundActivity)
      .slice()
      .sort(
        (a, b) =>
          Number(b.purchaseId || 0) -
          Number(a.purchaseId || 0),
      )

    return rows
  }, [allPurchases])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()

    return refundRows.filter((purchase) => {
      const status = getRefundStatus(purchase)

      if (
        filter !== 'ALL' &&
        status !== filter
      ) {
        return false
      }

      if (!term) return true

      return [
        purchase.purchaseId,
        purchase.policyNumber,
        purchase.coveredTypes,
        purchase.refundId,
        purchase.refundReason,
        purchase.transactionId,
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
    const pending = refundRows.filter(
      (p) =>
        [
          'PENDING',
          'PROCESSING',
          'RECONCILIATION',
        ].includes(getRefundStatus(p)),
    ).length

    const refunded = refundRows.filter(
      (p) =>
        getRefundStatus(p) === 'REFUNDED',
    ).length

    const failed = refundRows.filter(
      (p) =>
        getRefundStatus(p) === 'FAILED',
    ).length

    return {
      total: refundRows.length,
      pending,
      refunded,
      failed,
    }
  }, [refundRows])

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshRefunds() {
    setPageError('')

    try {
      const result = await q.refetch()

      if (result.error) {
        throw result.error
      }
    } catch (error) {
      setPageError(errorMessage(error))
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="Refunds"
        subtitle="Track your insurance refund requests and their processing status."
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

      {/* SUCCESS MESSAGE */}

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

      {/* REFUND REQUEST INFORMATION */}

      {requestedPurchaseId && (
        <div className="alert info">
          <Clock3 size={17} />

          <span>
            Refund request submitted for
            purchase #{requestedPurchaseId}.
            The status below comes from the
            backend and may take time to update.
          </span>
        </div>
      )}

      {/* PAGE ERROR */}

      {pageError && (
        <div
          className="alert error"
          role="alert"
        >
          <AlertCircle size={17} />
          <span>{pageError}</span>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Panel>
          <div className="payment-summary">
            <RotateCcw size={23} />

            <div>
              <div className="muted">
                Total requests
              </div>

              <strong>
                {q.isLoading
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
                {q.isLoading
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
                {q.isLoading
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
                {q.isLoading
                  ? '…'
                  : summary.failed}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* FILTERS */}

      <Panel flush>
        <div
          className="toolbar"
          style={{
            flexWrap: 'wrap',
          }}
        >
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search refund requests"
          />

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
            aria-label="Filter refunds"
            style={{
              minHeight: 40,
              padding: '8px 12px',
              borderRadius: 10,
              border:
                '1px solid var(--line, #e3e9e8)',
              background: 'var(--surface, #fff)',
              color: 'inherit',
            }}
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
            <RotateCcw size={15} />
            Refresh
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
              <div
                style={{
                  padding: 28,
                  textAlign: 'center',
                }}
              >
                <RotateCcw
                  size={28}
                  style={{
                    marginBottom: 10,
                    opacity: 0.6,
                  }}
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
            ) : (
              <Table
                rowKey="purchaseId"
                rows={filteredRows}
                onRowClick={setSelected}
                columns={[
                  {
                    key: 'purchaseId',
                    header: 'Purchase',
                    render: (p) => (
                      <b>
                        #{p.purchaseId}
                      </b>
                    ),
                  },
                  {
                    key: 'coveredTypes',
                    header: 'Insurance plan',
                    render: (p) => (
                      <div>
                        <b>
                          {p.coveredTypes ||
                            'Insurance'}
                        </b>

                        <div className="muted">
                          {p.policyNumber
                            ? `Policy #${p.policyNumber}`
                            : '—'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'totalPremium',
                    header: 'Amount paid',
                    render: (p) =>
                      money(
                        p.totalPremium,
                      ),
                  },
                  {
                    key: 'refundAmount',
                    header: 'Refund amount',
                    render: (p) =>
                      p.refundAmount != null
                        ? money(
                            p.refundAmount,
                          )
                        : '—',
                  },
                  {
                    key: 'refundStatus',
                    header: 'Status',
                    render: (p) => (
                      <RefundBadge
                        purchase={p}
                      />
                    ),
                  },
                  {
                    key: 'refundDateTime',
                    header: 'Updated',
                    render: (p) =>
                      dateTime(
                        p.refundDateTime,
                      ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (p) => (
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event?.stopPropagation?.()
                          setSelected(p)
                        }}
                      >
                        Details
                      </Button>
                    ),
                  },
                ]}
              />
            )
          }
        </DataState>
      </Panel>

      {/* REFUND DETAILS MODAL */}

      {selected && (
        <RefundDetails
          purchase={selected}
          onClose={() =>
            setSelected(null)
          }
        />
      )}
    </>
  )
}

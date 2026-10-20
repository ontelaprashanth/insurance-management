
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  PageHeader,
  Panel,
  SearchBox,
  Segmented,
  StatusBadge,
  Table,
  Details,
  Modal,
  DataState,
  Empty,
  Icon,
  useToast,
} from '../../components/ui'

/* =========================================================
   INSUREX — REFUNDS & PAYMENTS
   Uses existing global style.css only.
   No separate CSS and no nested Layout.
========================================================= */

const REFUND_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ELIGIBLE', label: 'Eligible' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const PROCESSING_STATUSES = new Set([
  'REFUND_PENDING',
  'REFUND_PROCESSING',
  'REFUND_REQUIRES_RECONCILIATION',
  'PROCESSING',
])

function statusOf(value) {
  return String(value ?? '').trim().toUpperCase()
}

function formatMoney(value) {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) return '—'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value, withTime = false) {
  if (!value) return '—'

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(parsed)
}

function isRefundEligible(purchase) {
  return (
    purchase?.refundEligible === true &&
    statusOf(purchase?.paymentStatus) === 'PAID' &&
    statusOf(purchase?.refundStatus) === 'NOT_REFUNDED'
  )
}

function refundLabel(purchase) {
  const status = statusOf(purchase?.refundStatus)

  if (status === 'REFUNDED') return 'Refunded'
  if (status === 'REFUND_FAILED') return 'Refund failed'
  if (status === 'REFUND_REQUIRES_RECONCILIATION') {
    return 'Under review'
  }
  if (status === 'REFUND_PENDING') return 'Refund pending'
  if (status === 'REFUND_PROCESSING') {
    return 'Processing'
  }

  if (isRefundEligible(purchase)) return 'Eligible'

  if (status === 'NOT_REFUNDED') return 'Not eligible'

  return status
    ? status.replaceAll('_', ' ').toLowerCase()
    : 'Unavailable'
}

function RefundBadge({ purchase }) {
  const status = statusOf(purchase?.refundStatus)

  if (status === 'REFUNDED') {
    return <StatusBadge value="REFUNDED" />
  }

  if (status === 'REFUND_FAILED') {
    return <StatusBadge value="FAILED" label="Refund failed" />
  }

  if (PROCESSING_STATUSES.has(status)) {
    return (
      <StatusBadge
        value="PENDING"
        label={refundLabel(purchase)}
      />
    )
  }

  if (isRefundEligible(purchase)) {
    return (
      <StatusBadge value="ACTIVE" label="Refund eligible" />
    )
  }

  return (
    <StatusBadge value="GRAY" label={refundLabel(purchase)} />
  )
}

/* =========================================================
   PURCHASE DETAILS MODAL
========================================================= */

function PurchaseDetails({ purchase, onClose, onRefund }) {
  const eligible = isRefundEligible(purchase)

  const items = [
    ['Purchase ID', `#${purchase.purchaseId}`],
    ['Policy number', purchase.policyNumber ?? '—'],
    ['Insurance type', purchase.coveredTypes ?? '—'],
    ['Coverage amount', formatMoney(purchase.coverageAmount)],
    [
      'Policy duration',
      purchase.durationYears
        ? `${purchase.durationYears} year(s)`
        : '—',
    ],
    ['Purchase date', formatDate(purchase.purchaseDate)],
    ['Base premium', formatMoney(purchase.basePremium)],
    ['Discount', formatMoney(purchase.discountAmount)],
    ['Taxable amount', formatMoney(purchase.taxableAmount)],
    [
      'GST rate',
      purchase.gstRate != null
        ? `${purchase.gstRate}%`
        : '—',
    ],
    ['GST amount', formatMoney(purchase.gstAmount)],
    ['Total paid', formatMoney(purchase.totalPremium)],
    ['Payment method', purchase.paymentMethod ?? '—'],
    [
      'Payment status',
      <StatusBadge value={purchase.paymentStatus} />,
    ],
    [
      'Payment date',
      formatDate(purchase.paymentDateTime, true),
    ],
    [
      'Refund status',
      <RefundBadge purchase={purchase} />,
    ],
    [
      'Refund deadline',
      formatDate(purchase.refundDeadline, true),
    ],
    [
      'Refund amount',
      purchase.refundAmount != null
        ? formatMoney(purchase.refundAmount)
        : '—',
    ],
    ['Refund ID', purchase.refundId ?? '—'],
    ['Refund reason', purchase.refundReason ?? '—'],
    [
      'Refund date',
      formatDate(purchase.refundDateTime, true),
    ],
    ['Transaction ID', purchase.transactionId ?? '—'],
    ['Razorpay order ID', purchase.razorpayOrderId ?? '—'],
    ['Razorpay payment ID', purchase.razorpayPaymentId ?? '—'],
    ['Nominee', purchase.nomineeName ?? '—'],
    ['Nominee relation', purchase.nomineeRelation ?? '—'],
    ['Nominee contact', purchase.nomineeContact ?? '—'],
  ]

  return (
    <Modal
      title={`Purchase #${purchase.purchaseId}`}
      wide
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose}>
            Close
          </Button>

          {eligible && (
            <Button
              type="button"
              variant="primary"
              onClick={() => onRefund(purchase)}
            >
              Request refund
            </Button>
          )}
        </>
      }
    >
      <div className="stack">
        <div className="alert info">
          <strong>Payment information</strong>
          <p>
            Review your insurance purchase, payment details,
            and refund status below.
          </p>
        </div>

        <Details items={items} />
      </div>
    </Modal>
  )
}

/* =========================================================
   REFUND REQUEST MODAL
========================================================= */

function RefundRequestModal({
  purchase,
  onClose,
  onSuccess,
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const toast = useToast()

  const validReason =
    reason.trim().length > 0 &&
    reason.trim().length <= 500

  const canSubmit =
    validReason &&
    confirmed &&
    !submitting &&
    isRefundEligible(purchase)

  function close() {
    if (submitting) return
    onClose()
  }

  async function submit(event) {
    event.preventDefault()

    if (!canSubmit) return

    setSubmitting(true)
    setSubmitError('')

    try {
      await purchases.refund(purchase.purchaseId, {
        refundReason: reason.trim(),
      })

      toast.success(
        'Refund request received. Check the status in your purchase history.'
      )

      onSuccess()
    } catch (error) {
      const message = errorMessage(
        error,
        'Unable to confirm the refund request.'
      )

      const uncertain =
        !error?.response ||
        Number(error?.response?.status) >= 500

      setSubmitError(
        uncertain
          ? 'The server response could not be confirmed. ' +
            'Please refresh your purchases and check the refund ' +
            'status before attempting another request.'
          : message
      )

      if (uncertain) {
        // Avoid an immediate retry after an ambiguous result.
        setConfirmed(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Request policy refund"
      onClose={close}
      footer={
        <>
          <Button
            type="button"
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="insurex-refund-form"
            variant="primary"
            loading={submitting}
            disabled={!canSubmit}
          >
            Submit refund
          </Button>
        </>
      }
    >
      <form
        id="insurex-refund-form"
        className="stack"
        onSubmit={submit}
      >
        <div className="panel">
          <div className="panel-body">
            <div className="stack-sm">
              <span className="muted">
                Full refund requested
              </span>

              <h2>{formatMoney(purchase.totalPremium)}</h2>

              <div className="row wrap">
                <StatusBadge value="PAID" />

                <span className="muted">
                  Policy #{purchase.policyNumber ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="insurex-refund-reason">
            Reason for refund
          </label>

          <textarea
            id="insurex-refund-reason"
            className="textarea"
            rows={4}
            maxLength={500}
            value={reason}
            disabled={submitting}
            onChange={(event) =>
              setReason(event.target.value)
            }
            placeholder="Explain why you want to cancel this policy..."
            required
          />

          <span className="hint">
            {reason.length}/500 characters
          </span>
        </div>

        <div className="alert warn">
          <strong>Important information</strong>
          <p>
            If your refund request is accepted, the policy
            may be deactivated while the refund is processed.
            Refund availability is subject to eligibility
            checks, including the 24-hour payment window
            and claim history.
          </p>
        </div>

        <label
          className="row"
          style={{ alignItems: 'flex-start' }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            disabled={submitting}
            onChange={(event) =>
              setConfirmed(event.target.checked)
            }
            style={{ marginTop: 5 }}
          />

          <span>
            I understand that submitting this refund
            request may deactivate my insurance coverage.
          </span>
        </label>

        {submitError && (
          <div className="alert error" role="alert">
            {submitError}
          </div>
        )}
      </form>
    </Modal>
  )
}

/* =========================================================
   MAIN REFUNDS PAGE
========================================================= */

export default function Refunds() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [refundPurchase, setRefundPurchase] = useState(null)

  const query = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const rows = Array.isArray(query.data)
    ? query.data
    : []

  const stats = useMemo(() => {
    const paid = rows.filter(
      (item) => statusOf(item.paymentStatus) === 'PAID'
    )

    const refunded = rows.filter(
      (item) => statusOf(item.refundStatus) === 'REFUNDED'
    )

    const eligible = rows.filter(isRefundEligible)

    const processing = rows.filter((item) =>
      PROCESSING_STATUSES.has(statusOf(item.refundStatus))
    )

    return {
      purchases: rows.length,
      paid: paid.length,
      eligible: eligible.length,
      processing: processing.length,
      refunded: refunded.length,
      totalPaid: paid.reduce(
        (sum, item) => sum + Number(item.totalPremium || 0),
        0
      ),
    }
  }, [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows
      .filter((item) => {
        if (filter === 'ELIGIBLE') {
          return isRefundEligible(item)
        }

        if (filter === 'PROCESSING') {
          return PROCESSING_STATUSES.has(
            statusOf(item.refundStatus)
          )
        }

        if (filter === 'REFUNDED') {
          return statusOf(item.refundStatus) === 'REFUNDED'
        }

        return true
      })
      .filter((item) => {
        if (!term) return true

        return [
          item.purchaseId,
          item.policyNumber,
          item.coveredTypes,
          item.paymentStatus,
          item.refundStatus,
          item.transactionId,
          item.razorpayPaymentId,
        ].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(term)
        )
      })
      .sort((a, b) =>
        Number(b.purchaseId || 0) -
        Number(a.purchaseId || 0)
      )
  }, [rows, search, filter])

  function openRefund(purchase) {
    if (!isRefundEligible(purchase)) return

    setSelected(null)
    setRefundPurchase(purchase)
  }

  async function afterRefund() {
    setRefundPurchase(null)
    setSelected(null)

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['my-purchases'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['my-policies'],
      }),
    ])
  }

  const columns = [
    {
      key: 'purchase',
      header: 'Purchase',
      render: (item) => (
        <div className="row">
          <div className="dot-icon">
            <Icon name="shield" size={17} />
          </div>

          <div className="stack-sm" style={{ gap: 2 }}>
            <strong>#{item.purchaseId}</strong>
            <span className="faint">
              Policy #{item.policyNumber ?? '—'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Insurance',
      render: (item) => (
        <span>{item.coveredTypes || '—'}</span>
      ),
    },
    {
      key: 'premium',
      header: 'Premium',
      align: 'right',
      render: (item) => (
        <strong>{formatMoney(item.totalPremium)}</strong>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (item) => (
        <StatusBadge value={item.paymentStatus} />
      ),
    },
    {
      key: 'refund',
      header: 'Refund status',
      render: (item) => (
        <RefundBadge purchase={item} />
      ),
    },
    {
      key: 'date',
      header: 'Purchased',
      render: (item) => formatDate(item.purchaseDate),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button
            type="button"
            size="sm"
            onClick={() => setSelected(item)}
          >
            Details
          </Button>

          {isRefundEligible(item) && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => openRefund(item)}
            >
              Refund
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="stack">
      <PageHeader
        title="Refunds & Payments"
        subtitle="Manage your insurance payments, check refund eligibility, and track refund requests."
      >
        <Button
          type="button"
          icon="clock"
          loading={query.isFetching}
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          Refresh
        </Button>
      </PageHeader>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="ledger">
        <div>
          <div className="label">Total purchases</div>
          <div className="value">{stats.purchases}</div>
          <div className="sub">Insurance purchase records</div>
        </div>

        <div>
          <div className="label">Paid purchases</div>
          <div className="value">{stats.paid}</div>
          <div className="sub">
            {formatMoney(stats.totalPaid)} paid
          </div>
        </div>

        <div>
          <div className="label">Refund eligible</div>
          <div className="value">{stats.eligible}</div>
          <div className="sub">
            Available for refund request
          </div>
        </div>

        <div>
          <div className="label">Refund processing</div>
          <div className="value">{stats.processing}</div>
          <div className="sub">
            {stats.refunded} completed refunds
          </div>
        </div>
      </div>

      {/* =====================================================
          PURCHASE HISTORY
      ===================================================== */}

      <Panel
        title="Purchase history"
        flush
        actions={
          <span className="muted">
            {filtered.length} records
          </span>
        }
      >
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search policy or transaction"
          />

          <Segmented
            value={filter}
            onChange={setFilter}
            options={REFUND_FILTERS}
          />
        </div>

        <DataState
          query={query}
          rows={5}
        >
          {() =>
            filtered.length === 0 ? (
              <Empty
                title={
                  rows.length === 0
                    ? 'No purchases found'
                    : 'No matching purchases'
                }
              >
                {rows.length === 0
                  ? 'Your completed insurance purchases will appear here.'
                  : 'Try another search or refund status filter.'}
              </Empty>
            ) : (
              <Table
                columns={columns}
                rows={filtered}
                rowKey="purchaseId"
              />
            )
          }
        </DataState>
      </Panel>

      {/* =====================================================
          INFORMATION
      ===================================================== */}

      <div className="alert info">
        <div className="row">
          <Icon name="shield" size={18} />

          <span>
            Refund eligibility is determined by the backend.
            Eligible purchases can be submitted for a refund
            within the allowed payment window, provided no
            disqualifying claim exists. Refund processing
            depends on Razorpay and the payment provider.
          </span>
        </div>
      </div>

      {/* =====================================================
          MODALS
      ===================================================== */}

      {selected && (
        <PurchaseDetails
          purchase={selected}
          onClose={() => setSelected(null)}
          onRefund={openRefund}
        />
      )}

      {refundPurchase && (
        <RefundRequestModal
          key={refundPurchase.purchaseId}
          purchase={refundPurchase}
          onClose={() => setRefundPurchase(null)}
          onSuccess={afterRefund}
        />
      )}
    </div>
  )
}

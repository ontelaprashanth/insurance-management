import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

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
  useFilter,
} from '../../components/ui'

import { date, dateTime, inr, inr2, inrShort } from '../../lib/format'

const FIELDS = [
  'purchaseId',
  'policyNumber',
  'coveredTypes',
  'transactionId',
  'paymentStatus',
]

function normalizeStatus(value) {
  return String(value || 'UNKNOWN').toUpperCase()
}

function refundStatusLabel(value) {
  return String(value || 'NOT_REFUNDED')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function canRequestRefund(purchase) {
  const paymentStatus = normalizeStatus(purchase?.paymentStatus)
  const refundStatus = normalizeStatus(
    purchase?.refundStatus || 'NOT_REFUNDED',
  )

  return (
    paymentStatus === 'PAID' &&
    purchase?.refundEligible === true &&
    ['NOT_REFUNDED', ''].includes(refundStatus)
  )
}

function isRefundInProgress(status) {
  return [
    'REFUND_PENDING',
    'REFUND_REQUIRES_RECONCILIATION',
    'PENDING',
  ].includes(normalizeStatus(status))
}

function RefundRequestForm({ purchase, onRefund, submitting }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()

    const refundReason = reason.trim()

    if (!refundReason) {
      setError('Refund reason is required.')
      return
    }

    if (refundReason.length > 500) {
      setError('Refund reason must not exceed 500 characters.')
      return
    }

    setError('')

    try {
      await onRefund(purchase.purchaseId, refundReason)
    } catch (err) {
      setError(
        errorMessage(err, 'Unable to submit the refund request.'),
      )
    }
  }

  return (
    <div className="stack">
      <div className="alert info">
        <ShieldCheck size={18} />
        <span>
          Your purchase is currently eligible for a full refund of{' '}
          <strong>{inr2(purchase.totalPremium)}</strong>.
          Eligibility is checked again by the backend when you submit.
        </span>
      </div>

      <form onSubmit={submit} className="stack">
        <label
          htmlFor={`refund-reason-${purchase.purchaseId}`}
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Reason for refund <span style={{ color: '#b42318' }}>*</span>
        </label>

        <textarea
          id={`refund-reason-${purchase.purchaseId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example, I purchased the wrong policy."
          rows={4}
          maxLength={500}
          required
          disabled={submitting}
          style={{
            width: '100%',
            resize: 'vertical',
            padding: 12,
            border: '1px solid var(--border, #d9e2e7)',
            borderRadius: 10,
            font: 'inherit',
            fontSize: 13,
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />

        <div
          className="faint"
          style={{ textAlign: 'right', fontSize: 11 }}
        >
          {reason.length}/500 characters
        </div>

        {error && (
          <div className="alert error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="alert warn">
          <AlertCircle size={17} />
          <span>
            This requests a full refund, not a partial refund.
            Do not submit another request if the refund outcome
            is uncertain. Contact support if the status requires
            reconciliation.
          </span>
        </div>

        <Button
          type="submit"
          variant="dark"
          loading={submitting}
          disabled={submitting || !reason.trim()}
        >
          <ShieldCheck size={16} />
          {submitting ? 'Submitting refund...' : 'Request full refund'}
        </Button>
      </form>
    </div>
  )
}

export function PurchaseDetail({
  p,
  onClose,
  onRefund,
  refundingId,
}) {
  const refunding = refundingId === p.purchaseId
  const eligible = canRequestRefund(p)
  const status = normalizeStatus(p.refundStatus)

  return (
    <Modal
      title={`Purchase #${p.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <Button onClick={onClose} disabled={refunding}>
          Close
        </Button>
      }
    >
      <div className="stack">
        <Details
          items={[
            ['Plan', p.coveredTypes],
            ['Policy', p.policyNumber ? `#${p.policyNumber}` : '—'],
            ['Customer', p.username],
            ['Coverage', inr(p.coverageAmount)],
            ['Term', `${p.durationYears} yr`],
            ['Purchased', date(p.purchaseDate)],
          ]}
        />

        <div className="divider" />

        <h4>Premium</h4>

        <dl className="kv">
          <dt>Base premium</dt>
          <dd>{inr2(p.basePremium)}</dd>

          <dt>Discount</dt>
          <dd>−{inr2(p.discountAmount)}</dd>

          <dt>Taxable amount</dt>
          <dd>{inr2(p.taxableAmount)}</dd>

          <dt>GST ({p.gstRate ?? 0}%)</dt>
          <dd>{inr2(p.gstAmount)}</dd>

          <dt className="total">Total paid</dt>
          <dd className="total">{inr2(p.totalPremium)}</dd>
        </dl>

        <div className="divider" />

        <h4>Payment</h4>

        <Details
          items={[
            ['Status', <StatusBadge value={p.paymentStatus} />],
            ['Method', p.paymentMethod],
            ['Paid at', dateTime(p.paymentDateTime)],
            ['Transaction', p.transactionId],
            ['Razorpay order', p.razorpayOrderId],
            ['Razorpay payment', p.razorpayPaymentId],
          ]}
        />

        <div className="divider" />

        <h4>Nominee</h4>

        <Details
          items={[
            ['Name', p.nomineeName],
            ['Relationship', p.nomineeRelation],
            ['Contact', p.nomineeContact],
          ]}
        />

        <div className="divider" />

        <h4>Refund details</h4>

        <Details
          items={[
            [
              'Refund status',
              <StatusBadge
                value={p.refundStatus || 'NOT_REFUNDED'}
              />,
            ],
            ['Refund ID', p.refundId || '—'],
            ['Refund window ends', dateTime(p.refundDeadline)],
            ['Eligible now', p.refundEligible ? 'Yes' : 'No'],
            [
              'Refunded amount',
              Number(p.refundAmount || 0) > 0
                ? inr2(p.refundAmount)
                : '—',
            ],
            ['Refund reason', p.refundReason || '—'],
            ['Refund date', dateTime(p.refundDateTime)],
          ]}
        />

        {eligible && (
          <>
            <div className="divider" />

            <h4>Request a refund</h4>

            <RefundRequestForm
              key={p.purchaseId}
              purchase={p}
              onRefund={onRefund}
              submitting={refunding}
            />
          </>
        )}

        {status === 'REFUNDED' && (
          <div className="alert success">
            <CheckCircle2 size={18} />
            <span>
              This purchase has been marked as refunded.
              Check the refund ID above for reference.
            </span>
          </div>
        )}

        {isRefundInProgress(status) && (
          <div className="alert warn">
            <Clock3 size={18} />
            <span>
              Your refund is pending or requires reconciliation.
              Do not submit another refund request until the outcome
              has been verified.
            </span>
          </div>
        )}

        {!eligible &&
          status !== 'REFUNDED' &&
          !isRefundInProgress(status) && (
            <div className="alert info">
              Refund requests are unavailable for this purchase.
              It may be outside the refund window, unpaid, or
              otherwise ineligible. The backend determines the
              final eligibility.
            </div>
          )}
      </div>
    </Modal>
  )
}

export default function MyPurchases() {
  const queryClient = useQueryClient()

  const q = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
  })

  const [open, setOpen] = useState(null)
  const [search, setSearch, rows] = useFilter(q.data, FIELDS)
  const [refundingId, setRefundingId] = useState(null)
  const [refundError, setRefundError] = useState('')
  const [refundNotice, setRefundNotice] = useState('')

  async function refreshPurchases(purchaseId) {
    await queryClient.invalidateQueries({
      queryKey: ['my-purchases'],
    })

    const result = await q.refetch()

    const latestPurchases = Array.isArray(result.data)
      ? result.data
      : []

    if (purchaseId != null) {
      const updated = latestPurchases.find(
        (item) => item.purchaseId === purchaseId,
      )

      if (updated) {
        setOpen(updated)
      }
    }
  }

  async function requestRefund(purchaseId, refundReason) {
    if (refundingId != null) return

    const purchase = (q.data || []).find(
      (item) => item.purchaseId === purchaseId,
    )

    if (!purchase) {
      throw new Error('Purchase could not be found. Refresh and try again.')
    }

    if (!canRequestRefund(purchase)) {
      throw new Error(
        'This purchase is not currently eligible for a refund. Refresh the purchase details.',
      )
    }

    const confirmed = window.confirm(
      `Request a FULL refund of ${inr2(purchase.totalPremium)} ` +
        `for purchase #${purchaseId}?\n\n` +
        'This sends a real refund request to InsureX. Continue only if you intend to request this refund.',
    )

    if (!confirmed) return

    setRefundingId(purchaseId)
    setRefundError('')
    setRefundNotice('')

    try {
      /*
       * Sends:
       * POST /policy/purchases/{purchaseId}/refund
       *
       * Request body:
       * { "refundReason": "..." }
       */
      await purchases.refund(purchaseId, {
        refundReason,
      })

      setRefundNotice(
        `Refund request submitted for purchase #${purchaseId}. Refreshing its latest status...`,
      )

      await refreshPurchases(purchaseId)

      setRefundNotice(
        `Refund request submitted for purchase #${purchaseId}. Check the refund status in the purchase details.`,
      )
    } catch (err) {
      const message = errorMessage(
        err,
        'The refund outcome could not be confirmed. Check the refund status before attempting another request.',
      )

      setRefundError(message)

      // A timeout or network failure does not prove that Razorpay
      // rejected the refund. Refresh before considering another attempt.
      try {
        await refreshPurchases(purchaseId)
      } catch {
        // Preserve the original error for the customer.
      }

      throw new Error(message)
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Receipts, premium breakdowns and refund status for each purchase."
      >
        <Button
          onClick={() => refreshPurchases(open?.purchaseId)}
          disabled={q.isFetching || refundingId != null}
        >
          <RefreshCw
            size={15}
            className={q.isFetching ? 'spin' : ''}
          />
          Refresh
        </Button>
      </PageHeader>

      {refundError && (
        <div
          className="alert error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          <AlertCircle size={17} />
          <span>{refundError}</span>
          <button
            type="button"
            onClick={() => setRefundError('')}
            aria-label="Dismiss refund error"
            style={{
              marginLeft: 'auto',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {refundNotice && (
        <div
          className="alert success"
          role="status"
          style={{ marginBottom: 16 }}
        >
          <CheckCircle2 size={17} />
          <span>{refundNotice}</span>
          <button
            type="button"
            onClick={() => setRefundNotice('')}
            aria-label="Dismiss refund notification"
            style={{
              marginLeft: 'auto',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search payments"
          />
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No payments yet',
            text: 'Your purchases and receipts will be listed here.',
          }}
        >
          {() => (
            <Table
              rowKey="purchaseId"
              rows={rows
                .slice()
                .sort((a, b) => b.purchaseId - a.purchaseId)}
              onRowClick={setOpen}
              columns={[
                {
                  key: 'purchaseId',
                  header: 'Ref',
                  render: (p) => <b>#{p.purchaseId}</b>,
                },
                {
                  key: 'coveredTypes',
                  header: 'Plan',
                },
                {
                  key: 'coverageAmount',
                  header: 'Cover',
                  render: (p) => inrShort(p.coverageAmount),
                },
                {
                  key: 'totalPremium',
                  header: 'Paid',
                  render: (p) => inr2(p.totalPremium),
                },
                {
                  key: 'paymentDateTime',
                  header: 'Date',
                  render: (p) => dateTime(p.paymentDateTime),
                },
                {
                  key: 'paymentStatus',
                  header: 'Payment',
                  render: (p) => (
                    <StatusBadge value={p.paymentStatus} />
                  ),
                },
                {
                  key: 'refundStatus',
                  header: 'Refund',
                  render: (p) => (
                    <StatusBadge
                      value={p.refundStatus || 'NOT_REFUNDED'}
                    />
                  ),
                },
                {
                  key: 'refundAction',
                  header: '',
                  align: 'right',
                  render: (p) => (
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation()
                        setOpen(p)
                      }}
                    >
                      {canRequestRefund(p)
                        ? 'Details / Refund'
                        : 'Details'}
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </DataState>
      </Panel>

      {open && (
        <PurchaseDetail
          p={
            (q.data || []).find(
              (item) => item.purchaseId === open.purchaseId,
            ) || open
          }
          onClose={() => {
            if (refundingId == null) setOpen(null)
          }}
          onRefund={requestRefund}
          refundingId={refundingId}
        />
      )}
    </>
  )
}

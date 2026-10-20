import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  RotateCcw,
  ShieldCheck,
  X,
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
  useFilter,
} from '../../components/ui'

import {
  date,
  dateTime,
  inr,
  inr2,
  inrShort,
} from '../../lib/format'

const FIELDS = [
  'purchaseId',
  'policyNumber',
  'coveredTypes',
  'transactionId',
  'paymentStatus',
  'refundStatus',
]

function money(value) {
  const amount = Number(value)
  return inr2(Number.isFinite(amount) ? amount : 0)
}

function normalizeStatus(value) {
  return String(value || '').trim().toUpperCase()
}

function isPaid(purchase) {
  return normalizeStatus(purchase?.paymentStatus) === 'PAID'
}

function isRefundPending(purchase) {
  return [
    'PENDING',
    'REFUND_PENDING',
    'PROCESSING',
    'REFUND_PROCESSING',
    'REQUIRES_RECONCILIATION',
    'REFUND_REQUIRES_RECONCILIATION',
  ].includes(normalizeStatus(purchase?.refundStatus))
}

function isRefunded(purchase) {
  return [
    'REFUNDED',
    'FULLY_REFUNDED',
    'PROCESSED',
  ].includes(normalizeStatus(purchase?.refundStatus))
}

function canRequestRefund(purchase) {
  return (
    Boolean(purchase?.refundEligible) &&
    isPaid(purchase) &&
    !isRefunded(purchase) &&
    !isRefundPending(purchase) &&
    normalizeStatus(purchase?.refundStatus) !== 'REFUND_FAILED'
  )
}

function refundStatusText(value) {
  const status = normalizeStatus(value)

  if (!status || status === 'NOT_REFUNDED') {
    return 'Not refunded'
  }

  if (status === 'REFUND_PENDING' || status === 'PENDING') {
    return 'Refund pending'
  }

  if (
    status === 'REFUND_PROCESSING' ||
    status === 'PROCESSING'
  ) {
    return 'Processing'
  }

  if (
    status === 'REFUND_REQUIRES_RECONCILIATION' ||
    status === 'REQUIRES_RECONCILIATION'
  ) {
    return 'Under verification'
  }

  if (
    status === 'REFUNDED' ||
    status === 'FULLY_REFUNDED' ||
    status === 'PROCESSED'
  ) {
    return 'Refunded'
  }

  if (status === 'REFUND_FAILED') {
    return 'Refund failed'
  }

  return String(value)
}

function RefundStatus({ purchase }) {
  const status = normalizeStatus(purchase?.refundStatus)

  if (isRefunded(purchase)) {
    return (
      <span className="refund-status refunded">
        <CheckCircle2 size={15} />
        Refunded
      </span>
    )
  }

  if (isRefundPending(purchase)) {
    return (
      <span className="refund-status pending">
        <Clock3 size={15} />
        {refundStatusText(status)}
      </span>
    )
  }

  if (status === 'REFUND_FAILED') {
    return (
      <span className="refund-status failed">
        <AlertCircle size={15} />
        Refund failed
      </span>
    )
  }

  return <StatusBadge value={purchase?.refundStatus || 'NOT_REFUNDED'} />
}

function RefundModal({
  purchase,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!purchase) return null

  const trimmedReason = reason.trim()
  const reasonValid =
    trimmedReason.length > 0 && trimmedReason.length <= 500

  async function submit(event) {
    event.preventDefault()

    if (
      submitting ||
      !reasonValid ||
      !confirmed ||
      !canRequestRefund(purchase)
    ) {
      return
    }

    await onSubmit({
      purchaseId: purchase.purchaseId,
      refundReason: trimmedReason,
    })
  }

  return (
    <Modal
      title={`Request refund · Purchase #${purchase.purchaseId}`}
      onClose={submitting ? undefined : onClose}
      wide
      footer={
        <div className="refund-modal-actions">
          <Button
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            variant="dark"
            loading={submitting}
            disabled={
              submitting ||
              !reasonValid ||
              !confirmed
            }
            onClick={() =>
              document
                .getElementById('insurex-refund-form')
                ?.requestSubmit()
            }
          >
            <RotateCcw size={16} />
            Submit refund request
          </Button>
        </div>
      }
    >
      <form
        id="insurex-refund-form"
        className="stack"
        onSubmit={submit}
      >
        <div className="refund-summary">
          <div className="refund-summary-icon">
            <CreditCard size={22} />
          </div>

          <div className="grow">
            <b>{purchase.coveredTypes || 'Insurance policy'}</b>
            <div className="muted">
              Purchase #{purchase.purchaseId}
              {purchase.policyNumber
                ? ` · Policy #${purchase.policyNumber}`
                : ''}
            </div>
          </div>

          <div className="refund-amount">
            <span>Full refund</span>
            <strong>{money(purchase.totalPremium)}</strong>
          </div>
        </div>

        <div className="alert info">
          <Clock3 size={17} />
          <span>
            Refund requests are available only while the backend
            confirms that the purchase is eligible. Refund processing
            may take additional time after the request is submitted.
          </span>
        </div>

        <div className="field">
          <label htmlFor="refund-reason">
            Reason for refund <span aria-hidden="true">*</span>
          </label>

          <textarea
            id="refund-reason"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value.slice(0, 500))
            }
            placeholder="Please explain why you want to cancel this purchase."
            rows={4}
            maxLength={500}
            required
            disabled={submitting}
          />

          <div className="refund-character-count">
            {reason.length}/500 characters
          </div>
        </div>

        <label className="refund-confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) =>
              setConfirmed(event.target.checked)
            }
            disabled={submitting}
          />

          <span>
            I confirm that I want to request a full refund for this
            purchase. I understand that submitting the request does
            not itself confirm that the refund has been completed.
          </span>
        </label>

        {error && (
          <div className="alert error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  )
}

export function PurchaseDetail({
  p,
  onClose,
  onRequestRefund,
}) {
  if (!p) return null

  const eligible = canRequestRefund(p)
  const refunded = isRefunded(p)
  const pending = isRefundPending(p)

  return (
    <Modal
      title={`Purchase #${p.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <div className="refund-modal-actions">
          {eligible && (
            <Button
              variant="dark"
              onClick={() => onRequestRefund(p)}
            >
              <RotateCcw size={16} />
              Request full refund
            </Button>
          )}

          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="stack purchase-detail">
        <div className="purchase-detail-banner">
          <div className="purchase-detail-icon">
            <ShieldCheck size={24} />
          </div>

          <div className="grow">
            <h3>{p.coveredTypes || 'Insurance policy'}</h3>
            <p>
              Purchase #{p.purchaseId}
              {p.policyNumber
                ? ` · Policy #${p.policyNumber}`
                : ''}
            </p>
          </div>

          <StatusBadge value={p.paymentStatus} />
        </div>

        <Details
          items={[
            ['Plan', p.coveredTypes],
            [
              'Policy number',
              p.policyNumber ? `#${p.policyNumber}` : '—',
            ],
            ['Customer', p.username],
            ['Coverage', money(p.coverageAmount)],
            [
              'Duration',
              `${p.durationYears || '—'} ${
                Number(p.durationYears) === 1 ? 'year' : 'years'
              }`,
            ],
            ['Purchase date', date(p.purchaseDate)],
          ]}
        />

        <div className="divider" />

        <h4>Premium breakdown</h4>

        <dl className="kv">
          <dt>Base premium</dt>
          <dd>{money(p.basePremium)}</dd>

          <dt>Discount</dt>
          <dd>−{money(p.discountAmount)}</dd>

          <dt>Taxable amount</dt>
          <dd>{money(p.taxableAmount)}</dd>

          <dt>GST ({p.gstRate ?? 0}%)</dt>
          <dd>{money(p.gstAmount)}</dd>

          <dt className="total">Total paid</dt>
          <dd className="total">{money(p.totalPremium)}</dd>
        </dl>

        <div className="divider" />

        <h4>Payment details</h4>

        <Details
          items={[
            [
              'Payment status',
              <StatusBadge value={p.paymentStatus} />,
            ],
            ['Payment method', p.paymentMethod || '—'],
            ['Payment date', dateTime(p.paymentDateTime)],
            ['Transaction ID', p.transactionId || '—'],
            ['Razorpay order ID', p.razorpayOrderId || '—'],
            ['Razorpay payment ID', p.razorpayPaymentId || '—'],
          ]}
        />

        <div className="divider" />

        <h4>Nominee details</h4>

        <Details
          items={[
            ['Name', p.nomineeName || '—'],
            ['Relationship', p.nomineeRelation || '—'],
            ['Mobile', p.nomineeContact || '—'],
          ]}
        />

        <div className="divider

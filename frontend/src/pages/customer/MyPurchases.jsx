// InsureX — MyPurchases.jsx
// Updated payment history, refund status synchronization,
// refund request safety, and responsive layout.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
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

import { date, dateTime, inr2, inrShort } from '../../lib/format'

/* =========================================================
   INSUREX — PAYMENTS & PURCHASES
========================================================= */

const FIELDS = [
  'purchaseId',
  'policyNumber',
  'coveredTypes',
  'transactionId',
  'paymentStatus',
  'refundStatus',
  'purchaseType',
  'renewedFromPolicyNumber',
  'renewalSourcePolicyNumber',
]

const REFUND_PENDING_STATUSES = [
  'PENDING',
  'REFUND_PENDING',
  'PROCESSING',
  'REFUND_PROCESSING',
  'REQUIRES_RECONCILIATION',
  'REFUND_REQUIRES_RECONCILIATION',
]

const REFUNDED_STATUSES = [
  'REFUNDED',
  'FULLY_REFUNDED',
  'PROCESSED',
]

const REFUND_FAILED_STATUSES = [
  'FAILED',
  'REFUND_FAILED',
]

const REFUND_POLL_INTERVAL = 15000

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  const amount = Number(value)
  return inr2(Number.isFinite(amount) ? amount : 0)
}

function normalizeStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizePurchases(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }
  return []
}

function getPolicyNumber(purchase) {
  return (
    purchase?.policyNumber ??
    purchase?.policy?.policyNumber ??
    null
  )
}

function getRenewalSource(purchase) {
  return (
    purchase?.renewedFromPolicyNumber ??
    purchase?.renewalSourcePolicyNumber ??
    purchase?.renewedFromPurchase?.policyNumber ??
    purchase?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function isRenewalPurchase(purchase) {
  return (
    getRenewalSource(purchase) != null ||
    normalizeStatus(purchase?.purchaseType) === 'RENEWAL'
  )
}

function purchaseTypeLabel(purchase) {
  return isRenewalPurchase(purchase)
    ? 'Renewal'
    : 'New policy'
}

function isPaid(purchase) {
  return normalizeStatus(purchase?.paymentStatus) === 'PAID'
}

function isRefundPending(purchase) {
  return REFUND_PENDING_STATUSES.includes(
    normalizeStatus(purchase?.refundStatus),
  )
}

function isRefunded(purchase) {
  return REFUNDED_STATUSES.includes(
    normalizeStatus(purchase?.refundStatus),
  )
}

function isRefundFailed(purchase) {
  return REFUND_FAILED_STATUSES.includes(
    normalizeStatus(purchase?.refundStatus),
  )
}

function isRefundNotRequested(purchase) {
  return (
    !purchase?.refundId &&
    ['', 'NOT_REFUNDED'].includes(
      normalizeStatus(purchase?.refundStatus),
    )
  )
}

function canRequestRefund(purchase) {
  return (
    purchase?.refundEligible === true &&
    isPaid(purchase) &&
    isRefundNotRequested(purchase)
  )
}

function refundEligibilityMessage(purchase) {
  if (!isPaid(purchase)) {
    return 'Only paid purchases can be refunded.'
  }

  if (!isRefundNotRequested(purchase)) {
    return 'A refund has already been requested or recorded.'
  }

  if (purchase?.refundEligible !== true) {
    return 'Refund unavailable. The backend has not confirmed eligibility. Check the 24-hour refund window and applicable rules.'
  }

  return ''
}

function refundStatusText(value) {
  const status = normalizeStatus(value)

  switch (status) {
    case '':
    case 'NOT_REFUNDED':
      return 'Not refunded'

    case 'PENDING':
    case 'REFUND_PENDING':
      return 'Refund pending'

    case 'PROCESSING':
    case 'REFUND_PROCESSING':
      return 'Processing'

    case 'REQUIRES_RECONCILIATION':
    case 'REFUND_REQUIRES_RECONCILIATION':
      return 'Under verification'

    case 'REFUNDED':
    case 'FULLY_REFUNDED':
    case 'PROCESSED':
      return 'Refunded'

    case 'FAILED':
    case 'REFUND_FAILED':
      return 'Refund failed'

    default:
      return String(value).replaceAll('_', ' ')
  }
}

/* =========================================================
   REFUND STATUS
========================================================= */

function RefundStatus({ purchase }) {
  const status = normalizeStatus(purchase?.refundStatus)

  if (isRefunded(purchase)) {
    return (
      <StatusBadge
        value="REFUNDED"
        label="Refunded"
      />
    )
  }

  if (isRefundFailed(purchase)) {
    return (
      <StatusBadge
        value="FAILED"
        label="Refund failed"
      />
    )
  }

  if (isRefundPending(purchase)) {
    return (
      <StatusBadge
        value="PENDING"
        label={refundStatusText(status)}
      />
    )
  }

  return (
    <StatusBadge
      value={status || 'NOT_REFUNDED'}
      label={refundStatusText(status)}
    />
  )
}

/* =========================================================
   PURCHASE TYPE
========================================================= */

function PurchaseTypeBadge({ purchase }) {
  const renewal = isRenewalPurchase(purchase)

  return (
    <StatusBadge
      value={renewal ? 'RENEWAL' : 'NEW'}
      label={renewal ? 'Renewal' : 'New policy'}
    />
  )
}

/* =========================================================
   REFUND REQUEST MODAL
========================================================= */

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

  const canSubmit =
    !submitting &&
    trimmedReason.length > 0 &&
    trimmedReason.length <= 500 &&
    confirmed &&
    canRequestRefund(purchase)

  async function submit(event) {
    event.preventDefault()

    if (!canSubmit) return

    await onSubmit({
      purchaseId: purchase.purchaseId,
      refundReason: trimmedReason,
    })
  }

  return (
    <Modal
      title={`Request refund · Purchase #${purchase.purchaseId}`}
      onClose={submitting ? () => {} : onClose}
      wide
      footer={
        <div className="ix-payment-modal-actions">
          <Button
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            variant="dark"
            loading={submitting}
            disabled={!canSubmit}
            onClick={() => {
              document
                .getElementById(
                  `refund-form-${purchase.purchaseId}`,
                )
                ?.requestSubmit()
            }}
          >
            <RotateCcw size={16} />
            Submit refund request
          </Button>
        </div>
      }
    >
      <form
        id={`refund-form-${purchase.purchaseId}`}
        className="stack"
        onSubmit={submit}
      >
        <div className="ix-payment-detail-summary">
          <ShieldCheck size={26} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>
              {purchase.coveredTypes || 'Insurance policy'}
            </strong>

            <div className="muted">
              Purchase #{purchase.purchaseId}
            </div>

            {isRenewalPurchase(purchase) && (
              <PurchaseTypeBadge purchase={purchase} />
            )}
          </div>

          <div>
            <div className="muted">Full refund</div>
            <strong>
              {money(purchase.totalPremium)}
            </strong>
          </div>
        </div>

        <div className="alert info">
          <Clock3 size={17} />
          <span>
            Refund requests are subject to backend
            eligibility checks. Submission does not
            mean the refund has completed.
          </span>
        </div>

        <div className="field">
          <label htmlFor="refund-reason">
            Reason for refund *
          </label>

          <textarea
            id="refund-reason"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value.slice(0, 500))
            }
            placeholder="Explain why you want to cancel this insurance purchase."
            rows={4}
            maxLength={500}
            required
            disabled={submitting}
          />

          <div
            className="muted"
            style={{
              textAlign: 'right',
              fontSize: 12,
            }}
          >
            {reason.length}/500 characters
          </div>
        </div>

        <label className="ix-payment-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) =>
              setConfirmed(event.target.checked)
            }
            disabled={submitting}
          />

          <span>
            I confirm that I want to request a full
            refund for this purchase. I understand
            that refund processing may take additional time.
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

/* =========================================================
   PURCHASE DETAILS
   Existing named export preserved.
========================================================= */

export function PurchaseDetail({
  p,
  onClose,
  onRequestRefund,
}) {
  if (!p) return null

  const eligible = canRequestRefund(p)
  const pending = isRefundPending(p)
  const refunded = isRefunded(p)
  const failed = isRefundFailed(p)

  const renewal = isRenewalPurchase(p)
  const renewalSource = getRenewalSource(p)
  const policyNumber = getPolicyNumber(p)

  return (
    <Modal
      title={`Purchase #${p.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <div className="ix-payment-modal-actions">
          {isPaid(p) &&
            isRefundNotRequested(p) &&
            onRequestRefund && (
              <Button
                variant="dark"
                disabled={!eligible}
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
      <div className="stack" style={{ gap: 18 }}>
        <div className="ix-payment-detail-summary">
          <ShieldCheck size={24} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>
              {p.coveredTypes || 'Insurance policy'}
            </h3>

            <p className="muted">
              Purchase #{p.purchaseId}
              {policyNumber != null
                ? ` · Policy #${policyNumber}`
                : ''}
            </p>
          </div>

          <StatusBadge value={p.paymentStatus} />
          <PurchaseTypeBadge purchase={p} />
        </div>

        {renewal && (
          <div className="alert info">
            <RefreshCw size={18} />
            <span>
              <strong>Policy renewal</strong>
              {renewalSource != null && (
                <>
                  {' '}— Renewed from policy{' '}
                  <strong>#{renewalSource}</strong>.
                </>
              )}
              {' '}This renewal has its own purchase
              and payment history.
            </span>
          </div>
        )}

        <h4>Purchase information</h4>

        <Details
          items={[
            ['Purchase type', purchaseTypeLabel(p)],
            ['Plan', p.coveredTypes || '—'],
            [
              'Policy number',
              policyNumber != null
                ? `#${policyNumber}`
                : '—',
            ],
            ...(renewal
              ? [[
                  'Original policy',
                  renewalSource != null
                    ? `#${renewalSource}`
                    : '—',
                ]]
              : []),
            ['Customer', p.username || '—'],
            ['Coverage', money(p.coverageAmount)],
            [
              'Duration',
              p.durationYears != null
                ? `${p.durationYears} years`
                : '—',
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
          <dd className="total">
            {money(p.totalPremium)}
          </dd>
        </dl>

        <div className="divider" />

        <h4>Payment details</h4>

        <Details
          items={[
            [
              'Payment status',
              <StatusBadge value={p.paymentStatus} />,
            ],
            [
              'Payment method',
              p.paymentMethod || '—',
            ],
            [
              'Payment date',
              dateTime(p.paymentDateTime),
            ],
            [
              'Transaction ID',
              p.transactionId || '—',
            ],
            [
              'Razorpay order ID',
              p.razorpayOrderId || '—',
            ],
            [
              'Razorpay payment ID',
              p.razorpayPaymentId || '—',
            ],
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

        <div className="divider" />

        <h4>Refund information</h4>

        <Details
          items={[
            [
              'Refund status',
              <RefundStatus purchase={p} />,
            ],
            [
              'Refund deadline',
              dateTime(p.refundDeadline),
            ],
            [
              'Eligible for refund',
              p.refundEligible === true ? 'Yes' : 'No',
            ],
            [
              'Refund amount',
              Number(p.refundAmount || 0) > 0
                ? money(p.refundAmount)
                : '—',
            ],
            ['Refund ID', p.refundId || '—'],
            [
              'Refund reason',
              p.refundReason || '—',
            ],
            [
              'Refund updated',
              dateTime(p.refundDateTime),
            ],
          ]}
        />

        {eligible && (
          <div className="alert info">
            <Clock3 size={17} />
            <span>
              This purchase is eligible for a refund.
              Submit your request before the deadline.
            </span>
          </div>
        )}

        {isPaid(p) &&
          isRefundNotRequested(p) &&
          !eligible && (
            <div className="alert info" role="status">
              <AlertCircle size={17} />
              <span>
                {refundEligibilityMessage(p)}
              </span>
            </div>
          )}

        {pending && (
          <div className="alert info" role="status">
            <Clock3 size={17} />
            <span>
              {normalizeStatus(p.refundStatus).includes(
                'RECONCILIATION',
              )
                ? 'Your refund is under verification. Do not submit another refund request.'
                : 'Your refund request is being processed. Its status will update when the backend confirms a change.'}
            </span>
          </div>
        )}

        {refunded && (
          <div className="alert success" role="status">
            <CheckCircle2 size={17} />
            <span>
              Razorpay refund processing has been
              confirmed by the backend.
            </span>
          </div>
        )}

        {failed && (
          <div className="alert error" role="status">
            <AlertCircle size={17} />
            <span>
              The refund failed. Contact support
              before taking further action.
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* =========================================================
   PAYMENTS PAGE
========================================================= */

export default function MyPurchases() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [openId, setOpenId] = useState(null)
  const [refundPurchaseId, setRefundPurchaseId] =
    useState(null)

  const [refundError, setRefundError] = useState('')
  const [pageError, setPageError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const q = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Poll only while a refund is still unresolved.
    // No polling is needed after all refunds
    // have reached terminal states.
    refetchInterval: (query) => {
      const currentPurchases = normalizePurchases(
        query.state.data,
      )

      return currentPurchases.some(isRefundPending)
        ? REFUND_POLL_INTERVAL
        : false
    },

    refetchIntervalInBackground: false,
  })

  const allPurchases = useMemo(
    () => normalizePurchases(q.data),
    [q.data],
  )

  const [search, setSearch, filteredRows] =
    useFilter(allPurchases, FIELDS)

  const rows = useMemo(
    () =>
      (filteredRows || [])
        .slice()
        .sort(
          (a, b) =>
            Number(b.purchaseId || 0) -
            Number(a.purchaseId || 0),
        ),
    [filteredRows],
  )

  // Always display current query data in open modals,
  // rather than a stale snapshot of a purchase.
  const open = allPurchases.find(
    (p) => String(p.purchaseId) === String(openId),
  ) || null

  const refundPurchase = allPurchases.find(
    (p) =>
      String(p.purchaseId) === String(refundPurchaseId),
  ) || null

  const totalPaid = allPurchases.reduce(
    (sum, purchase) =>
      isPaid(purchase)
        ? sum + Number(purchase.totalPremium || 0)
        : sum,
    0,
  )

  const refundCount = allPurchases.filter(
    (purchase) =>
      !isRefundNotRequested(purchase),
  ).length

  const renewalCount = allPurchases.filter(
    isRenewalPurchase,
  ).length

  const pendingCount = allPurchases.filter(
    isRefundPending,
  ).length

  /* =======================================================
     REFRESH RELATED DATA
  ======================================================= */

  async function invalidateRelatedData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['my-purchases'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['my-policies'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['insurance-plans'],
      }),
    ])
  }

  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  async function refreshPurchases() {
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
     REFUND SUBMISSION
  ======================================================= */

  async function submitRefund({
    purchaseId,
    refundReason,
  }) {
    if (submitting) return

    const currentPurchase = allPurchases.find(
      (p) =>
        String(p.purchaseId) === String(purchaseId),
    )

    if (!currentPurchase || !canRequestRefund(currentPurchase)) {
      setRefundError(
        'This purchase is no longer confirmed as eligible for a refund. Refresh and check its latest status.',
      )
      return
    }

    setSubmitting(true)
    setRefundError('')
    setPageError('')

    try {
      const result = await purchases.refund(
        purchaseId,
        { refundReason },
      )

      if (result?.success === false) {
        throw new Error(
          result.message ||
          'The backend rejected the refund request.',
        )
      }

      // Close the refund modal before refreshing.
      setRefundPurchaseId(null)
      setOpenId(null)

      try {
        await invalidateRelatedData()
      } catch (refreshError) {
        console.error(
          'Refund submitted, but refresh failed:',
          refreshError,
        )
      }

      navigate('/app/refunds', {
        state: {
          purchaseId,
          refundRequested: true,
          message:
            result?.message ||
            'Your refund request has been submitted. Track the verified refund status here.',
        },
      })
    } catch (error) {
      console.error(
        'InsureX refund request error:',
        error,
      )

      const uncertain =
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ETIMEDOUT' ||
        !error?.response ||
        error?.response?.status >= 500

      if (uncertain) {
        // A server error or timeout does not prove
        // the refund was rejected. Never retry
        // the request automatically.
        setRefundError(
          'The refund outcome could not be confirmed. Do not submit another request. Refresh your purchases and check the status, or contact support.',
        )

        try {
          await invalidateRelatedData()
        } catch {
          // Preserve the original uncertainty message.
        }
      } else {
        setRefundError(errorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* =======================================================
     RECHECK REFUND ELIGIBILITY
  ======================================================= */

  useEffect(() => {
    if (
      refundPurchaseId != null &&
      refundPurchase &&
      !canRequestRefund(refundPurchase) &&
      !submitting
    ) {
      setRefundError(
        'Refund eligibility has changed. Close this dialog and check the latest purchase status.',
      )
    }
  }, [refundPurchaseId, refundPurchase, submitting])

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Review insurance purchases, renewals, payment receipts, and refund status."
      />

      {pageError && (
        <div className="alert error" role="alert">
          <AlertCircle size={17} />
          <span>{pageError}</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div
          className="alert info"
          role="status"
          style={{ marginBottom: 16 }}
        >
          <RefreshCw size={17} />
          <span>
            {pendingCount} refund
            {pendingCount === 1 ? ' is' : 's are'} awaiting
            completion or verification. Statuses refresh
            automatically while this page is open.
          </span>
        </div>
      )}

      {/* PAYMENT SUMMARY */}

      <div className="ix-payment-summary-grid">
        <Panel>
          <div className="payment-summary">
            <FileText size={22} />
            <div>
              <div className="muted">Purchases</div>
              <strong>
                {q.isLoading ? '…' : allPurchases.length}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <CreditCard size={22} />
            <div>
              <div className="muted">Total paid</div>
              <strong>
                {q.isLoading ? '…' : money(totalPaid)}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <RefreshCw size={22} />
            <div>
              <div className="muted">Renewals</div>
              <strong>
                {q.isLoading ? '…' : renewalCount}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <RotateCcw size={22} />
            <div>
              <div className="muted">Refund requests</div>
              <strong>
                {q.isLoading ? '…' : refundCount}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* RESPONSIVE STYLES */}

      <style>{`
        .ix-payment-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-payment-detail-summary {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          padding: 16px;
          border: 1px solid var(--line, #e3e9e8);
          border-radius: 14px;
        }

        .ix-payment-detail-summary h3,
        .ix-payment-detail-summary p {
          margin: 0;
        }

        .ix-payment-modal-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ix-payment-confirm {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.6;
        }

        .ix-payment-confirm input {
          margin-top: 4px;
          flex-shrink: 0;
        }

        .ix-payments-table-scroll {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
        }

        .ix-payments-table-scroll table {
          width: 100%;
          min-width: 1180px;
          border-collapse: collapse;
        }

        .ix-payments-table-scroll th,
        .ix-payments-table-scroll td {
          padding: 14px 16px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .ix-payments-table-scroll .purchase-ref,
        .ix-payments-table-scroll .purchase-plan {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 4px;
          min-width: 0;
          line-height: 1.4;
        }

        .ix-payments-table-scroll .purchase-ref > b,
        .ix-payments-table-scroll .purchase-plan > b {
          font-weight: 700;
          color: var(--ink);
        }

        .ix-payments-table-scroll .purchase-ref > span,
        .ix-payments-table-scroll .purchase-plan > span {
          font-size: 13px;
          color: var(--ink-2);
        }

        .ix-payments-table-scroll .badge {
          display: inline-flex;
          align-items: center;
          width: max-content;
          max-width: none;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .ix-payment-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: nowrap;
          gap: 6px;
          white-space: nowrap;
        }

        .ix-payment-actions > * {
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .ix-payment-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .ix-payment-detail-summary {
            padding: 12px;
          }

          .ix-payment-modal-actions {
            justify-content: stretch;
          }

          .ix-payment-modal-actions > * {
            flex: 1;
          }
        }
      `}</style>

      {/* PURCHASE TABLE */}

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search purchases, policies or transactions"
          />

          <Button
            onClick={refreshPurchases}
            disabled={q.isFetching || submitting}
          >
            <RefreshCw size={15} />
            {q.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No payments yet',
            text:
              'Your insurance purchases and payment receipts will appear here.',
          }}
        >
          {() => (
            <div
              className="ix-payments-table-scroll"
              role="region"
              aria-label="Payments history table"
              tabIndex={0}
            >
              <Table
                rowKey="purchaseId"
                rows={rows}
                onRowClick={(p) => setOpenId(p.purchaseId)}
                columns={[
                  {
                    key: 'purchaseId',
                    header: 'Purchase',
                    render: (p) => (
                      <div className="purchase-ref">
                        <b>#{p.purchaseId}</b>
                        <span>{date(p.purchaseDate)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'coveredTypes',
                    header: 'Insurance plan',
                    render: (p) => (
                      <div className="purchase-plan">
                        <b>
                          {p.coveredTypes || 'Insurance'}
                        </b>
                        <span>
                          {getPolicyNumber(p) != null
                            ? `Policy #${getPolicyNumber(p)}`
                            : 'Policy pending'}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'purchaseType',
                    header: 'Type',
                    render: (p) => (
                      <PurchaseTypeBadge purchase={p} />
                    ),
                  },
                  {
                    key: 'coverageAmount',
                    header: 'Coverage',
                    render: (p) =>
                      inrShort(p.coverageAmount),
                  },
                  {
                    key: 'totalPremium',
                    header: 'Paid',
                    render: (p) => (
                      <b>{money(p.totalPremium)}</b>
                    ),
                  },
                  {
                    key: 'paymentDateTime',
                    header: 'Payment date',
                    render: (p) =>
                      dateTime(p.paymentDateTime),
                  },
                  {
                    key: 'paymentStatus',
                    header: 'Payment',
                    render: (p) => (
                      <StatusBadge
                        value={p.paymentStatus}
                      />
                    ),
                  },
                  {
                    key: 'refundStatus',
                    header: 'Refund',
                    render: (p) => (
                      <RefundStatus purchase={p} />
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (p) => (
                      <div className="ix-payment-actions">
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event?.stopPropagation?.()
                            setOpenId(p.purchaseId)
                          }}
                        >
                          Details
                        </Button>

                        {isPaid(p) &&
                          isRefundNotRequested(p) && (
                            <Button
                              size="sm"
                              variant="dark"
                              disabled={
                                submitting ||
                                !canRequestRefund(p)
                              }
                              onClick={(event) => {
                                event?.stopPropagation?.()
                                setRefundError('')
                                setRefundPurchaseId(
                                  p.purchaseId,
                                )
                              }}
                            >
                              {canRequestRefund(p)
                                ? 'Refund'
                                : 'Refund unavailable'}
                            </Button>
                          )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </DataState>
      </Panel>

      {/* PURCHASE DETAILS */}

      {open && (
        <PurchaseDetail
          p={open}
          onClose={() => setOpenId(null)}
          onRequestRefund={(purchase) => {
            setRefundError('')
            setOpenId(null)
            setRefundPurchaseId(purchase.purchaseId)
          }}
        />
      )}

      {/* REFUND MODAL */}

      {refundPurchase && (
        <RefundModal
          key={refundPurchase.purchaseId}
          purchase={refundPurchase}
          onClose={() => {
            if (submitting) return

            setRefundPurchaseId(null)
            setRefundError('')
          }}
          onSubmit={submitRefund}
          submitting={submitting}
          error={refundError}
        />
      )}
    </>
  )
}

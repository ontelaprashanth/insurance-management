
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

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

import {
  date,
  dateTime,
  inr2,
  inrShort,
} from '../../lib/format'

/* =========================================================
   INSUREX — MY PURCHASES / PAYMENTS

   - New insurance purchases
   - Policy renewal purchases
   - Original policy references
   - Payment history and receipts
   - Premium breakdown
   - Razorpay transaction details
   - Nominee details
   - Refund eligibility and requests
   - Refund status tracking
   - Responsive table
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

/* =========================================================
   COMMON HELPERS
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

/* =========================================================
   RENEWAL HELPERS

   Renewal metadata must come from the backend.
========================================================= */

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

/* =========================================================
   PAYMENT HELPERS
========================================================= */

function isPaid(purchase) {
  return normalizeStatus(purchase?.paymentStatus) === 'PAID'
}

/* =========================================================
   REFUND HELPERS

   Eligibility remains controlled by the backend.
========================================================= */

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

function isRefundNotRequested(purchase) {
  return (
    !purchase?.refundId &&
    ['', 'NOT_REFUNDED'].includes(
      normalizeStatus(purchase?.refundStatus),
    )
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
    return 'Refund unavailable: the server has not confirmed eligibility. Check the 24-hour window and purchase eligibility rules.'
  }

  return ''
}

function canRequestRefund(purchase) {
  return (
    purchase?.refundEligible === true &&
    isPaid(purchase) &&
    isRefundNotRequested(purchase)
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

  if (status === 'REFUND_FAILED' || status === 'FAILED') {
    return 'Refund failed'
  }

  return String(value).replaceAll('_', ' ')
}

/* =========================================================
   REFUND STATUS BADGE
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

  if (isRefundPending(purchase)) {
    return (
      <StatusBadge
        value="PENDING"
        label={refundStatusText(status)}
      />
    )
  }

  if (
    status === 'REFUND_FAILED' ||
    status === 'FAILED'
  ) {
    return (
      <StatusBadge
        value="FAILED"
        label="Refund failed"
      />
    )
  }

  return (
    <StatusBadge
      value="NOT_REFUNDED"
      label="Not refunded"
    />
  )
}

/* =========================================================
   PURCHASE TYPE BADGE
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            padding: 16,
            border: '1px solid var(--line, #e3e9e8)',
            borderRadius: 14,
          }}
        >
          <ShieldCheck size={26} />

          <div style={{ flex: 1 }}>
            <b>
              {purchase.coveredTypes ||
                'Insurance policy'}
            </b>

            <div className="muted">
              Purchase #{purchase.purchaseId}
            </div>

            {isRenewalPurchase(purchase) && (
              <div style={{ marginTop: 6 }}>
                <PurchaseTypeBadge purchase={purchase} />
              </div>
            )}
          </div>

          <div>
            <div className="muted">
              Full refund
            </div>

            <strong>
              {money(purchase.totalPremium)}
            </strong>
          </div>
        </div>

        <div className="alert info">
          <Clock3 size={17} />

          <span>
            Refund requests are allowed only when
            the backend confirms eligibility.
            Submission does not mean the refund
            has already been completed.
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
              setReason(
                event.target.value.slice(0, 500),
              )
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

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) =>
              setConfirmed(event.target.checked)
            }
            disabled={submitting}
            style={{ marginTop: 4 }}
          />

          <span>
            I confirm that I want to request a
            full refund for this purchase.
            I understand that refund processing
            may take additional time.
          </span>
        </label>

        {error && (
          <div
            className="alert error"
            role="alert"
          >
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  )
}

/* =========================================================
   PURCHASE DETAILS MODAL

   Export preserved for existing imports.
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

  const renewal = isRenewalPurchase(p)
  const renewalSource = getRenewalSource(p)
  const policyNumber = getPolicyNumber(p)

  return (
    <Modal
      title={`Purchase #${p.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
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

        {/* PURCHASE SUMMARY */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: 16,
            border: '1px solid var(--line, #e3e9e8)',
            borderRadius: 14,
          }}
        >
          <ShieldCheck size={24} />

          <div style={{ flex: 1 }}>
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

        {/* RENEWAL INFORMATION */}

        {renewal && (
          <div className="alert info">
            <RefreshCw size={18} />

            <span>
              <b>Policy renewal</b>
              {renewalSource != null && (
                <>
                  {' '}— Renewed from policy{' '}
                  <b>#{renewalSource}</b>.
                </>
              )}
              {' '}This renewal has its own purchase
              and payment history.
            </span>
          </div>
        )}

        {/* PURCHASE DETAILS */}

        <Details
          items={[
            ['Purchase type', purchaseTypeLabel(p)],
            ['Plan', p.coveredTypes],
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
            ['Customer', p.username],
            ['Coverage', money(p.coverageAmount)],
            [
              'Duration',
              `${p.durationYears || '—'} years`,
            ],
            ['Purchase date', date(p.purchaseDate)],
          ]}
        />

        <div className="divider" />

        {/* PREMIUM BREAKDOWN */}

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

          <dt className="total">
            Total paid
          </dt>
          <dd className="total">
            {money(p.totalPremium)}
          </dd>
        </dl>

        <div className="divider" />

        {/* PAYMENT DETAILS */}

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

        {/* NOMINEE DETAILS */}

        <h4>Nominee details</h4>

        <Details
          items={[
            ['Name', p.nomineeName || '—'],
            ['Relationship', p.nomineeRelation || '—'],
            ['Mobile', p.nomineeContact || '—'],
          ]}
        />

        <div className="divider" />

        {/* REFUND INFORMATION */}

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
              p.refundEligible ? 'Yes' : 'No',
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
              This purchase is currently eligible
              for a refund. Submit your request
              before the deadline.
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
          <div className="alert info">
            <Clock3 size={17} />
            <span>
              Your refund is being processed.
              Track its status in Refunds.
            </span>
          </div>
        )}

        {refunded && (
          <div className="alert success">
            <CheckCircle2 size={17} />
            <span>
              This purchase is marked as refunded
              by the backend.
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

  const q = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 15000,
    refetchOnWindowFocus: true,
  })

  const [open, setOpen] = useState(null)

  const [refundPurchase, setRefundPurchase] =
    useState(null)

  const [refundError, setRefundError] =
    useState('')

  const [submitting, setSubmitting] =
    useState(false)

  const [pageError, setPageError] =
    useState('')

  const allPurchases = useMemo(
    () => normalizePurchases(q.data),
    [q.data],
  )

  /* =======================================================
     SEARCH AND SORT
  ======================================================= */

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

  /* =======================================================
     PAYMENT SUMMARY
  ======================================================= */

  const totalPaid = allPurchases.reduce(
    (sum, purchase) =>
      isPaid(purchase)
        ? sum +
          Number(purchase.totalPremium || 0)
        : sum,
    0,
  )

  const refundCount = allPurchases.filter(
    (purchase) =>
      isRefundPending(purchase) ||
      isRefunded(purchase),
  ).length

  const renewalCount = allPurchases.filter(
    isRenewalPurchase,
  ).length

  /* =======================================================
     REFRESH PURCHASES
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
     SUBMIT REFUND
  ======================================================= */

  async function submitRefund({
    purchaseId,
    refundReason,
  }) {
    if (submitting) return

    setSubmitting(true)
    setRefundError('')
    setPageError('')

    let result

    try {
      result = await purchases.refund(
        purchaseId,
        { refundReason },
      )

      if (result?.success === false) {
        throw new Error(
          result.message ||
          'The backend rejected the refund request.',
        )
      }
    } catch (error) {
      console.error(
        'InsureX refund request failed:',
        error,
      )

      const uncertain =
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'

      setRefundError(
        uncertain
          ? 'The refund result could not be confirmed. Refresh your purchases and verify the status before trying again.'
          : errorMessage(error),
      )

      setSubmitting(false)
      return
    }

    setRefundPurchase(null)
    setOpen(null)

    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['my-purchases'],
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({
          queryKey: ['my-policies'],
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({
          queryKey: ['insurance-plans'],
          refetchType: 'none',
        }),
      ])

      navigate('/app/refunds', {
        state: {
          purchaseId,
          refundRequested: true,
          message:
            result?.message ||
            'Your refund request was submitted successfully. Track its status below.',
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Review insurance purchases, renewals, receipts, and refund requests."
      />

      {pageError && (
        <div className="alert error" role="alert">
          <AlertCircle size={17} />
          <span>{pageError}</span>
        </div>
      )}

      {/* PAYMENT SUMMARY */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
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

      {/* RESPONSIVE TABLE STYLES */}

      <style>{`
        .ix-payments-table-scroll {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
        }

        .ix-payments-table-scroll table {
          width: 100%;
          min-width: 1240px;
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
          display: block;
          font-weight: 700;
          color: var(--ink);
        }

        .ix-payments-table-scroll .purchase-ref > span,
        .ix-payments-table-scroll .purchase-plan > span {
          display: block;
          font-size: 13px;
          font-weight: 400;
          color: var(--ink-2);
        }

        .ix-payments-table-scroll .badge {
          display: inline-flex;
          align-items: center;
          width: max-content;
          max-width: none;
          white-space: nowrap;
          word-break: normal;
          overflow-wrap: normal;
          flex-shrink: 0;
        }

        .ix-payments-table-scroll .badge::before {
          flex-shrink: 0;
        }

        .ix-payments-table-scroll .ix-payment-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: nowrap;
          gap: 6px;
          white-space: nowrap;
        }

        .ix-payments-table-scroll .ix-payment-actions > * {
          flex-shrink: 0;
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
            <RotateCcw size={15} />
            Refresh
          </Button>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No payments yet',
            text:
              'Your completed policy purchases and payment receipts will appear here.',
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
                onRowClick={setOpen}
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
                            setOpen(p)
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
                                setRefundPurchase(p)
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
          onClose={() => setOpen(null)}
          onRequestRefund={(purchase) => {
            setRefundError('')
            setOpen(null)
            setRefundPurchase(purchase)
          }}
        />
      )}

      {/* REFUND REQUEST MODAL */}

      {refundPurchase && (
        <RefundModal
          key={refundPurchase.purchaseId}
          purchase={refundPurchase}
          onClose={() => {
            if (submitting) return
            setRefundPurchase(null)
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

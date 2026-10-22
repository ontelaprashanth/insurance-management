import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

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
   INSUREX — PAYMENTS & PURCHASES

   Purchase History
   Payment Receipts
   New Policies / Renewals
   Premium Breakdown
   Refund Eligibility
   Safe Refund Submission
   Refund Status Synchronization
   Razorpay Reconciliation
   Responsive Layout

   Existing backend endpoints preserved.
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

const REFUND_POLL_INTERVAL = 15_000

const PENDING_STATUSES = [
  'REQUESTED',
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
]

const FAILED_STATUSES = [
  'FAILED',
  'REFUND_FAILED',
]

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  if (value == null || value === '') {
    return inr2(0)
  }

  const amount = Number(value)

  return inr2(
    Number.isFinite(amount)
      ? amount
      : 0,
  )
}

function normalizeStatus(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizePurchases(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.content)) {
    return data.content
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }

  if (Array.isArray(data?.purchases)) {
    return data.purchases
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
    normalizeStatus(
      purchase?.purchaseType,
    ) === 'RENEWAL'
  )
}

function purchaseTypeLabel(purchase) {
  return isRenewalPurchase(purchase)
    ? 'Renewal'
    : 'New policy'
}

function isPaid(purchase) {
  return normalizeStatus(
    purchase?.paymentStatus,
  ) === 'PAID'
}

function isRefundPending(purchase) {
  return PENDING_STATUSES.includes(
    normalizeStatus(
      purchase?.refundStatus,
    ),
  )
}

function isRefunded(purchase) {
  return REFUNDED_STATUSES.includes(
    normalizeStatus(
      purchase?.refundStatus,
    ),
  )
}

function isRefundFailed(purchase) {
  return FAILED_STATUSES.includes(
    normalizeStatus(
      purchase?.refundStatus,
    ),
  )
}

function isRefundNotRequested(purchase) {
  const status = normalizeStatus(
    purchase?.refundStatus,
  )

  return (
    !purchase?.refundId &&
    !purchase?.refundReason &&
    !purchase?.refundDateTime &&
    (
      status === '' ||
      status === 'NOT_REFUNDED'
    )
  )
}

function hasRefundActivity(purchase) {
  return (
    !isRefundNotRequested(purchase) ||
    Boolean(purchase?.refundId) ||
    Boolean(purchase?.refundReason) ||
    Boolean(purchase?.refundDateTime)
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
    return 'A refund has already been requested or recorded for this purchase.'
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

    case 'REQUESTED':
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
      return 'Refunded'

    case 'FAILED':
    case 'REFUND_FAILED':
      return 'Refund failed'

    default:
      return String(value ?? '')
        .replaceAll('_', ' ')
  }
}

function refundActivityDate(purchase) {
  return (
    purchase?.refundDateTime ??
    purchase?.refundProcessedAt ??
    purchase?.refundRequestedAt ??
    null
  )
}

function isUncertainRefundError(error) {
  const status = error?.response?.status

  return (
    error?.insurexPaymentOutcomeUncertain === true ||
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    !error?.response ||
    status >= 500
  )
}

/* =========================================================
   REFUND STATUS BADGE
========================================================= */

function RefundStatus({ purchase }) {
  const status = normalizeStatus(
    purchase?.refundStatus,
  )

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
  outcomeUncertain = false,
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!purchase) {
    return null
  }

  const trimmedReason = reason.trim()

  const canSubmit =
    !submitting &&
    !outcomeUncertain &&
    trimmedReason.length > 0 &&
    trimmedReason.length <= 500 &&
    confirmed &&
    canRequestRefund(purchase)

  function submit(event) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    onSubmit({
      purchaseId: purchase.purchaseId,
      refundReason: trimmedReason,
    })
  }

  return (
    <Modal
      title={`Request refund · Purchase #${purchase.purchaseId}`}
      onClose={
        submitting
          ? () => {}
          : onClose
      }
      wide
      footer={
        <div className="ix-payment-modal-actions">
          <Button
            onClick={onClose}
            disabled={submitting}
          >
            {outcomeUncertain
              ? 'Close'
              : 'Cancel'}
          </Button>

          {!outcomeUncertain && (
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
          )}
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

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <strong>
              {purchase.coveredTypes ||
                'Insurance policy'}
            </strong>

            <div className="muted">
              Purchase #{purchase.purchaseId}
            </div>

            {isRenewalPurchase(purchase) && (
              <PurchaseTypeBadge
                purchase={purchase}
              />
            )}
          </div>

          <div>
            <div className="muted">
              Refund amount
            </div>

            <strong>
              {money(purchase.totalPremium)}
            </strong>
          </div>
        </div>

        <div className="alert info">
          <Clock3 size={17} />

          <span>
            Refund requests are subject to backend
            eligibility checks. Submitting a request
            does not mean the refund is completed.
            The final amount and status are
            determined by the backend.
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
            disabled={
              submitting ||
              outcomeUncertain
            }
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
              setConfirmed(
                event.target.checked,
              )
            }
            disabled={
              submitting ||
              outcomeUncertain
            }
          />

          <span>
            I confirm that I want to request
            a refund for this purchase.
            I understand that refund processing
            may take additional time.
          </span>
        </label>

        {error && (
          <div
            className={
              outcomeUncertain
                ? 'alert info'
                : 'alert error'
            }
            role="alert"
          >
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {outcomeUncertain && (
          <div className="alert info">
            <ShieldCheck size={17} />

            <span>
              Another refund request is blocked
              in this session until the outcome
              can be verified. Check Refunds
              or contact support.
            </span>
          </div>
        )}
      </form>
    </Modal>
  )
}

/* =========================================================
   PURCHASE DETAILS

   Named export preserved.
========================================================= */

export function PurchaseDetail({
  p,
  onClose,
  onRequestRefund,
}) {
  if (!p) {
    return null
  }

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
                onClick={() =>
                  onRequestRefund(p)
                }
              >
                <RotateCcw size={16} />
                Request refund
              </Button>
            )}

          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div
        className="stack"
        style={{ gap: 18 }}
      >
        {/* PURCHASE SUMMARY */}

        <div className="ix-payment-detail-summary">
          <ShieldCheck size={24} />

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <h3>
              {p.coveredTypes ||
                'Insurance policy'}
            </h3>

            <p className="muted">
              Purchase #{p.purchaseId}

              {policyNumber != null
                ? ` · Policy #${policyNumber}`
                : ''}
            </p>
          </div>

          <StatusBadge
            value={
              p.paymentStatus ||
              'UNKNOWN'
            }
          />

          <PurchaseTypeBadge
            purchase={p}
          />
        </div>

        {/* RENEWAL INFORMATION */}

        {renewal && (
          <div className="alert info">
            <RefreshCw size={18} />

            <span>
              <strong>Policy renewal</strong>

              {renewalSource != null && (
                <>
                  {' '}— Renewed from policy{' '}
                  <strong>
                    #{renewalSource}
                  </strong>.
                </>
              )}

              {' '}This renewal has its own
              purchase and payment history.
            </span>
          </div>
        )}

        {/* PURCHASE INFORMATION */}

        <h4>Purchase information</h4>

        <Details
          items={[
            [
              'Purchase type',
              purchaseTypeLabel(p),
            ],
            [
              'Plan',
              p.coveredTypes || '—',
            ],
            [
              'Policy number',
              policyNumber != null
                ? `#${policyNumber}`
                : '—',
            ],
            ...(
              renewal
                ? [[
                    'Original policy',
                    renewalSource != null
                      ? `#${renewalSource}`
                      : '—',
                  ]]
                : []
            ),
            [
              'Customer',
              p.username || '—',
            ],
            [
              'Coverage',
              money(p.coverageAmount),
            ],
            [
              'Duration',
              p.durationYears != null
                ? `${p.durationYears} years`
                : '—',
            ],
            [
              'Purchase date',
              date(p.purchaseDate),
            ],
          ]}
        />

        <div className="divider" />

        {/* PREMIUM BREAKDOWN */}

        <h4>Premium breakdown</h4>

        <dl className="kv">
          <dt>Base premium</dt>
          <dd>
            {money(p.basePremium)}
          </dd>

          <dt>Discount</dt>
          <dd>
            −{money(p.discountAmount)}
          </dd>

          <dt>Taxable amount</dt>
          <dd>
            {money(p.taxableAmount)}
          </dd>

          <dt>
            GST ({p.gstRate ?? 0}%)
          </dt>
          <dd>
            {money(p.gstAmount)}
          </dd>

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
              <StatusBadge
                value={
                  p.paymentStatus ||
                  'UNKNOWN'
                }
              />,
            ],
            [
              'Payment method',
              p.paymentMethod || '—',
            ],
            [
              'Payment date',
              dateTime(
                p.paymentDateTime,
              ),
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
            [
              'Name',
              p.nomineeName || '—',
            ],
            [
              'Relationship',
              p.nomineeRelation || '—',
            ],
            [
              'Mobile',
              p.nomineeContact || '—',
            ],
          ]}
        />

        <div className="divider" />

        {/* REFUND DETAILS */}

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
              p.refundEligible === true
                ? 'Yes'
                : 'No',
            ],
            [
              'Refund amount',
              p.refundAmount != null
                ? money(p.refundAmount)
                : '—',
            ],
            [
              'Refund ID',
              p.refundId || '—',
            ],
            [
              'Refund reason',
              p.refundReason || '—',
            ],
            [
              'Refund activity',
              refundActivityDate(p)
                ? dateTime(
                    refundActivityDate(p),
                  )
                : '—',
            ],
          ]}
        />

        {/* ELIGIBLE */}

        {eligible && (
          <div
            className="alert info"
            role="status"
          >
            <Clock3 size={17} />

            <span>
              This purchase is eligible
              for a refund. Submit your
              request before the deadline.
            </span>
          </div>
        )}

        {/* NOT ELIGIBLE */}

        {isPaid(p) &&
          isRefundNotRequested(p) &&
          !eligible && (
            <div
              className="alert info"
              role="status"
            >
              <AlertCircle size={17} />

              <span>
                {refundEligibilityMessage(p)}
              </span>
            </div>
          )}

        {/* REFUND PENDING */}

        {pending && (
          <div
            className="alert info"
            role="status"
          >
            <Clock3 size={17} />

            <span>
              {normalizeStatus(
                p.refundStatus,
              ).includes('RECONCILIATION')
                ? 'Your refund is under verification. Do not submit another refund request.'
                : 'Your refund is awaiting final confirmation. The status will update when the backend records a change.'}
            </span>
          </div>
        )}

        {/* REFUNDED */}

        {refunded && (
          <div
            className="alert success"
            role="status"
          >
            <CheckCircle2 size={17} />

            <span>
              The InsureX backend reports
              this refund as completed.
              Bank or payment-method
              settlement timing may vary.
            </span>
          </div>
        )}

        {/* FAILED */}

        {failed && (
          <div
            className="alert error"
            role="status"
          >
            <AlertCircle size={17} />

            <span>
              This refund is marked as
              failed. Contact support
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

  /* =======================================================
     STATE
  ======================================================= */

  const [openId, setOpenId] = useState(null)

  const [
    refundPurchaseId,
    setRefundPurchaseId,
  ] = useState(null)

  const [refundError, setRefundError] =
    useState('')

  const [pageError, setPageError] =
    useState('')

  const [submitting, setSubmitting] =
    useState(false)

  const [
    uncertainRefundIds,
    setUncertainRefundIds,
  ] = useState(() => new Set())

  const refundRequestLock = useRef(false)

  /* =======================================================
     FETCH PURCHASES

     Poll only when a refund is unresolved.
  ======================================================= */

  const q = useQuery({
    queryKey: ['my-purchases'],

    queryFn: purchases.mine,

    staleTime: 10_000,

    refetchOnMount: 'always',

    refetchOnWindowFocus: true,

    refetchOnReconnect: true,

    refetchInterval: (query) => {
      const currentPurchases =
        normalizePurchases(
          query.state.data,
        )

      return currentPurchases.some(
        isRefundPending,
      )
        ? REFUND_POLL_INTERVAL
        : false
    },

    refetchIntervalInBackground: false,
  })

  /* =======================================================
     NORMALIZED PURCHASE DATA
  ======================================================= */

  const allPurchases = useMemo(
    () => normalizePurchases(q.data),
    [q.data],
  )

  /* =======================================================
     FILTER AND SORT
  ======================================================= */

  const [
    search,
    setSearch,
    filteredRows,
  ] = useFilter(
    allPurchases,
    FIELDS,
  )

  const rows = useMemo(
    () =>
      (filteredRows || [])
        .slice()
        .sort(
          (a, b) =>
            Number(
              b.purchaseId || 0,
            ) -
            Number(
              a.purchaseId || 0,
            ),
        ),
    [filteredRows],
  )

  /* =======================================================
     LIVE MODAL DATA

     Use latest query results, not old snapshots.
  ======================================================= */

  const open = useMemo(
    () =>
      allPurchases.find(
        (purchase) =>
          String(purchase.purchaseId) ===
          String(openId),
      ) || null,
    [allPurchases, openId],
  )

  const refundPurchase = useMemo(
    () =>
      allPurchases.find(
        (purchase) =>
          String(purchase.purchaseId) ===
          String(refundPurchaseId),
      ) || null,
    [allPurchases, refundPurchaseId],
  )

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let totalPaid = 0
    let refundCount = 0
    let renewalCount = 0
    let pendingCount = 0

    for (const purchase of allPurchases) {
      if (isPaid(purchase)) {
        const amount = Number(
          purchase.totalPremium || 0,
        )

        if (Number.isFinite(amount)) {
          totalPaid += amount
        }
      }

      if (hasRefundActivity(purchase)) {
        refundCount += 1
      }

      if (isRenewalPurchase(purchase)) {
        renewalCount += 1
      }

      if (isRefundPending(purchase)) {
        pendingCount += 1
      }
    }

    return {
      totalPaid,
      refundCount,
      renewalCount,
      pendingCount,
    }
  }, [allPurchases])

  /* =======================================================
     RELATED QUERY INVALIDATION
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

      await queryClient.invalidateQueries({
        queryKey: ['my-policies'],
        refetchType: 'active',
      })
    } catch (error) {
      setPageError(
        errorMessage(
          error,
          'Unable to refresh payment history.',
        ),
      )
    }
  }

  /* =======================================================
     REFUND REQUEST

     IMPORTANT:
     Never automatically retry a financial mutation.

     Network timeout or HTTP 5xx may mean the backend
     processed the request but the response was lost.
  ======================================================= */

  async function submitRefund({
    purchaseId,
    refundReason,
  }) {
    if (
      refundRequestLock.current ||
      submitting
    ) {
      return
    }

    const purchaseKey = String(purchaseId)

    if (
      uncertainRefundIds.has(purchaseKey)
    ) {
      setRefundError(
        'The previous refund request outcome is not confirmed. Check its status before taking further action.',
      )
      return
    }

    const currentPurchase =
      allPurchases.find(
        (purchase) =>
          String(purchase.purchaseId) ===
          purchaseKey,
      )

    if (
      !currentPurchase ||
      !canRequestRefund(currentPurchase)
    ) {
      setRefundError(
        'This purchase is no longer confirmed as eligible for a refund. Refresh and check its latest status.',
      )
      return
    }

    const cleanReason = String(
      refundReason ?? '',
    ).trim()

    if (
      !cleanReason ||
      cleanReason.length > 500
    ) {
      setRefundError(
        'Enter a refund reason of up to 500 characters.',
      )
      return
    }

    refundRequestLock.current = true

    setSubmitting(true)
    setRefundError('')
    setPageError('')

    try {
      const result = await purchases.refund(
        purchaseId,
        {
          refundReason: cleanReason,
        },
      )

      if (result?.success === false) {
        throw new Error(
          result.message ||
          'The backend rejected the refund request.',
        )
      }

      setRefundPurchaseId(null)
      setOpenId(null)

      try {
        await invalidateRelatedData()
      } catch (refreshError) {
        console.error(
          'Refund submitted but data refresh failed:',
          refreshError,
        )
      }

      navigate('/app/refunds', {
        state: {
          purchaseId,
          refundRequested: true,
          message:
            result?.message ||
            'Your refund request has been submitted. Track its verified status here.',
        },
      })
    } catch (error) {
      console.error(
        'InsureX refund request error:',
        error,
      )

      if (isUncertainRefundError(error)) {
        setUncertainRefundIds((current) => {
          const next = new Set(current)
          next.add(purchaseKey)
          return next
        })

        setRefundError(
          'The refund outcome could not be confirmed. Do not submit another request. Refresh the status or contact support.',
        )

        try {
          await invalidateRelatedData()
        } catch {
          // Preserve the uncertainty warning.
        }
      } else {
        setRefundError(
          errorMessage(
            error,
            'Unable to submit refund request.',
          ),
        )
      }
    } finally {
      refundRequestLock.current = false
      setSubmitting(false)
    }
  }

  /* =======================================================
     REFUND ELIGIBILITY CHANGES

     A refresh can change eligibility while
     the refund modal is open.
  ======================================================= */

  useEffect(() => {
    if (
      refundPurchaseId == null ||
      !refundPurchase ||
      submitting
    ) {
      return
    }

    if (
      !canRequestRefund(refundPurchase) &&
      !uncertainRefundIds.has(
        String(refundPurchaseId),
      )
    ) {
      setRefundError(
        'Refund eligibility has changed. Close this dialog and check the latest purchase status.',
      )
    }
  }, [
    refundPurchaseId,
    refundPurchase,
    submitting,
    uncertainRefundIds,
  ])

  /* =======================================================
     OPEN REFUND MODAL
  ======================================================= */

  function openRefundModal(purchase) {
    const purchaseKey = String(
      purchase.purchaseId,
    )

    if (
      uncertainRefundIds.has(purchaseKey)
    ) {
      setPageError(
        'This refund request has an uncertain outcome. Check Refunds or contact support before submitting anything again.',
      )
      return
    }

    if (!canRequestRefund(purchase)) {
      return
    }

    setRefundError('')
    setOpenId(null)

    setRefundPurchaseId(
      purchase.purchaseId,
    )
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* PAGE HEADER */}

      <PageHeader
        title="Payments"
        subtitle="Review insurance purchases, renewals, payment receipts, and refund status."
      >
        <Button
          onClick={() =>
            navigate('/app/refunds')
          }
        >
          <RotateCcw size={16} />
          Refunds
        </Button>
      </PageHeader>

      {/* PAGE ERROR */}

      {pageError && (
        <div
          className="alert error"
          role="alert"
        >
          <AlertCircle size={17} />

          <span>
            {pageError}
          </span>

          <Button
            size="sm"
            onClick={() =>
              setPageError('')
            }
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* PENDING REFUND INFORMATION */}

      {summary.pendingCount > 0 && (
        <div
          className="alert info"
          role="status"
          style={{
            marginBottom: 16,
          }}
        >
          <RefreshCw size={17} />

          <span>
            {summary.pendingCount} refund
            {summary.pendingCount === 1
              ? ' is'
              : 's are'}{' '}
            awaiting completion or verification.
            Statuses refresh automatically
            while this page is open.
          </span>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="ix-payment-summary-grid">
        <Panel>
          <div className="payment-summary">
            <FileText size={22} />

            <div>
              <div className="muted">
                Purchases
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : allPurchases.length}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <CreditCard size={22} />

            <div>
              <div className="muted">
                Total paid
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : money(summary.totalPaid)}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <RefreshCw size={22} />

            <div>
              <div className="muted">
                Renewals
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.renewalCount}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <RotateCcw size={22} />

            <div>
              <div className="muted">
                Refund requests
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.refundCount}
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
          border: 1px solid
            var(--line, #e3e9e8);
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
          min-width: 0;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
        }

        .ix-payments-table-scroll .table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
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
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
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

        @media (max-width: 380px) {
          .ix-payment-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* PURCHASE HISTORY */}

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search purchases, policies or transactions"
          />

          <Button
            onClick={refreshPurchases}
            disabled={
              q.isFetching ||
              submitting
            }
          >
            <RefreshCw size={15} />

            {q.isFetching
              ? 'Refreshing…'
              : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No payments yet',
            text: 'Your insurance purchases and payment receipts will appear here.',
          }}
        >
          {() =>
            rows.length === 0 ? (
              <div
                className="empty"
                style={{
                  padding: 28,
                  textAlign: 'center',
                }}
              >
                <h4>
                  No matching purchases
                </h4>

                <p className="muted">
                  Try another search term.
                </p>

                <Button
                  onClick={() =>
                    setSearch('')
                  }
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div
                className="ix-payments-table-scroll"
                role="region"
                aria-label="Payments history table"
                tabIndex={0}
              >
                <Table
                  rowKey="purchaseId"
                  rows={rows}
                  onRowClick={(p) =>
                    setOpenId(p.purchaseId)
                  }
                  columns={[
                    {
                      key: 'purchaseId',
                      header: 'Purchase',
                      render: (p) => (
                        <div className="purchase-ref">
                          <b>
                            #{p.purchaseId}
                          </b>

                          <span>
                            {date(
                              p.purchaseDate,
                            )}
                          </span>
                        </div>
                      ),
                    },

                    {
                      key: 'coveredTypes',
                      header: 'Insurance plan',
                      render: (p) => (
                        <div className="purchase-plan">
                          <b>
                            {p.coveredTypes ||
                              'Insurance'}
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
                        <PurchaseTypeBadge
                          purchase={p}
                        />
                      ),
                    },

                    {
                      key: 'coverageAmount',
                      header: 'Coverage',
                      render: (p) =>
                        inrShort(
                          p.coverageAmount,
                        ),
                    },

                    {
                      key: 'totalPremium',
                      header: 'Paid',
                      render: (p) => (
                        <b>
                          {money(
                            p.totalPremium,
                          )}
                        </b>
                      ),
                    },

                    {
                      key: 'paymentDateTime',
                      header: 'Payment date',
                      render: (p) =>
                        dateTime(
                          p.paymentDateTime,
                        ),
                    },

                    {
                      key: 'paymentStatus',
                      header: 'Payment',
                      render: (p) => (
                        <StatusBadge
                          value={
                            p.paymentStatus ||
                            'UNKNOWN'
                          }
                        />
                      ),
                    },

                    {
                      key: 'refundStatus',
                      header: 'Refund',
                      render: (p) => (
                        <RefundStatus
                          purchase={p}
                        />
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

                              setOpenId(
                                p.purchaseId,
                              )
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
                                  !canRequestRefund(p) ||
                                  uncertainRefundIds.has(
                                    String(p.purchaseId),
                                  )
                                }
                                onClick={(event) => {
                                  event?.stopPropagation?.()

                                  openRefundModal(p)
                                }}
                              >
                                {uncertainRefundIds.has(
                                  String(p.purchaseId),
                                )
                                  ? 'Verify status'
                                  : canRequestRefund(p)
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
            )
          }
        </DataState>
      </Panel>

      {/* PURCHASE DETAILS */}

      {open && (
        <PurchaseDetail
          p={open}
          onClose={() =>
            setOpenId(null)
          }
          onRequestRefund={
            uncertainRefundIds.has(
              String(open.purchaseId),
            )
              ? undefined
              : openRefundModal
          }
        />
      )}

      {/* REFUND REQUEST MODAL */}

      {refundPurchase && (
        <RefundModal
          key={refundPurchase.purchaseId}
          purchase={refundPurchase}
          onClose={() => {
            if (submitting) {
              return
            }

            setRefundPurchaseId(null)
            setRefundError('')
          }}
          onSubmit={submitRefund}
          submitting={submitting}
          error={refundError}
          outcomeUncertain={
            uncertainRefundIds.has(
              String(refundPurchase.purchaseId),
            )
          }
        />
      )}
    </>
  )
}

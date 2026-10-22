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
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
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
      <div
        className="stack"
        style={{
          gap: 18,
        }}
      >
        {/* ===============================================
            POLICY SUMMARY
        =============================================== */}

        <div className="ix-refunds-detail-header">
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
      <style>{`
        /* ===============================================
           INSUREX REFUNDS — RESPONSIVE STYLES
        =============================================== */

        .ix-refunds-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ix-refunds-toolbar > * {
          max-width: 100%;
        }

        .ix-refunds-summary {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-refunds-table {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .ix-refunds-table .table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ix-refunds-table table {
          width: 100%;
          min-width: 1020px;
          table-layout: fixed;
          border-collapse: collapse;
        }

        .ix-refunds-table th,
        .ix-refunds-table td {
          box-sizing: border-box;
          padding: 16px 14px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .ix-refunds-table th:nth-child(1),
        .ix-refunds-table td:nth-child(1) {
          width: 9%;
        }

        .ix-refunds-table th:nth-child(2),
        .ix-refunds-table td:nth-child(2) {
          width: 23%;
        }

        .ix-refunds-table th:nth-child(3),
        .ix-refunds-table td:nth-child(3) {
          width: 14%;
        }

        .ix-refunds-table th:nth-child(4),
        .ix-refunds-table td:nth-child(4) {
          width: 15%;
        }

        .ix-refunds-table th:nth-child(5),
        .ix-refunds-table td:nth-child(5) {
          width: 16%;
        }

        .ix-refunds-table th:nth-child(6),
        .ix-refunds-table td:nth-child(6) {
          width: 13%;
        }

        .ix-refunds-table th:nth-child(7),
        .ix-refunds-table td:nth-child(7) {
          width: 10%;
          text-align: right;
        }

        .ix-refunds-purchase {
          display: block;
          font-weight: 700;
        }

        .ix-refunds-plan {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          min-width: 0;
        }

        .ix-refunds-plan strong {
          display: block;
          font-weight: 700;
          white-space: nowrap;
        }

        .ix-refunds-plan .muted {
          display: block;
          font-size: 13px;
          white-space: nowrap;
        }

        .ix-refunds-amount,
        .ix-refunds-updated {
          display: inline-block;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .ix-refunds-status {
          display: inline-flex;
          white-space: nowrap;
        }

        .ix-refunds-status * {
          white-space: nowrap !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
        }

        .ix-refunds-action {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          white-space: nowrap;
        }

        .ix-refunds-action button {
          white-space: nowrap;
          flex-shrink: 0;
        }

        .ix-refunds-detail-header {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px;
          border: 1px solid
            var(--line, #e3e9e8);
          border-radius: 14px;
        }

        @keyframes ixRefundSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .ix-refunds-spin {
          animation:
            ixRefundSpin 0.9s linear infinite;
        }

        @media (max-width: 700px) {
          .ix-refunds-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .ix-refunds-table table {
            min-width: 940px;
          }

          .ix-refunds-table th,
          .ix-refunds-table td {
            padding: 12px 11px;
          }
        }

        @media (max-width: 380px) {
          .ix-refunds-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-refunds-spin {
            animation: none;
          }
        }

        /* =====================================================
           INSUREX — PREMIUM EMERALD REFUNDS EXPERIENCE
           Visual-only overrides: all financial logic unchanged.
        ===================================================== */
        @keyframes ixRefundReveal {
          from { opacity:0; transform:translateY(18px) scale(.975); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes ixRefundFloat {
          0%,100% { transform:translateY(0) rotate(-3deg); }
          50% { transform:translateY(-5px) rotate(4deg); }
        }
        @keyframes ixRefundShimmer {
          from { transform:translateX(-180%) skewX(-16deg); }
          to { transform:translateX(460%) skewX(-16deg); }
        }
        .ix-refunds-summary > * {
          position:relative; isolation:isolate; overflow:hidden;
          border:1px solid #bfe4ce !important; border-radius:18px !important;
          background:linear-gradient(145deg,#fff 5%,#edf9f1 100%) !important;
          box-shadow:0 7px 22px rgba(16,103,63,.08);
          animation:ixRefundReveal .6s cubic-bezier(.2,.8,.2,1) both;
          transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease;
        }
        .ix-refunds-summary > :nth-child(2) { animation-delay:80ms; }
        .ix-refunds-summary > :nth-child(3) { animation-delay:160ms; }
        .ix-refunds-summary > :nth-child(4) { animation-delay:240ms; }
        .ix-refunds-summary > *::before {
          content:''; position:absolute; inset:0 auto 0 -35%; width:24%;
          background:linear-gradient(90deg,transparent,rgba(65,194,121,.15),transparent);
          transform:translateX(-180%) skewX(-16deg); pointer-events:none;
        }
        .ix-refunds-summary > *:hover::before { animation:ixRefundShimmer .95s ease-out; }
        .ix-refunds-summary > *:hover {
          transform:translateY(-6px); border-color:#37a46b !important;
          box-shadow:0 18px 34px rgba(16,103,63,.16);
        }
        .ix-refunds-summary .payment-summary { color:#17744a !important; gap:13px; }
        .ix-refunds-summary .payment-summary svg {
          color:#158250; animation:ixRefundFloat 4s ease-in-out infinite;
          flex-shrink:0;
        }
        .ix-refunds-summary .payment-summary strong {
          color:#0b432d !important; font-size:clamp(22px,2.4vw,29px);
          font-weight:800; font-variant-numeric:tabular-nums;
        }
        .ix-refunds-summary .payment-summary .muted { color:#466b58 !important; opacity:1 !important; }
        .ix-refunds-toolbar {
          padding:17px 18px !important;
          background:linear-gradient(115deg,#f3fbf5,#e8f7ee);
          border-bottom:1px solid #cbe7d6;
        }
        .ix-refunds-toolbar select {
          border:1px solid #a9d7bd !important;
          background:#fff !important; color:#174b34 !important;
          border-radius:12px !important; font-weight:650;
          transition:border-color .2s ease,box-shadow .2s ease;
        }
        .ix-refunds-toolbar select:focus-visible {
          outline:2px solid #138250; outline-offset:2px;
        }
        .ix-refunds-toolbar button:not(:disabled) {
          transition:transform .22s ease,box-shadow .22s ease;
        }
        .ix-refunds-toolbar button:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 7px 18px rgba(20,117,70,.13); }
        .ix-refunds-table { animation:ixRefundReveal .58s ease both; }
        .ix-refunds-table table { color:#1a4332; }
        .ix-refunds-table thead th {
          background:#e8f6ed !important; color:#205a3d !important;
          border-bottom:1px solid #bfdfcb !important;
          font-size:12px; font-weight:800; letter-spacing:.02em;
        }
        .ix-refunds-table tbody tr { transition:background-color .2s ease,box-shadow .2s ease; }
        .ix-refunds-table tbody tr:nth-child(even) { background:#f8fcf9; }
        .ix-refunds-table tbody tr:hover { background:#e9f8ef !important; }
        .ix-refunds-table tbody td { border-bottom-color:#e0eee5 !important; }
        .ix-refunds-purchase,.ix-refunds-plan strong { color:#0c4b30 !important; }
        .ix-refunds-plan .muted { color:#527460 !important; opacity:1 !important; }
        .ix-refunds-amount { color:#124c34; font-weight:750; }
        .ix-refunds-detail-header {
          background:linear-gradient(120deg,#ecf9f1,#fff);
          border:1px solid #bfe4cd !important; color:#15452f;
          border-radius:17px !important; box-shadow:0 5px 18px rgba(19,103,64,.06);
          animation:ixRefundReveal .5s ease both;
        }
        .ix-refunds-detail-header svg { color:#178451 !important; }
        .ix-refunds-detail-header h3 { color:#10452d; }
        .ix-refunds-detail-header .muted { color:#54705d !important; opacity:1 !important; }
        .ix-refunds-action button:not(:disabled) { transition:transform .2s ease,box-shadow .2s ease; }
        .ix-refunds-action button:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 7px 16px rgba(16,111,65,.15); }
        @media(max-width:700px) {
          .ix-refunds-summary { gap:10px; }
          .ix-refunds-toolbar { padding:12px !important; }
          .ix-refunds-toolbar > * { min-width:0; }
          .ix-refunds-detail-header { padding:13px; }
        }
        @media(prefers-reduced-motion:reduce) {
          .ix-refunds-summary > *, .ix-refunds-summary .payment-summary svg,
          .ix-refunds-table,.ix-refunds-detail-header,.ix-refunds-summary > *::before {
            animation:none !important; transition:none !important;
          }
          .ix-refunds-summary > *:hover,.ix-refunds-toolbar button:not(:disabled):hover,
          .ix-refunds-action button:not(:disabled):hover { transform:none !important; }
        }
      `}</style>

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

      {requestedPurchaseId != null && (
        <div className="alert info">
          <Clock3 size={17} />

          <span>
            Refund request submitted for
            purchase #{requestedPurchaseId}.
            The status shown below comes
            from the backend and may take
            time to update.
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
              background:
                'var(--surface, #fff)',
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
            ) : filteredRows.length === 0 ? (
              <div
                style={{
                  padding: 28,
                  textAlign: 'center',
                }}
              >
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

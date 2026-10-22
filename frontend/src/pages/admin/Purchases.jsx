import { useMemo, useState } from 'react'

import {
  useQuery,
} from '@tanstack/react-query'

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

import { purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  DataState,
  PageHeader,
  Panel,
  SearchBox,
  Segmented,
  StatusBadge,
  Table,
  useFilter,
} from '../../components/ui'

import {
  dateTime,
  inr,
  inr2,
  inrShort,
} from '../../lib/format'

import {
  PurchaseDetail,
} from '../customer/MyPurchases'

/* =========================================================
   INSUREX — ADMIN PURCHASES

   All Customer Purchases
   Payment History
   Policy Renewals
   Refund Status Tracking
   Refund Reconciliation Visibility
   Financial Summary
   Automatic Refresh
   Responsive Layout

   BACKEND:
   GET /policy/getAllPurchases
   (Uses existing purchases.getAll endpoint)
========================================================= */

/* =========================================================
   SEARCH FIELDS
========================================================= */

const FIELDS = [
  'purchaseId',
  'username',
  'coveredTypes',
  'transactionId',
  'paymentStatus',
  'policyNumber',
  'refundStatus',
  'refundId',
  'razorpayPaymentId',
  'purchaseType',
]

const REFUND_POLL_INTERVAL = 15_000

/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {
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

function safeAmount(value) {
  const amount = Number(value)

  return Number.isFinite(amount)
    ? Math.max(0, amount)
    : 0
}

function isPaid(purchase) {
  return normalize(
    purchase?.paymentStatus,
  ) === 'PAID'
}

function getRefundStatus(purchase) {
  const status = normalize(
    purchase?.refundStatus,
  )

  if (
    status === 'REFUNDED' ||
    status === 'FULLY_REFUNDED'
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
    status === 'REFUND_REQUIRES_RECONCILIATION' ||
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
    status === 'PENDING' ||
    status === 'REQUESTED'
  ) {
    return 'PENDING'
  }

  return 'NONE'
}

function isRefundPending(purchase) {
  return [
    'PENDING',
    'PROCESSING',
    'RECONCILIATION',
  ].includes(getRefundStatus(purchase))
}

function hasRefundActivity(purchase) {
  return (
    getRefundStatus(purchase) !== 'NONE' ||
    Boolean(purchase?.refundId) ||
    Boolean(purchase?.refundReason) ||
    Boolean(purchase?.refundDateTime)
  )
}

function getConfirmedRefundAmount(purchase) {
  if (getRefundStatus(purchase) !== 'REFUNDED') {
    return 0
  }

  const paid = safeAmount(
    purchase.totalPremium,
  )

  const reported = purchase.refundAmount

  if (reported != null && reported !== '') {
    return Math.min(
      paid,
      safeAmount(reported),
    )
  }

  // Only use the full premium as a fallback for
  // a backend-confirmed full refund.
  if (
    normalize(purchase.refundStatus) ===
    'FULLY_REFUNDED'
  ) {
    return paid
  }

  return 0
}

/* =========================================================
   REFUND BADGE
========================================================= */

function RefundBadge({ purchase }) {
  const status = getRefundStatus(purchase)

  switch (status) {
    case 'REFUNDED':
      return (
        <StatusBadge
          value="REFUNDED"
          label="Refunded"
        />
      )

    case 'FAILED':
      return (
        <StatusBadge
          value="FAILED"
          label="Refund failed"
        />
      )

    case 'RECONCILIATION':
      return (
        <StatusBadge
          value="PENDING"
          label="Under verification"
        />
      )

    case 'PROCESSING':
      return (
        <StatusBadge
          value="PENDING"
          label="Processing"
        />
      )

    case 'PENDING':
      return (
        <StatusBadge
          value="PENDING"
          label="Pending"
        />
      )

    default:
      return (
        <StatusBadge
          value="NOT_REFUNDED"
          label="Not refunded"
        />
      )
  }
}

/* =========================================================
   ADMIN PURCHASES PAGE
========================================================= */

export default function Purchases() {
  /* =======================================================
     STATE
  ======================================================= */

  const [openId, setOpenId] = useState(null)

  const [filter, setFilter] = useState('all')

  const [pageError, setPageError] = useState('')

  /* =======================================================
     FETCH ALL PURCHASES

     Uses the existing admin endpoint.

     Automatic polling occurs only when the
     backend reports unresolved refunds.
  ======================================================= */

  const q = useQuery({
    queryKey: ['a-purchases'],

    queryFn: purchases.getAll,

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
     NORMALIZE PURCHASE DATA
  ======================================================= */

  const purchaseList = useMemo(
    () => normalizePurchases(q.data),
    [q.data],
  )

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    search,
    setSearch,
    searched,
  ] = useFilter(
    purchaseList,
    FIELDS,
  )

  /* =======================================================
     FILTER AND SORT
  ======================================================= */

  const rows = useMemo(() => {
    return (searched || [])
      .filter((purchase) => {
        const status = getRefundStatus(
          purchase,
        )

        switch (filter) {
          case 'refunded':
            return status === 'REFUNDED'

          case 'pending':
            return [
              'PENDING',
              'PROCESSING',
              'RECONCILIATION',
            ].includes(status)

          case 'failed':
            return status === 'FAILED'

          case 'kept':
            return !hasRefundActivity(
              purchase,
            )

          default:
            return true
        }
      })
      .slice()
      .sort(
        (a, b) =>
          Number(b.purchaseId || 0) -
          Number(a.purchaseId || 0),
      )
  }, [
    searched,
    filter,
  ])

  /* =======================================================
     SELECTED PURCHASE

     Always uses the latest query data so that
     the details modal updates after refresh.
  ======================================================= */

  const open = useMemo(() => {
    if (openId == null) {
      return null
    }

    return (
      purchaseList.find(
        (purchase) =>
          String(purchase.purchaseId) ===
          String(openId),
      ) || null
    )
  }, [
    purchaseList,
    openId,
  ])

  /* =======================================================
     FINANCIAL SUMMARY

     Only paid purchases contribute to gross premium.

     Only confirmed refund amounts are subtracted.

     Pending and processing refunds are not counted
     as completed refunds.
  ======================================================= */

  const summary = useMemo(() => {
    let grossPremium = 0
    let confirmedRefunds = 0
    let totalCover = 0

    let refundedCount = 0
    let pendingCount = 0
    let failedCount = 0
    let refundRequestCount = 0

    for (const purchase of purchaseList) {
      if (isPaid(purchase)) {
        grossPremium += safeAmount(
          purchase.totalPremium,
        )

        totalCover += safeAmount(
          purchase.coverageAmount,
        )
      }

      if (hasRefundActivity(purchase)) {
        refundRequestCount += 1
      }

      const status = getRefundStatus(
        purchase,
      )

      if (status === 'REFUNDED') {
        refundedCount += 1

        confirmedRefunds +=
          getConfirmedRefundAmount(
            purchase,
          )
      }

      if (
        status === 'PENDING' ||
        status === 'PROCESSING' ||
        status === 'RECONCILIATION'
      ) {
        pendingCount += 1
      }

      if (status === 'FAILED') {
        failedCount += 1
      }
    }

    return {
      purchases: purchaseList.length,

      grossPremium,

      confirmedRefunds,

      netPremium:
        grossPremium - confirmedRefunds,

      totalCover,

      refundedCount,

      pendingCount,

      failedCount,

      refundRequestCount,
    }
  }, [purchaseList])

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
      setPageError(
        errorMessage(
          error,
          'Unable to refresh purchase history.',
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
        title="Purchases"
        subtitle="Monitor customer payments, policy purchases, renewals, and refund processing."
      >
        <Button
          onClick={refreshPurchases}
          disabled={q.isFetching}
        >
          <RefreshCw
            size={16}
            className={
              q.isFetching
                ? 'ix-admin-purchases-spin'
                : ''
            }
          />

          {q.isFetching
            ? 'Refreshing...'
            : 'Refresh'}
        </Button>
      </PageHeader>

      {/* ===================================================
          ERROR MESSAGE
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
          PENDING REFUND INFORMATION
      =================================================== */}

      {summary.pendingCount > 0 && (
        <div
          className="alert info"
          role="status"
          style={{
            marginBottom: 18,
          }}
        >
          <Clock3 size={18} />

          <span>
            <strong>
              {summary.pendingCount} refund
              {summary.pendingCount === 1
                ? ''
                : 's'}
            </strong>
            {' '}awaiting processing or
            reconciliation.

            {' '}Statuses are refreshed
            automatically while this page
            is open.
          </span>
        </div>
      )}

      {/* ===================================================
          SUMMARY CARDS
      =================================================== */}

      <div className="ix-admin-purchases-summary">
        <Panel>
          <div className="payment-summary">
            <CreditCard size={23} />

            <div>
              <div className="muted">
                Total purchases
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : summary.purchases}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <Wallet size={23} />

            <div>
              <div className="muted">
                Net premium
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : inr(summary.netPremium)}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <ShieldCheck size={23} />

            <div>
              <div className="muted">
                Cover sold
              </div>

              <strong>
                {q.isPending
                  ? '…'
                  : inrShort(
                      summary.totalCover,
                    )}
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
                  : summary.refundedCount}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* ===================================================
          ADDITIONAL REFUND SUMMARY
      =================================================== */}

      <div className="ix-admin-refund-summary">
        <div>
          <span className="muted">
            Gross premium
          </span>

          <strong>
            {inr(summary.grossPremium)}
          </strong>
        </div>

        <div>
          <span className="muted">
            Confirmed refunds
          </span>

          <strong>
            {inr(summary.confirmedRefunds)}
          </strong>
        </div>

        <div>
          <span className="muted">
            Refund requests
          </span>

          <strong>
            {summary.refundRequestCount}
          </strong>
        </div>

        <div>
          <span className="muted">
            Pending
          </span>

          <strong>
            {summary.pendingCount}
          </strong>
        </div>

        <div>
          <span className="muted">
            Failed
          </span>

          <strong>
            {summary.failedCount}
          </strong>
        </div>
      </div>

      {/* ===================================================
          RESPONSIVE STYLES
      =================================================== */}

      <style>{`
        .ix-admin-purchases-summary {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .ix-admin-refund-summary {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid
            var(--line, #e3e9e8);
          border-radius: 14px;
          background:
            var(--surface, #fff);
        }

        .ix-admin-refund-summary > div {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .ix-admin-refund-summary strong {
          font-size: 16px;
          font-weight: 750;
          font-variant-numeric:
            tabular-nums;
        }

        .ix-admin-purchases-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ix-admin-purchases-table {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .ix-admin-purchases-table .table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ix-admin-purchases-table table {
          width: 100%;
          min-width: 1160px;
          border-collapse: collapse;
        }

        .ix-admin-purchases-table th,
        .ix-admin-purchases-table td {
          padding: 14px 15px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .ix-admin-purchases-customer {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .ix-admin-purchases-customer strong {
          font-weight: 700;
        }

        .ix-admin-purchases-customer span {
          font-size: 12px;
        }

        .ix-admin-purchases-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .ix-admin-purchases-actions button {
          white-space: nowrap;
          flex-shrink: 0;
        }

        @keyframes ixAdminPurchasesSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .ix-admin-purchases-spin {
          animation:
            ixAdminPurchasesSpin 0.9s
            linear infinite;
        }

        @media (max-width: 700px) {
          .ix-admin-purchases-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .ix-admin-refund-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .ix-admin-purchases-table table {
            min-width: 1060px;
          }
        }

        @media (max-width: 380px) {
          .ix-admin-purchases-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-admin-purchases-spin {
            animation: none;
          }
        }
      `}</style>

      {/* ===================================================
          PURCHASES TABLE
      =================================================== */}

      <Panel flush>
        <div className="toolbar ix-admin-purchases-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search customer, policy, plan, transaction or refund"
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
                value: 'refunded',
                label: 'Refunded',
              },
              {
                value: 'pending',
                label: 'Pending',
              },
              {
                value: 'failed',
                label: 'Failed',
              },
              {
                value: 'kept',
                label: 'Not refunded',
              },
            ]}
          />
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No purchases yet',
            text: 'Purchases appear here after customers pay.',
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
                <RotateCcw
                  size={28}
                  style={{
                    opacity: 0.6,
                    marginBottom: 10,
                  }}
                />

                <h4>
                  No matching purchases
                </h4>

                <p className="muted">
                  Try changing the search
                  term or refund filter.
                </p>

                <Button
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className="ix-admin-purchases-table"
                role="region"
                aria-label="Admin purchase history"
                tabIndex={0}
              >
                <Table
                  rowKey="purchaseId"
                  rows={rows}
                  onRowClick={(purchase) =>
                    setOpenId(
                      purchase.purchaseId,
                    )
                  }
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
                      key: 'username',
                      header: 'Customer',
                      render: (p) => (
                        <div className="ix-admin-purchases-customer">
                          <strong>
                            {p.username || '—'}
                          </strong>

                          {p.policyNumber && (
                            <span className="muted">
                              Policy #{p.policyNumber}
                            </span>
                          )}
                        </div>
                      ),
                    },

                    {
                      key: 'coveredTypes',
                      header: 'Plan',
                      render: (p) =>
                        p.coveredTypes ||
                        'Insurance',
                    },

                    {
                      key: 'coverageAmount',
                      header: 'Cover',
                      render: (p) =>
                        inrShort(
                          p.coverageAmount,
                        ),
                    },

                    {
                      key: 'totalPremium',
                      header: 'Paid',
                      render: (p) => (
                        <strong>
                          {inr2(
                            p.totalPremium,
                          )}
                        </strong>
                      ),
                    },

                    {
                      key: 'paymentDateTime',
                      header: 'Paid at',
                      render: (p) => (
                        <span
                          title={
                            p.paymentDateTime
                              ? String(
                                  p.paymentDateTime,
                                )
                              : undefined
                          }
                        >
                          {dateTime(
                            p.paymentDateTime,
                          )}
                        </span>
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
                        <RefundBadge
                          purchase={p}
                        />
                      ),
                    },

                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      render: (p) => (
                        <div className="ix-admin-purchases-actions">
                          <Button
                            type="button"
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

      {/* ===================================================
          PURCHASE DETAILS

          Existing PurchaseDetail export reused.

          No refund submission is available to admin.
      =================================================== */}

      {open && (
        <PurchaseDetail
          p={open}
          onClose={() =>
            setOpenId(null)
          }
        />
      )}
    </>
  )
}

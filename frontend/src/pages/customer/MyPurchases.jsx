
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import {
  AlertCircle,
  CreditCard,
  FileText,
  RotateCcw,
  ShieldCheck,
  Receipt,
  ArrowRight,
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
  date,
  dateTime,
  inr2,
  inrShort,
} from '../../lib/format'

/* =========================================================
   INSUREX — CUSTOMER PAYMENTS

   Purchase History
   Payment Receipts
   Premium Breakdown
   Transaction Details
   Refunds Navigation

   Refund submissions are managed separately:
   /app/refunds
========================================================= */

/* =========================================================
   HELPERS
========================================================= */

const FIELDS = [
  'purchaseId',
  'policyNumber',
  'coveredTypes',
  'transactionId',
  'paymentStatus',
  'paymentMethod',
  'razorpayPaymentId',
]

function money(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  const amount = Number(value)

  return Number.isFinite(amount)
    ? inr2(amount)
    : '—'
}

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function isPaid(purchase) {
  return normalizeStatus(
    purchase?.paymentStatus,
  ) === 'PAID'
}

function isRefundPending(purchase) {
  return [
    'PENDING',
    'REFUND_PENDING',
    'PROCESSING',
    'REFUND_PROCESSING',
    'REQUIRES_RECONCILIATION',
    'REFUND_REQUIRES_RECONCILIATION',
  ].includes(
    normalizeStatus(purchase?.refundStatus),
  )
}

function isRefunded(purchase) {
  return [
    'REFUNDED',
    'FULLY_REFUNDED',
    'PROCESSED',
  ].includes(
    normalizeStatus(purchase?.refundStatus),
  )
}

function refundStatusLabel(value) {
  const status = normalizeStatus(value)

  if (!status || status === 'NOT_REFUNDED') {
    return 'Not refunded'
  }

  if (
    status === 'PENDING' ||
    status === 'REFUND_PENDING'
  ) {
    return 'Refund pending'
  }

  if (
    status === 'PROCESSING' ||
    status === 'REFUND_PROCESSING'
  ) {
    return 'Processing'
  }

  if (
    status === 'REQUIRES_RECONCILIATION' ||
    status === 'REFUND_REQUIRES_RECONCILIATION'
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

  if (
    status === 'FAILED' ||
    status === 'REFUND_FAILED'
  ) {
    return 'Refund failed'
  }

  return String(value).replaceAll('_', ' ')
}

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

  if (isRefundPending(purchase)) {
    return (
      <StatusBadge
        value="PENDING"
        label={refundStatusLabel(status)}
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
   PURCHASE DETAILS MODAL

   Read-only payment information.
   Refund actions redirect to /app/refunds.
========================================================= */

export function PurchaseDetail({
  p,
  onClose,
  onViewRefunds,
}) {
  if (!p) return null

  const paid = isPaid(p)
  const refunded = isRefunded(p)
  const pending = isRefundPending(p)

  return (
    <Modal
      title={`Purchase #${p.purchaseId}`}
      onClose={onClose}
      wide
      footer={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Button
            onClick={onClose}
          >
            Close
          </Button>

          {onViewRefunds && (
            <Button
              variant="dark"
              onClick={() => onViewRefunds(p)}
            >
              <RotateCcw size={16} />
              View refunds
            </Button>
          )}
        </div>
      }
    >
      <div
        className="stack"
        style={{ gap: 18 }}
      >
        {/* POLICY SUMMARY */}

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
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--mist, #eef4f3)',
              color: 'var(--fjord, #0f3d3e)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={23} />
          </div>

          <div
            style={{
              flex: '1 1 180px',
              minWidth: 0,
            }}
          >
            <h3
              style={{
                margin: '0 0 4px',
                fontSize: 17,
              }}
            >
              {p.coveredTypes || 'Insurance policy'}
            </h3>

            <div className="muted">
              Purchase #{p.purchaseId}

              {p.policyNumber
                ? ` · Policy #${p.policyNumber}`
                : ''}
            </div>
          </div>

          <StatusBadge
            value={p.paymentStatus}
          />
        </div>

        {/* POLICY DETAILS */}

        <h4>Policy information</h4>

        <Details
          items={[
            [
              'Insurance plan',
              p.coveredTypes || '—',
            ],
            [
              'Policy number',
              p.policyNumber
                ? `#${p.policyNumber}`
                : '—',
            ],
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
              p.durationYears
                ? `${p.durationYears} ${
                    Number(p.durationYears) === 1
                      ? 'year'
                      : 'years'
                  }`
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
          <dd>{money(p.basePremium)}</dd>

          <dt>Discount</dt>
          <dd>
            {Number(p.discountAmount || 0) > 0
              ? `−${money(p.discountAmount)}`
              : money(0)}
          </dd>

          <dt>Taxable amount</dt>
          <dd>{money(p.taxableAmount)}</dd>

          <dt>
            GST ({p.gstRate ?? 0}%)
          </dt>
          <dd>{money(p.gstAmount)}</dd>

          <dt className="total">
            Total premium
          </dt>
          <dd className="total">
            {money(p.totalPremium)}
          </dd>
        </dl>

        <div className="divider" />

        {/* PAYMENT DETAILS */}

        <h4>Payment information</h4>

        <Details
          items={[
            [
              'Payment status',
              <StatusBadge
                value={p.paymentStatus}
              />,
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

        <h4>Nominee information</h4>

        <Details
          items={[
            [
              'Nominee name',
              p.nomineeName || '—',
            ],
            [
              'Relationship',
              p.nomineeRelation || '—',
            ],
            [
              'Contact number',
              p.nomineeContact || '—',
            ],
          ]}
        />

        <div className="divider" />

        {/* REFUND OVERVIEW */}

        <h4>Refund overview</h4>

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
              'Refund amount',
              p.refundAmount != null
                ? money(p.refundAmount)
                : '—',
            ],
            [
              'Refund ID',
              p.refundId || '—',
            ],
          ]}
        />

        {pending && (
          <div className="alert info">
            <RotateCcw size={17} />

            <span>
              Your refund request is being processed.
              Open Refunds to check its latest status.
            </span>
          </div>
        )}

        {refunded && (
          <div className="alert success">
            <ShieldCheck size={17} />

            <span>
              This purchase is marked as refunded.
              View Refunds for more details.
            </span>
          </div>
        )}

        {paid && !pending && !refunded && (
          <div className="alert info">
            <RotateCcw size={17} />

            <span>
              Need to request a refund? Open the
              Refunds section to check eligibility.
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* =========================================================
   CUSTOMER PAYMENTS PAGE
========================================================= */

export default function MyPurchases() {
  const navigate = useNavigate()

  const q = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const [open, setOpen] = useState(null)
  const [search, setSearch] = useState('')
  const [pageError, setPageError] = useState('')

  /* =======================================================
     PURCHASE DATA
  ======================================================= */

  const allPurchases = useMemo(() => {
    return Array.isArray(q.data)
      ? q.data
      : []
  }, [q.data])

  /* =======================================================
     SEARCH AND SORT
  ======================================================= */

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()

    return allPurchases
      .filter((purchase) => {
        if (!term) return true

        return FIELDS.some((field) =>
          String(purchase?.[field] ?? '')
            .toLowerCase()
            .includes(term),
        )
      })
      .slice()
      .sort(
        (a, b) =>
          Number(b.purchaseId || 0) -
          Number(a.purchaseId || 0),
      )
  }, [allPurchases, search])

  /* =======================================================
     SUMMARY STATISTICS
  ======================================================= */

  const summary = useMemo(() => {
    const paidPurchases = allPurchases.filter(
      isPaid,
    )

    const totalPaid = paidPurchases.reduce(
      (sum, purchase) => {
        const amount = Number(
          purchase.totalPremium || 0,
        )

        return sum + (
          Number.isFinite(amount) ? amount : 0
        )
      },
      0,
    )

    const refundedCount = allPurchases.filter(
      isRefunded,
    ).length

    const pendingCount = allPurchases.filter(
      isRefundPending,
    ).length

    return {
      purchases: allPurchases.length,
      totalPaid,
      refundedCount,
      pendingCount,
    }
  }, [allPurchases])

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
     NAVIGATE TO REFUNDS
  ======================================================= */

  function openRefunds() {
    setOpen(null)
    navigate('/app/refunds')
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="View insurance purchases, premium breakdowns and payment receipts."
      >
        <Button
          variant="dark"
          onClick={openRefunds}
        >
          <RotateCcw size={16} />
          Refunds
          <ArrowRight size={15} />
        </Button>
      </PageHeader>

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

      {/* SUMMARY */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Panel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
            }}
          >
            <FileText
              size={23}
              color="var(--fjord, #0f3d3e)"
            />

            <div>
              <div className="muted">
                Purchases
              </div>

              <strong
                style={{ fontSize: 21 }}
              >
                {q.isLoading
                  ? '…'
                  : summary.purchases}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
            }}
          >
            <CreditCard
              size={23}
              color="var(--fjord, #0f3d3e)"
            />

            <div>
              <div className="muted">
                Total paid
              </div>

              <strong
                style={{
                  fontSize: 21,
                  overflowWrap: 'anywhere',
                }}
              >
                {q.isLoading
                  ? '…'
                  : money(summary.totalPaid)}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
            }}
          >
            <RotateCcw
              size={23}
              color="var(--fjord, #0f3d3e)"
            />

            <div>
              <div className="muted">
                Refund activity
              </div>

              <strong
                style={{ fontSize: 21 }}
              >
                {q.isLoading
                  ? '…'
                  : summary.refundedCount +
                    summary.pendingCount}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

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
            disabled={q.isFetching}
          >
            <RotateCcw size={15} />
            {q.isFetching
              ? 'Refreshing…'
              : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No payments yet',
            text: 'Your policy purchases and payment receipts will appear here.',
          }}
        >
          {() => (
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

                      <span>
                        {date(p.purchaseDate)}
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
                        {p.policyNumber
                          ? `Policy #${p.policyNumber}`
                          : 'Policy pending'}
                      </span>
                    </div>
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
                  header: 'Premium',
                  render: (p) => (
                    <b>
                      {money(p.totalPremium)}
                    </b>
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
                  header: 'Payment status',
                  render: (p) => (
                    <StatusBadge
                      value={p.paymentStatus}
                    />
                  ),
                },
                {
                  key: 'refundStatus',
                  header: 'Refund status',
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event?.stopPropagation?.()
                          setOpen(p)
                        }}
                      >
                        <Receipt size={14} />
                        Details
                      </Button>

                      <Button
                        size="sm"
                        variant="dark"
                        onClick={(event) => {
                          event?.stopPropagation?.()
                          openRefunds()
                        }}
                      >
                        <RotateCcw size={14} />
                        Refunds
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </DataState>
      </Panel>

      {/* PURCHASE DETAILS */}

      {open && (
        <PurchaseDetail
          p={open}
          onClose={() => setOpen(null)}
          onViewRefunds={openRefunds}
        />
      )}
    </>
  )
}

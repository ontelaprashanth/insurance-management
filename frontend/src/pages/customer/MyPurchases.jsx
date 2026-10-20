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

        <div className="divider" />

        <h4>Refund information</h4>

        <Details
          items={[
            ['Refund status', <RefundStatus purchase={p} />],
            ['Refund deadline', dateTime(p.refundDeadline)],
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
            ['Refund reason', p.refundReason || '—'],
            ['Refund updated', dateTime(p.refundDateTime)],
          ]}
        />

        {eligible && (
          <div className="alert info">
            <Clock3 size={17} />
            <span>
              This purchase is currently eligible for a full refund.
              Submit the request before the displayed deadline.
            </span>
          </div>
        )}

        {pending && (
          <div className="alert info">
            <Clock3 size={17} />
            <span>
              Your refund is pending or being verified. Do not submit
              another request. Check this page again for the latest
              status.
            </span>
          </div>
        )}

        {refunded && (
          <div className="alert success">
            <CheckCircle2 size={17} />
            <span>
              The purchase is marked as refunded by the backend.
            </span>
          </div>
        )}

        {!eligible && !pending && !refunded && (
          <div className="refund-not-available">
            <AlertCircle size={17} />
            <span>
              A refund request is not currently available for this
              purchase. This can happen when the eligibility period
              has ended or the purchase is not paid.
            </span>
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
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const [open, setOpen] = useState(null)
  const [refundPurchase, setRefundPurchase] = useState(null)
  const [refundError, setRefundError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pageError, setPageError] = useState('')

  const [search, setSearch, filteredRows] = useFilter(
    q.data,
    FIELDS,
  )

  const rows = useMemo(
    () =>
      (filteredRows || []).slice().sort(
        (a, b) =>
          Number(b.purchaseId || 0) -
          Number(a.purchaseId || 0),
      ),
    [filteredRows],
  )

  async function submitRefund({ purchaseId, refundReason }) {
    if (submitting) return

    setSubmitting(true)
    setRefundError('')
    setPageError('')

    try {
      // Only this operation determines whether submission succeeded.
      await purchases.refund(purchaseId, { refundReason })
    } catch (err) {
      setRefundError(errorMessage(err,
        'The refund request could not be submitted. Please check its status before retrying.'))
      setSubmitting(false)
      return
    }

    setRefundPurchase(null)
    setOpen(null)
    setSubmitting(false)

    // Refresh after successful submission. A refresh failure does not mean
    // that the refund submission failed; never automatically repeat POST.
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['my-policies'] }),
        queryClient.invalidateQueries({ queryKey: ['insurance-plans'] }),
      ])
    } catch (err) {
      setPageError('Refund request submitted, but the latest status could not be refreshed. Use Refresh to check its status.')
    }
  }

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Review receipts, payment details and refund requests."
      />

      {pageError && (
        <div className="alert error" role="alert">
          {pageError}
        </div>
      )}

      <div className="payment-summary-grid">
        <Panel>
          <div className="payment-summary">
            <div className="payment-summary-icon">
              <FileText size={21} />
            </div>

            <div>
              <div className="muted">Purchases</div>
              <strong>
                {q.isLoading ? '…' : (q.data || []).length}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <div className="payment-summary-icon">
              <CreditCard size={21} />
            </div>

            <div>
              <div className="muted">Total paid</div>
              <strong>
                {q.isLoading
                  ? '…'
                  : money(
                      (q.data || []).reduce(
                        (sum, purchase) =>
                          isPaid(purchase)
                            ? sum +
                              Number(purchase.totalPremium || 0)
                            : sum,
                        0,
                      ),
                    )}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="payment-summary">
            <div className="payment-summary-icon">
              <RotateCcw size={21} />
            </div>

            <div>
              <div className="muted">Refund requests</div>
              <strong>
                {q.isLoading
                  ? '…'
                  : (q.data || []).filter(
                      (purchase) =>
                        isRefundPending(purchase) ||
                        isRefunded(purchase),
                    ).length}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search purchases, policies or transactions"
          />

          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ['my-purchases'],
              })
            }
            disabled={q.isFetching}
          >
            <RotateCcw size={15} />
            Refresh
          </Button>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No payments yet',
            text: 'Your completed policy purchases and payment receipts will appear here.',
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
                      <span>{date(p.purchaseDate)}</span>
                    </div>
                  ),
                },
                {
                  key: 'coveredTypes',
                  header: 'Insurance plan',
                  render: (p) => (
                    <div className="purchase-plan">
                      <b>{p.coveredTypes || 'Insurance'}</b>
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
                  render: (p) => inrShort(p.coverageAmount),
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
                    <RefundStatus purchase={p} />
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (p) => (
                    <div className="purchase-actions">
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event?.stopPropagation?.()
                          setOpen(p)
                        }}
                      >
                        Details
                      </Button>

                      {canRequestRefund(p) && (
                        <Button
                          size="sm"
                          variant="dark"
                          onClick={(event) => {
                            event?.stopPropagation?.()
                            setRefundError('')
                            setRefundPurchase(p)
                          }}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </DataState>
      </Panel>

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

      {refundPurchase && (
        <RefundModal
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

      <style>{`
        .payment-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .payment-summary {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .payment-summary-icon,
        .purchase-detail-icon,
        .refund-summary-icon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--surface-soft, #eef4f3);
          color: var(--primary, #0f3d3e);
        }

        .payment-summary strong {
          display: block;
          margin-top: 4px;
          font-size: 20px;
          overflow-wrap: anywhere;
        }

        .purchase-ref,
        .purchase-plan {
          display: grid;
          gap: 4px;
        }

        .purchase-ref span,
        .purchase-plan span {
          color: var(--muted, #68777a);
          font-size: 12px;
        }

        .purchase-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 6px;
        }

        .refund-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
        }

        .refund-status.refunded {
          color: #147746;
        }

        .refund-status.pending {
          color: #946200;
        }

        .refund-status.failed {
          color: #b42318;
        }

        .purchase-detail {
          gap: 17px;
        }

        .purchase-detail-banner,
        .refund-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border: 1px solid var(--border, #e3e9e8);
          border-radius: 14px;
        }

        .purchase-detail-banner h3 {
          margin: 0 0 5px;
          font-size: 17px;
        }

        .purchase-detail-banner p {
          margin: 0;
          color: var(--muted, #68777a);
          font-size: 13px;
        }

        .refund-amount {
          display: grid;
          gap: 4px;
          text-align: right;
        }

        .refund-amount span {
          color: var(--muted, #68777a);
          font-size: 12px;
        }

        .refund-amount strong {
          font-size: 17px;
        }

        .refund-modal-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .refund-character-count {
          margin-top: 5px;
          text-align: right;
          color: var(--muted, #68777a);
          font-size: 12px;
        }

        .refund-confirmation {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.6;
          cursor: pointer;
        }

        .refund-confirmation input {
          margin-top: 4px;
          accent-color: var(--primary, #0f3d3e);
        }

        .refund-not-available {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px;
          border-radius: 10px;
          background: var(--surface-soft, #f4f6f6);
          color: var(--muted, #68777a);
          font-size: 13px;
          line-height: 1.6;
        }

        @media (max-width: 760px) {
          .payment-summary-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .payment-summary {
            align-items: center;
          }

          .purchase-detail-banner {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .purchase-detail-banner > :last-child {
            margin-left: auto;
          }

          .refund-summary {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .refund-amount {
            width: 100%;
            text-align: left;
            padding-left: 56px;
          }

          .refund-modal-actions {
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}

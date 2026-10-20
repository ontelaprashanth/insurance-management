import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { purchases } from '../../api/endpoints'
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
import { dateTime, inr, inr2, inrShort } from '../../lib/format'
import { PurchaseDetail } from '../customer/MyPurchases'

const FIELDS = [
  'purchaseId',
  'username',
  'coveredTypes',
  'transactionId',
  'paymentStatus',
  'policyNumber',
]

export default function Purchases() {
  const q = useQuery({
    queryKey: ['a-purchases'],
    queryFn: purchases.getAll,
  })

  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('all')

  const purchaseList = Array.isArray(q.data) ? q.data : []

  const [search, setSearch, searched] = useFilter(
    purchaseList,
    FIELDS,
  )

  // Filter purchases by refund status.
  const rows = searched.filter((p) => {
    if (filter === 'all') return true

    const refunded =
      String(p.refundStatus ?? '')
        .trim()
        .toUpperCase() === 'REFUNDED'

    return filter === 'refunded' ? refunded : !refunded
  })

  // Exclude refunded purchases from collected premium.
  const collected = purchaseList
    .filter(
      (p) =>
        String(p.refundStatus ?? '')
          .trim()
          .toUpperCase() !== 'REFUNDED',
    )
    .reduce(
      (sum, p) => sum + Number(p.totalPremium || 0),
      0,
    )

  const refundedCount = purchaseList.filter(
    (p) =>
      String(p.refundStatus ?? '')
        .trim()
        .toUpperCase() === 'REFUNDED',
  ).length

  const totalCover = purchaseList.reduce(
    (sum, p) => sum + Number(p.coverageAmount || 0),
    0,
  )

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle="Every policy purchase with its payment and refund state."
      />

      {/* Purchase summary */}
      <div className="ledger" style={{ marginBottom: 20 }}>
        <div>
          <div className="label">Purchases</div>
          <div className="value">
            {q.isLoading ? '…' : purchaseList.length}
          </div>
        </div>

        <div>
          <div className="label">Premium collected</div>
          <div className="value">
            {q.isLoading ? '…' : inr(collected)}
          </div>
          <div className="sub">Excluding refunds</div>
        </div>

        <div>
          <div className="label">Total cover sold</div>
          <div className="value">
            {q.isLoading ? '…' : inrShort(totalCover)}
          </div>
        </div>

        <div>
          <div className="label">Refunded</div>
          <div className="value">
            {q.isLoading ? '…' : refundedCount}
          </div>
        </div>
      </div>

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search customer, plan, transaction"
          />

          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'kept', label: 'Not refunded' },
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
              <div className="empty">
                <h4>No matching purchases</h4>
                <p>
                  Try changing the refund filter or search term.
                </p>
              </div>
            ) : (
              <Table
                rowKey="purchaseId"
                rows={rows
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(b.purchaseId) -
                      Number(a.purchaseId),
                  )}
                onRowClick={setOpen}
                columns={[
                  {
                    key: 'purchaseId',
                    header: 'Ref',
                    render: (p) => (
                      <b>#{p.purchaseId}</b>
                    ),
                  },
                  {
                    key: 'username',
                    header: 'Customer',
                  },
                  {
                    key: 'coveredTypes',
                    header: 'Plan',
                  },
                  {
                    key: 'coverageAmount',
                    header: 'Cover',
                    render: (p) =>
                      inrShort(p.coverageAmount),
                  },
                  {
                    key: 'totalPremium',
                    header: 'Paid',
                    render: (p) =>
                      inr2(p.totalPremium),
                  },
                  {
                    key: 'paymentDateTime',
                    header: 'Paid at',
                    render: (p) => (
                      <span
                        title={
                          p.paymentDateTime
                            ? String(p.paymentDateTime)
                            : undefined
                        }
                      >
                        {dateTime(p.paymentDateTime)}
                      </span>
                    ),
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
                      <StatusBadge
                        value={p.refundStatus}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (p) => (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpen(p)
                        }}
                      >
                        Details
                      </Button>
                    ),
                  },
                ]}
              />
            )
          }
        </DataState>
      </Panel>

      {/* Purchase details */}
      {open && (
        <PurchaseDetail
          p={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

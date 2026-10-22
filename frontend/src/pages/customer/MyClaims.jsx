
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { claims, policies, purchases } from '../../api/endpoints'

import {
  Button,
  DataState,
  Details,
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  Segmented,
  StatusBadge,
  Table,
  useFilter,
} from '../../components/ui'

import { date, inr } from '../../lib/format'
import ClaimForm from './ClaimForm'

/* =========================================================
   INSUREX — MY CLAIMS

   Features:
   - Customer claim history
   - Claim search and status filters
   - Claim details
   - Approved / rejected / settled information
   - Claim submission
   - Policy renewal navigation
   - Existing review functionality
========================================================= */

const FIELDS = [
  'claimNumber',
  'policyNumber',
  'claimType',
  'status',
]

const SUCCESSFUL_CLAIM_STATUSES = [
  'APPROVED',
  'SETTLED',
]

function claimStatus(claim) {
  return String(claim?.status ?? '')
    .trim()
    .toUpperCase()
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  return []
}

function renewalSource(value) {
  return value?.renewedFromPolicyNumber ??
    value?.renewalSourcePolicyNumber ??
    value?.renewedFromPurchase?.policyNumber ??
    value?.renewedFromPurchase?.policy?.policyNumber ?? null
}

function buildRenewedSources(policyRows, purchaseRows) {
  const renewed = new Set()
  // Explicit policy renewal links are authoritative.
  for (const policy of policyRows) {
    const source = renewalSource(policy)
    if (source != null) renewed.add(String(source))
    const lifecycle = String(policy?.lifecycleStatus ?? policy?.status ?? '').toUpperCase()
    if (lifecycle === 'RENEWED' && policy?.policyNumber != null) {
      renewed.add(String(policy.policyNumber))
    }
  }
  // A renewal purchase only counts once payment succeeds.
  for (const purchase of purchaseRows) {
    const source = renewalSource(purchase)
    if (source != null && String(purchase?.paymentStatus ?? '').toUpperCase() === 'PAID') {
      renewed.add(String(source))
    }
  }
  return renewed
}

function canRequestRenewal(claim, renewedSources, ready = true) {
  return ready &&
    SUCCESSFUL_CLAIM_STATUSES.includes(claimStatus(claim)) &&
    claim?.policyNumber != null &&
    !renewedSources.has(String(claim.policyNumber))
}

function renewalUrl(claim) {
  return `/app/renew/${encodeURIComponent(
    String(claim.policyNumber),
  )}`
}

/* =========================================================
   CLAIM DETAIL MODAL

   Shared by customer and admin views.
========================================================= */

export function ClaimDetail({
  c,
  onClose,
  customerView = true,
  renewedSources = new Set(),
  renewalReady = true,
}) {
  const status = claimStatus(c)

  const approved =
    status === 'APPROVED' ||
    status === 'SETTLED'

  const renewalAvailable =
    customerView &&
    canRequestRenewal(c, renewedSources, renewalReady)

  return (
    <Modal
      title={`Claim #${c.claimNumber}`}
      onClose={onClose}
      wide
      footer={
        <>
          {customerView && status !== 'PENDING' && (
            <Link
              className="btn"
              to="/app/reviews"
              state={{
                claimNumber: c.claimNumber,
              }}
              onClick={onClose}
            >
              Review this claim
            </Link>
          )}

          {renewalAvailable && (
            <Link
              className="btn primary"
              to={renewalUrl(c)}
              onClick={onClose}
            >
              Renew policy
            </Link>
          )}

          <Button onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="stack">

        {/* Claim status and filing date */}

        <div className="row spread">
          <StatusBadge value={status} />

          <span className="muted">
            Filed {date(c.claimDate)}
          </span>
        </div>

        {/* Claim information */}

        <Details
          items={[
            [
              'Policy',
              c.policyNumber != null
                ? `#${c.policyNumber}`
                : '—',
            ],
            ['Claim type', c.claimType],
            ['Amount claimed', inr(c.amount)],
            ['Incident date', date(c.incidentDate)],
            ['Location', c.incidentLocation],
            ['Document ref', c.nFilepo],
          ]}
        />

        {/* Description */}

        <div>
          <h4 style={{ marginBottom: 6 }}>
            What happened
          </h4>

          <p className="muted">
            {c.description || '—'}
          </p>
        </div>

        {/* Approved / settled claim */}

        {approved && (
          <div className="alert ok">
            <b>
              {status === 'SETTLED'
                ? 'Claim settled'
                : 'Claim approved'}
            </b>

            {c.approvedAmount != null && (
              <>
                {' '}for {inr(c.approvedAmount)}
              </>
            )}

            {c.reviewedDate && (
              <>
                {' '}on {date(c.reviewedDate)}
              </>
            )}

            {c.adminRemarks && (
              <>
                . Note from the reviewer:{' '}
                {c.adminRemarks}
              </>
            )}
          </div>
        )}

        {/* Rejected claim */}

        {status === 'REJECTED' && (
          <div className="alert error">
            <b>Not approved</b>

            {c.reviewedDate && (
              <>
                {' '}on {date(c.reviewedDate)}
              </>
            )}

            . Reason:{' '}
            {c.rejectionReason || 'Not given'}

            {c.adminRemarks && (
              <>
                . {c.adminRemarks}
              </>
            )}
          </div>
        )}

        {/* Pending claim */}

        {status === 'PENDING' && (
          <div className="alert info">
            A reviewer is looking at this claim.
            You will get a notification as soon
            as there is a decision.
          </div>
        )}

        {customerView && c.policyNumber != null && renewedSources.has(String(c.policyNumber)) && (
          <div className="alert info">This policy has already been renewed. Its claim history remains available.</div>
        )}

        {/* Renewal information */}

        {renewalAvailable && (
          <div className="alert info">
            <b>Policy renewal</b>

            <p style={{ marginTop: 6 }}>
              Your claim has been{' '}
              {status === 'SETTLED'
                ? 'settled'
                : 'approved'}.
              You can request renewal of policy{' '}
              <b>#{c.policyNumber}</b>.
            </p>

            <p style={{ marginTop: 6 }}>
              Renewal uses the original policy's
              paid premium, coverage, and duration.
              Eligibility is verified by the server
              before payment.
            </p>

            <Link
              className="btn primary"
              to={renewalUrl(c)}
              onClick={onClose}
              style={{
                marginTop: 12,
                display: 'inline-flex',
              }}
            >
              Renew policy
            </Link>
          </div>
        )}

      </div>
    </Modal>
  )
}

/* =========================================================
   MY CLAIMS PAGE
========================================================= */

export default function MyClaims() {
  const policiesQuery = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
  })
  const purchasesQuery = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
  })
  const renewalReady = policiesQuery.isSuccess && purchasesQuery.isSuccess
  const renewedSources = buildRenewedSources(
    normalizeRows(policiesQuery.data),
    normalizeRows(purchasesQuery.data),
  )

  const q = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
  })

  const [open, setOpen] = useState(null)

  const [showForm, setShowForm] =
    useState(false)

  const [status, setStatus] =
    useState('all')

  const [
    search,
    setSearch,
    searched,
  ] = useFilter(q.data, FIELDS)

  /* =======================================================
     FILTER CLAIMS
  ======================================================= */

  const rows = searched.filter((claim) => {
    if (status === 'all') {
      return true
    }

    return claimStatus(claim) === status
  })

  /* =======================================================
     SORT CLAIMS — NEWEST FIRST
  ======================================================= */

  const sortedRows = rows
    .slice()
    .sort(
      (a, b) =>
        Number(b.claimNumber) -
        Number(a.claimNumber),
    )

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="My claims"
        subtitle="Track claims, review decisions, and request policy renewal after approval or settlement."
      >
        <Button
          variant="primary"
          icon="plus"
          onClick={() => setShowForm(true)}
        >
          File a claim
        </Button>
      </PageHeader>

      {!renewalReady && (policiesQuery.isError || purchasesQuery.isError) && (
        <div className="alert info" role="status" style={{ marginBottom: 16 }}>
          Renewal eligibility could not be checked. Claim history is available, but renewal actions are temporarily hidden.
        </div>
      )}

      <Panel flush>

        {/* Search and filters */}

        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search claims"
          />

          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              {
                value: 'all',
                label: 'All',
              },
              {
                value: 'PENDING',
                label: 'Pending',
              },
              {
                value: 'APPROVED',
                label: 'Approved',
              },
              {
                value: 'SETTLED',
                label: 'Settled',
              },
              {
                value: 'REJECTED',
                label: 'Rejected',
              },
            ]}
          />
        </div>

        {/* Claim history */}

        <DataState
          query={q}
          empty={{
            title: 'No claims filed',
            text:
              'If you need to make a claim, choose a policy and describe what happened.',
          }}
          emptyAction={
            <Button
              variant="dark"
              onClick={() => setShowForm(true)}
            >
              File a claim
            </Button>
          }
        >
          {() =>
            sortedRows.length === 0 ? (
              <div className="empty">
                <h4>No matches</h4>

                <p>
                  Try another search or filter.
                </p>
              </div>
            ) : (
              <Table
                rowKey="claimNumber"
                rows={sortedRows}
                onRowClick={setOpen}
                columns={[
                  {
                    key: 'claimNumber',
                    header: 'Claim',
                    render: (c) => (
                      <b>#{c.claimNumber}</b>
                    ),
                  },
                  {
                    key: 'policyNumber',
                    header: 'Policy',
                    render: (c) =>
                      c.policyNumber != null
                        ? `#${c.policyNumber}`
                        : '—',
                  },
                  {
                    key: 'claimType',
                    header: 'Type',
                  },
                  {
                    key: 'claimDate',
                    header: 'Filed',
                    render: (c) =>
                      date(c.claimDate),
                  },
                  {
                    key: 'amount',
                    header: 'Claimed',
                    render: (c) =>
                      inr(c.amount),
                  },
                  {
                    key: 'approvedAmount',
                    header: 'Approved',
                    render: (c) =>
                      (
                        claimStatus(c) === 'APPROVED' ||
                        claimStatus(c) === 'SETTLED'
                      ) &&
                      c.approvedAmount != null
                        ? inr(c.approvedAmount)
                        : '—',
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (c) => (
                      <StatusBadge
                        value={claimStatus(c)}
                      />
                    ),
                  },
                  {
                    key: 'renewal',
                    header: 'Action',
                    align: 'right',
                    render: (c) =>
                      renewedSources.has(String(c.policyNumber)) ? (
                        <span className="muted">Already renewed</span>
                      ) : canRequestRenewal(c, renewedSources, renewalReady) ? (
                        <Link
                          className="btn primary"
                          to={renewalUrl(c)}
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                        >
                          Renew policy
                        </Link>
                      ) : (
                        <span className="muted">
                          —
                        </span>
                      ),
                  },
                ]}
              />
            )
          }
        </DataState>
      </Panel>

      {/* Claim details modal */}

      {open && (
        <ClaimDetail
          c={open}
          renewedSources={renewedSources}
          renewalReady={renewalReady}
          onClose={() => setOpen(null)}
        />
      )}

      {/* File a new claim */}

      {showForm && (
        <ClaimForm
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}

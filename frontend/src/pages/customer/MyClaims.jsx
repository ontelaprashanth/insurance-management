import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ClipboardList,
  Clock3,
  CheckCircle2,
  WalletCards,
  ArrowUpRight,
} from 'lucide-react'

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
  useFilter,
} from '../../components/ui'

import { date, inr } from '../../lib/format'
import ClaimForm from './ClaimForm'

const FIELDS = [
  'claimNumber',
  'policyNumber',
  'claimType',
  'status',
]

const SUCCESSFUL_CLAIM_STATUSES = ['APPROVED', 'SETTLED']

function claimStatus(claim) {
  return String(claim?.status ?? '').trim().toUpperCase()
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  return []
}

function renewalSource(value) {
  return (
    value?.renewedFromPolicyNumber ??
    value?.renewalSourcePolicyNumber ??
    value?.renewedFromPurchase?.policyNumber ??
    value?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function buildRenewedSources(policyRows, purchaseRows) {
  const renewed = new Set()

  // Explicit policy renewal links are authoritative.
  for (const policy of policyRows) {
    const source = renewalSource(policy)

    if (source != null) {
      renewed.add(String(source))
    }

    const lifecycle = String(
      policy?.lifecycleStatus ?? policy?.status ?? '',
    ).toUpperCase()

    if (lifecycle === 'RENEWED' && policy?.policyNumber != null) {
      renewed.add(String(policy.policyNumber))
    }
  }

  // A renewal purchase only counts after successful payment.
  for (const purchase of purchaseRows) {
    const source = renewalSource(purchase)

    if (
      source != null &&
      String(purchase?.paymentStatus ?? '').toUpperCase() === 'PAID'
    ) {
      renewed.add(String(source))
    }
  }

  return renewed
}

function canRequestRenewal(claim, renewedSources, ready = true) {
  return (
    ready &&
    SUCCESSFUL_CLAIM_STATUSES.includes(claimStatus(claim)) &&
    claim?.policyNumber != null &&
    !renewedSources.has(String(claim.policyNumber))
  )
}

function renewalUrl(claim) {
  return `/app/renew/${encodeURIComponent(String(claim.policyNumber))}`
}

/* =========================================================
   CLAIM DETAIL MODAL
========================================================= */

export function ClaimDetail({
  c,
  onClose,
  customerView = true,
  renewedSources = new Set(),
  renewalReady = true,
}) {
  const status = claimStatus(c)

  const approved = SUCCESSFUL_CLAIM_STATUSES.includes(status)

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
              state={{ claimNumber: c.claimNumber }}
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

          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="stack ix-claim-detail-green">
        <div className="row spread">
          <StatusBadge value={status} />
          <span className="muted">Filed {date(c.claimDate)}</span>
        </div>

        <Details
          items={[
            [
              'Policy',
              c.policyNumber != null ? `#${c.policyNumber}` : '—',
            ],
            ['Claim type', c.claimType],
            ['Amount claimed', inr(c.amount)],
            ['Incident date', date(c.incidentDate)],
            ['Location', c.incidentLocation],
            ['Document ref', c.nFilepo],
          ]}
        />

        <div>
          <h4 className="ix-claim-detail-heading">What happened</h4>
          <p className="muted">{c.description || '—'}</p>
        </div>

        {approved && (
          <div className="alert ok">
            <b>{status === 'SETTLED' ? 'Claim settled' : 'Claim approved'}</b>

            {c.approvedAmount != null && <> for {inr(c.approvedAmount)}</>}
            {c.reviewedDate && <> on {date(c.reviewedDate)}</>}

            {c.adminRemarks && (
              <>. Note from the reviewer: {c.adminRemarks}</>
            )}
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="alert error">
            <b>Not approved</b>

            {c.reviewedDate && <> on {date(c.reviewedDate)}</>}

            . Reason: {c.rejectionReason || 'Not given'}

            {c.adminRemarks && <>. {c.adminRemarks}</>}
          </div>
        )}

        {status === 'PENDING' && (
          <div className="alert info">
            A reviewer is looking at this claim. You will get a notification
            as soon as there is a decision.
          </div>
        )}

        {customerView &&
          c.policyNumber != null &&
          renewedSources.has(String(c.policyNumber)) && (
            <div className="alert info">
              This policy has already been renewed. Its claim history remains
              available.
            </div>
          )}

        {renewalAvailable && (
          <div className="alert info">
            <b>Policy renewal</b>

            <p className="ix-claim-renewal-copy">
              Your claim has been {status === 'SETTLED' ? 'settled' : 'approved'}.
              You can request renewal of policy <b>#{c.policyNumber}</b>.
            </p>

            <p className="ix-claim-renewal-copy">
              Renewal uses the original policy's paid premium, coverage, and
              duration. Eligibility is verified by the server before payment.
            </p>

            <Link
              className="btn primary ix-claim-renewal-link"
              to={renewalUrl(c)}
              onClick={onClose}
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

  const renewalReady =
    policiesQuery.isSuccess && purchasesQuery.isSuccess

  const renewedSources = useMemo(
    () =>
      buildRenewedSources(
        normalizeRows(policiesQuery.data),
        normalizeRows(purchasesQuery.data),
      ),
    [policiesQuery.data, purchasesQuery.data],
  )

  const q = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
  })

  const [open, setOpen] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('all')

  const [search, setSearch, searched] = useFilter(q.data, FIELDS)

  const rows = (searched || []).filter((claim) => {
    if (status === 'all') return true
    return claimStatus(claim) === status
  })

  const sortedRows = rows
    .slice()
    .sort((a, b) => Number(b.claimNumber) - Number(a.claimNumber))

  const allClaims = normalizeRows(q.data)

  const claimSummary = {
    total: allClaims.length,
    inReview: allClaims.filter((claim) =>
      ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(claimStatus(claim)),
    ).length,
    approved: allClaims.filter((claim) =>
      SUCCESSFUL_CLAIM_STATUSES.includes(claimStatus(claim)),
    ).length,
    settled: allClaims.filter((claim) => claimStatus(claim) === 'SETTLED')
      .length,
  }

  const stats = [
    {
      label: 'Total claims',
      value: claimSummary.total,
      icon: ClipboardList,
    },
    {
      label: 'In review',
      value: claimSummary.inReview,
      icon: Clock3,
    },
    {
      label: 'Approved / settled',
      value: claimSummary.approved,
      icon: CheckCircle2,
    },
    {
      label: 'Settled',
      value: claimSummary.settled,
      icon: WalletCards,
    },
  ]

  return (
    <div className="ix-claims-page">
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

      {!renewalReady &&
        (policiesQuery.isError || purchasesQuery.isError) && (
          <div className="alert info ix-claims-renewal-warning" role="status">
            Renewal eligibility could not be checked. Claim history is
            available, but renewal actions are temporarily hidden.
          </div>
        )}

      <section className="ix-claims-stats ix-claims-green" aria-label="Claim summary">
        {stats.map(({ label, value, icon: StatIcon }) => (
          <article
            className="ix-claims-stat"
            key={label}
          >
            <div className="ix-claims-stat-icon">
              <StatIcon size={22} aria-hidden="true" />
            </div>

            <div className="ix-claims-stat-content">
              <span>{label}</span>
              <strong>{q.isLoading ? '…' : value}</strong>
            </div>
          </article>
        ))}
      </section>

      <Panel flush>
        <div className="ix-claims-toolbar">
          <div className="ix-claims-search">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search claims"
            />
          </div>

          <div className="ix-claims-filters">
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'All' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'SETTLED', label: 'Settled' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No claims filed',
            text:
              'If you need to make a claim, choose a policy and describe what happened.',
          }}
          emptyAction={
            <Button variant="dark" onClick={() => setShowForm(true)}>
              File a claim
            </Button>
          }
        >
          {() =>
            sortedRows.length === 0 ? (
              <div className="empty ix-claims-no-matches">
                <h4>No matches</h4>
                <p>Try another search or filter.</p>
              </div>
            ) : (
              <div className="ix-claims-cards" aria-label="My claim history">
                {sortedRows.map((c) => {
                  const renewed =
                    c.policyNumber != null &&
                    renewedSources.has(String(c.policyNumber))

                  const eligible = canRequestRenewal(
                    c,
                    renewedSources,
                    renewalReady,
                  )

                  const approved = SUCCESSFUL_CLAIM_STATUSES.includes(
                    claimStatus(c),
                  )

                  return (
                    <article
                      className="ix-claim-card"
                      key={String(c.claimNumber)}
                    >
                      <div className="ix-claim-card-head">
                        <div className="ix-claim-heading">
                          <span className="ix-claim-eyebrow">
                            Insurance claim
                          </span>

                          <strong>Claim #{c.claimNumber}</strong>

                          <small>
                            Policy #
                            {c.policyNumber ?? c.policy?.policyNumber ?? '—'}
                          </small>
                        </div>

                        <StatusBadge value={claimStatus(c)} />
                      </div>

                      <div className="ix-claim-card-meta">
                        <div>
                          <span>Claim type</span>
                          <b>{c.claimType || '—'}</b>
                        </div>

                        <div>
                          <span>Filed on</span>
                          <b>{date(c.claimDate)}</b>
                        </div>

                        <div>
                          <span>Amount claimed</span>
                          <b>{inr(c.amount)}</b>
                        </div>

                        <div>
                          <span>Amount approved</span>
                          <b>
                            {approved && c.approvedAmount != null
                              ? inr(c.approvedAmount)
                              : '—'}
                          </b>
                        </div>
                      </div>

                      <div className="ix-claim-card-footer">
                        <div className="ix-claim-card-actions">
                          <Button
                            size="sm"
                            onClick={() => setOpen(c)}
                          >
                            View details
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </Button>

                          {eligible && (
                            <Link
                              className="btn primary"
                              to={renewalUrl(c)}
                            >
                              Renew policy
                            </Link>
                          )}
                        </div>

                        {renewed && (
                          <span className="ix-claim-renewed">
                            Already renewed
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          }
        </DataState>
      </Panel>

      {open && (
        <ClaimDetail
          c={open}
          renewedSources={renewedSources}
          renewalReady={renewalReady}
          onClose={() => setOpen(null)}
        />
      )}

      {showForm && (
        <ClaimForm onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

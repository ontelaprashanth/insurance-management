
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { claims, policies, purchases } from '../../api/endpoints'
import { ClipboardList, Clock3, CheckCircle2, WalletCards, ArrowUpRight } from 'lucide-react'

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
  const renewedSources = useMemo(
    () => buildRenewedSources(
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

  const rows = (searched || []).filter((claim) => {
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

  const allClaims = normalizeRows(q.data)
  const claimSummary = {
    total: allClaims.length,
    inReview: allClaims.filter((c) => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(claimStatus(c))).length,
    approved: allClaims.filter((c) => ['APPROVED', 'SETTLED'].includes(claimStatus(c))).length,
    settled: allClaims.filter((c) => claimStatus(c) === 'SETTLED').length,
  }

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

      <style>{`
        .ix-claims-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
        .ix-claims-stat { padding:19px; border:1px solid var(--border, #dce4eb); border-radius:17px; background:var(--surface, #fff); display:flex; align-items:center; gap:13px; min-width:0; }
        .ix-claims-stat svg { flex-shrink:0; opacity:.75; }
        .ix-claims-stat span { display:block; font-size:13px; color:var(--muted, #64748b); }
        .ix-claims-stat strong { display:block; font-size:25px; margin-top:4px; }
        .ix-claims-toolbar { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding:16px; }
        .ix-claims-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr)); gap:16px; padding:16px; }
        .ix-claim-card { border:1px solid var(--border, #dce4eb); background:var(--surface, #fff); border-radius:18px; padding:20px; min-width:0; display:flex; flex-direction:column; gap:16px; }
        .ix-claim-card-head { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .ix-claim-card-head strong { display:block; font-size:19px; }
        .ix-claim-card-head small { display:block; color:var(--muted, #64748b); margin-top:4px; }
        .ix-claim-card-meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px 12px; }
        .ix-claim-card-meta span { display:block; font-size:12px; color:var(--muted, #64748b); margin-bottom:5px; }
        .ix-claim-card-meta b { font-size:14px; overflow-wrap:anywhere; }
        .ix-claim-card-footer { margin-top:auto; border-top:1px solid var(--border, #e2e8f0); padding-top:15px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .ix-claim-card-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .ix-claim-card-actions .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; }
        @media(max-width:950px) { .ix-claims-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:520px) { .ix-claims-stats { gap:9px; } .ix-claims-stat { padding:13px; gap:9px; } .ix-claims-stat strong { font-size:21px; } .ix-claims-stat svg { width:19px; } .ix-claims-cards { padding:12px; } .ix-claim-card { padding:16px; } .ix-claims-toolbar { align-items:stretch; } }
      `}</style>

      <div className="ix-claims-stats">
        {[
          { label: 'Total claims', value: claimSummary.total, icon: ClipboardList },
          { label: 'In review', value: claimSummary.inReview, icon: Clock3 },
          { label: 'Approved / settled', value: claimSummary.approved, icon: CheckCircle2 },
          { label: 'Settled', value: claimSummary.settled, icon: WalletCards },
        ].map(({ label, value, icon: StatIcon }) => (
          <div className="ix-claims-stat" key={label}>
            <StatIcon size={23} aria-hidden="true" />
            <div><span>{label}</span><strong>{q.isLoading ? '…' : value}</strong></div>
          </div>
        ))}
      </div>

      <Panel flush>

        {/* Search and filters */}

        <div className="ix-claims-toolbar">
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
              <div className="ix-claims-cards" aria-label="My claim history">
                {sortedRows.map((c) => {
                  const renewed = c.policyNumber != null && renewedSources.has(String(c.policyNumber))
                  const eligible = canRequestRenewal(c, renewedSources, renewalReady)
                  const approved = SUCCESSFUL_CLAIM_STATUSES.includes(claimStatus(c))
                  return (
                    <article className="ix-claim-card" key={String(c.claimNumber)}>
                      <div className="ix-claim-card-head">
                        <div>
                          <span className="muted">Insurance claim</span>
                          <strong>Claim #{c.claimNumber}</strong>
                          <small>Policy #{c.policyNumber ?? c.policy?.policyNumber ?? '—'}</small>
                        </div>
                        <StatusBadge value={claimStatus(c)} />
                      </div>
                      <div className="ix-claim-card-meta">
                        <div><span>Claim type</span><b>{c.claimType || '—'}</b></div>
                        <div><span>Filed on</span><b>{date(c.claimDate)}</b></div>
                        <div><span>Amount claimed</span><b>{inr(c.amount)}</b></div>
                        <div><span>Amount approved</span><b>{approved && c.approvedAmount != null ? inr(c.approvedAmount) : '—'}</b></div>
                      </div>
                      <div className="ix-claim-card-footer">
                        <div className="ix-claim-card-actions">
                          <Button size="sm" onClick={() => setOpen(c)}>View details <ArrowUpRight size={14} /></Button>
                          {eligible && (
                            <Link className="btn primary" to={renewalUrl(c)}>Renew policy</Link>
                          )}
                        </div>
                        {renewed && <span className="muted" style={{ fontSize: 12 }}>Already renewed</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
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

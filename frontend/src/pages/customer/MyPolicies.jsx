// =========================================================
// INSUREX — MY POLICIES
// =========================================================
//
// Features:
// - Active, claimed, renewed, inactive, expired policies
// - Refund pending, processing, refunded and failed statuses
// - Backend-authoritative policy lifecycle handling
// - Policy renewal navigation
// - Duplicate renewal prevention
// - Claim eligibility checks
// - Pending claim detection
// - Automatic refresh for unresolved refunds
// - Manual refresh
// - Search and URL-synchronized filters
// - Responsive policy table
//
// Existing imports, routes and ClaimForm integration preserved.
//
// =========================================================

import { useMemo, useState } from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

import {
  claims,
  policies,
  purchases,
} from '../../api/endpoints'

import {
  Button,
  DataState,
  PageHeader,
  Panel,
  Segmented,
  StatusBadge,
  Table,
  SearchBox,
  useFilter,
} from '../../components/ui'

import { date, today } from '../../lib/format'

import ClaimForm from './ClaimForm'

/* =========================================================
   CONSTANTS
========================================================= */

const FIELDS = [
  'policyNumber',
  'coveredTypes',
  'status',
  'lifecycleStatus',
  'refundStatus',
]

const SUCCESSFUL_CLAIM_STATUSES = new Set([
  'APPROVED',
  'SETTLED',
])

const PENDING_CLAIM_STATUSES = new Set([
  'PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
])

const REFUND_PENDING_STATUSES = new Set([
  'REFUND_PENDING',
  'PENDING',
  'REFUND_PROCESSING',
  'PROCESSING',
  'REFUND_REQUIRES_RECONCILIATION',
  'REQUIRES_RECONCILIATION',
])

const REFUNDED_STATUSES = new Set([
  'REFUNDED',
  'FULLY_REFUNDED',
  'PROCESSED',
])

const REFUND_FAILED_STATUSES = new Set([
  'REFUND_FAILED',
  'FAILED',
])

const VALID_FILTERS = new Set([
  'all',
  'active',
  'claimed',
  'renewed',
  'inactive',
  'expired',
])

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
]

const REFRESH_INTERVAL = 15000

/* =========================================================
   GENERAL HELPERS
========================================================= */

function normalizedStatus(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data

  if (Array.isArray(data?.content)) {
    return data.content
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }

  return []
}

function policyNumberOf(value) {
  return (
    value?.policyNumber ??
    value?.policy?.policyNumber ??
    null
  )
}

function claimPolicyNumber(claim) {
  return (
    claim?.policyNumber ??
    claim?.policy?.policyNumber ??
    null
  )
}

function getRenewalSourceNumber(policy) {
  return (
    policy?.renewedFromPolicyNumber ??
    policy?.renewalSourcePolicyNumber ??
    policy?.renewedFromPurchase?.policyNumber ??
    policy?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function getPurchaseRenewalSource(purchase) {
  return (
    purchase?.renewedFromPolicyNumber ??
    purchase?.renewalSourcePolicyNumber ??
    purchase?.renewedFromPurchase?.policyNumber ??
    purchase?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function isSuccessfulPurchase(purchase) {
  return (
    normalizedStatus(purchase?.paymentStatus) ===
    'PAID'
  )
}

/* =========================================================
   REFUND HELPERS
========================================================= */

function getRefundStatus(policy, purchase) {
  const purchaseStatus = normalizedStatus(
    purchase?.refundStatus,
  )

  const policyStatus = normalizedStatus(
    policy?.refundStatus,
  )

  const lifecycleStatus = normalizedStatus(
    policy?.lifecycleStatus,
  )

  // A purchase refund status is the preferred source
  // for displaying the actual payment refund.
  if (purchaseStatus && purchaseStatus !== 'NOT_REFUNDED') {
    return purchaseStatus
  }

  if (policyStatus && policyStatus !== 'NOT_REFUNDED') {
    return policyStatus
  }

  if (
    lifecycleStatus.startsWith('REFUND_') ||
    lifecycleStatus === 'REFUNDED'
  ) {
    return lifecycleStatus
  }

  return purchaseStatus || policyStatus || ''
}

function isRefundPending(status) {
  return REFUND_PENDING_STATUSES.has(
    normalizedStatus(status),
  )
}

function isRefunded(status) {
  return REFUNDED_STATUSES.has(
    normalizedStatus(status),
  )
}

function isRefundFailed(status) {
  return REFUND_FAILED_STATUSES.has(
    normalizedStatus(status),
  )
}

function refundStatusLabel(status) {
  switch (normalizedStatus(status)) {
    case 'REFUND_PENDING':
    case 'PENDING':
      return 'Refund pending'

    case 'REFUND_PROCESSING':
    case 'PROCESSING':
      return 'Refund processing'

    case 'REFUND_REQUIRES_RECONCILIATION':
    case 'REQUIRES_RECONCILIATION':
      return 'Under verification'

    case 'REFUNDED':
    case 'FULLY_REFUNDED':
    case 'PROCESSED':
      return 'Refunded'

    case 'REFUND_FAILED':
    case 'FAILED':
      return 'Refund failed'

    default:
      return 'Not refunded'
  }
}

/* =========================================================
   RENEWAL HELPERS
========================================================= */

function isRenewedPolicy(policy, purchase) {
  return (
    getRenewalSourceNumber(policy) != null ||
    getPurchaseRenewalSource(purchase) != null ||
    normalizedStatus(policy?.status) === 'RENEWED' ||
    normalizedStatus(policy?.lifecycleStatus) === 'RENEWED'
  )
}

function renewalUrl(policyNumber) {
  return `/app/renew/${encodeURIComponent(
    String(policyNumber),
  )}`
}

/* =========================================================
   CLAIM HELPERS
========================================================= */

function hasSuccessfulClaim(policy, relatedClaims) {
  if (
    policy?.hasSuccessfulClaim === true ||
    policy?.claimApproved === true
  ) {
    return true
  }

  if (
    SUCCESSFUL_CLAIM_STATUSES.has(
      normalizedStatus(policy?.claimStatus),
    )
  ) {
    return true
  }

  if (
    Array.isArray(policy?.claims) &&
    policy.claims.some((claim) =>
      SUCCESSFUL_CLAIM_STATUSES.has(
        normalizedStatus(claim?.status),
      ),
    )
  ) {
    return true
  }

  return relatedClaims.some((claim) =>
    SUCCESSFUL_CLAIM_STATUSES.has(
      normalizedStatus(claim?.status),
    ),
  )
}

function isPendingClaim(policy, relatedClaims) {
  const embeddedStatuses = Array.isArray(
    policy?.claims,
  )
    ? policy.claims.map((claim) =>
        normalizedStatus(claim?.status),
      )
    : [
        normalizedStatus(policy?.claimStatus),
      ]

  return (
    embeddedStatuses.some((status) =>
      PENDING_CLAIM_STATUSES.has(status),
    ) ||
    relatedClaims.some((claim) =>
      PENDING_CLAIM_STATUSES.has(
        normalizedStatus(claim?.status),
      ),
    )
  )
}

/* =========================================================
   POLICY STATUS

   Refund lifecycle takes priority over ordinary
   ACTIVE / CLAIMED / EXPIRED display states.
========================================================= */

function getPolicyStatus(
  policy,
  relatedClaims,
  relatedPurchase,
) {
  const backendStatus = normalizedStatus(
    policy?.status,
  )

  const lifecycleStatus = normalizedStatus(
    policy?.lifecycleStatus,
  )

  const refundStatus = getRefundStatus(
    policy,
    relatedPurchase,
  )

  if (
    isRefunded(refundStatus) ||
    lifecycleStatus === 'REFUNDED'
  ) {
    return 'REFUNDED'
  }

  if (
    isRefundPending(refundStatus) ||
    isRefundPending(lifecycleStatus)
  ) {
    if (
      refundStatus === 'REFUND_REQUIRES_RECONCILIATION' ||
      refundStatus === 'REQUIRES_RECONCILIATION' ||
      lifecycleStatus === 'REFUND_REQUIRES_RECONCILIATION'
    ) {
      return 'REFUND_REQUIRES_RECONCILIATION'
    }

    if (
      refundStatus === 'REFUND_PROCESSING' ||
      refundStatus === 'PROCESSING'
    ) {
      return 'REFUND_PROCESSING'
    }

    return 'REFUND_PENDING'
  }

  if (
    isRefundFailed(refundStatus) ||
    lifecycleStatus === 'REFUND_FAILED'
  ) {
    return 'REFUND_FAILED'
  }

  if (
    hasSuccessfulClaim(policy, relatedClaims) ||
    backendStatus === 'CLAIMED' ||
    lifecycleStatus === 'CLAIMED'
  ) {
    return 'CLAIMED'
  }

  if (
    backendStatus === 'RENEWED' ||
    lifecycleStatus === 'RENEWED'
  ) {
    return 'RENEWED'
  }

  // Respect explicit non-active backend lifecycle states.
  if (
    lifecycleStatus &&
    ![
      'ACTIVE',
      'INACTIVE',
      'NEW',
    ].includes(lifecycleStatus)
  ) {
    return lifecycleStatus
  }

  if (
    backendStatus &&
    ![
      'ACTIVE',
      'INACTIVE',
    ].includes(backendStatus)
  ) {
    return backendStatus
  }

  if (
    policy?.expiryDate &&
    String(policy.expiryDate).slice(0, 10) < today()
  ) {
    return 'EXPIRED'
  }

  if (
    backendStatus === 'INACTIVE' ||
    lifecycleStatus === 'INACTIVE' ||
    policy?.isActive === false
  ) {
    return 'INACTIVE'
  }

  return policy?.isActive === true ||
    backendStatus === 'ACTIVE'
    ? 'ACTIVE'
    : 'INACTIVE'
}

/* =========================================================
   STATUS BADGE
========================================================= */

function PolicyStatusBadge({ policy }) {
  const status = policy.displayStatus

  if (status === 'REFUNDED') {
    return (
      <StatusBadge
        value="REFUNDED"
        label="Refunded"
      />
    )
  }

  if (isRefundPending(status)) {
    return (
      <StatusBadge
        value="PENDING"
        label={refundStatusLabel(status)}
      />
    )
  }

  if (isRefundFailed(status)) {
    return (
      <StatusBadge
        value="FAILED"
        label="Refund failed"
      />
    )
  }

  return (
    <StatusBadge value={status} />
  )
}

/* =========================================================
   ACTION COMPONENT
========================================================= */

function PolicyAction({ policy, onClaim }) {
  if (
    policy.refundPending ||
    policy.refunded ||
    policy.refundFailed
  ) {
    return (
      <span className="muted ix-policy-action-label">
        {refundStatusLabel(policy.refundStatus)}
      </span>
    )
  }

  if (policy.alreadyRenewed) {
    return (
      <span className="muted ix-policy-action-label">
        Already renewed
      </span>
    )
  }

  if (policy.canRequestRenewal) {
    return (
      <Link
        className="btn primary ix-policy-action-btn"
        to={renewalUrl(policy.policyNumber)}
      >
        <RefreshCw size={15} />
        Renew policy
      </Link>
    )
  }

  return (
    <Button
      size="sm"
      disabled={!policy.canFileClaim}
      title={
        policy.canFileClaim
          ? 'File a claim'
          : policy.pendingClaim
            ? 'A claim is already being processed'
            : policy.displayStatus === 'EXPIRED'
              ? 'Claims cannot be started for an expired policy'
              : 'Claims require an active policy'
      }
      onClick={() => {
        if (policy.canFileClaim) {
          onClaim(policy)
        }
      }}
    >
      {policy.displayStatus === 'EXPIRED'
        ? 'Expired'
        : policy.pendingClaim
          ? 'Claim pending'
          : policy.displayStatus === 'CLAIMED'
            ? 'Claimed'
            : 'File a claim'}
    </Button>
  )
}

/* =========================================================
   COMPONENT
========================================================= */

export default function MyPolicies() {
  const [searchParams, setSearchParams] =
    useSearchParams()

  const requestedFilter =
    searchParams.get('status') || 'all'

  const status = VALID_FILTERS.has(requestedFilter)
    ? requestedFilter
    : 'all'

  const [claimFor, setClaimFor] = useState(null)
  const [refreshError, setRefreshError] = useState('')

  /* =======================================================
     QUERIES
  ======================================================= */

  const policiesQuery = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const claimsQuery = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const purchasesQuery = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Only poll while there are unresolved refunds.
    refetchInterval: (query) => {
      const purchaseRows = normalizeRows(
        query.state.data,
      )

      return purchaseRows.some((purchase) =>
        isRefundPending(purchase.refundStatus),
      )
        ? REFRESH_INTERVAL
        : false
    },

    refetchIntervalInBackground: false,
  })

  /* =======================================================
     NORMALIZE RESPONSE DATA
  ======================================================= */

  const policyRows = useMemo(
    () => normalizeRows(policiesQuery.data),
    [policiesQuery.data],
  )

  const claimRows = useMemo(
    () => normalizeRows(claimsQuery.data),
    [claimsQuery.data],
  )

  const purchaseRows = useMemo(
    () => normalizeRows(purchasesQuery.data),
    [purchasesQuery.data],
  )

  /* =======================================================
     INDEX CLAIMS BY POLICY
  ======================================================= */

  const claimsByPolicy = useMemo(() => {
    const map = new Map()

    for (const claim of claimRows) {
      const number = claimPolicyNumber(claim)

      if (number == null) continue

      const key = String(number)

      if (!map.has(key)) {
        map.set(key, [])
      }

      map.get(key).push(claim)
    }

    return map
  }, [claimRows])

  /* =======================================================
     INDEX PURCHASES BY POLICY
  ======================================================= */

  const purchasesByPolicy = useMemo(() => {
    const map = new Map()

    for (const purchase of purchaseRows) {
      const number = policyNumberOf(purchase)

      if (number == null) continue

      const key = String(number)
      const existing = map.get(key)

      if (
        !existing ||
        Number(purchase.purchaseId || 0) >
          Number(existing.purchaseId || 0)
      ) {
        map.set(key, purchase)
      }
    }

    return map
  }, [purchaseRows])

  /* =======================================================
     TRACK COMPLETED RENEWALS

     A source policy counts as already renewed only
     when the linked renewal purchase was paid or
     the backend policy explicitly records renewal.
  ======================================================= */

  const renewedSourceNumbers = useMemo(() => {
    const set = new Set()

    for (const policy of policyRows) {
      const source = getRenewalSourceNumber(policy)

      if (source != null) {
        set.add(String(source))
      }
    }

    for (const purchase of purchaseRows) {
      const source = getPurchaseRenewalSource(purchase)

      if (
        source != null &&
        isSuccessfulPurchase(purchase)
      ) {
        set.add(String(source))
      }
    }

    return set
  }, [policyRows, purchaseRows])

  /* =======================================================
     ENRICH POLICY DATA
  ======================================================= */

  const enrichedPolicies = useMemo(
    () =>
      policyRows.map((policy) => {
        const number = String(
          policy.policyNumber,
        )

        const relatedClaims =
          claimsByPolicy.get(number) || []

        const relatedPurchase =
          purchasesByPolicy.get(number) || null

        const refundStatus = getRefundStatus(
          policy,
          relatedPurchase,
        )

        const displayStatus = getPolicyStatus(
          policy,
          relatedClaims,
          relatedPurchase,
        )

        const pendingClaim = isPendingClaim(
          policy,
          relatedClaims,
        )

        const alreadyRenewed =
          renewedSourceNumbers.has(number)

        const renewalChild = isRenewedPolicy(
          policy,
          relatedPurchase,
        )

        const refundPending =
          isRefundPending(refundStatus) ||
          isRefundPending(policy.lifecycleStatus)

        const refunded =
          isRefunded(refundStatus) ||
          normalizedStatus(policy.lifecycleStatus) ===
            'REFUNDED'

        const refundFailed =
          isRefundFailed(refundStatus) ||
          normalizedStatus(policy.lifecycleStatus) ===
            'REFUND_FAILED'

        const canFileClaim =
          displayStatus === 'ACTIVE' &&
          !pendingClaim &&
          !refundPending &&
          !refunded &&
          !refundFailed

        // Preserve the existing business rule:
        // renewal is available for a claimed policy
        // that has not already been renewed.
        //
        // Backend must still validate eligibility.
        const canRequestRenewal =
          displayStatus === 'CLAIMED' &&
          !alreadyRenewed &&
          !renewalChild &&
          relatedPurchase != null &&
          isSuccessfulPurchase(relatedPurchase) &&
          !refundPending &&
          !refunded &&
          !refundFailed

        return {
          ...policy,
          displayStatus,
          refundStatus,
          refundPending,
          refunded,
          refundFailed,
          pendingClaim,
          alreadyRenewed,
          renewalChild,
          canFileClaim,
          canRequestRenewal,
        }
      }),
    [
      policyRows,
      claimsByPolicy,
      purchasesByPolicy,
      renewedSourceNumbers,
    ],
  )

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    search,
    setSearch,
    searched,
  ] = useFilter(enrichedPolicies, FIELDS)

  /* =======================================================
     FILTER
  ======================================================= */

  const rows = useMemo(
    () =>
      (searched || []).filter((policy) => {
        if (status === 'all') {
          return true
        }

        if (status === 'renewed') {
          return (
            policy.renewalChild ||
            policy.alreadyRenewed ||
            policy.displayStatus === 'RENEWED'
          )
        }

        return (
          policy.displayStatus ===
          status.toUpperCase()
        )
      }),
    [searched, status],
  )

  function changeStatus(nextStatus) {
    if (!VALID_FILTERS.has(nextStatus)) return

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (nextStatus === 'all') {
        next.delete('status')
      } else {
        next.set('status', nextStatus)
      }

      return next
    })
  }

  /* =======================================================
     SUMMARY COUNTS
  ======================================================= */

  const summary = useMemo(
    () => ({
      total: enrichedPolicies.length,

      active: enrichedPolicies.filter(
        (p) => p.displayStatus === 'ACTIVE',
      ).length,

      claimed: enrichedPolicies.filter(
        (p) => p.displayStatus === 'CLAIMED',
      ).length,

      renewed: enrichedPolicies.filter(
        (p) =>
          p.renewalChild ||
          p.alreadyRenewed ||
          p.displayStatus === 'RENEWED',
      ).length,

      refunds: enrichedPolicies.filter(
        (p) => p.refundPending,
      ).length,
    }),
    [enrichedPolicies],
  )

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshing =
    policiesQuery.isFetching ||
    claimsQuery.isFetching ||
    purchasesQuery.isFetching

  async function refreshAll() {
    setRefreshError('')

    try {
      const results = await Promise.all([
        policiesQuery.refetch(),
        claimsQuery.refetch(),
        purchasesQuery.refetch(),
      ])

      const failure = results.find(
        (result) => result.error,
      )

      if (failure) {
        throw failure.error
      }
    } catch (error) {
      setRefreshError(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to refresh policy information.',
      )
    }
  }

  /* =======================================================
     COMBINED QUERY STATUS
  ======================================================= */

  const query = {
    ...policiesQuery,

    isLoading:
      policiesQuery.isLoading ||
      claimsQuery.isLoading ||
      purchasesQuery.isLoading,

    isError:
      policiesQuery.isError ||
      claimsQuery.isError ||
      purchasesQuery.isError,

    error:
      policiesQuery.error ||
      claimsQuery.error ||
      purchasesQuery.error,

    refetch: refreshAll,
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="My policies"
        subtitle="Manage your insurance coverage, track claims, refunds and eligible renewals."
      >
        <Link
          className="btn primary"
          to="/app/plans"
        >
          Buy insurance
        </Link>
      </PageHeader>

      {/* RESPONSIVE STYLES */}

      <style>{`
        .ix-policy-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(165px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .ix-policy-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .ix-policy-summary-card svg {
          flex-shrink: 0;
        }

        .ix-policy-summary-card strong {
          display: block;
          font-size: 22px;
          margin-top: 3px;
        }

        .ix-policy-table-scroll {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
        }

        .ix-policy-table-scroll table {
          width: 100%;
          min-width: 960px;
          border-collapse: collapse;
        }

        .ix-policy-table-scroll th,
        .ix-policy-table-scroll td {
          padding: 13px 15px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .ix-policy-table-scroll .badge {
          display: inline-flex;
          align-items: center;
          width: max-content;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .ix-policy-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          white-space: nowrap;
          text-decoration: none;
        }

        .ix-policy-action-label {
          display: inline-block;
          white-space: nowrap;
          font-size: 13px;
        }

        .ix-policy-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        @media (max-width: 640px) {
          .ix-policy-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .ix-policy-summary-card strong {
            font-size: 20px;
          }

          .ix-policy-toolbar {
            align-items: stretch;
          }
        }
      `}</style>

      {/* SUMMARY */}

      <div className="ix-policy-summary-grid">
        <Panel>
          <div className="ix-policy-summary-card">
            <ShieldCheck size={22} />
            <div>
              <div className="muted">
                Total policies
              </div>
              <strong>
                {query.isLoading ? '…' : summary.total}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="ix-policy-summary-card">
            <CheckCircle2 size={22} />
            <div>
              <div className="muted">
                Active
              </div>
              <strong>
                {query.isLoading ? '…' : summary.active}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="ix-policy-summary-card">
            <RefreshCw size={22} />
            <div>
              <div className="muted">
                Renewed
              </div>
              <strong>
                {query.isLoading ? '…' : summary.renewed}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="ix-policy-summary-card">
            <RotateCcw size={22} />
            <div>
              <div className="muted">
                Pending refunds
              </div>
              <strong>
                {query.isLoading ? '…' : summary.refunds}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* REFUND NOTICE */}

      {summary.refunds > 0 && (
        <div
          className="alert info"
          role="status"
          style={{ marginBottom: 16 }}
        >
          <Clock3 size={17} />
          <span>
            {summary.refunds} policy
            {summary.refunds === 1 ? ' has' : ' policies have'}
            {' '}a refund awaiting processing or verification.
            Refund information refreshes automatically.
          </span>
        </div>
      )}

      {refreshError && (
        <div
          className="alert error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          <AlertCircle size={17} />
          <span>{refreshError}</span>
        </div>
      )}

      {/* POLICY TABLE */}

      <Panel flush>
        <div className="toolbar ix-policy-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by policy number or type"
          />

          <Segmented
            value={status}
            onChange={changeStatus}
            options={FILTER_OPTIONS}
          />

          <Button
            onClick={refreshAll}
            disabled={refreshing}
          >
            <RefreshCw size={15} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={query}
          empty={{
            title: 'No policies yet',
            text:
              'Once you buy an insurance plan, it will appear here.',
          }}
          emptyAction={
            <Link
              className="btn primary"
              to="/app/plans"
            >
              Browse plans
            </Link>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching policies</h4>
                <p>
                  Try another search or status filter.
                </p>
              </div>
            ) : (
              <div
                className="ix-policy-table-scroll"
                role="region"
                aria-label="My policies table"
                tabIndex={0}
              >
                <Table
                  rowKey="policyNumber"
                  rows={rows}
                  columns={[
                    {
                      key: 'policyNumber',
                      header: 'Policy',
                      render: (policy) => (
                        <b>
                          #{policy.policyNumber}
                        </b>
                      ),
                    },
                    {
                      key: 'coveredTypes',
                      header: 'Cover type',
                      render: (policy) =>
                        policy.coveredTypes || '—',
                    },
                    {
                      key: 'startDate',
                      header: 'Starts',
                      render: (policy) =>
                        date(policy.startDate),
                    },
                    {
                      key: 'durationYears',
                      header: 'Term',
                      render: (policy) =>
                        `${
                          policy.durationYears ?? '—'
                        } yr`,
                    },
                    {
                      key: 'expiryDate',
                      header: 'Expires',
                      render: (policy) =>
                        date(policy.expiryDate),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (policy) => (
                        <PolicyStatusBadge
                          policy={policy}
                        />
                      ),
                    },
                    {
                      key: 'action',
                      header: 'Action',
                      align: 'right',
                      render: (policy) => (
                        <PolicyAction
                          policy={policy}
                          onClaim={setClaimFor}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            )
          }
        </DataState>
      </Panel>

      {/* CLAIM FORM */}

      {claimFor && (
        <ClaimForm
          policy={claimFor}
          onClose={() => setClaimFor(null)}
        />
      )}
    </>
  )
}

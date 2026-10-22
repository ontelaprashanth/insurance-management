
import { useMemo, useState } from 'react'
import {
  Link,
  useSearchParams,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

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
   INSUREX — MY POLICIES

   - Active policies
   - Claimed policies
   - Renewed policies
   - Pending claim detection
   - Renewal checkout navigation
   - Sidebar URL filter synchronization
========================================================= */

const FIELDS = [
  'policyNumber',
  'coveredTypes',
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

const VALID_FILTERS = new Set([
  'all',
  'active',
  'claimed',
  'renewed',
  'inactive',
  'expired',
])

function normalizedStatus(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
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
    policy?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function getPurchaseRenewalSource(purchase) {
  return (
    purchase?.renewedFromPolicyNumber ??
    purchase?.renewalSourcePolicyNumber ??
    purchase?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function isRenewedPolicy(policy, purchase) {
  return (
    getRenewalSourceNumber(policy) != null ||
    getPurchaseRenewalSource(purchase) != null ||
    normalizedStatus(policy?.status) === 'RENEWED'
  )
}

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
  const embeddedStatuses = Array.isArray(policy?.claims)
    ? policy.claims.map((claim) =>
        normalizedStatus(claim?.status),
      )
    : [normalizedStatus(policy?.claimStatus)]

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

function getPolicyStatus(
  policy,
  relatedClaims,
  relatedPurchase,
) {
  const backendStatus = normalizedStatus(
    policy?.status,
  )

  if (
    hasSuccessfulClaim(policy, relatedClaims) ||
    backendStatus === 'CLAIMED'
  ) {
    return 'CLAIMED'
  }

  if (
    isRenewedPolicy(policy, relatedPurchase) &&
    backendStatus === 'RENEWED'
  ) {
    return 'RENEWED'
  }

  if (
    backendStatus &&
    backendStatus !== 'ACTIVE'
  ) {
    return backendStatus
  }

  if (
    policy?.expiryDate &&
    policy.expiryDate <= today()
  ) {
    return 'EXPIRED'
  }

  return policy?.isActive ? 'ACTIVE' : 'INACTIVE'
}

function renewalUrl(policyNumber) {
  return `/app/renew/${encodeURIComponent(
    String(policyNumber),
  )}`
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

  const policiesQuery = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
  })

  const claimsQuery = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
  })

  const purchasesQuery = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
  })

  const [claimFor, setClaimFor] = useState(null)

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
     INDEX CLAIMS BY POLICY NUMBER
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
     INDEX PURCHASES BY POLICY NUMBER
  ======================================================= */

  const purchasesByPolicy = useMemo(() => {
    const map = new Map()

    for (const purchase of purchaseRows) {
      const number = policyNumberOf(purchase)

      if (number == null) continue

      map.set(String(number), purchase)
    }

    return map
  }, [purchaseRows])

  /* =======================================================
     TRACK ALREADY RENEWED ORIGINAL POLICIES
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

      if (source != null) {
        set.add(String(source))
      }
    }

    return set
  }, [policyRows, purchaseRows])

  /* =======================================================
     BUILD DISPLAY ROWS
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

        const policyStatus = getPolicyStatus(
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

        const canFileClaim =
          policyStatus === 'ACTIVE' &&
          !pendingClaim

        const canRequestRenewal =
          policyStatus === 'CLAIMED' &&
          !alreadyRenewed &&
          !renewalChild &&
          relatedPurchase != null

        return {
          ...policy,
          displayStatus: policyStatus,
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
     STATUS FILTER
  ======================================================= */

  const rows = useMemo(
    () =>
      searched.filter((policy) => {
        if (status === 'all') {
          return true
        }

        if (status === 'renewed') {
          return (
            policy.renewalChild ||
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
    setSearchParams(
      nextStatus === 'all'
        ? {}
        : { status: nextStatus },
    )
  }

  /* =======================================================
     COMBINED QUERY STATUS

     Keep DataState compatible with the
     existing query interface.
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

    refetch: async () => {
      await Promise.all([
        policiesQuery.refetch(),
        claimsQuery.refetch(),
        purchasesQuery.refetch(),
      ])
    },
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title="My policies"
        subtitle="Manage your insurance, track claimed coverage, and renew eligible policies."
      >
        <Link
          className="btn primary"
          to="/app/plans"
        >
          Buy insurance
        </Link>
      </PageHeader>

      <Panel flush>

        {/* SEARCH AND FILTERS */}

        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by number or type"
          />

          <Segmented
            value={status}
            onChange={changeStatus}
            options={[
              {
                value: 'all',
                label: 'All',
              },
              {
                value: 'active',
                label: 'Active',
              },
              {
                value: 'claimed',
                label: 'Claimed',
              },
              {
                value: 'renewed',
                label: 'Renewed',
              },
              {
                value: 'inactive',
                label: 'Inactive',
              },
              {
                value: 'expired',
                label: 'Expired',
              },
            ]}
          />
        </div>

        {/* POLICY TABLE */}

        <DataState
          query={query}
          empty={{
            title: 'No policies yet',
            text:
              'Once you buy a plan it will appear here.',
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
                <h4>No matches</h4>

                <p>
                  Try another search or filter.
                </p>
              </div>
            ) : (
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
                      <StatusBadge
                        value={
                          policy.displayStatus
                        }
                      />
                    ),
                  },
                  {
                    key: 'a',
                    header: 'Action',
                    align: 'right',

                    render: (policy) => {
                      if (policy.alreadyRenewed) {
                        return (
                          <span className="muted">
                            Already renewed
                          </span>
                        )
                      }

                      if (
                        policy.canRequestRenewal
                      ) {
                        return (
                          <Link
                            className="btn primary"
                            to={renewalUrl(
                              policy.policyNumber,
                            )}
                          >
                            Renew policy
                          </Link>
                        )
                      }

                      return (
                        <Button
                          size="sm"
                          disabled={
                            !policy.canFileClaim
                          }
                          title={
                            policy.canFileClaim
                              ? 'File a claim'
                              : policy.pendingClaim
                                ? 'A claim is already being processed'
                                : policy.displayStatus ===
                                    'EXPIRED'
                                  ? 'Claims cannot be started for an expired policy'
                                  : 'Claims require an active policy'
                          }
                          onClick={() => {
                            if (
                              policy.canFileClaim
                            ) {
                              setClaimFor(policy)
                            }
                          }}
                        >
                          {policy.displayStatus ===
                          'EXPIRED'
                            ? 'Expired'
                            : policy.pendingClaim
                              ? 'Claim pending'
                              : policy.displayStatus ===
                                  'CLAIMED'
                                ? 'Claimed'
                                : 'File a claim'}
                        </Button>
                      )
                    },
                  },
                ]}
              />
            )
          }
        </DataState>
      </Panel>

      {/* CLAIM FORM */}

      {claimFor && (
        <ClaimForm
          policy={claimFor}
          onClose={() =>
            setClaimFor(null)
          }
        />
      )}
    </>
  )
}

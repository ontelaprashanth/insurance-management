import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { policies } from '../../api/endpoints'
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

const FIELDS = ['policyNumber', 'coveredTypes']
const SUCCESSFUL_CLAIM_STATUSES = new Set(['APPROVED', 'SETTLED'])

function normalizedStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function hasSuccessfulClaim(policy) {
  if (policy.hasSuccessfulClaim === true || policy.claimApproved === true) {
    return true
  }

  if (SUCCESSFUL_CLAIM_STATUSES.has(normalizedStatus(policy.claimStatus))) {
    return true
  }

  if (Array.isArray(policy.claims)) {
    return policy.claims.some((claim) =>
      SUCCESSFUL_CLAIM_STATUSES.has(normalizedStatus(claim?.status)),
    )
  }

  return false
}

function getPolicyStatus(policy) {
  // A successfully claimed policy may have isActive=false intentionally.
  // Never present it as merely inactive when claim information is available.
  if (hasSuccessfulClaim(policy)) return 'CLAIMED'

  const backendStatus = normalizedStatus(policy.status)
  if (backendStatus === 'CLAIMED') return 'CLAIMED'
  if (backendStatus === 'RENEWED') return 'RENEWED'
  if (backendStatus) return backendStatus

  // Compatibility with older API responses.
  if (policy.expiryDate && policy.expiryDate <= today()) {
    return 'EXPIRED'
  }

  return policy.isActive ? 'ACTIVE' : 'INACTIVE'
}

function getRenewalSourceNumber(policy) {
  return (
    policy.renewedFromPolicyNumber ??
    policy.renewalSourcePolicyNumber ??
    policy.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function isRenewedPolicy(policy) {
  return getRenewalSourceNumber(policy) != null ||
    normalizedStatus(policy.status) === 'RENEWED'
}

function isPendingClaim(policy) {
  const statuses = Array.isArray(policy.claims)
    ? policy.claims.map((claim) => normalizedStatus(claim?.status))
    : [normalizedStatus(policy.claimStatus)]

  return statuses.some((value) =>
    value === 'PENDING' || value === 'SUBMITTED' || value === 'UNDER_REVIEW',
  )
}

export default function MyPolicies() {
  const q = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
  })

  const [claimFor, setClaimFor] = useState(null)
  const [status, setStatus] = useState('all')
  const [search, setSearch, searched] = useFilter(q.data, FIELDS)

  const rows = useMemo(
    () => searched.filter((policy) => {
      const policyStatus = getPolicyStatus(policy)

      if (status === 'all') return true
      if (status === 'active') return policyStatus === 'ACTIVE'
      if (status === 'claimed') return policyStatus === 'CLAIMED'
      if (status === 'renewed') return isRenewedPolicy(policy)
      if (status === 'inactive') return policyStatus === 'INACTIVE'
      if (status === 'expired') return policyStatus === 'EXPIRED'

      return true
    }),
    [searched, status],
  )

  return (
    <>
      <PageHeader
        title="My policies"
        subtitle="Manage your insurance, view claimed policies, and renew eligible coverage."
      >
        <Link className="btn primary" to="/app/plans">
          Buy insurance
        </Link>
      </PageHeader>

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by number or type"
          />

          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'claimed', label: 'Claimed' },
              { value: 'renewed', label: 'Renewed' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No policies yet',
            text: 'Once you buy a plan it will appear here.',
          }}
          emptyAction={
            <Link className="btn primary" to="/app/plans">
              Browse plans
            </Link>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matches</h4>
                <p>Try another search or filter.</p>
              </div>
            ) : (
              <Table
                rowKey="policyNumber"
                rows={rows}
                columns={[
                  {
                    key: 'policyNumber',
                    header: 'Policy',
                    render: (policy) => <b>#{policy.policyNumber}</b>,
                  },
                  {
                    key: 'coveredTypes',
                    header: 'Cover type',
                  },
                  {
                    key: 'startDate',
                    header: 'Starts',
                    render: (policy) => date(policy.startDate),
                  },
                  {
                    key: 'durationYears',
                    header: 'Term',
                    render: (policy) => `${policy.durationYears ?? '—'} yr`,
                  },
                  {
                    key: 'expiryDate',
                    header: 'Expires',
                    render: (policy) => date(policy.expiryDate),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (policy) => (
                      <StatusBadge value={getPolicyStatus(policy)} />
                    ),
                  },
                  {
                    key: 'a',
                    header: 'Action',
                    align: 'right',
                    render: (policy) => {
                      const policyStatus = getPolicyStatus(policy)
                      const canFileClaim =
                        policyStatus === 'ACTIVE' && !isPendingClaim(policy)
                      const canRenew = policyStatus === 'CLAIMED'

                      if (canRenew) {
                        return (
                          <Button
                            size="sm"
                            title="Renewal checkout will be connected to your existing payment flow"
                            disabled
                          >
                            Renew policy
                          </Button>
                        )
                      }

                      return (
                        <Button
                          size="sm"
                          disabled={!canFileClaim}
                          title={
                            canFileClaim
                              ? 'File a claim'
                              : isPendingClaim(policy)
                                ? 'A claim is already being processed'
                                : policyStatus === 'EXPIRED'
                                  ? 'Claims cannot be started for an expired policy'
                                  : 'Claims need an active policy'
                          }
                          onClick={() => {
                            if (canFileClaim) setClaimFor(policy)
                          }}
                        >
                          {policyStatus === 'EXPIRED'
                            ? 'Expired'
                            : isPendingClaim(policy)
                              ? 'Claim pending'
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

      {claimFor && (
        <ClaimForm
          policy={claimFor}
          onClose={() => setClaimFor(null)}
        />
      )}
    </>
  )
}

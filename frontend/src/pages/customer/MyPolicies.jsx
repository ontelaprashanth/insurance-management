
import { useState } from 'react'
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

function getPolicyStatus(policy) {
  // Use the status computed by the backend when available.
  if (policy.status) {
    return String(policy.status).toUpperCase()
  }

  // Fallback for older API responses.
  if (policy.expiryDate && policy.expiryDate <= today()) {
    return 'EXPIRED'
  }

  return policy.isActive ? 'ACTIVE' : 'INACTIVE'
}

export default function MyPolicies() {
  const q = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
  })

  const [claimFor, setClaimFor] = useState(null)
  const [status, setStatus] = useState('all')
  const [search, setSearch, searched] = useFilter(q.data, FIELDS)

  const rows = searched.filter((p) => {
    const policyStatus = getPolicyStatus(p)

    if (status === 'all') return true
    if (status === 'active') return policyStatus === 'ACTIVE'
    if (status === 'inactive') return policyStatus === 'INACTIVE'
    if (status === 'expired') return policyStatus === 'EXPIRED'

    return true
  })

  return (
    <>
      <PageHeader
        title="My policies"
        subtitle="Every policy you hold, and the quickest way to file a claim on one."
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
                    render: (p) => <b>#{p.policyNumber}</b>,
                  },
                  {
                    key: 'coveredTypes',
                    header: 'Cover type',
                  },
                  {
                    key: 'startDate',
                    header: 'Starts',
                    render: (p) => date(p.startDate),
                  },
                  {
                    key: 'durationYears',
                    header: 'Term',
                    render: (p) => `${p.durationYears ?? '—'} yr`,
                  },
                  {
                    key: 'expiryDate',
                    header: 'Expires',
                    render: (p) => date(p.expiryDate),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (p) => (
                      <StatusBadge value={getPolicyStatus(p)} />
                    ),
                  },
                  {
                    key: 'a',
                    header: '',
                    align: 'right',
                    render: (p) => {
                      const policyStatus = getPolicyStatus(p)
                      const canFileClaim = policyStatus === 'ACTIVE'

                      return (
                        <Button
                          size="sm"
                          disabled={!canFileClaim}
                          title={
                            canFileClaim
                              ? 'File a claim'
                              : policyStatus === 'EXPIRED'
                                ? 'Claims cannot be started through this page for an expired policy'
                                : 'Claims need an active policy'
                          }
                          onClick={() => {
                            if (canFileClaim) setClaimFor(p)
                          }}
                        >
                          {policyStatus === 'EXPIRED'
                            ? 'Expired'
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

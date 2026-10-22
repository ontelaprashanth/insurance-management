import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { claims, settlements } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  Confirm,
  DataState,
  Details,
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  Segmented,
  StatusBadge,
  Table,
  TextArea,
  TextInput,
  useFilter,
  useToast,
} from '../../components/ui'

import { date, inr } from '../../lib/format'
import { SettlementForm } from './Settlements'

/* =========================================================
   INSUREX — ADMIN CLAIMS
========================================================= */

const REVIEWABLE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'PENDING',
]

const SEARCH_FIELDS = [
  'claimNumber',
  'policyNumber',
  'claimType',
  'incidentLocation',
  'description',
  'status',
]

function normalizeStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  return []
}

function normalizeSettlements(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  if (data?.settlementNumber != null) return [data]
  return []
}

function canReview(claim) {
  return REVIEWABLE_STATUSES.includes(
    normalizeStatus(claim?.status),
  )
}

function isApproved(claim) {
  return normalizeStatus(claim?.status) === 'APPROVED'
}

function isUncertainError(error) {
  const status = error?.response?.status

  return (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    !error?.response ||
    status >= 500
  )
}

function getPolicyNumber(claim) {
  return (
    claim?.policyNumber ??
    claim?.policy?.policyNumber ??
    '—'
  )
}

/* =========================================================
   APPROVE / REJECT CLAIM
========================================================= */

function Decision({
  claim,
  mode,
  onClose,
}) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const submitting = useRef(false)

  const approve = mode === 'approve'

  const [amount, setAmount] = useState(
    claim.approvedAmount ??
    claim.amount ??
    '',
  )

  const [remarks, setRemarks] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)

  const mutation = useMutation({
    mutationFn: (body) =>
      approve
        ? claims.approve(claim.claimNumber, body)
        : claims.reject(claim.claimNumber, body),

    retry: false,

    onSuccess: async (response) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-claims'],
        })
      } catch {
        // The decision succeeded even if refreshing fails.
      }

      toast.success(
        approve
          ? `Claim #${claim.claimNumber} approved`
          : `Claim #${claim.claimNumber} rejected`,
      )

      onClose(
        approve
          ? response?.claimNumber
            ? response
            : {
                ...claim,
                status: 'APPROVED',
                approvedAmount: Number(amount),
              }
          : null,
      )
    },

    onError: async (requestError) => {
      if (isUncertainError(requestError)) {
        setUncertain(true)

        setError(
          'The server did not confirm the decision. The claim may already have been updated. Close this dialog and refresh the claim before attempting another decision.',
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-claims'],
          })
        } catch {
          // Keep the uncertainty warning visible.
        }

        return
      }

      setError(
        errorMessage(
          requestError,
          'Could not record the decision.',
        ),
      )
    },

    onSettled: () => {
      submitting.current = false
    },
  })

  function submit(event) {
    event?.preventDefault?.()

    if (
      submitting.current ||
      mutation.isPending ||
      uncertain
    ) {
      return
    }

    if (!canReview(claim)) {
      setError(
        'This claim is no longer awaiting a decision.',
      )
      return
    }

    if (approve) {
      const approvedAmount = Number(amount)
      const claimedAmount = Number(claim.amount)

      if (
        !Number.isFinite(approvedAmount) ||
        approvedAmount <= 0
      ) {
        setError(
          'Enter a valid approved amount greater than zero.',
        )
        return
      }

      if (
        Number.isFinite(claimedAmount) &&
        approvedAmount > claimedAmount
      ) {
        setError(
          `The approved amount cannot exceed the claimed ${inr(claimedAmount)}.`,
        )
        return
      }

      setError('')
      submitting.current = true

      mutation.mutate({
        approvedAmount,
        adminRemarks: remarks.trim() || undefined,
      })

      return
    }

    const rejectionReason = reason.trim()

    if (rejectionReason.length < 5) {
      setError(
        'Enter a rejection reason of at least 5 characters.',
      )
      return
    }

    setError('')
    submitting.current = true

    mutation.mutate({
      rejectionReason,
      adminRemarks: remarks.trim() || undefined,
    })
  }

  function close() {
    if (mutation.isPending) return
    onClose(null)
  }

  return (
    <Modal
      title={`${approve ? 'Approve' : 'Reject'} claim #${claim.claimNumber}`}
      onClose={close}
      footer={
        <div className="ix-claims-modal-actions">
          <Button
            type="button"
            onClick={close}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>

          {!uncertain && (
            <Button
              type="button"
              variant={approve ? 'dark' : 'danger'}
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onClick={submit}
            >
              {approve ? 'Approve claim' : 'Reject claim'}
            </Button>
          )}
        </div>
      }
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}

        <div className="alert info">
          <span>
            Claim <strong>#{claim.claimNumber}</strong>
            {' · '}Policy <strong>#{getPolicyNumber(claim)}</strong>
            {' · '}Requested <strong>{inr(claim.amount)}</strong>
          </span>
        </div>

        {approve ? (
          <TextInput
            label="Approved amount (₹)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            disabled={mutation.isPending || uncertain}
            onChange={(event) => {
              setAmount(event.target.value)
              setError('')
            }}
          />
        ) : (
          <TextArea
            label="Reason for rejection"
            value={reason}
            disabled={mutation.isPending || uncertain}
            onChange={(event) => {
              setReason(event.target.value)
              setError('')
            }}
            hint="This reason may be shown to the customer."
          />
        )}

        <TextArea
          label="Remarks (optional)"
          value={remarks}
          disabled={mutation.isPending || uncertain}
          onChange={(event) => {
            setRemarks(event.target.value)
            setError('')
          }}
        />
      </form>
    </Modal>
  )
}

/* =========================================================
   CLAIM DETAILS
========================================================= */

function ClaimView({
  claim,
  onClose,
  onDecide,
  onSettle,
}) {
  const approved = isApproved(claim)

  const settlementQuery = useQuery({
    queryKey: ['a-settlement-claim', claim.claimNumber],
    queryFn: () => settlements.byClaim(claim.claimNumber),
    enabled: approved,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })

  const existing = useMemo(
    () => normalizeSettlements(settlementQuery.data),
    [settlementQuery.data],
  )

  const canCreateSettlement =
    approved &&
    settlementQuery.isSuccess &&
    existing.length === 0

  return (
    <Modal
      title={`Claim #${claim.claimNumber}`}
      wide
      onClose={onClose}
      footer={
        <div className="ix-claims-modal-actions">
          {canReview(claim) && (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => onDecide('reject')}
              >
                Reject
              </Button>

              <Button
                type="button"
                variant="dark"
                onClick={() => onDecide('approve')}
              >
                Approve
              </Button>
            </>
          )}

          {canCreateSettlement && (
            <Button
              type="button"
              variant="primary"
              onClick={onSettle}
            >
              Create settlement
            </Button>
          )}

          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="stack">
        <div className="row spread wrap">
          <StatusBadge value={claim.status} />

          <span className="muted">
            Filed {date(claim.claimDate)}
          </span>
        </div>

        <Details
          items={[
            ['Claim', `#${claim.claimNumber}`],
            ['Policy', `#${getPolicyNumber(claim)}`],
            ['Claim type', claim.claimType || '—'],
            ['Amount claimed', inr(claim.amount)],
            ['Incident date', date(claim.incidentDate)],
            ['Location', claim.incidentLocation || '—'],
            ['Document reference', claim.nFilepo || '—'],
          ]}
        />

        <div>
          <h4 style={{ marginBottom: 6 }}>
            Customer's description
          </h4>

          <p className="muted">
            {claim.description || 'No description provided.'}
          </p>
        </div>

        {approved && (
          <div className="alert ok">
            <span>
              <strong>
                Approved for {inr(claim.approvedAmount)}
              </strong>

              {claim.reviewedDate && (
                <> on {date(claim.reviewedDate)}</>
              )}

              {claim.adminRemarks && (
                <>. Remarks: {claim.adminRemarks}</>
              )}
            </span>
          </div>
        )}

        {normalizeStatus(claim.status) === 'REJECTED' && (
          <div className="alert error">
            <span>
              <strong>Rejected</strong>

              {claim.reviewedDate && (
                <> on {date(claim.reviewedDate)}</>
              )}

              . Reason:{' '}
              {claim.rejectionReason ||
                'No rejection reason was provided.'}

              {claim.adminRemarks && (
                <> Remarks: {claim.adminRemarks}</>
              )}
            </span>
          </div>
        )}

        {approved && (
          <div className="stack">
            <h4>Settlements</h4>

            {settlementQuery.isPending ? (
              <p className="muted">
                Checking settlement records…
              </p>
            ) : settlementQuery.isError ? (
              <div className="alert error" role="alert">
                <span>
                  Could not verify existing settlements.
                  Creating a new settlement is disabled
                  until this check succeeds.
                </span>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => settlementQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : existing.length > 0 ? (
              existing.map((settlement) => (
                <div
                  key={settlement.settlementNumber}
                  className="row spread wrap"
                  style={{
                    padding: '12px 0',
                    gap: 12,
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div>
                    <strong>
                      #{settlement.settlementNumber}
                    </strong>

                    <div className="muted">
                      {inr(settlement.amount)}
                      {' · '}
                      {date(settlement.settlementDate)}
                    </div>
                  </div>

                  <StatusBadge
                    value={settlement.settlementStatus}
                  />
                </div>
              ))
            ) : (
              <div className="alert warn">
                This claim is approved but does not
                have a settlement yet.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* =========================================================
   ADMIN CLAIMS PAGE
========================================================= */

export default function Claims() {
  const location = useLocation()
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const toast = useToast()

  const [status, setStatus] = useState('all')
  const [viewId, setViewId] = useState(null)
  const [decisionMode, setDecisionMode] = useState(null)
  const [settleClaimId, setSettleClaimId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [pageError, setPageError] = useState('')
  const [uncertainDeleteId, setUncertainDeleteId] = useState(null)

  const deleteLock = useRef(false)
  const handledNavigation = useRef(null)

  /* =======================================================
     FETCH CLAIMS
  ======================================================= */

  const query = useQuery({
    queryKey: ['a-claims'],
    queryFn: claims.getAll,
    staleTime: 10_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const all = useMemo(
    () => normalizeRows(query.data),
    [query.data],
  )

  const [search, setSearch, searched] = useFilter(
    all,
    SEARCH_FIELDS,
  )

  /* =======================================================
     FILTERING
  ======================================================= */

  const rows = useMemo(
    () =>
      (searched || [])
        .filter((claim) => {
          if (status === 'all') return true

          if (status === 'PENDING') {
            return canReview(claim)
          }

          return normalizeStatus(claim.status) === status
        })
        .slice()
        .sort(
          (a, b) =>
            Number(b.claimNumber || 0) -
            Number(a.claimNumber || 0),
        ),
    [searched, status],
  )

  const pendingCount = all.filter(canReview).length

  const approvedCount = all.filter(
    (claim) => isApproved(claim),
  ).length

  const rejectedCount = all.filter(
    (claim) => normalizeStatus(claim.status) === 'REJECTED',
  ).length

  /* =======================================================
     CURRENT CLAIMS

     Selected dialogs use fresh query data.
  ======================================================= */

  const findClaim = (id) => {
    if (id == null) return null

    return (
      all.find(
        (claim) =>
          String(claim.claimNumber) === String(id),
      ) || null
    )
  }

  const viewed = findClaim(viewId)
  const settling = findClaim(settleClaimId)
  const deleting = findClaim(deleteId)

  /* =======================================================
     OPEN CLAIM FROM ANOTHER PAGE
  ======================================================= */

  useEffect(() => {
    const requestedId = location.state?.open

    if (requestedId == null || !query.isSuccess) {
      return
    }

    const requestKey = `${location.key}:${requestedId}`

    if (handledNavigation.current === requestKey) {
      return
    }

    handledNavigation.current = requestKey

    const found = all.find(
      (claim) =>
        String(claim.claimNumber) === String(requestedId),
    )

    if (found) {
      setViewId(found.claimNumber)
    }

    navigate(
      `${location.pathname}${location.search}${location.hash}`,
      {
        replace: true,
        state: null,
      },
    )
  }, [
    location.key,
    location.state,
    location.pathname,
    location.search,
    location.hash,
    query.isSuccess,
    all,
    navigate,
  ])

  /* =======================================================
     REFRESH RELATED DATA
  ======================================================= */

  async function refreshClaims() {
    setPageError('')

    try {
      const result = await query.refetch()

      if (result.error) {
        throw result.error
      }
    } catch (error) {
      setPageError(
        errorMessage(error, 'Unable to refresh claims.'),
      )
    }
  }

  /* =======================================================
     DELETE CLAIM

     Existing backend endpoint retained.
  ======================================================= */

  const remove = useMutation({
    mutationFn: (claimNumber) =>
      claims.remove(claimNumber),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setUncertainDeleteId(null)

      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['a-claims'],
          }),

          queryClient.invalidateQueries({
            queryKey: ['a-settlements'],
          }),
        ])
      } catch {
        // Deletion succeeded even if refresh fails.
      }

      toast.success('Claim deleted successfully.')
    },

    onError: async (error, claimNumber) => {
      if (isUncertainError(error)) {
        setUncertainDeleteId(claimNumber)

        setPageError(
          `Deletion of claim #${claimNumber} could not be confirmed. Refresh the claim list before taking further action.`,
        )

        setDeleteId(null)

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-claims'],
          })
        } catch {
          // Preserve the warning.
        }

        return
      }

      toast.error(
        errorMessage(
          error,
          'Could not delete this claim.',
        ),
      )
    },

    onSettled: () => {
      deleteLock.current = false
    },
  })

  function submitDelete() {
    if (
      !deleting ||
      remove.isPending ||
      deleteLock.current ||
      String(uncertainDeleteId) ===
        String(deleting.claimNumber)
    ) {
      return
    }

    deleteLock.current = true
    remove.mutate(deleting.claimNumber)
  }

  /* =======================================================
     DECISION COMPLETED

     Refresh claims before offering settlement creation.
  ======================================================= */

  async function finishDecision(approvedClaim) {
    setDecisionMode(null)
    setViewId(null)

    if (!approvedClaim) return

    try {
      const result = await query.refetch()

      const latest = normalizeRows(result.data).find(
        (claim) =>
          String(claim.claimNumber) ===
          String(approvedClaim.claimNumber),
      )

      if (latest && isApproved(latest)) {
        setSettleClaimId(latest.claimNumber)
      } else {
        toast.error(
          'Approval was submitted, but the latest approved claim could not be verified. Refresh the claim list before creating a settlement.',
        )
      }
    } catch {
      toast.error(
        'Unable to verify the approved claim. Refresh before creating its settlement.',
      )
    }
  }

  /* =======================================================
     STYLES
  ======================================================= */

  return (
    <>
      <style>{`
        .ix-admin-claims-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ix-admin-claims-table {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ix-admin-claims-table .table-wrap {
          max-width: 100%;
          overflow-x: auto;
        }

        .ix-admin-claims-table table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
        }

        .ix-admin-claims-table th,
        .ix-admin-claims-table td {
          padding: 13px 14px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .ix-admin-claims-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          white-space: nowrap;
        }

        .ix-admin-claims-actions button {
          flex-shrink: 0;
        }

        .ix-claims-modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 700px) {
          .ix-admin-claims-table table {
            min-width: 980px;
          }

          .ix-admin-claims-table th,
          .ix-admin-claims-table td {
            padding: 11px 12px;
          }

          .ix-claims-modal-actions {
            justify-content: stretch;
          }
        }
      `}</style>

      <PageHeader
        title="Claims"
        subtitle="Review customer claims, record decisions, and create settlements for approved claims."
      >
        <Button
          type="button"
          onClick={refreshClaims}
          disabled={query.isFetching}
        >
          {query.isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </PageHeader>

      {pageError && (
        <div className="alert error" role="alert">
          {pageError}
        </div>
      )}

      <div className="ledger" style={{ marginBottom: 20 }}>
        <div>
          <div className="label">Awaiting review</div>
          <div className="value">
            {query.isPending ? '…' : pendingCount}
          </div>
        </div>

        <div>
          <div className="label">Approved</div>
          <div className="value">
            {query.isPending ? '…' : approvedCount}
          </div>
        </div>

        <div>
          <div className="label">Rejected</div>
          <div className="value">
            {query.isPending ? '…' : rejectedCount}
          </div>
        </div>

        <div>
          <div className="label">Total claims</div>
          <div className="value">
            {query.isPending ? '…' : all.length}
          </div>
        </div>
      </div>

      <Panel flush>
        <div className="toolbar ix-admin-claims-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search claim, policy, type or location"
          />

          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              {
                value: 'PENDING',
                label: `Awaiting review (${pendingCount})`,
              },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'SETTLED', label: 'Settled' },
            ]}
          />
        </div>

        <DataState
          query={query}
          empty={{
            title: 'No claims yet',
            text: 'Customer claims will appear here for review.',
          }}
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching claims</h4>

                <p className="muted">
                  Try another search or status filter.
                </p>

                <Button
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className="ix-admin-claims-table"
                role="region"
                aria-label="Admin claims table"
                tabIndex={0}
              >
                <Table
                  rowKey="claimNumber"
                  rows={rows}
                  onRowClick={(claim) =>
                    setViewId(claim.claimNumber)
                  }
                  columns={[
                    {
                      key: 'claimNumber',
                      header: 'Claim',
                      render: (claim) => (
                        <strong>
                          #{claim.claimNumber}
                        </strong>
                      ),
                    },
                    {
                      key: 'policyNumber',
                      header: 'Policy',
                      render: (claim) =>
                        `#${getPolicyNumber(claim)}`,
                    },
                    {
                      key: 'claimType',
                      header: 'Type',
                      render: (claim) =>
                        claim.claimType || '—',
                    },
                    {
                      key: 'claimDate',
                      header: 'Filed',
                      render: (claim) =>
                        date(claim.claimDate),
                    },
                    {
                      key: 'amount',
                      header: 'Claimed',
                      render: (claim) =>
                        inr(claim.amount),
                    },
                    {
                      key: 'approvedAmount',
                      header: 'Approved',
                      render: (claim) =>
                        ['APPROVED', 'SETTLED'].includes(
                          normalizeStatus(claim.status),
                        )
                          ? inr(claim.approvedAmount)
                          : '—',
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (claim) => (
                        <StatusBadge value={claim.status} />
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      render: (claim) => {
                        const stop = (action) => (event) => {
                          event?.stopPropagation?.()
                          action()
                        }

                        return (
                          <div className="ix-admin-claims-actions">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                canReview(claim)
                                  ? 'dark'
                                  : undefined
                              }
                              onClick={stop(() =>
                                setViewId(claim.claimNumber),
                              )}
                            >
                              {canReview(claim)
                                ? 'Review'
                                : 'View'}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={remove.isPending}
                              onClick={stop(() =>
                                setDeleteId(claim.claimNumber),
                              )}
                            >
                              Delete
                            </Button>
                          </div>
                        )
                      },
                    },
                  ]}
                />
              </div>
            )
          }
        </DataState>
      </Panel>

      {viewed && !decisionMode && !settleClaimId && (
        <ClaimView
          claim={viewed}
          onClose={() => setViewId(null)}
          onDecide={setDecisionMode}
          onSettle={() => {
            setViewId(null)
            setSettleClaimId(viewed.claimNumber)
          }}
        />
      )}

      {decisionMode && viewed && (
        <Decision
          key={`${viewed.claimNumber}-${decisionMode}`}
          claim={viewed}
          mode={decisionMode}
          onClose={finishDecision}
        />
      )}

      {settling && (
        <SettlementForm
          key={settling.claimNumber}
          claim={settling}
          onClose={async () => {
            setSettleClaimId(null)

            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: ['a-settlement-claim'],
              }),

              queryClient.invalidateQueries({
                queryKey: ['a-settlements'],
              }),

              queryClient.invalidateQueries({
                queryKey: ['a-claims'],
              }),
            ])
          }}
        />
      )}

      {deleting && (
        <Confirm
          danger
          title="Delete this claim?"
          message={
            `Delete claim #${deleting.claimNumber}? ` +
            'This may affect related settlement records. ' +
            'Only proceed if deletion is permitted by your backend.'
          }
          confirmLabel="Delete claim"
          loading={remove.isPending}
          onClose={() => {
            if (!remove.isPending) {
              setDeleteId(null)
            }
          }}
          onConfirm={submitDelete}
        />
      )}
    </>
  )
}

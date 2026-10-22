import { useMemo, useRef, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { policies, policyHolders } from '../../api/endpoints'
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
  SelectInput,
  StatusBadge,
  Table,
  TextInput,
  useFilter,
  useToast,
} from '../../components/ui'

import { PLANS } from '../../lib/premium'
import { date, today } from '../../lib/format'

/* =========================================================
   INSUREX — ADMIN POLICY MANAGEMENT
========================================================= */

const TYPES = [
  ...new Set(
    PLANS.map((plan) => `${plan.label} Insurance`),
  ),
]

const SEARCH_FIELDS = [
  'policyNumber',
  'coveredTypes',
  'policyHolderId',
  'holderName',
]

/* =========================================================
   HELPERS
========================================================= */

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }

  return []
}

function isActive(policy) {
  const value = policy?.isActive

  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  )
}

function getHolderId(record) {
  return (
    record?.policyHolderId ??
    record?.policyHolder?.policyHolderId ??
    null
  )
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

function calendarDate(value) {
  if (!value) return ''

  return String(value).slice(0, 10)
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)

  const parsed = new Date(
    Date.UTC(year, month - 1, day),
  )

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

/*
 * Adds calendar years without local timezone conversion.
 * February 29 becomes February 28 when the target
 * year is not a leap year.
 */
function addYears(value, years) {
  const start = calendarDate(value)
  const duration = Number(years)

  if (
    !validDate(start) ||
    !Number.isInteger(duration) ||
    duration < 1
  ) {
    return ''
  }

  const [year, month, day] = start
    .split('-')
    .map(Number)

  const targetYear = year + duration

  const lastDay = new Date(
    Date.UTC(targetYear, month, 0),
  ).getUTCDate()

  const targetDay = Math.min(day, lastDay)

  return [
    targetYear,
    String(month).padStart(2, '0'),
    String(targetDay).padStart(2, '0'),
  ].join('-')
}

/*
 * A policy's configured active flag and its expiry
 * are separate concepts.
 *
 * Expired policies should never be shown as
 * available for purchase merely because isActive
 * is still true.
 */
function getPolicyStatus(policy) {
  const suppliedStatus = String(
    policy?.status ?? '',
  ).trim().toUpperCase()

  const expiry = calendarDate(policy?.expiryDate)

  if (
    validDate(expiry) &&
    expiry < today()
  ) {
    return 'EXPIRED'
  }

  if (
    suppliedStatus === 'EXPIRED'
  ) {
    return 'EXPIRED'
  }

  if (
    suppliedStatus === 'ACTIVE' ||
    suppliedStatus === 'INACTIVE'
  ) {
    return isActive(policy) ? 'ACTIVE' : 'INACTIVE'
  }

  return isActive(policy) ? 'ACTIVE' : 'INACTIVE'
}

function displayValue(value) {
  return value == null || value === ''
    ? '—'
    : value
}

/* =========================================================
   POLICY FORM
========================================================= */

function PolicyForm({
  policy,
  onClose,
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const submitLock = useRef(false)

  const holdersQuery = useQuery({
    queryKey: ['a-holders'],
    queryFn: policyHolders.getAll,
    staleTime: 15_000,
  })

  const [form, setForm] = useState({
    coveredTypes: policy?.coveredTypes ?? '',
    startDate: calendarDate(
      policy?.startDate,
    ) || today(),
    durationYears: policy?.durationYears ?? 1,
    policyHolderId: getHolderId(policy) ?? '',
    isActive: policy ? isActive(policy) : true,
  })

  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)

  const expiryDate = addYears(
    form.startDate,
    form.durationYears,
  )

  const holderList = useMemo(
    () => normalizeRows(holdersQuery.data),
    [holdersQuery.data],
  )

  const holderOptions = useMemo(
    () =>
      holderList.map((holder) => ({
        value: String(holder.policyHolderId),
        label: `${holder.name || 'Policy holder'} (#${holder.policyHolderId})`,
      })),
    [holderList],
  )

  const typeOptions = useMemo(() => {
    const available = [...TYPES]

    if (
      form.coveredTypes &&
      !available.includes(form.coveredTypes)
    ) {
      available.unshift(form.coveredTypes)
    }

    return available.map((value) => ({
      value,
      label: value,
    }))
  }, [form.coveredTypes])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setError('')
  }

  /* =======================================================
     SAVE MUTATION
  ======================================================= */

  const save = useMutation({
    mutationFn: (body) =>
      policy
        ? policies.update(policy.policyNumber, body)
        : policies.save(body),

    retry: false,

    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-policies'],
        })
      } catch {
        // Saving succeeded even if refreshing fails.
      }

      toast.success(
        policy
          ? 'Policy updated successfully.'
          : 'Policy created successfully.',
      )

      onClose()
    },

    onError: async (requestError) => {
      if (isUncertainError(requestError)) {
        setUncertain(true)

        setError(
          'The server did not confirm whether the policy was saved. Close this form and refresh the policy list before trying again.',
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-policies'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      setError(
        errorMessage(
          requestError,
          'Could not save this policy.',
        ),
      )
    },

    onSettled: () => {
      submitLock.current = false
    },
  })

  /* =======================================================
     VALIDATION
  ======================================================= */

  function submit(event) {
    event?.preventDefault?.()

    if (
      save.isPending ||
      submitLock.current ||
      uncertain
    ) {
      return
    }

    if (!form.coveredTypes) {
      setError('Choose the insurance cover type.')
      return
    }

    if (!validDate(form.startDate)) {
      setError('Choose a valid start date.')
      return
    }

    const duration = Number(form.durationYears)

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 5
    ) {
      setError('Policy term must be between 1 and 5 years.')
      return
    }

    if (!expiryDate) {
      setError('Could not calculate the expiry date.')
      return
    }

    if (
      form.isActive &&
      expiryDate < today()
    ) {
      setError(
        'An expired policy cannot be active. Update its dates or mark it inactive.',
      )
      return
    }

    if (form.policyHolderId) {
      if (!holdersQuery.isSuccess) {
        setError(
          'Policy holders could not be verified. Refresh the holder list.',
        )
        return
      }

      const holderExists = holderList.some(
        (holder) =>
          String(holder.policyHolderId) ===
          String(form.policyHolderId),
      )

      if (!holderExists) {
        setError('Choose a valid policy holder.')
        return
      }
    }

    setError('')
    submitLock.current = true

    save.mutate({
      coveredTypes: form.coveredTypes,
      startDate: form.startDate,
      durationYears: duration,
      expiryDate,
      isActive: Boolean(form.isActive),

      policyHolderId: form.policyHolderId
        ? Number(form.policyHolderId)
        : undefined,
    })
  }

  function close() {
    if (save.isPending) return
    onClose()
  }

  return (
    <Modal
      title={
        policy
          ? `Edit policy #${policy.policyNumber}`
          : 'New policy'
      }
      wide
      onClose={close}
      footer={
        <div className="ix-policies-modal-actions">
          <Button
            type="button"
            disabled={save.isPending}
            onClick={close}
          >
            Cancel
          </Button>

          {!uncertain && (
            <Button
              type="button"
              variant="dark"
              loading={save.isPending}
              disabled={save.isPending}
              onClick={submit}
            >
              {policy ? 'Save changes' : 'Create policy'}
            </Button>
          )}
        </div>
      }
    >
      <form
        className="form-grid"
        onSubmit={submit}
        noValidate
      >
        {error && (
          <div
            className="alert error full"
            role="alert"
          >
            {error}
          </div>
        )}

        <SelectInput
          label="Cover type"
          value={form.coveredTypes}
          disabled={save.isPending || uncertain}
          onChange={(event) =>
            updateField(
              'coveredTypes',
              event.target.value,
            )
          }
          options={typeOptions}
          placeholder="Choose insurance type…"
        />

        <SelectInput
          label="Policy holder (optional)"
          value={String(form.policyHolderId)}
          disabled={
            save.isPending ||
            uncertain ||
            holdersQuery.isPending
          }
          onChange={(event) =>
            updateField(
              'policyHolderId',
              event.target.value,
            )
          }
          placeholder="Open to all customers"
          options={holderOptions}
          hint="Leave empty for an open policy available to eligible customers."
        />

        <TextInput
          label="Start date"
          type="date"
          value={form.startDate}
          disabled={save.isPending || uncertain}
          onChange={(event) =>
            updateField(
              'startDate',
              event.target.value,
            )
          }
        />

        <TextInput
          label="Term (years)"
          type="number"
          min="1"
          max="5"
          value={form.durationYears}
          disabled={save.isPending || uncertain}
          onChange={(event) =>
            updateField(
              'durationYears',
              event.target.value,
            )
          }
          hint={
            expiryDate
              ? `Expires ${date(expiryDate)}`
              : 'Choose a valid date and term.'
          }
        />

        <label
          className="row full"
          style={{
            gap: 10,
            alignItems: 'center',
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(form.isActive)}
            disabled={save.isPending || uncertain}
            onChange={(event) =>
              updateField(
                'isActive',
                event.target.checked,
              )
            }
          />

          <span>
            Active and available for purchase
          </span>
        </label>

        <div className="full alert info">
          <strong>Policy preview</strong>

          <div style={{ marginTop: 8 }}>
            Cover: {form.coveredTypes || 'Not selected'}
          </div>

          <div style={{ marginTop: 4 }}>
            Starts: {date(form.startDate)}
          </div>

          <div style={{ marginTop: 4 }}>
            Expires:{' '}
            {expiryDate ? date(expiryDate) : '—'}
          </div>

          <div style={{ marginTop: 4 }}>
            Availability:{' '}
            {expiryDate && expiryDate < today()
              ? 'Expired'
              : form.isActive
                ? 'Active'
                : 'Inactive'}
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* =========================================================
   ADMIN POLICIES PAGE
========================================================= */

export default function Policies() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const toggleLock = useRef(false)
  const deleteLock = useRef(false)

  const query = useQuery({
    queryKey: ['a-policies'],
    queryFn: policies.getAll,
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const holdersQuery = useQuery({
    queryKey: ['a-holders'],
    queryFn: policyHolders.getAll,
    staleTime: 15_000,
  })

  const [formId, setFormId] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [toggleId, setToggleId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const [status, setStatus] = useState('all')
  const [pageError, setPageError] = useState('')
  const [uncertainAction, setUncertainAction] = useState(null)

  /* =======================================================
     DATA
  ======================================================= */

  const policyList = useMemo(
    () => normalizeRows(query.data),
    [query.data],
  )

  const holderList = useMemo(
    () => normalizeRows(holdersQuery.data),
    [holdersQuery.data],
  )

  const holderMap = useMemo(
    () =>
      new Map(
        holderList.map((holder) => [
          String(holder.policyHolderId),
          holder,
        ]),
      ),
    [holderList],
  )

  const all = useMemo(
    () =>
      policyList.map((policy) => {
        const holderId = getHolderId(policy)
        const holder = holderMap.get(String(holderId))

        return {
          ...policy,
          policyHolderId: holderId,
          holderName:
            holder?.name ||
            policy.policyHolder?.name ||
            '',
        }
      }),
    [policyList, holderMap],
  )

  const [search, setSearch, searched] = useFilter(
    all,
    SEARCH_FIELDS,
  )

  const rows = useMemo(
    () =>
      (searched || [])
        .filter((policy) => {
          if (status === 'all') return true

          return (
            getPolicyStatus(policy).toLowerCase() === status
          )
        })
        .slice()
        .sort(
          (a, b) =>
            Number(b.policyNumber || 0) -
            Number(a.policyNumber || 0),
        ),
    [searched, status],
  )

  /* =======================================================
     SUMMARY
  ======================================================= */

  const activeCount = all.filter(
    (policy) => getPolicyStatus(policy) === 'ACTIVE',
  ).length

  const inactiveCount = all.filter(
    (policy) => getPolicyStatus(policy) === 'INACTIVE',
  ).length

  const expiredCount = all.filter(
    (policy) => getPolicyStatus(policy) === 'EXPIRED',
  ).length

  /* =======================================================
     SELECTED RECORDS
  ======================================================= */

  function findPolicy(id) {
    if (id == null) return null

    return (
      all.find(
        (policy) =>
          String(policy.policyNumber) === String(id),
      ) || null
    )
  }

  const viewed = findPolicy(viewId)
  const editing = findPolicy(formId)
  const toggling = findPolicy(toggleId)
  const deleting = findPolicy(deleteId)

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshPolicies() {
    setPageError('')

    try {
      const result = await query.refetch()

      if (result.error) {
        throw result.error
      }
    } catch (requestError) {
      setPageError(
        errorMessage(
          requestError,
          'Could not refresh policies.',
        ),
      )
    }
  }

  /* =======================================================
     ACTIVATE / DEACTIVATE
  ======================================================= */

  const toggle = useMutation({
    mutationFn: (policy) => {
      if (
        !isActive(policy) &&
        getPolicyStatus(policy) === 'EXPIRED'
      ) {
        throw new Error(
          'Expired policies cannot be activated. Update the policy dates first.',
        )
      }

      return isActive(policy)
        ? policies.deactivate(policy.policyNumber)
        : policies.activate(policy.policyNumber)
    },

    retry: false,

    onSuccess: async (_, policy) => {
      setToggleId(null)
      setUncertainAction(null)

      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-policies'],
        })
      } catch {
        // Status change already succeeded.
      }

      toast.success(
        isActive(policy)
          ? 'Policy deactivated successfully.'
          : 'Policy activated successfully.',
      )
    },

    onError: async (requestError, policy) => {
      setToggleId(null)

      if (isUncertainError(requestError)) {
        setUncertainAction({
          type: 'toggle',
          policyNumber: policy.policyNumber,
        })

        setPageError(
          `The status change for policy #${policy.policyNumber} could not be confirmed. Refresh the policy list before trying again.`,
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-policies'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not update policy status.',
        ),
      )
    },

    onSettled: () => {
      toggleLock.current = false
    },
  })

  function confirmToggle() {
    if (
      !toggling ||
      toggle.isPending ||
      toggleLock.current
    ) {
      return
    }

    if (
      uncertainAction?.type === 'toggle' &&
      String(uncertainAction.policyNumber) ===
        String(toggling.policyNumber)
    ) {
      return
    }

    toggleLock.current = true
    toggle.mutate(toggling)
  }

  /* =======================================================
     DELETE
  ======================================================= */

  const remove = useMutation({
    mutationFn: (policyNumber) =>
      policies.remove(policyNumber),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setUncertainAction(null)

      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-policies'],
        })
      } catch {
        // Deletion already succeeded.
      }

      toast.success('Policy deleted successfully.')
    },

    onError: async (requestError, policyNumber) => {
      setDeleteId(null)

      if (isUncertainError(requestError)) {
        setUncertainAction({
          type: 'delete',
          policyNumber,
        })

        setPageError(
          `Deletion of policy #${policyNumber} could not be confirmed. Refresh the policy list before trying again.`,
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-policies'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not delete this policy.',
        ),
      )
    },

    onSettled: () => {
      deleteLock.current = false
    },
  })

  function confirmDelete() {
    if (
      !deleting ||
      remove.isPending ||
      deleteLock.current
    ) {
      return
    }

    if (
      uncertainAction?.type === 'delete' &&
      String(uncertainAction.policyNumber) ===
        String(deleting.policyNumber)
    ) {
      return
    }

    deleteLock.current = true
    remove.mutate(deleting.policyNumber)
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>{`
        .ix-policies-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-policies-summary-card {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 14px;
          background: var(--surface, #fff);
        }

        .ix-policies-summary-card .label {
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        .ix-policies-summary-card .value {
          margin-top: 7px;
          font-size: 26px;
          font-weight: 750;
        }

        .ix-policies-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ix-policies-table-wrap table {
          width: 100%;
          min-width: 1120px;
        }

        .ix-policies-table-wrap th,
        .ix-policies-table-wrap td {
          padding: 12px 14px;
          vertical-align: middle;
        }

        .ix-policies-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          white-space: nowrap;
        }

        .ix-policies-modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .ix-policies-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .ix-policies-summary {
            gap: 10px;
          }

          .ix-policies-summary-card {
            padding: 14px;
          }

          .ix-policies-summary-card .value {
            font-size: 22px;
          }

          .ix-policies-table-wrap table {
            min-width: 1000px;
          }
        }

        @media (max-width: 360px) {
          .ix-policies-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageHeader
        title="Policies"
        subtitle="Manage insurance plans, policy availability, expiry dates, and assigned policy holders."
      >
        <Button
          type="button"
          variant="primary"
          icon="plus"
          onClick={() => setFormId('new')}
        >
          New policy
        </Button>
      </PageHeader>

      {pageError && (
        <div className="alert error" role="alert">
          {pageError}
        </div>
      )}

      {/* SUMMARY */}

      <div className="ix-policies-summary">
        <div className="ix-policies-summary-card">
          <div className="label">Total policies</div>
          <div className="value">
            {query.isPending ? '…' : all.length}
          </div>
        </div>

        <div className="ix-policies-summary-card">
          <div className="label">Active</div>
          <div className="value">
            {query.isPending ? '…' : activeCount}
          </div>
        </div>

        <div className="ix-policies-summary-card">
          <div className="label">Inactive</div>
          <div className="value">
            {query.isPending ? '…' : inactiveCount}
          </div>
        </div>

        <div className="ix-policies-summary-card">
          <div className="label">Expired</div>
          <div className="value">
            {query.isPending ? '…' : expiredCount}
          </div>
        </div>
      </div>

      {/* POLICY TABLE */}

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search policy, cover type, holder"
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

          <Button
            type="button"
            disabled={query.isFetching}
            onClick={refreshPolicies}
          >
            {query.isFetching
              ? 'Refreshing…'
              : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={query}
          empty={{
            title: 'No policies',
            text: 'Create your first insurance plan so customers can start buying.',
          }}
          emptyAction={
            <Button
              type="button"
              variant="dark"
              onClick={() => setFormId('new')}
            >
              New policy
            </Button>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching policies</h4>

                <p className="muted">
                  Try changing the search or status filter.
                </p>

                <Button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="ix-policies-table-wrap">
                <Table
                  rowKey="policyNumber"
                  rows={rows}
                  onRowClick={(policy) =>
                    setViewId(policy.policyNumber)
                  }
                  columns={[
                    {
                      key: 'policyNumber',
                      header: 'Policy',
                      render: (policy) => (
                        <strong>
                          #{policy.policyNumber}
                        </strong>
                      ),
                    },
                    {
                      key: 'coveredTypes',
                      header: 'Cover type',
                    },
                    {
                      key: 'policyHolderId',
                      header: 'Holder',
                      render: (policy) =>
                        policy.policyHolderId != null ? (
                          <div>
                            <strong>
                              {policy.holderName ||
                                `Holder #${policy.policyHolderId}`}
                            </strong>

                            <div
                              className="faint"
                              style={{ fontSize: 12 }}
                            >
                              #{policy.policyHolderId}
                            </div>
                          </div>
                        ) : (
                          <span className="faint">
                            Open policy
                          </span>
                        ),
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
                        `${displayValue(policy.durationYears)} yr`,
                    },
                    {
                      key: 'expiryDate',
                      header: 'Expires',
                      render: (policy) =>
                        date(policy.expiryDate),
                    },
                    {
                      key: 'hasClaims',
                      header: 'Claims',
                      render: (policy) =>
                        policy.hasClaims ? 'Yes' : 'None',
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (policy) => (
                        <StatusBadge
                          value={getPolicyStatus(policy)}
                        />
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      render: (policy) => {
                        const expired =
                          getPolicyStatus(policy) === 'EXPIRED'

                        const stop = (callback) => (event) => {
                          event?.stopPropagation?.()
                          callback()
                        }

                        return (
                          <div className="ix-policies-actions">
                            <Button
                              type="button"
                              size="sm"
                              onClick={stop(() =>
                                setViewId(policy.policyNumber),
                              )}
                            >
                              View
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={stop(() =>
                                setFormId(policy.policyNumber),
                              )}
                            >
                              Edit
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                toggle.isPending ||
                                (expired && !isActive(policy))
                              }
                              onClick={stop(() =>
                                setToggleId(policy.policyNumber),
                              )}
                            >
                              {expired && !isActive(policy)
                                ? 'Expired'
                                : isActive(policy)
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={remove.isPending}
                              onClick={stop(() =>
                                setDeleteId(policy.policyNumber),
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

      {/* POLICY DETAILS */}

      {viewed && (
        <Modal
          title={`Policy #${viewed.policyNumber}`}
          wide
          onClose={() => setViewId(null)}
          footer={
            <Button
              type="button"
              onClick={() => setViewId(null)}
            >
              Close
            </Button>
          }
        >
          <Details
            items={[
              ['Policy number', `#${viewed.policyNumber}`],
              ['Cover type', displayValue(viewed.coveredTypes)],
              ['Start date', date(viewed.startDate)],
              ['Term', `${viewed.durationYears ?? '—'} years`],
              ['Expiry date', date(viewed.expiryDate)],
              [
                'Status',
                <StatusBadge
                  value={getPolicyStatus(viewed)}
                />,
              ],
              [
                'Policy holder',
                viewed.policyHolderId != null
                  ? `${viewed.holderName || 'Holder'} (#${viewed.policyHolderId})`
                  : 'Open to eligible customers',
              ],
              ['Has claims', viewed.hasClaims ? 'Yes' : 'No'],
            ]}
          />
        </Modal>
      )}

      {/* CREATE */}

      {formId === 'new' && (
        <PolicyForm
          key="new-policy"
          policy={null}
          onClose={() => setFormId(null)}
        />
      )}

      {/* EDIT */}

      {editing && (
        <PolicyForm
          key={editing.policyNumber}
          policy={editing}
          onClose={() => setFormId(null)}
        />
      )}

      {/* TOGGLE CONFIRMATION */}

      {toggling && (
        <Confirm
          title={
            isActive(toggling)
              ? 'Deactivate this policy?'
              : 'Activate this policy?'
          }
          message={
            isActive(toggling)
              ? `Deactivate policy #${toggling.policyNumber}? It will no longer be available for new purchases when your backend enforces availability.`
              : `Activate policy #${toggling.policyNumber}? It will become available for eligible customers if its dates and other backend rules permit.`
          }
          confirmLabel={
            isActive(toggling)
              ? 'Deactivate policy'
              : 'Activate policy'
          }
          loading={toggle.isPending}
          onClose={() => {
            if (!toggle.isPending) {
              setToggleId(null)
            }
          }}
          onConfirm={confirmToggle}
        />
      )}

      {/* DELETE CONFIRMATION */}

      {deleting && (
        <Confirm
          danger
          title="Delete this policy?"
          message={
            `Delete policy #${deleting.policyNumber}? ` +
            'Existing purchases and claims may reference this policy. The backend may refuse deletion when related records exist.'
          }
          confirmLabel="Delete policy"
          loading={remove.isPending}
          onClose={() => {
            if (!remove.isPending) {
              setDeleteId(null)
            }
          }}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

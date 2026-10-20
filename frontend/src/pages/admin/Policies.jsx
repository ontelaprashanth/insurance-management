import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { policies, policyHolders } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  Confirm,
  DataState,
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

const TYPES = PLANS.map((p) => `${p.label} Insurance`)

/**
 * Adds years to a YYYY-MM-DD calendar date without relying
 * on the browser's local timezone.
 *
 * Handles leap-day dates by allowing JavaScript to normalize
 * the date if the target year is not a leap year.
 */
function addYears(value, years) {
  if (!value || !Number.isFinite(Number(years)) || Number(years) < 1) {
    return ''
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))

  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const duration = Number(years)

  const original = new Date(Date.UTC(year, month - 1, day))

  // Reject invalid calendar dates such as 2026-02-30.
  if (
    original.getUTCFullYear() !== year ||
    original.getUTCMonth() !== month - 1 ||
    original.getUTCDate() !== day
  ) {
    return ''
  }

  const targetYear = year + duration

  // Preserve the month and day where possible.
  // If the target year is not a leap year, use the last day
  // of the target month for dates such as February 29.
  const lastDay = new Date(
    Date.UTC(targetYear, month, 0),
  ).getUTCDate()

  const targetDay = Math.min(day, lastDay)

  const result = new Date(
    Date.UTC(targetYear, month - 1, targetDay),
  )

  const yyyy = result.getUTCFullYear()
  const mm = String(result.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(result.getUTCDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

/**
 * Prefer the backend status when available.
 * Otherwise derive status from expiryDate and isActive.
 */
function getPolicyStatus(policy) {
  const suppliedStatus = String(policy?.status ?? '')
    .trim()
    .toUpperCase()

  if (suppliedStatus) return suppliedStatus

  const expiryDate = String(policy?.expiryDate ?? '').slice(0, 10)

  if (expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    if (expiryDate < today()) {
      return 'EXPIRED'
    }
  }

  return policy?.isActive ? 'ACTIVE' : 'INACTIVE'
}

function PolicyForm({ policy, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()

  const holders = useQuery({
    queryKey: ['a-holders'],
    queryFn: policyHolders.getAll,
  })

  const [f, setF] = useState({
    coveredTypes: policy?.coveredTypes || '',
    startDate: policy?.startDate || today(),
    durationYears: policy?.durationYears ?? 1,
    policyHolderId: policy?.policyHolderId ?? '',
    isActive: policy?.isActive ?? true,
  })

  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: (body) =>
      policy
        ? policies.update(policy.policyNumber, body)
        : policies.save(body),

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['a-policies'],
      })

      toast.success(
        policy ? 'Policy updated' : 'Policy created',
      )

      onClose()
    },

    onError: (e) => {
      setError(
        errorMessage(e, 'Could not save this policy.'),
      )
    },
  })

  const expiryDate = addYears(
    f.startDate,
    f.durationYears,
  )

  function updateField(field, value) {
    setF((current) => ({
      ...current,
      [field]: value,
    }))

    if (error) setError('')
  }

  function submit() {
    if (!f.coveredTypes) {
      setError('Choose the cover type.')
      return
    }

    if (!f.startDate) {
      setError('Choose a start date.')
      return
    }

    if (
      !Number.isInteger(Number(f.durationYears)) ||
      Number(f.durationYears) < 1 ||
      Number(f.durationYears) > 5
    ) {
      setError('Term must be between 1 and 5 years.')
      return
    }

    if (!expiryDate) {
      setError('Could not calculate the expiry date.')
      return
    }

    setError('')

    save.mutate({
      coveredTypes: f.coveredTypes,
      startDate: f.startDate,
      durationYears: Number(f.durationYears),
      expiryDate,
      isActive: f.isActive,
      policyHolderId: f.policyHolderId
        ? Number(f.policyHolderId)
        : undefined,
    })
  }

  const types =
    f.coveredTypes && !TYPES.includes(f.coveredTypes)
      ? [f.coveredTypes, ...TYPES]
      : TYPES

  return (
    <Modal
      title={
        policy
          ? `Edit policy #${policy.policyNumber}`
          : 'New policy'
      }
      wide
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="dark"
            loading={save.isPending}
            onClick={submit}
          >
            Save policy
          </Button>
        </>
      }
    >
      <div className="form-grid">
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
          value={f.coveredTypes}
          onChange={(e) =>
            updateField('coveredTypes', e.target.value)
          }
          options={types}
          placeholder="Choose…"
        />

        <SelectInput
          label="Policy holder (optional)"
          value={f.policyHolderId}
          onChange={(e) =>
            updateField('policyHolderId', e.target.value)
          }
          placeholder="Open to all customers"
          options={(Array.isArray(holders.data) ? holders.data : []).map(
            (h) => ({
              value: h.policyHolderId,
              label: `${h.name} (#${h.policyHolderId})`,
            }),
          )}
        />

        <TextInput
          label="Start date"
          type="date"
          value={f.startDate}
          onChange={(e) =>
            updateField('startDate', e.target.value)
          }
        />

        <TextInput
          label="Term (years)"
          type="number"
          min="1"
          max="5"
          value={f.durationYears}
          onChange={(e) =>
            updateField('durationYears', e.target.value)
          }
          hint={
            expiryDate
              ? `Expires ${date(expiryDate)}`
              : 'Choose a valid start date and term.'
          }
        />

        <label
          className="row full"
          style={{ gap: 10 }}
        >
          <input
            type="checkbox"
            checked={Boolean(f.isActive)}
            onChange={(e) =>
              updateField('isActive', e.target.checked)
            }
          />

          Active and available for purchase
        </label>
      </div>
    </Modal>
  )
}

export default function Policies() {
  const qc = useQueryClient()
  const toast = useToast()

  const q = useQuery({
    queryKey: ['a-policies'],
    queryFn: policies.getAll,
  })

  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  const [status, setStatus] = useState('all')

  const policyList = Array.isArray(q.data) ? q.data : []

  const [search, setSearch, searched] = useFilter(
    policyList,
    ['policyNumber', 'coveredTypes'],
  )

  const rows = searched.filter((p) => {
    const policyStatus = getPolicyStatus(p)

    if (status === 'all') return true
    if (status === 'active') return policyStatus === 'ACTIVE'
    if (status === 'inactive') return policyStatus === 'INACTIVE'
    if (status === 'expired') return policyStatus === 'EXPIRED'

    return true
  })

  async function refresh(message) {
    await qc.invalidateQueries({
      queryKey: ['a-policies'],
    })

    toast.success(message)
  }

  const toggle = useMutation({
    mutationFn: (p) => {
      const currentStatus = getPolicyStatus(p)

      if (currentStatus === 'EXPIRED') {
        throw new Error(
          'Expired policies cannot be activated. Update the policy dates first.',
        )
      }

      return p.isActive
        ? policies.deactivate(p.policyNumber)
        : policies.activate(p.policyNumber)
    },

    onSuccess: async (_, p) => {
      await refresh(
        p.isActive
          ? 'Policy deactivated'
          : 'Policy activated',
      )
    },

    onError: (e) => {
      toast.error(
        errorMessage(e, 'Could not update policy status.'),
      )
    },
  })

  const remove = useMutation({
    mutationFn: (p) =>
      policies.remove(p.policyNumber),

    onSuccess: async () => {
      await refresh('Policy deleted')
      setDel(null)
    },

    onError: (e) => {
      toast.error(
        errorMessage(e, 'Could not delete this policy.'),
      )
      setDel(null)
    },
  })

  return (
    <>
      <PageHeader
        title="Policies"
        subtitle="The plans customers can buy and the policies already issued."
      >
        <Button
          type="button"
          variant="primary"
          icon="plus"
          onClick={() => setForm({})}
        >
          New policy
        </Button>
      </PageHeader>

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search policies"
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
            title: 'No policies',
            text: 'Create your first plan so customers can start buying.',
          }}
          emptyAction={
            <Button
              type="button"
              variant="dark"
              onClick={() => setForm({})}
            >
              New policy
            </Button>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching policies</h4>
                <p>
                  Try changing the status filter or search term.
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
                    render: (p) => (
                      <b>#{p.policyNumber}</b>
                    ),
                  },
                  {
                    key: 'coveredTypes',
                    header: 'Cover type',
                  },
                  {
                    key: 'policyHolderId',
                    header: 'Holder',
                    render: (p) =>
                      p.policyHolderId ? (
                        `#${p.policyHolderId}`
                      ) : (
                        <span className="faint">Open</span>
                      ),
                  },
                  {
                    key: 'startDate',
                    header: 'Starts',
                    render: (p) => date(p.startDate),
                  },
                  {
                    key: 'durationYears',
                    header: 'Term',
                    render: (p) =>
                      `${p.durationYears ?? '—'} yr`,
                  },
                  {
                    key: 'expiryDate',
                    header: 'Expires',
                    render: (p) => date(p.expiryDate),
                  },
                  {
                    key: 'hasClaims',
                    header: 'Claims',
                    render: (p) =>
                      p.hasClaims ? 'Yes' : 'None',
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (p) => (
                      <StatusBadge
                        value={getPolicyStatus(p)}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (p) => {
                      const policyStatus = getPolicyStatus(p)
                      const expired = policyStatus === 'EXPIRED'

                      return (
                        <div className="actions">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setForm(p)}
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              expired || toggle.isPending
                            }
                            onClick={() => toggle.mutate(p)}
                          >
                            {expired
                              ? 'Expired'
                              : p.isActive
                                ? 'Deactivate'
                                : 'Activate'}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDel(p)}
                          >
                            Delete
                          </Button>
                        </div>
                      )
                    },
                  },
                ]}
              />
            )
          }
        </DataState>
      </Panel>

      {form && (
        <PolicyForm
          policy={form.policyNumber ? form : null}
          onClose={() => setForm(null)}
        />
      )}

      {del && (
        <Confirm
          danger
          title="Delete this policy?"
          message={`Policy #${del.policyNumber} will be removed.${
            del.hasClaims
              ? ' It has claims attached, so the server may refuse.'
              : ''
          }`}
          confirmLabel="Delete policy"
          loading={remove.isPending}
          onClose={() => {
            if (!remove.isPending) setDel(null)
          }}
          onConfirm={() => remove.mutate(del)}
        />
      )}
    </>
  )
}

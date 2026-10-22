import { useMemo, useRef, useState } from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  Button,
  Confirm,
  DataState,
  Details,
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  SelectInput,
  Table,
  TextInput,
  useFilter,
  useToast,
} from '../../components/ui'

import { policyHolders, users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { date, today } from '../../lib/format'

/* =========================================================
   INSUREX — ADMIN POLICY HOLDERS
========================================================= */

const SEARCH_FIELDS = [
  'policyHolderId',
  'name',
  'userId',
  'username',
  'email',
]

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }
  return []
}

function getUserId(record) {
  return record?.userId ?? record?.user?.userId ?? null
}

function isCustomer(user) {
  return String(user?.role ?? '').toUpperCase() === 'USER'
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

function validDateOfBirth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00`)

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10)) &&
    value <= today()
  )
}

/* =========================================================
   CREATE / EDIT HOLDER
========================================================= */

function HolderForm({
  holder,
  holders,
  onClose,
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const submitLock = useRef(false)

  const usersQuery = useQuery({
    queryKey: ['a-users'],
    queryFn: users.getAll,
    staleTime: 15_000,
  })

  const [form, setForm] = useState({
    name: holder?.name ?? '',
    dob: holder?.dob ?? '',
    userId: getUserId(holder) ?? '',
  })

  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)

  const customers = useMemo(
    () => normalizeRows(usersQuery.data).filter(isCustomer),
    [usersQuery.data],
  )

  const occupiedUserIds = useMemo(
    () =>
      new Set(
        holders
          .filter(
            (item) =>
              String(item.policyHolderId) !==
              String(holder?.policyHolderId),
          )
          .map((item) => getUserId(item))
          .filter((id) => id != null)
          .map(String),
      ),
    [holders, holder?.policyHolderId],
  )

  const customerOptions = useMemo(
    () =>
      customers
        .filter((user) => {
          const id = String(user.userId)

          return (
            !occupiedUserIds.has(id) ||
            id === String(form.userId)
          )
        })
        .map((user) => ({
          value: String(user.userId),
          label: `${user.username || user.email || 'Customer'} (#${user.userId})`,
        })),
    [customers, occupiedUserIds, form.userId],
  )

  const save = useMutation({
    mutationFn: (body) =>
      holder
        ? policyHolders.update(holder.policyHolderId, body)
        : policyHolders.save(body),

    retry: false,

    onSuccess: async () => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['a-holders'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['a-users'],
          }),
        ])
      } catch {
        // Saving succeeded even if refresh fails.
      }

      toast.success(
        holder
          ? 'Policy holder updated successfully.'
          : 'Policy holder created successfully.',
      )

      onClose()
    },

    onError: async (requestError) => {
      if (isUncertainError(requestError)) {
        setUncertain(true)

        setError(
          'The server did not confirm whether the policy holder was saved. Close this form and refresh the list before attempting another save.',
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-holders'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      setError(
        errorMessage(
          requestError,
          'Could not save this policy holder.',
        ),
      )
    },

    onSettled: () => {
      submitLock.current = false
    },
  })

  function submit(event) {
    event?.preventDefault?.()

    if (
      save.isPending ||
      submitLock.current ||
      uncertain
    ) {
      return
    }

    const name = form.name.trim()
    const dob = form.dob
    const userId = String(form.userId)

    if (!name) {
      setError('Enter the policy holder’s full name.')
      return
    }

    if (name.length > 150) {
      setError('The name cannot exceed 150 characters.')
      return
    }

    if (!dob) {
      setError('Enter the date of birth.')
      return
    }

    if (!validDateOfBirth(dob)) {
      setError('Enter a valid date of birth that is not in the future.')
      return
    }

    if (!form.userId) {
      setError('Choose a customer account.')
      return
    }

    if (usersQuery.isError || !usersQuery.isSuccess) {
      setError(
        'Customer accounts could not be verified. Refresh the customer list and try again.',
      )
      return
    }

    const customerExists = customers.some(
      (customer) =>
        String(customer.userId) === userId,
    )

    if (!customerExists) {
      setError('Choose a valid customer account.')
      return
    }

    if (occupiedUserIds.has(userId)) {
      setError(
        'This customer already has a policy holder profile. Edit the existing profile instead.',
      )
      return
    }

    setError('')
    submitLock.current = true

    save.mutate({
      name,
      dob,
      userId: Number(form.userId),
    })
  }

  function close() {
    if (save.isPending) return
    onClose()
  }

  return (
    <Modal
      title={
        holder
          ? `Edit policy holder #${holder.policyHolderId}`
          : 'New policy holder'
      }
      onClose={close}
      footer={
        <div className="ix-holders-modal-actions">
          <Button
            type="button"
            onClick={close}
            disabled={save.isPending}
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
              {holder ? 'Save changes' : 'Create holder'}
            </Button>
          )}
        </div>
      }
    >
      <form
        className="stack"
        onSubmit={submit}
        noValidate
      >
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}

        <TextInput
          label="Full name"
          value={form.name}
          disabled={save.isPending || uncertain}
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              name: event.target.value,
            }))
            setError('')
          }}
        />

        <TextInput
          label="Date of birth"
          type="date"
          max={today()}
          value={form.dob}
          disabled={save.isPending || uncertain}
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              dob: event.target.value,
            }))
            setError('')
          }}
        />

        <SelectInput
          label="Customer account"
          value={String(form.userId)}
          disabled={
            save.isPending ||
            uncertain ||
            usersQuery.isPending
          }
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              userId: event.target.value,
            }))
            setError('')
          }}
          placeholder={
            usersQuery.isPending
              ? 'Loading customers…'
              : 'Choose a customer…'
          }
          options={customerOptions}
          hint="Customers normally receive a policy holder profile automatically during registration."
        />

        {usersQuery.isError && (
          <div className="alert error" role="alert">
            <span>Could not load customer accounts.</span>

            <Button
              type="button"
              size="sm"
              onClick={() => usersQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {!holder &&
          usersQuery.isSuccess &&
          customerOptions.length === 0 && (
            <div className="alert info">
              All listed customers already have policy holder
              profiles, or no customer accounts are available.
            </div>
          )}
      </form>
    </Modal>
  )
}

/* =========================================================
   POLICY HOLDERS PAGE
========================================================= */

export default function PolicyHolders() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const deleteLock = useRef(false)

  const holdersQuery = useQuery({
    queryKey: ['a-holders'],
    queryFn: policyHolders.getAll,
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const usersQuery = useQuery({
    queryKey: ['a-users'],
    queryFn: users.getAll,
    staleTime: 15_000,
  })

  const [formId, setFormId] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const [pageError, setPageError] = useState('')
  const [uncertainDeleteId, setUncertainDeleteId] = useState(null)

  const holders = useMemo(
    () => normalizeRows(holdersQuery.data),
    [holdersQuery.data],
  )

  const userList = useMemo(
    () => normalizeRows(usersQuery.data),
    [usersQuery.data],
  )

  const userMap = useMemo(
    () =>
      new Map(
        userList.map((user) => [
          String(user.userId),
          user,
        ]),
      ),
    [userList],
  )

  const enrichedHolders = useMemo(
    () =>
      holders.map((holder) => {
        const userId = getUserId(holder)
        const user = userMap.get(String(userId))

        return {
          ...holder,
          userId,
          username: user?.username || holder.user?.username || '',
          email: user?.email || holder.user?.email || '',
        }
      }),
    [holders, userMap],
  )

  const [search, setSearch, searched] = useFilter(
    enrichedHolders,
    SEARCH_FIELDS,
  )

  const rows = useMemo(
    () =>
      (searched || [])
        .slice()
        .sort(
          (a, b) =>
            Number(b.policyHolderId || 0) -
            Number(a.policyHolderId || 0),
        ),
    [searched],
  )

  const linkedCount = enrichedHolders.filter(
    (holder) => holder.userId != null,
  ).length

  const unlinkedCount = enrichedHolders.length - linkedCount

  function findHolder(id) {
    if (id == null) return null

    return (
      enrichedHolders.find(
        (holder) =>
          String(holder.policyHolderId) === String(id),
      ) || null
    )
  }

  const viewed = findHolder(viewId)
  const editing = findHolder(formId)
  const deleting = findHolder(deleteId)

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshData() {
    setPageError('')

    try {
      const results = await Promise.all([
        holdersQuery.refetch(),
        usersQuery.refetch(),
      ])

      const failed = results.find((result) => result.error)

      if (failed) {
        throw failed.error
      }
    } catch (requestError) {
      setPageError(
        errorMessage(
          requestError,
          'Could not refresh policy holders.',
        ),
      )
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  const remove = useMutation({
    mutationFn: (holderId) =>
      policyHolders.remove(holderId),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setUncertainDeleteId(null)

      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['a-holders'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['a-users'],
          }),
        ])
      } catch {
        // Deletion succeeded even if refresh fails.
      }

      toast.success('Policy holder deleted successfully.')
    },

    onError: async (requestError, holderId) => {
      setDeleteId(null)

      if (isUncertainError(requestError)) {
        setUncertainDeleteId(holderId)

        setPageError(
          `Deletion of policy holder #${holderId} could not be confirmed. Refresh the list before taking further action.`,
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-holders'],
          })
        } catch {
          // Preserve warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not delete this policy holder.',
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
      deleteLock.current ||
      String(deleting.policyHolderId) ===
        String(uncertainDeleteId)
    ) {
      return
    }

    deleteLock.current = true

    remove.mutate(deleting.policyHolderId)
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>{`
        .ix-holders-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-holders-summary-card {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 14px;
          background: var(--surface, #fff);
        }

        .ix-holders-summary-card .label {
          font-size: 12px;
          color: var(--muted, #64748b);
        }

        .ix-holders-summary-card .value {
          margin-top: 7px;
          font-size: 26px;
          font-weight: 750;
        }

        .ix-holders-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ix-holders-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ix-holders-table-wrap table {
          width: 100%;
          min-width: 850px;
        }

        .ix-holders-table-wrap th,
        .ix-holders-table-wrap td {
          padding: 12px 14px;
          vertical-align: middle;
        }

        .ix-holders-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          white-space: nowrap;
        }

        .ix-holders-modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 700px) {
          .ix-holders-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .ix-holders-summary-card {
            padding: 14px;
          }

          .ix-holders-summary-card .value {
            font-size: 22px;
          }

          .ix-holders-table-wrap table {
            min-width: 760px;
          }
        }

        @media (max-width: 380px) {
          .ix-holders-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <PageHeader
        title="Policy holders"
        subtitle="Manage insured profiles linked to customer accounts."
      >
        <Button
          type="button"
          variant="primary"
          icon="plus"
          onClick={() => setFormId('new')}
        >
          New policy holder
        </Button>
      </PageHeader>

      {pageError && (
        <div className="alert error" role="alert">
          {pageError}
        </div>
      )}

      {/* SUMMARY */}

      <div className="ix-holders-summary">
        <div className="ix-holders-summary-card">
          <div className="label">Policy holders</div>
          <div className="value">
            {holdersQuery.isPending ? '…' : enrichedHolders.length}
          </div>
        </div>

        <div className="ix-holders-summary-card">
          <div className="label">Linked accounts</div>
          <div className="value">
            {holdersQuery.isPending ? '…' : linkedCount}
          </div>
        </div>

        <div className="ix-holders-summary-card">
          <div className="label">Unlinked profiles</div>
          <div className="value">
            {holdersQuery.isPending ? '…' : unlinkedCount}
          </div>
        </div>
      </div>

      <Panel flush>
        <div className="toolbar ix-holders-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search holder, ID, or customer"
          />

          <Button
            type="button"
            disabled={
              holdersQuery.isFetching ||
              usersQuery.isFetching
            }
            onClick={refreshData}
          >
            {holdersQuery.isFetching || usersQuery.isFetching
              ? 'Refreshing…'
              : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={holdersQuery}
          empty={{
            title: 'No policy holders',
            text: 'Customer profiles normally appear after registration.',
          }}
          emptyAction={
            <Button
              type="button"
              variant="dark"
              onClick={() => setFormId('new')}
            >
              New policy holder
            </Button>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching policy holders</h4>

                <p className="muted">
                  Try a different search term.
                </p>

                <Button
                  type="button"
                  onClick={() => setSearch('')}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="ix-holders-table-wrap">
                <Table
                  rowKey="policyHolderId"
                  rows={rows}
                  onRowClick={(holder) =>
                    setViewId(holder.policyHolderId)
                  }
                  columns={[
                    {
                      key: 'policyHolderId',
                      header: 'ID',
                      render: (holder) => (
                        <strong>
                          #{holder.policyHolderId}
                        </strong>
                      ),
                    },
                    {
                      key: 'name',
                      header: 'Policy holder',
                      render: (holder) => (
                        <strong>
                          {holder.name || '—'}
                        </strong>
                      ),
                    },
                    {
                      key: 'dob',
                      header: 'Date of birth',
                      render: (holder) =>
                        date(holder.dob),
                    },
                    {
                      key: 'userId',
                      header: 'Customer account',
                      render: (holder) => (
                        <div>
                          <strong>
                            {holder.username ||
                              (holder.userId != null
                                ? `Customer #${holder.userId}`
                                : 'Not linked')}
                          </strong>

                          {holder.userId != null && (
                            <div
                              className="faint"
                              style={{ fontSize: 12 }}
                            >
                              #{holder.userId}
                              {holder.email
                                ? ` · ${holder.email}`
                                : ''}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      render: (holder) => {
                        const stop = (callback) => (event) => {
                          event?.stopPropagation?.()
                          callback()
                        }

                        return (
                          <div className="ix-holders-actions">
                            <Button
                              type="button"
                              size="sm"
                              onClick={stop(() =>
                                setViewId(holder.policyHolderId),
                              )}
                            >
                              View
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={stop(() =>
                                setFormId(holder.policyHolderId),
                              )}
                            >
                              Edit
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={remove.isPending}
                              onClick={stop(() =>
                                setDeleteId(holder.policyHolderId),
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

      {/* DETAILS */}

      {viewed && (
        <Modal
          title={`Policy holder #${viewed.policyHolderId}`}
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
              ['Holder ID', `#${viewed.policyHolderId}`],
              ['Full name', viewed.name || '—'],
              ['Date of birth', date(viewed.dob)],
              [
                'Customer',
                viewed.username ||
                  (viewed.userId != null
                    ? `Customer #${viewed.userId}`
                    : 'Not linked'),
              ],
              ['Customer ID', viewed.userId ?? '—'],
              ['Email', viewed.email || '—'],
            ]}
          />
        </Modal>
      )}

      {/* CREATE */}

      {formId === 'new' && (
        <HolderForm
          key="new-holder"
          holder={null}
          holders={holders}
          onClose={() => setFormId(null)}
        />
      )}

      {/* EDIT */}

      {editing && (
        <HolderForm
          key={editing.policyHolderId}
          holder={editing}
          holders={holders}
          onClose={() => setFormId(null)}
        />
      )}

      {/* DELETE */}

      {deleting && (
        <Confirm
          danger
          title="Delete policy holder?"
          message={
            `Delete ${deleting.name} (#${deleting.policyHolderId})? ` +
            'Existing policies, purchases, and claims may depend on this profile. The backend may reject deletion when related records exist.'
          }
          confirmLabel="Delete policy holder"
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

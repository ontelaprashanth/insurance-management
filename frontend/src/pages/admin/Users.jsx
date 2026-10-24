import { useMemo, useRef, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { users } from '../../api/endpoints'
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
  TextInput,
  useFilter,
  useToast,
} from '../../components/ui'

import { date, dateTime, inr } from '../../lib/format'

const SEARCH_FIELDS = [
  'userId',
  'username',
  'email',
  'contactNumber',
  'role',
  'occupation',
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

function isActive(user) {
  return (
    user?.isActive === true ||
    user?.isActive === 1 ||
    user?.isActive === '1' ||
    String(user?.isActive).toLowerCase() === 'true'
  )
}

function isAdmin(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN'
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

function displayValue(value) {
  return value == null || value === '' ? '—' : value
}

function maskValue(value, visible = 4) {
  const text = String(value || '').trim()

  if (!text) return '—'

  if (text.length <= visible) {
    return '•'.repeat(text.length)
  }

  return `${'•'.repeat(text.length - visible)}${text.slice(-visible)}`
}

/* =========================================================
   EDIT USER
========================================================= */

function EditUser({ user, onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const submitLock = useRef(false)

  const [form, setForm] = useState({
    username: user.username ?? '',
    email: user.email ?? '',
    contactNumber: user.contactNumber ?? '',
    occupation: user.occupation ?? '',
    income: user.income ?? '',
    aadharNumber: user.aadharNumber ?? '',
    bankName: user.bankName ?? '',
    accountNumber: user.accountNumber ?? '',
    ifscCode: user.ifscCode ?? '',
    password: '',
  })

  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)

  function updateField(field) {
    return (event) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))

      setError('')
    }
  }

  const save = useMutation({
    mutationFn: (body) => users.update(user.userId, body),

    retry: false,

    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({
          queryKey: ['a-users'],
        })
      } catch {
        // The update succeeded even if refreshing fails.
      }

      toast.success('User updated successfully.')
      onClose()
    },

    onError: async (requestError) => {
      if (isUncertainError(requestError)) {
        setUncertain(true)

        setError(
          'The server did not confirm the update. The changes may already have been saved. Close this form and refresh the user list before attempting another update.',
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-users'],
          })
        } catch {
          // Keep the warning visible.
        }

        return
      }

      setError(
        errorMessage(
          requestError,
          'Could not update this user.',
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

    const username = form.username.trim()
    const email = form.email.trim()
    const mobile = form.contactNumber.trim()
    const password = form.password

    if (!username) {
      setError('Username is required.')
      return
    }

    if (!email) {
      setError('Email is required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }

    const incomeText = String(form.income).trim()

    if (
      incomeText &&
      (
        !Number.isFinite(Number(incomeText)) ||
        Number(incomeText) < 0
      )
    ) {
      setError('Enter a valid yearly income.')
      return
    }

    const aadhaar = form.aadharNumber.trim()

    if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
      setError('Aadhaar must contain exactly 12 digits.')
      return
    }

    const ifsc = form.ifscCode.trim().toUpperCase()

    if (
      ifsc &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
    ) {
      setError('Enter a valid IFSC code.')
      return
    }

    if (password && password.length < 8) {
      setError(
        'The new password must contain at least 8 characters.',
      )
      return
    }

    setError('')
    submitLock.current = true

    const body = {
      username,
      email,
      contactNumber: mobile,
      occupation: form.occupation.trim(),
      income: incomeText ? Number(incomeText) : null,
      aadharNumber: aadhaar,
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifscCode: ifsc,
    }

    if (password) {
      body.password = password
    }

    save.mutate(body)
  }

  function close() {
    if (save.isPending) return
    onClose()
  }

  return (
    <Modal
      title={`Edit ${user.username}`}
      wide
      onClose={close}
      footer={
        <div className="ix-users-modal-actions">
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
              Save changes
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
          <div className="alert error full" role="alert">
            {error}
          </div>
        )}

        <TextInput
          label="Username"
          value={form.username}
          disabled={save.isPending || uncertain}
          onChange={updateField('username')}
        />

        <TextInput
          label="Email"
          type="email"
          value={form.email}
          disabled={save.isPending || uncertain}
          onChange={updateField('email')}
        />

        <TextInput
          label="Mobile"
          value={form.contactNumber}
          maxLength={10}
          disabled={save.isPending || uncertain}
          onChange={updateField('contactNumber')}
        />

        <TextInput
          label="Occupation"
          value={form.occupation}
          disabled={save.isPending || uncertain}
          onChange={updateField('occupation')}
        />

        <TextInput
          label="Yearly income (₹)"
          type="number"
          min="0"
          value={form.income}
          disabled={save.isPending || uncertain}
          onChange={updateField('income')}
        />

        <TextInput
          label="Aadhaar"
          value={form.aadharNumber}
          maxLength={12}
          disabled={save.isPending || uncertain}
          onChange={updateField('aadharNumber')}
        />

        <TextInput
          label="Bank"
          value={form.bankName}
          disabled={save.isPending || uncertain}
          onChange={updateField('bankName')}
        />

        <TextInput
          label="Account number"
          value={form.accountNumber}
          disabled={save.isPending || uncertain}
          onChange={updateField('accountNumber')}
        />

        <TextInput
          label="IFSC"
          value={form.ifscCode}
          maxLength={11}
          disabled={save.isPending || uncertain}
          onChange={updateField('ifscCode')}
        />

        <div className="full">
          <TextInput
            label="New password (optional)"
            type="password"
            value={form.password}
            disabled={save.isPending || uncertain}
            onChange={updateField('password')}
            hint="Leave blank to keep the current password."
            autoComplete="new-password"
          />
        </div>
      </form>
    </Modal>
  )
}

/* =========================================================
   MAIN USERS PAGE
========================================================= */

export default function Users() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const toggleLock = useRef(false)
  const deleteLock = useRef(false)

  const query = useQuery({
    queryKey: ['a-users'],
    queryFn: users.getAll,
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const all = useMemo(
    () => normalizeRows(query.data),
    [query.data],
  )

  const [role, setRole] = useState('USER')
  const [accountStatus, setAccountStatus] = useState('all')

  const [viewId, setViewId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [toggleId, setToggleId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const [pageError, setPageError] = useState('')
  const [uncertainAction, setUncertainAction] = useState(null)

  const [search, setSearch, searched] = useFilter(
    all,
    SEARCH_FIELDS,
  )

  /* FILTERS */

  const rows = useMemo(
    () =>
      (searched || [])
        .filter((user) => {
          if (
            role !== 'all' &&
            String(user.role || '').toUpperCase() !== role
          ) {
            return false
          }

          if (
            accountStatus === 'active' &&
            !isActive(user)
          ) {
            return false
          }

          if (
            accountStatus === 'inactive' &&
            isActive(user)
          ) {
            return false
          }

          return true
        })
        .slice()
        .sort(
          (a, b) =>
            Number(b.userId || 0) -
            Number(a.userId || 0),
        ),
    [searched, role, accountStatus],
  )

  const totalCustomers = all.filter(
    (user) => !isAdmin(user),
  ).length

  const activeCustomers = all.filter(
    (user) => !isAdmin(user) && isActive(user),
  ).length

  const inactiveCustomers = all.filter(
    (user) => !isAdmin(user) && !isActive(user),
  ).length

  const adminCount = all.filter(isAdmin).length

  /* FRESH SELECTED RECORDS */

  function findUser(id) {
    if (id == null) return null

    return (
      all.find(
        (user) => String(user.userId) === String(id),
      ) || null
    )
  }

  const viewed = findUser(viewId)
  const editing = findUser(editId)
  const toggling = findUser(toggleId)
  const deleting = findUser(deleteId)

  /* REFRESH */

  async function refreshUsers() {
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
          'Unable to refresh the user list.',
        ),
      )
    }
  }

  /* ACTIVATE / DEACTIVATE */

  const toggle = useMutation({
    mutationFn: (user) =>
      isActive(user)
        ? users.deactivate(user.userId)
        : users.activate(user.userId),

    retry: false,

    onSuccess: async (_, user) => {
      setToggleId(null)
      setUncertainAction(null)

      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['a-users'],
          }),

          queryClient.invalidateQueries({
            queryKey: ['a-customers'],
          }),
        ])
      } catch {
        // Account status change already succeeded.
      }

      toast.success(
        isActive(user)
          ? 'User deactivated successfully.'
          : 'User activated successfully.',
      )
    },

    onError: async (requestError, user) => {
      setToggleId(null)

      if (isUncertainError(requestError)) {
        setUncertainAction({
          type: 'toggle',
          userId: user.userId,
        })

        setPageError(
          `The account status change for ${user.username} could not be confirmed. Refresh the user list before trying again.`,
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-users'],
          })
        } catch {
          // Preserve the warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not change the account status.',
        ),
      )
    },

    onSettled: () => {
      toggleLock.current = false
    },
  })

  function submitToggle() {
    if (
      !toggling ||
      toggle.isPending ||
      toggleLock.current ||
      isAdmin(toggling)
    ) {
      return
    }

    if (
      uncertainAction?.type === 'toggle' &&
      String(uncertainAction.userId) ===
        String(toggling.userId)
    ) {
      return
    }

    toggleLock.current = true
    toggle.mutate(toggling)
  }

  /* DELETE USER */

  const remove = useMutation({
    mutationFn: (userId) => users.remove(userId),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setUncertainAction(null)

      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['a-users'],
          }),

          queryClient.invalidateQueries({
            queryKey: ['a-customers'],
          }),
        ])
      } catch {
        // Deletion already succeeded.
      }

      toast.success('User deleted successfully.')
    },

    onError: async (requestError, userId) => {
      setDeleteId(null)

      if (isUncertainError(requestError)) {
        setUncertainAction({
          type: 'delete',
          userId,
        })

        setPageError(
          `Deletion of user #${userId} could not be confirmed. Refresh the list before taking further action.`,
        )

        try {
          await queryClient.invalidateQueries({
            queryKey: ['a-users'],
          })
        } catch {
          // Preserve the warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not delete this user.',
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
      isAdmin(deleting)
    ) {
      return
    }

    if (
      uncertainAction?.type === 'delete' &&
      String(uncertainAction.userId) ===
        String(deleting.userId)
    ) {
      return
    }

    deleteLock.current = true
    remove.mutate(deleting.userId)
  }

  /* UI */

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage customer accounts, update profiles, and control account access."
      >
        <Button
          type="button"
          onClick={refreshUsers}
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

      {/* SUMMARY */}

      <div className="ix-users-summary">
        <div className="ix-users-summary-card">
          <div className="label">Customers</div>
          <div className="value">
            {query.isPending ? '…' : totalCustomers}
          </div>
        </div>

        <div className="ix-users-summary-card">
          <div className="label">Active customers</div>
          <div className="value">
            {query.isPending ? '…' : activeCustomers}
          </div>
        </div>

        <div className="ix-users-summary-card">
          <div className="label">Inactive customers</div>
          <div className="value">
            {query.isPending ? '…' : inactiveCustomers}
          </div>
        </div>

        <div className="ix-users-summary-card">
          <div className="label">Administrators</div>
          <div className="value">
            {query.isPending ? '…' : adminCount}
          </div>
        </div>
      </div>

      {/* USER TABLE */}

      <Panel flush>
        <div className="toolbar ix-users-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search username, email, mobile"
          />

          <Segmented
            value={role}
            onChange={setRole}
            options={[
              { value: 'USER', label: 'Customers' },
              { value: 'ADMIN', label: 'Admins' },
              { value: 'all', label: 'All' },
            ]}
          />

          <Segmented
            value={accountStatus}
            onChange={setAccountStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        <DataState
          query={query}
          empty={{
            title: 'No users yet',
            text: 'Accounts appear here when customers register.',
          }}
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching users</h4>

                <p className="muted">
                  Try changing your filters or search term.
                </p>

                <Button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setRole('USER')
                    setAccountStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="ix-users-table-wrap">
                <Table
                  rowKey="userId"
                  rows={rows}
                  columns={[
                    {
                      key: 'userId',
                      header: 'ID',
                      render: (user) => (
                        <strong>#{user.userId}</strong>
                      ),
                    },
                    {
                      key: 'username',
                      header: 'User',
                      render: (user) => (
                        <div>
                          <strong>
                            {displayValue(user.username)}
                          </strong>

                          <div className="faint ix-user-email">
                            {displayValue(user.email)}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'contactNumber',
                      header: 'Mobile',
                      render: (user) =>
                        displayValue(user.contactNumber),
                    },
                    {
                      key: 'role',
                      header: 'Role',
                      render: (user) => (
                        <StatusBadge
                          value={
                            isAdmin(user) ? 'BLUE' : 'GRAY'
                          }
                          label={
                            isAdmin(user) ? 'Admin' : 'Customer'
                          }
                        />
                      ),
                    },
                    {
                      key: 'createdAt',
                      header: 'Joined',
                      render: (user) => date(user.createdAt),
                    },
                    {
                      key: 'isActive',
                      header: 'Status',
                      render: (user) => (
                        <StatusBadge
                          value={
                            isActive(user)
                              ? 'ACTIVE'
                              : 'INACTIVE'
                          }
                        />
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      render: (user) => (
                        <div className="ix-users-actions">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              setViewId(user.userId)
                            }
                          >
                            View
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isAdmin(user)}
                            onClick={() =>
                              setEditId(user.userId)
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              isAdmin(user) ||
                              toggle.isPending
                            }
                            onClick={() =>
                              setToggleId(user.userId)
                            }
                          >
                            {isActive(user)
                              ? 'Deactivate'
                              : 'Activate'}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={
                              isAdmin(user) ||
                              remove.isPending
                            }
                            onClick={() =>
                              setDeleteId(user.userId)
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )
          }
        </DataState>
      </Panel>

      {/* USER DETAILS */}

      {viewed && (
        <Modal
          title={viewed.username || `User #${viewed.userId}`}
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
              ['User ID', `#${viewed.userId}`],
              ['Username', displayValue(viewed.username)],
              ['Email', displayValue(viewed.email)],
              ['Mobile', displayValue(viewed.contactNumber)],
              ['Role', displayValue(viewed.role)],
              [
                'Status',
                <StatusBadge
                  value={
                    isActive(viewed)
                      ? 'ACTIVE'
                      : 'INACTIVE'
                  }
                />,
              ],
              ['Joined', dateTime(viewed.createdAt)],
              ['Occupation', displayValue(viewed.occupation)],
              [
                'Yearly income',
                viewed.income != null
                  ? inr(viewed.income)
                  : '—',
              ],
              ['Aadhaar', maskValue(viewed.aadharNumber)],
              ['Bank', displayValue(viewed.bankName)],
              ['Account', maskValue(viewed.accountNumber)],
              ['IFSC', displayValue(viewed.ifscCode)],
            ]}
          />
        </Modal>
      )}

      {/* EDIT USER */}

      {editing && !isAdmin(editing) && (
        <EditUser
          key={editing.userId}
          user={editing}
          onClose={() => setEditId(null)}
        />
      )}

      {/* ACCOUNT STATUS CONFIRMATION */}

      {toggling && !isAdmin(toggling) && (
        <Confirm
          title={
            isActive(toggling)
              ? 'Deactivate this customer?'
              : 'Activate this customer?'
          }
          message={
            isActive(toggling)
              ? `Deactivate ${toggling.username}? This will prevent future authenticated access when your backend enforces the account status.`
              : `Activate ${toggling.username}? The customer will be able to sign in again.`
          }
          confirmLabel={
            isActive(toggling)
              ? 'Deactivate customer'
              : 'Activate customer'
          }
          loading={toggle.isPending}
          onClose={() => {
            if (!toggle.isPending) {
              setToggleId(null)
            }
          }}
          onConfirm={submitToggle}
        />
      )}

      {/* DELETE USER CONFIRMATION */}

      {deleting && !isAdmin(deleting) && (
        <Confirm
          danger
          title="Delete this customer?"
          message={
            `${deleting.username} and linked records may be permanently removed. ` +
            'This action cannot be undone. Deactivate the account instead if you only want to prevent sign-in.'
          }
          confirmLabel="Delete customer"
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

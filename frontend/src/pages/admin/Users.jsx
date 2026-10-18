import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, Confirm, DataState, Details, Modal, PageHeader, Panel, SearchBox, Segmented, StatusBadge, Table, TextInput, useFilter, useToast } from '../../components/ui'
import { date, dateTime, inr } from '../../lib/format'

const FIELDS = ['userId', 'username', 'email', 'contactNumber', 'role']

function EditUser({ user, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState({ ...user, password: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: (b) => users.update(user.userId, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-users'] }); toast.success('User updated'); onClose() },
    onError: (e) => setError(errorMessage(e, 'Could not update this user.')),
  })
  return (
    <Modal title={`Edit ${user.username}`} wide onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="dark" loading={save.isPending} onClick={() => { setError(''); save.mutate({ ...f, income: Number(f.income), password: f.password || undefined }) }}>Save changes</Button></>}>
      <div className="form-grid">
        {error && <div className="alert error full" role="alert">{error}</div>}
        <TextInput label="Username" value={f.username || ''} onChange={set('username')} />
        <TextInput label="Email" value={f.email || ''} onChange={set('email')} />
        <TextInput label="Mobile" value={f.contactNumber || ''} onChange={set('contactNumber')} maxLength={10} />
        <TextInput label="Occupation" value={f.occupation || ''} onChange={set('occupation')} />
        <TextInput label="Yearly income (₹)" type="number" value={f.income ?? ''} onChange={set('income')} />
        <TextInput label="Aadhaar" value={f.aadharNumber || ''} onChange={set('aadharNumber')} maxLength={12} />
        <TextInput label="Bank" value={f.bankName || ''} onChange={set('bankName')} />
        <TextInput label="Account number" value={f.accountNumber || ''} onChange={set('accountNumber')} />
        <TextInput label="IFSC" value={f.ifscCode || ''} onChange={set('ifscCode')} />
        <div className="full"><TextInput label="New password (optional)" type="password" value={f.password} onChange={set('password')} hint="Leave blank to keep the current password." autoComplete="new-password" /></div>
      </div>
    </Modal>
  )
}

export default function Users() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['a-users'], queryFn: users.getAll })
  const [role, setRole] = useState('USER')
  const [view, setView] = useState(null)
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [search, setSearch, searched] = useFilter(q.data, FIELDS)
  const rows = searched.filter((u) => role === 'all' || u.role === role)
  const done = (m) => () => { qc.invalidateQueries({ queryKey: ['a-users'] }); toast.success(m) }
  const toggle = useMutation({
    mutationFn: (u) => (u.isActive ? users.deactivate(u.userId) : users.activate(u.userId)),
    onSuccess: (_, u) => done(u.isActive ? 'User deactivated' : 'User activated')(), onError: toast.error,
  })
  const remove = useMutation({ mutationFn: (u) => users.remove(u.userId), onSuccess: () => { done('User deleted')(); setDel(null) }, onError: (e) => { toast.error(e); setDel(null) } })

  return (
    <>
      <PageHeader title="Users" subtitle="Customers register themselves. Here you can update, deactivate or remove accounts." />
      <Panel flush>
        <div className="toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, mobile" />
          <Segmented value={role} onChange={setRole} options={[{ value: 'USER', label: 'Customers' }, { value: 'ADMIN', label: 'Admins' }, { value: 'all', label: 'All' }]} />
        </div>
        <DataState query={q} empty={{ title: 'No users yet', text: 'Accounts appear here when customers register.' }}>
          {() => rows.length === 0 ? <div className="empty"><h4>No matches</h4></div> : (
            <Table rowKey="userId" rows={rows} columns={[
              { key: 'userId', header: 'ID', render: (u) => `#${u.userId}` },
              { key: 'username', header: 'User', render: (u) => <><b>{u.username}</b><div className="faint" style={{ fontSize: 13 }}>{u.email}</div></> },
              { key: 'contactNumber', header: 'Mobile' },
              { key: 'role', header: 'Role', render: (u) => <StatusBadge value={u.role === 'ADMIN' ? 'BLUE' : 'GRAY'} label={u.role === 'ADMIN' ? 'Admin' : 'Customer'} /> },
              { key: 'createdAt', header: 'Joined', render: (u) => date(u.createdAt) },
              { key: 'isActive', header: 'Status', render: (u) => <StatusBadge value={u.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
              { key: 'a', header: '', align: 'right', render: (u) => (
                <div className="actions">
                  <Button size="sm" onClick={() => setView(u)}>View</Button>
                  <Button size="sm" onClick={() => setEdit(u)}>Edit</Button>
                  <Button size="sm" onClick={() => toggle.mutate(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${u.username}`} onClick={() => setDel(u)}>Delete</Button>
                </div>
              ) },
            ]} />
          )}
        </DataState>
      </Panel>

      {view && (
        <Modal title={view.username} onClose={() => setView(null)} wide footer={<Button onClick={() => setView(null)}>Close</Button>}>
          <Details items={[
            ['User ID', `#${view.userId}`], ['Email', view.email], ['Mobile', view.contactNumber],
            ['Role', view.role], ['Status', <StatusBadge value={view.isActive ? 'ACTIVE' : 'INACTIVE'} />], ['Joined', dateTime(view.createdAt)],
            ['Occupation', view.occupation], ['Yearly income', inr(view.income)], ['Aadhaar', view.aadharNumber],
            ['Bank', view.bankName], ['Account', view.accountNumber], ['IFSC', view.ifscCode],
          ]} />
        </Modal>
      )}
      {edit && <EditUser user={edit} onClose={() => setEdit(null)} />}
      {del && <Confirm danger title="Delete this user?" message={`${del.username} and their linked data may be removed. This cannot be undone. Deactivate instead if you only want to block sign-in.`} confirmLabel="Delete user" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} />}
    </>
  )
}

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, DataState, PageHeader, Panel, PasswordInput, TextInput, useToast } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { date } from '../../lib/format'

const PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

function ProfileForm({ data }) {
  const toast = useToast()
  const qc = useQueryClient()
  const { refresh } = useAuth()
  const [f, setF] = useState(data)
  const [error, setError] = useState('')
  useEffect(() => setF(data), [data])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: (b) => users.updateMe(b),
    onSuccess: () => { toast.success('Profile saved'); qc.invalidateQueries({ queryKey: ['me'] }); refresh() },
    onError: (e) => setError(errorMessage(e, 'Could not save your profile.')),
  })

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!/^[6-9]\d{9}$/.test(f.contactNumber || '')) return setError('Enter a valid 10-digit mobile number.')
    if (!/^\d{9,18}$/.test(f.accountNumber || '')) return setError('Account number must be 9–18 digits.')
    if (!/^\d{12}$/.test(f.aadharNumber || '')) return setError('Aadhaar must be exactly 12 digits.')
    save.mutate({ ...f, income: Number(f.income), password: undefined })
  }

  return (
    <Panel title="Personal and payout details">
      <form className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="alert error full" role="alert">{error}</div>}
        <TextInput label="Username" value={f.username || ''} disabled readOnly />
        <TextInput label="Email" type="email" value={f.email || ''} onChange={set('email')} />
        <TextInput label="Mobile number" value={f.contactNumber || ''} onChange={set('contactNumber')} maxLength={10} />
        <TextInput label="Occupation" value={f.occupation || ''} onChange={set('occupation')} />
        <TextInput label="Yearly income (₹)" type="number" value={f.income ?? ''} onChange={set('income')} />
        <TextInput label="Aadhaar number" value={f.aadharNumber || ''} onChange={set('aadharNumber')} maxLength={12} />
        <TextInput label="Bank name" value={f.bankName || ''} onChange={set('bankName')} />
        <TextInput label="Account number" value={f.accountNumber || ''} onChange={set('accountNumber')} maxLength={18} />
        <TextInput label="IFSC code" value={f.ifscCode || ''} onChange={(e) => setF((s) => ({ ...s, ifscCode: e.target.value.toUpperCase() }))} maxLength={11} />
        <div className="full row" style={{ justifyContent: 'flex-end' }}><Button variant="dark" type="submit" loading={save.isPending}>Save changes</Button></div>
      </form>
    </Panel>
  )
}

function PasswordForm() {
  const toast = useToast()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const change = useMutation({
    mutationFn: (b) => users.changePassword(b),
    onSuccess: () => { toast.success('Password changed'); setF({ currentPassword: '', newPassword: '', confirm: '' }) },
    onError: (e) => setError(errorMessage(e, 'Could not change your password.')),
  })
  function submit(e) {
    e.preventDefault()
    setError('')
    if (!f.currentPassword) return setError('Enter your current password.')
    if (!PW.test(f.newPassword)) return setError('New password needs 8+ characters with upper and lower case, a number and one of @$!%*?&')
    if (f.newPassword !== f.confirm) return setError('The new passwords do not match.')
    change.mutate({ currentPassword: f.currentPassword, newPassword: f.newPassword })
  }
  return (
    <Panel title="Change password">
      <form className="stack" onSubmit={submit} noValidate>
        {error && <div className="alert error" role="alert">{error}</div>}
        <PasswordInput label="Current password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" />
        <PasswordInput label="New password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} autoComplete="new-password" />
        <PasswordInput label="Confirm new password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" />
        <Button variant="dark" type="submit" loading={change.isPending}>Update password</Button>
      </form>
    </Panel>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const q = useQuery({ queryKey: ['me'], queryFn: users.me })
  return (
    <>
      <PageHeader title="Profile" subtitle={user?.createdAt ? `Customer since ${date(user.createdAt)}` : undefined} />
      <div className="two-col">
        <DataState query={q}>{(d) => <ProfileForm data={d} />}</DataState>
        <PasswordForm />
      </div>
    </>
  )
}

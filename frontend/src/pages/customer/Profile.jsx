import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, UserRound, LockKeyhole, Sparkles, CheckCircle2 } from 'lucide-react'
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
    if (save.isPending) return
    setError('')
    if (!/^[6-9]\d{9}$/.test(f.contactNumber || '')) return setError('Enter a valid 10-digit mobile number.')
    if (!/^\d{9,18}$/.test(f.accountNumber || '')) return setError('Account number must be 9–18 digits.')
    if (!/^\d{12}$/.test(f.aadharNumber || '')) return setError('Aadhaar must be exactly 12 digits.')
    save.mutate({ ...f, income: Number(f.income), password: undefined })
  }

  return (
    <div className="ix-profile-section ix-profile-section-personal">
      <Panel title="Personal and payout details">
        <div className="ix-profile-section-intro">
          <span className="ix-profile-section-icon"><UserRound size={20} /></span>
          <div><strong>Your account information</strong><span>Keep your contact and payout details up to date.</span></div>
        </div>
        <form className="form-grid ix-profile-form" onSubmit={submit} noValidate>
          {error && <div className="alert error full" role="alert">{error}</div>}
          <TextInput label="Username" value={f.username || ''} disabled readOnly />
          <TextInput label="Email" type="email" value={f.email || ''} onChange={set('email')} />
          <TextInput label="Mobile number" value={f.contactNumber || ''} onChange={set('contactNumber')} maxLength={10} />
          <TextInput label="Occupation" value={f.occupation || ''} onChange={set('occupation')} />
          <TextInput label="Yearly income (₹)" type="number" value={f.income ?? ''} onChange={set('income')} />
          <div className="ix-profile-subheading full"><ShieldCheck size={16} /> Identity & payout details</div>
          <TextInput label="Aadhaar number" value={f.aadharNumber || ''} onChange={set('aadharNumber')} maxLength={12} />
          <TextInput label="Bank name" value={f.bankName || ''} onChange={set('bankName')} />
          <TextInput label="Account number" value={f.accountNumber || ''} onChange={set('accountNumber')} maxLength={18} />
          <TextInput label="IFSC code" value={f.ifscCode || ''} onChange={(e) => setF((s) => ({ ...s, ifscCode: e.target.value.toUpperCase() }))} maxLength={11} />
          <div className="full ix-profile-form-footer"><span><CheckCircle2 size={15} /> Changes are saved to your account</span><Button variant="dark" type="submit" loading={save.isPending} disabled={save.isPending}>Save changes</Button></div>
        </form>
      </Panel>
    </div>
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
    if (change.isPending) return
    setError('')
    if (!f.currentPassword) return setError('Enter your current password.')
    if (!PW.test(f.newPassword)) return setError('New password needs 8+ characters with upper and lower case, a number and one of @$!%*?&')
    if (f.newPassword !== f.confirm) return setError('The new passwords do not match.')
    change.mutate({ currentPassword: f.currentPassword, newPassword: f.newPassword })
  }
  return (
    <div className="ix-profile-section ix-profile-section-password">
      <Panel title="Change password">
        <div className="ix-profile-section-intro">
          <span className="ix-profile-section-icon"><LockKeyhole size={20} /></span>
          <div><strong>Account security</strong><span>Use a strong password to protect your insurance account.</span></div>
        </div>
        <form className="stack ix-profile-password-form" onSubmit={submit} noValidate>
          {error && <div className="alert error" role="alert">{error}</div>}
          <PasswordInput label="Current password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" />
          <PasswordInput label="New password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} autoComplete="new-password" />
          <PasswordInput label="Confirm new password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" />
          <div className="ix-profile-password-tip"><ShieldCheck size={17} /><span>Use 8+ characters, uppercase and lowercase letters, a number, and one of @$!%*?&.</span></div>
          <Button variant="dark" type="submit" loading={change.isPending} disabled={change.isPending}>Update password</Button>
        </form>
      </Panel>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const q = useQuery({ queryKey: ['me'], queryFn: users.me })
  return (
    <div className="ix-profile-page">
      <PageHeader title="Profile" subtitle={user?.createdAt ? `Customer since ${date(user.createdAt)}` : undefined} />
      <div className="ix-profile-hero">
        <div className="ix-profile-hero-copy"><div className="ix-profile-hero-avatar"><UserRound size={27} /></div><div><h2>{user?.username || 'Your InsureX account'}</h2><p>Manage your personal details, payout information and password.</p></div></div>
        <div className="ix-profile-hero-mark"><Sparkles size={15} /> Account settings</div>
      </div>
      <div className="ix-profile-layout">
        <DataState query={q}>{(d) => <ProfileForm data={d} />}</DataState>
        <PasswordForm />
      </div>
    </div>
  )
}

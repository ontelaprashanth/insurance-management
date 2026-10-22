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
      <style>{`
        @keyframes ixProfileRise { from { opacity:0; transform:translateY(22px) scale(.985) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes ixProfileFloat { 0%,100% { transform:translateY(0) rotate(-3deg) } 50% { transform:translateY(-7px) rotate(4deg) } }
        @keyframes ixProfileShimmer { from { transform:translateX(-160%) skewX(-18deg) } to { transform:translateX(480%) skewX(-18deg) } }
        .ix-profile-page { min-width:0; color:#153e2c; }
        .ix-profile-hero { position:relative; overflow:hidden; isolation:isolate; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:20px 24px; margin:0 0 20px; border:1px solid #a5dfbc; border-radius:20px; background:linear-gradient(115deg,#e9f9ef 0%,#f5fcf8 55%,#e2f7eb 100%); animation:ixProfileRise .5s both; }
        .ix-profile-hero::after { content:''; position:absolute; width:220px; height:220px; border-radius:50%; right:-70px; top:-100px; background:rgba(30,157,92,.09); pointer-events:none; }
        .ix-profile-hero-copy { position:relative; z-index:1; display:flex; align-items:center; gap:14px; min-width:0; }
        .ix-profile-hero-avatar { display:grid; place-items:center; width:58px; height:58px; flex-shrink:0; border-radius:17px; color:white; background:linear-gradient(145deg,#168650,#0c5b38); box-shadow:0 10px 22px rgba(13,105,61,.22); animation:ixProfileFloat 4s ease-in-out infinite; }
        .ix-profile-hero h2 { margin:0 0 4px; font-size:clamp(18px,2.5vw,24px); color:#0d462d; overflow-wrap:anywhere; }
        .ix-profile-hero p { margin:0; font-size:13px; color:#47715b; line-height:1.5; }
        .ix-profile-hero-mark { position:relative; z-index:1; display:flex; align-items:center; gap:7px; white-space:nowrap; font-size:12px; font-weight:750; color:#167348; background:#d7f4e3; border:1px solid #afe2c3; border-radius:999px; padding:9px 12px; }
        .ix-profile-layout { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(300px,1fr); align-items:start; gap:18px; }
        .ix-profile-section { min-width:0; animation:ixProfileRise .58s cubic-bezier(.2,.85,.2,1) both; }
        .ix-profile-section-password { animation-delay:100ms; }
        .ix-profile-section > * { min-width:0; border:1px solid #c2e6d1 !important; border-radius:20px !important; background:linear-gradient(155deg,#fff 0%,#f5fcf8 100%) !important; box-shadow:0 8px 26px rgba(12,92,54,.07); transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease; }
        .ix-profile-section > *:hover { transform:translateY(-3px); border-color:#7fcda3 !important; box-shadow:0 16px 32px rgba(12,92,54,.12); }
        .ix-profile-section-intro { display:flex; align-items:center; gap:12px; padding:13px 14px; margin-bottom:18px; border:1px solid #d3ebdd; border-radius:14px; background:#ecf9f1; }
        .ix-profile-section-icon { display:grid; place-items:center; flex-shrink:0; width:42px; height:42px; border-radius:12px; color:#0d7847; background:#d7f3e2; animation:ixProfileFloat 4.4s ease-in-out infinite; }
        .ix-profile-section-intro strong { display:block; color:#12482e; font-size:14px; }
        .ix-profile-section-intro span:not(.ix-profile-section-icon) { display:block; color:#52715f; font-size:12px; line-height:1.55; margin-top:3px; }
        .ix-profile-form { gap:14px !important; }
        .ix-profile-form .field, .ix-profile-password-form .field { min-width:0; }
        .ix-profile-page input:not([type=checkbox]), .ix-profile-page select, .ix-profile-page textarea { border-color:#bfdcca; transition:border-color .2s ease,box-shadow .2s ease; }
        .ix-profile-page input:not([type=checkbox]):focus, .ix-profile-page select:focus, .ix-profile-page textarea:focus { border-color:#21975e; box-shadow:0 0 0 3px rgba(33,151,94,.12); outline:none; }
        .ix-profile-subheading { display:flex; align-items:center; gap:8px; padding:12px 0 4px; border-top:1px solid #dcefe3; color:#17633e; font-size:13px; font-weight:800; }
        .ix-profile-form-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-top:14px; border-top:1px solid #dcefe3; }
        .ix-profile-form-footer > span { display:flex; align-items:center; gap:7px; color:#56806a; font-size:12px; }
        .ix-profile-password-form { gap:15px !important; }
        .ix-profile-password-tip { display:flex; align-items:flex-start; gap:9px; padding:13px; border:1px solid #d1e9dc; border-radius:12px; background:#ecf9f1; color:#456c55; font-size:12px; line-height:1.65; }
        .ix-profile-password-tip svg { color:#178653; flex-shrink:0; margin-top:2px; }
        .ix-profile-page button[type=submit] { position:relative; overflow:hidden; min-height:42px; background:linear-gradient(125deg,#168c53,#0d6d41) !important; color:#fff !important; border-color:#0e7446 !important; font-weight:750; transition:transform .22s ease,box-shadow .22s ease,filter .22s ease; }
        .ix-profile-page button[type=submit]:not(:disabled):hover { transform:translateY(-3px); box-shadow:0 9px 19px rgba(13,117,66,.24); filter:brightness(1.04); }
        .ix-profile-page button[type=submit]:not(:disabled):active { transform:scale(.98); }
        .ix-profile-page button[type=submit]:disabled { opacity:.65; cursor:not-allowed; }
        .ix-profile-page button[type=submit]::after { content:''; position:absolute; inset:0 auto 0 -50%; width:25%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent); pointer-events:none; }
        .ix-profile-page button[type=submit]:not(:disabled):hover::after { animation:ixProfileShimmer .85s ease-out; }
        @media(max-width:950px) { .ix-profile-layout { grid-template-columns:1fr; } }
        @media(max-width:640px) { .ix-profile-hero { padding:16px; align-items:flex-start; flex-direction:column; gap:12px; } .ix-profile-hero-avatar { width:48px; height:48px; } .ix-profile-hero-mark { align-self:flex-start; } .ix-profile-layout { gap:13px; } .ix-profile-form-footer { align-items:stretch; flex-direction:column; } .ix-profile-form-footer button, .ix-profile-password-form button[type=submit] { width:100%; } }
        @media(prefers-reduced-motion:reduce) { .ix-profile-page *, .ix-profile-page *::before, .ix-profile-page *::after { animation:none !important; transition:none !important; } .ix-profile-section > *:hover, .ix-profile-page button[type=submit]:hover { transform:none !important; } }
      `}</style>
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

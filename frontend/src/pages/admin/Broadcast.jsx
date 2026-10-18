import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { broadcast } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, Confirm, DataState, PageHeader, Panel, SelectInput, StatusBadge, Table, TextArea, TextInput, useToast } from '../../components/ui'
import { dateTime } from '../../lib/format'

const TYPES = [
  { value: 'ANNOUNCEMENT', label: 'Announcement' }, { value: 'OFFER', label: 'Offer' }, { value: 'ALERT', label: 'Alert' },
  { value: 'PAYMENT', label: 'Payment' }, { value: 'POLICY', label: 'Policy' }, { value: 'GENERAL', label: 'General' },
]

export default function Broadcast() {
  const toast = useToast()
  const qc = useQueryClient()
  const customers = useQuery({ queryKey: ['a-customers'], queryFn: broadcast.customers })
  const history = useQuery({ queryKey: ['a-broadcasts'], queryFn: broadcast.list })
  const [f, setF] = useState({ title: '', message: '', type: 'ANNOUNCEMENT', recipientType: 'ALL', userId: '' })
  const [error, setError] = useState('')
  const [del, setDel] = useState(null)

  const send = useMutation({
    mutationFn: broadcast.send,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['a-broadcasts'] })
      toast.success(r?.message ? `${r.message} (${r.recipientCount ?? 0} recipients)` : 'Notification sent')
      setF({ ...f, title: '', message: '' })
    },
    onError: (e) => setError(errorMessage(e, 'Could not send the notification.')),
  })
  const remove = useMutation({
    mutationFn: (n) => broadcast.remove(n.notificationId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-broadcasts'] }); toast.success('Deleted'); setDel(null) },
    onError: (e) => { toast.error(e); setDel(null) },
  })

  function submit(e) {
    e.preventDefault()
    if (!f.title.trim()) return setError('Add a title.')
    if (!f.message.trim()) return setError('Write the message.')
    if (f.recipientType === 'USER' && !f.userId) return setError('Choose who should receive it.')
    setError('')
    send.mutate({ title: f.title.trim(), message: f.message.trim(), type: f.type, recipientType: f.recipientType, userId: f.recipientType === 'USER' ? Number(f.userId) : undefined })
  }

  const list = (customers.data || []).map((c) => ({ value: c.userId ?? c.id, label: `${c.username ?? c.name ?? 'User'} (#${c.userId ?? c.id})` }))

  return (
    <>
      <PageHeader title="Broadcast" subtitle="Send an announcement, offer or alert to every customer or to one person." />
      <div className="two-col">
        <Panel title="New notification">
          <form className="stack" onSubmit={submit} noValidate>
            {error && <div className="alert error" role="alert">{error}</div>}
            <div className="form-grid">
              <SelectInput label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={TYPES} />
              <SelectInput label="Send to" value={f.recipientType} onChange={(e) => setF({ ...f, recipientType: e.target.value })} options={[{ value: 'ALL', label: 'All customers' }, { value: 'USER', label: 'One customer' }]} />
              {f.recipientType === 'USER' && <div className="full"><SelectInput label="Customer" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} options={list} placeholder={customers.isLoading ? 'Loading…' : 'Choose a customer…'} /></div>}
            </div>
            <TextInput label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
            <TextArea label="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="dark" type="submit" loading={send.isPending}>{f.recipientType === 'ALL' ? 'Send to all customers' : 'Send notification'}</Button></div>
          </form>
        </Panel>

        <Panel title="Sent by you" flush>
          <DataState query={history} empty={{ title: 'Nothing sent yet', text: 'Notifications you send will be listed here.' }} rows={3}>
            {(rows) => rows.slice(0, 20).map((n) => (
              <div className="list-item" key={n.notificationId}>
                <div className="grow">
                  <div className="row wrap" style={{ gap: 8 }}><b>{n.title}</b><StatusBadge value="GRAY" label={String(n.type || '').toLowerCase()} /></div>
                  <p className="muted" style={{ fontSize: 14 }}>{n.message}</p>
                  <div className="faint" style={{ fontSize: 12.5 }}>{dateTime(n.createdAt)}{n.userId ? ` · to user #${n.userId}` : ''}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDel(n)}>Delete</Button>
              </div>
            ))}
          </DataState>
        </Panel>
      </div>
      {del && <Confirm danger title="Delete notification?" message={`“${del.title}” will be removed from the customer’s notifications.`} confirmLabel="Delete" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} />}
    </>
  )
}

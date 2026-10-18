import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { policyHolders, users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, Confirm, DataState, Modal, PageHeader, Panel, SearchBox, SelectInput, Table, TextInput, useFilter, useToast } from '../../components/ui'
import { date, today } from '../../lib/format'

function HolderForm({ holder, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const us = useQuery({ queryKey: ['a-users'], queryFn: users.getAll })
  const [f, setF] = useState({ name: holder?.name || '', dob: holder?.dob || '', userId: holder?.userId ?? '' })
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: (b) => (holder ? policyHolders.update(holder.policyHolderId, b) : policyHolders.save(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-holders'] }); toast.success(holder ? 'Policy holder updated' : 'Policy holder created'); onClose() },
    onError: (e) => setError(errorMessage(e, 'Could not save.')),
  })
  function submit() {
    if (!f.name.trim()) return setError('Enter the policy holder’s name.')
    if (!f.dob) return setError('Enter the date of birth.')
    if (!f.userId) return setError('Link the policy holder to a user account.')
    setError('')
    save.mutate({ name: f.name.trim(), dob: f.dob, userId: Number(f.userId) })
  }
  const customers = (us.data || []).filter((u) => u.role === 'USER')
  return (
    <Modal title={holder ? 'Edit policy holder' : 'New policy holder'} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="dark" loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="stack">
        {error && <div className="alert error" role="alert">{error}</div>}
        <TextInput label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <TextInput label="Date of birth" type="date" max={today()} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
        <SelectInput label="User account" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} placeholder="Choose a customer…"
          options={customers.map((u) => ({ value: u.userId, label: `${u.username} (#${u.userId})` }))}
          hint="A customer needs a policy holder profile before they can buy a policy." />
      </div>
    </Modal>
  )
}

export default function PolicyHolders() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['a-holders'], queryFn: policyHolders.getAll })
  const us = useQuery({ queryKey: ['a-users'], queryFn: users.getAll })
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  const [search, setSearch, rows] = useFilter(q.data, ['name', 'policyHolderId', 'userId'])
  const nameOf = (id) => (us.data || []).find((u) => u.userId === id)?.username
  const remove = useMutation({
    mutationFn: (h) => policyHolders.remove(h.policyHolderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['a-holders'] }); toast.success('Policy holder deleted'); setDel(null) },
    onError: (e) => { toast.error(e); setDel(null) },
  })
  return (
    <>
      <PageHeader title="Policy holders" subtitle="The insured person behind each customer account.">
        <Button variant="primary" icon="plus" onClick={() => setForm({})}>New policy holder</Button>
      </PageHeader>
      <Panel flush>
        <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search policy holders" /></div>
        <DataState query={q} empty={{ title: 'No policy holders', text: 'Create one for each customer who needs to buy a policy.' }} emptyAction={<Button variant="dark" onClick={() => setForm({})}>New policy holder</Button>}>
          {() => (
            <Table rowKey="policyHolderId" rows={rows} columns={[
              { key: 'policyHolderId', header: 'ID', render: (h) => `#${h.policyHolderId}` },
              { key: 'name', header: 'Name', render: (h) => <b>{h.name}</b> },
              { key: 'dob', header: 'Date of birth', render: (h) => date(h.dob) },
              { key: 'userId', header: 'User account', render: (h) => nameOf(h.userId) ? `${nameOf(h.userId)} (#${h.userId})` : `#${h.userId}` },
              { key: 'a', header: '', align: 'right', render: (h) => (
                <div className="actions"><Button size="sm" onClick={() => setForm(h)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setDel(h)}>Delete</Button></div>
              ) },
            ]} />
          )}
        </DataState>
      </Panel>
      {form && <HolderForm holder={form.policyHolderId ? form : null} onClose={() => setForm(null)} />}
      {del && <Confirm danger title="Delete policy holder?" message={`${del.name} will be removed. Policies linked to this holder may be affected.`} confirmLabel="Delete" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} />}
    </>
  )
}

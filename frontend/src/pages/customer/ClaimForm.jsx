import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claims, policies } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, Modal, SelectInput, TextArea, TextInput, useToast } from '../../components/ui'
import { today } from '../../lib/format'

export const CLAIM_TYPES = ['Medical expense', 'Hospitalisation', 'Accident', 'Death', 'Disability', 'Vehicle damage', 'Theft', 'Fire or natural calamity', 'Trip cancellation', 'Other']

export default function ClaimForm({ policy, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const mine = useQuery({ queryKey: ['my-policies'], queryFn: policies.mine, enabled: !policy })
  const [f, setF] = useState({
    policyNumber: policy?.policyNumber ?? '', claimType: '', incidentDate: '', incidentLocation: '', amount: '', description: '', nFilepo: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: '' })) }

  const save = useMutation({
    mutationFn: (body) => claims.save(body),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['my-claims'] })
      qc.invalidateQueries({ queryKey: ['my-policies'] })
      toast.success(`Claim #${c?.claimNumber ?? ''} submitted. We will review it shortly.`)
      onClose()
    },
    onError: (e) => setServerError(errorMessage(e, 'Could not submit your claim.')),
  })

  function submit() {
    const e = {}
    if (!f.policyNumber) e.policyNumber = 'Choose the policy this claim is for.'
    if (!f.claimType) e.claimType = 'Choose what happened.'
    if (!f.incidentDate) e.incidentDate = 'Enter the date it happened.'
    else if (f.incidentDate > today()) e.incidentDate = 'The incident date cannot be in the future.'
    if (!f.incidentLocation.trim()) e.incidentLocation = 'Enter where it happened.'
    if (!(Number(f.amount) > 0)) e.amount = 'Enter the amount you are claiming.'
    if (f.description.trim().length < 10) e.description = 'Describe what happened in at least 10 characters.'
    setErrors(e)
    if (Object.keys(e).length) return
    setServerError('')
    save.mutate({
      policyNumber: Number(f.policyNumber), claimType: f.claimType, incidentDate: f.incidentDate,
      incidentLocation: f.incidentLocation.trim(), amount: Number(f.amount), description: f.description.trim(),
      nfilepo: f.nFilepo.trim() || undefined, claimDate: today(), status: 'PENDING',
    })
  }

  const activePolicies = (mine.data || []).filter((p) => p.isActive)

  return (
    <Modal title="File a claim" onClose={onClose} wide footer={
      <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="dark" loading={save.isPending} onClick={submit}>Submit claim</Button>
      </>
    }>
      <div className="form-grid">
        {serverError && <div className="alert error full" role="alert">{serverError}</div>}
        {policy ? (
          <div className="full"><TextInput label="Policy" value={`#${policy.policyNumber} · ${policy.coveredTypes}`} disabled readOnly /></div>
        ) : (
          <div className="full">
            <SelectInput label="Policy" value={f.policyNumber} onChange={set('policyNumber')} error={errors.policyNumber}
              placeholder={mine.isLoading ? 'Loading…' : activePolicies.length ? 'Choose a policy…' : 'You have no active policies'}
              options={activePolicies.map((p) => ({ value: p.policyNumber, label: `#${p.policyNumber} · ${p.coveredTypes}` }))} />
          </div>
        )}
        <SelectInput label="What happened" value={f.claimType} onChange={set('claimType')} options={CLAIM_TYPES} placeholder="Choose…" error={errors.claimType} />
        <TextInput label="Incident date" type="date" max={today()} value={f.incidentDate} onChange={set('incidentDate')} error={errors.incidentDate} />
        <TextInput label="Where it happened" value={f.incidentLocation} onChange={set('incidentLocation')} error={errors.incidentLocation} />
        <TextInput label="Amount claimed (₹)" type="number" min="1" value={f.amount} onChange={set('amount')} error={errors.amount} />
        <div className="full"><TextArea label="Describe what happened" value={f.description} onChange={set('description')} error={errors.description} hint="Include what was damaged or treated, and anything that supports the amount." /></div>
        <div className="full"><TextInput label="Document reference (optional)" value={f.nFilepo} onChange={set('nFilepo')} hint="A file name or reference for bills or reports you have submitted." /></div>
      </div>
    </Modal>
  )
}

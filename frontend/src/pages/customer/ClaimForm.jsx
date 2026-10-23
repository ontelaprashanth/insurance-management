import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claims, policies, purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import {
  Button,
  Modal,
  SelectInput,
  TextArea,
  TextInput,
  useToast,
} from '../../components/ui'
import { today } from '../../lib/format'

export const CLAIM_TYPES = [
  'Medical expense',
  'Hospitalisation',
  'Accident',
  'Death',
  'Disability',
  'Vehicle damage',
  'Theft',
  'Fire or natural calamity',
  'Trip cancellation',
  'Other',
]

const BLOCKING_CLAIM_STATUSES = new Set([
  'PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'SETTLED',
])

const claimFormStyles = `
  @keyframes ixClaimEnter {
    from { opacity: 0; transform: translateY(18px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes ixClaimGlow {
    0%, 100% { transform: translate(-15%, -30%) scale(1); opacity: .5; }
    50% { transform: translate(8%, -15%) scale(1.1); opacity: .8; }
  }

  @keyframes ixClaimSweep {
    from { transform: translateX(-130%) skewX(-20deg); }
    to { transform: translateX(330%) skewX(-20deg); }
  }

  .ix-claim-form {
    --ix-green-deep: #103e2d;
    --ix-green: #17814f;
    --ix-green-light: #e7f7ee;
    width: 100%;
    color: #17392e;
  }

  .ix-claim-hero {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    margin-bottom: 18px;
    padding: 22px 24px;
    border-radius: 18px;
    color: #fff;
    background: linear-gradient(120deg, #103e2d 0%, #176a48 58%, #1e935b 100%);
    box-shadow: 0 14px 30px rgba(16, 62, 45, .14);
    animation: ixClaimEnter .5s cubic-bezier(.2,.8,.2,1) both;
  }

  .ix-claim-hero::before {
    content: '';
    position: absolute;
    z-index: -1;
    top: -130px;
    right: -70px;
    width: 230px;
    height: 230px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(180,255,211,.28), transparent 70%);
    animation: ixClaimGlow 7s ease-in-out infinite;
  }

  .ix-claim-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 36%;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
    transform: translateX(-130%) skewX(-20deg);
  }

  .ix-claim-hero:hover::after {
    animation: ixClaimSweep 1.1s ease-out;
  }

  .ix-claim-eyebrow {
    margin-bottom: 8px;
    color: #c8f5da;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .ix-claim-title {
    margin: 0 0 6px;
    color: #fff;
    font-size: clamp(19px, 3vw, 24px);
    line-height: 1.25;
    font-weight: 800;
  }

  .ix-claim-subtitle {
    max-width: 590px;
    margin: 0;
    color: #e1f7e9;
    font-size: 13px;
    line-height: 1.65;
  }

  .ix-claim-form .ix-claim-section {
    margin-bottom: 14px;
    padding: 18px;
    border: 1px solid #d9e9df;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 4px 18px rgba(16, 62, 45, .045);
    animation: ixClaimEnter .52s cubic-bezier(.2,.8,.2,1) both;
    animation-delay: calc(var(--ix-claim-index, 0) * 90ms);
    transition: border-color .25s ease, box-shadow .25s ease, transform .25s ease;
  }

  .ix-claim-form .ix-claim-section:hover,
  .ix-claim-form .ix-claim-section:focus-within {
    border-color: #8fcdae;
    box-shadow: 0 12px 28px rgba(16, 100, 62, .10);
    transform: translateY(-2px);
  }

  .ix-claim-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .ix-claim-section-icon {
    display: grid;
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 11px;
    color: #137346;
    background: #e2f5e9;
    font-size: 13px;
    font-weight: 900;
    transition: transform .35s ease, background .35s ease;
  }

  .ix-claim-section:hover .ix-claim-section-icon {
    transform: rotate(-8deg) scale(1.08);
    background: #c9eed8;
  }

  .ix-claim-section-title {
    margin: 0;
    color: #103e2d;
    font-size: 15px;
    font-weight: 800;
  }

  .ix-claim-section-note {
    margin: 3px 0 0;
    color: #526b60;
    font-size: 12px;
    line-height: 1.5;
  }

  .ix-claim-form .form-grid {
    gap: 14px;
  }

  .ix-claim-form label {
    color: #204637;
    font-weight: 650;
  }

  .ix-claim-form input,
  .ix-claim-form textarea,
  .ix-claim-form select {
    color: #17392e;
    border-color: #cbded2;
    background: #fff;
    transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
  }

  .ix-claim-form input:focus,
  .ix-claim-form textarea:focus,
  .ix-claim-form select:focus {
    border-color: #17814f;
    box-shadow: 0 0 0 3px rgba(23, 129, 79, .12);
    outline-color: #17814f;
  }

  .ix-claim-form input:disabled {
    background: #f1f7f3;
    color: #3e5b4e;
    opacity: 1;
  }

  .ix-claim-form .alert.error {
    border: 1px solid #f1c3c3;
    border-radius: 12px;
    color: #8c2020;
    background: #fff0f0;
    animation: ixClaimEnter .3s ease both;
  }

  .ix-claim-helper {
    padding: 11px 13px;
    border: 1px solid #d2ecdc;
    border-radius: 12px;
    color: #4d6859;
    background: #eff9f3;
    font-size: 12px;
    line-height: 1.65;
  }

  .ix-claim-form-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .ix-claim-form-footer > * {
    transition: transform .22s ease, box-shadow .22s ease;
  }

  .ix-claim-form-footer > *:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 7px 17px rgba(16,62,45,.12);
  }

  .ix-claim-form-footer > *:active:not(:disabled) {
    transform: translateY(0) scale(.98);
  }

  @media (max-width: 640px) {
    .ix-claim-hero {
      padding: 18px;
      border-radius: 14px;
    }

    .ix-claim-form .ix-claim-section {
      padding: 14px;
      border-radius: 13px;
    }

    .ix-claim-form-footer {
      width: 100%;
    }

    .ix-claim-form-footer > * {
      flex: 1 1 120px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ix-claim-form *,
    .ix-claim-form *::before,
    .ix-claim-form *::after,
    .ix-claim-form-footer > * {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
  }
`

function normalize(value) {
  return String(value ?? '').trim().toUpperCase()
}

function rows(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.data?.content)) return value.data.content
  return []
}

function policyId(value) {
  return value?.policyNumber ?? value?.policy?.policyNumber ?? null
}

function claimIsBlocking(claim) {
  const status = normalize(claim?.status)

  if (!status) return true

  if (['REJECTED', 'CANCELLED', 'CANCELED'].includes(status)) {
    return false
  }

  // Fail closed for unknown statuses until the backend's status
  // vocabulary has been confirmed.
  return BLOCKING_CLAIM_STATUSES.has(status) || true
}

function eligibility(policy, purchaseRows, claimRows) {
  if (!policy || policy.policyNumber == null) {
    return 'Policy details are unavailable.'
  }

  if (policy.isActive !== true) {
    return 'This policy is not active.'
  }

  const lifecycle = normalize(policy.lifecycleStatus)

  if (lifecycle && lifecycle !== 'ACTIVE') {
    return `Policy status is ${lifecycle.replaceAll('_', ' ').toLowerCase()}.`
  }

  const currentDate = today()

  if (!policy.startDate || !policy.expiryDate) {
    return 'Policy coverage dates are unavailable.'
  }

  if (String(policy.startDate).slice(0, 10) > currentDate) {
    return 'Coverage has not started.'
  }

  if (String(policy.expiryDate).slice(0, 10) <= currentDate) {
    return 'This policy has expired.'
  }

  const linkedPurchases = purchaseRows.filter(
    (purchase) =>
      String(policyId(purchase)) === String(policy.policyNumber),
  )

  if (
    linkedPurchases.some(
      (purchase) =>
        normalize(purchase.refundStatus) !== 'NOT_REFUNDED',
    )
  ) {
    return 'A refund is pending, processing, completed, or requires verification.'
  }

  const linkedClaims = claimRows.filter(
    (claim) =>
      String(policyId(claim)) === String(policy.policyNumber),
  )

  if (linkedClaims.some(claimIsBlocking)) {
    return 'A pending or successful claim already exists for this policy.'
  }

  if (
    Array.isArray(policy.claims) &&
    policy.claims.some(claimIsBlocking)
  ) {
    return 'A pending or successful claim already exists for this policy.'
  }

  if (
    policy.hasSuccessfulClaim ||
    policy.claimApproved ||
    BLOCKING_CLAIM_STATUSES.has(normalize(policy.claimStatus))
  ) {
    return 'A pending or successful claim already exists for this policy.'
  }

  return ''
}

export default function ClaimForm({ policy, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()

  const mine = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const myClaims = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const myPurchases = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const [f, setF] = useState({
    policyNumber: policy?.policyNumber ?? '',
    claimType: '',
    incidentDate: '',
    incidentLocation: '',
    amount: '',
    description: '',
    nFilepo: '',
  })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const set = (key) => (event) => {
    const value = event.target.value

    setF((previous) => ({
      ...previous,
      [key]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [key]: '',
    }))

    setServerError('')
  }

  const loadingEligibility =
    mine.isPending ||
    myClaims.isPending ||
    myPurchases.isPending ||
    mine.isFetching ||
    myClaims.isFetching ||
    myPurchases.isFetching

  const eligibilityError =
    mine.isError || myClaims.isError || myPurchases.isError

  const currentPolicies = rows(mine.data)
  const purchaseRows = rows(myPurchases.data)
  const claimRows = rows(myClaims.data)

  const activePolicies =
    !loadingEligibility && !eligibilityError
      ? currentPolicies.filter(
          (item) => !eligibility(item, purchaseRows, claimRows),
        )
      : []

  const selectedPolicy = currentPolicies.find(
    (item) =>
      String(item.policyNumber) === String(f.policyNumber),
  )

  const selectedPolicyError = loadingEligibility
    ? 'Checking current policy eligibility…'
    : eligibilityError
      ? 'Unable to verify current policy eligibility. Please retry.'
      : !selectedPolicy
        ? 'The selected policy is not available in your policy history.'
        : eligibility(selectedPolicy, purchaseRows, claimRows)

  const save = useMutation({
    mutationFn: (body) => claims.save(body),

    onSuccess: (createdClaim) => {
      qc.invalidateQueries({ queryKey: ['my-claims'] })
      qc.invalidateQueries({ queryKey: ['my-policies'] })
      qc.invalidateQueries({ queryKey: ['my-purchases'] })

      toast.success(
        `Claim #${createdClaim?.claimNumber ?? ''} submitted. We will review it shortly.`,
      )

      onClose?.()
    },

    onError: (error) => {
      setServerError(
        errorMessage(error, 'Could not submit your claim.'),
      )
    },
  })

  async function submit() {
    if (save.isPending || loadingEligibility) return

    setServerError('')

    const e = {}

    if (!f.policyNumber) {
      e.policyNumber = 'Choose the policy this claim is for.'
    } else if (selectedPolicyError) {
      e.policyNumber = selectedPolicyError
    }

    if (!f.claimType) {
      e.claimType = 'Choose what happened.'
    }

    if (!f.incidentDate) {
      e.incidentDate = 'Enter the date it happened.'
    } else if (f.incidentDate > today()) {
      e.incidentDate = 'The incident date cannot be in the future.'
    } else if (
      selectedPolicy?.startDate &&
      f.incidentDate < String(selectedPolicy.startDate).slice(0, 10)
    ) {
      e.incidentDate = 'The incident happened before coverage started.'
    } else if (
      selectedPolicy?.expiryDate &&
      f.incidentDate >= String(selectedPolicy.expiryDate).slice(0, 10)
    ) {
      e.incidentDate = 'The incident happened after coverage ended.'
    }

    if (!f.incidentLocation.trim()) {
      e.incidentLocation = 'Enter where it happened.'
    }

    const amount = Number(f.amount)

    if (
      !f.amount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      e.amount = 'Enter a valid amount greater than zero.'
    }

    if (f.description.trim().length < 10) {
      e.description =
        'Describe what happened in at least 10 characters.'
    }

    setErrors(e)

    if (Object.keys(e).length > 0) return

    // Refresh server-authoritative records before submission.
    // Backend must still enforce ownership and atomic eligibility checks.
    try {
      const [policyResult, claimResult, purchaseResult] =
        await Promise.all([
          mine.refetch(),
          myClaims.refetch(),
          myPurchases.refetch(),
        ])

      if (
        policyResult.error ||
        claimResult.error ||
        purchaseResult.error
      ) {
        throw new Error(
          'Could not verify the latest policy status. Please retry.',
        )
      }

      const freshPolicy = rows(policyResult.data).find(
        (item) =>
          String(item.policyNumber) === String(f.policyNumber),
      )

      if (!freshPolicy) {
        setErrors((previous) => ({
          ...previous,
          policyNumber:
            'This policy is no longer available in your policy history.',
        }))
        return
      }

      const reason = eligibility(
        freshPolicy,
        rows(purchaseResult.data),
        rows(claimResult.data),
      )

      if (reason) {
        setErrors((previous) => ({
          ...previous,
          policyNumber: reason,
        }))
        return
      }

      // Validate the incident against the freshly fetched policy dates.
      if (
        f.incidentDate < String(freshPolicy.startDate).slice(0, 10) ||
        f.incidentDate >= String(freshPolicy.expiryDate).slice(0, 10)
      ) {
        setErrors((previous) => ({
          ...previous,
          incidentDate:
            'The incident date must fall within the policy coverage period.',
        }))
        return
      }
    } catch (error) {
      setServerError(
        errorMessage(error, 'Unable to verify policy eligibility.'),
      )
      return
    }

    save.mutate({
      policyNumber: Number(f.policyNumber),
      claimType: f.claimType,
      incidentDate: f.incidentDate,
      incidentLocation: f.incidentLocation.trim(),
      amount: Number(f.amount),
      description: f.description.trim(),
      nfilepo: f.nFilepo.trim() || undefined,
    })
  }

  return (
    <Modal
      title="File a claim"
      onClose={onClose}
      wide
      footer={
        <div className="ix-claim-form-footer">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>

          <Button
            variant="dark"
            loading={save.isPending}
            disabled={
              save.isPending ||
              loadingEligibility ||
              eligibilityError ||
              Boolean(f.policyNumber && selectedPolicyError)
            }
            onClick={submit}
          >
            Submit claim
          </Button>
        </div>
      }
    >
      <style>{claimFormStyles}</style>

      <div className="ix-claim-form">
        <div className="ix-claim-hero">
          <div className="ix-claim-eyebrow">
            InsureX · Claims assistance
          </div>

          <h3 className="ix-claim-title">
            Tell us what happened
          </h3>

          <p className="ix-claim-subtitle">
            Submit the incident details below. Our team will review
            your claim and update its status in My Claims.
          </p>
        </div>

        {serverError && (
          <div
            className="alert error"
            role="alert"
            style={{ marginBottom: 14 }}
          >
            {serverError}
          </div>
        )}

        {eligibilityError && (
          <div
            className="alert error"
            role="alert"
            style={{ marginBottom: 14 }}
          >
            Could not verify policy, purchase and claim records.
            Close and reopen the form or try again.
          </div>
        )}

        {!loadingEligibility &&
          f.policyNumber &&
          selectedPolicyError &&
          !eligibilityError && (
            <div
              className="alert error"
              role="alert"
              style={{ marginBottom: 14 }}
            >
              {selectedPolicyError}
            </div>
          )}

        <section
          className="ix-claim-section"
          style={{ '--ix-claim-index': 1 }}
        >
          <div className="ix-claim-section-head">
            <span className="ix-claim-section-icon" aria-hidden="true">
              01
            </span>

            <div>
              <h4 className="ix-claim-section-title">
                Policy & incident
              </h4>

              <p className="ix-claim-section-note">
                Choose the insured policy and describe the event.
              </p>
            </div>
          </div>

          <div className="form-grid">
            {policy ? (
              <div className="full">
                <TextInput
                  label="Policy"
                  value={`#${policy.policyNumber} · ${policy.coveredTypes}`}
                  disabled
                  readOnly
                />

                {errors.policyNumber && (
                  <p className="alert error" role="alert">
                    {errors.policyNumber}
                  </p>
                )}
              </div>
            ) : (
              <div className="full">
                <SelectInput
                  label="Policy"
                  value={f.policyNumber}
                  onChange={set('policyNumber')}
                  error={errors.policyNumber}
                  placeholder={
                    loadingEligibility
                      ? 'Checking policies…'
                      : activePolicies.length
                        ? 'Choose a policy…'
                        : 'No eligible policies available'
                  }
                  options={activePolicies.map((item) => ({
                    value: item.policyNumber,
                    label: `#${item.policyNumber} · ${item.coveredTypes}`,
                  }))}
                />
              </div>
            )}

            <SelectInput
              label="What happened"
              value={f.claimType}
              onChange={set('claimType')}
              options={CLAIM_TYPES}
              placeholder="Choose…"
              error={errors.claimType}
            />

            <TextInput
              label="Incident date"
              type="date"
              max={today()}
              value={f.incidentDate}
              onChange={set('incidentDate')}
              error={errors.incidentDate}
            />

            <div className="full">
              <TextInput
                label="Where it happened"
                value={f.incidentLocation}
                onChange={set('incidentLocation')}
                error={errors.incidentLocation}
              />
            </div>
          </div>
        </section>

        <section
          className="ix-claim-section"
          style={{ '--ix-claim-index': 2 }}
        >
          <div className="ix-claim-section-head">
            <span className="ix-claim-section-icon" aria-hidden="true">
              02
            </span>

            <div>
              <h4 className="ix-claim-section-title">
                Claim amount & details
              </h4>

              <p className="ix-claim-section-note">
                Enter the requested amount and supporting description.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <TextInput
              label="Amount claimed (₹)"
              type="number"
              min="1"
              value={f.amount}
              onChange={set('amount')}
              error={errors.amount}
            />

            <div className="full">
              <TextArea
                label="Describe what happened"
                value={f.description}
                onChange={set('description')}
                error={errors.description}
                hint="Include what was damaged or treated, and anything that supports the amount."
              />
            </div>
          </div>
        </section>

        <section
          className="ix-claim-section"
          style={{ '--ix-claim-index': 3 }}
        >
          <div className="ix-claim-section-head">
            <span className="ix-claim-section-icon" aria-hidden="true">
              03
            </span>

            <div>
              <h4 className="ix-claim-section-title">
                Supporting reference
              </h4>

              <p className="ix-claim-section-note">
                Optional reference for bills, reports or documents.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="full">
              <TextInput
                label="Document reference (optional)"
                value={f.nFilepo}
                onChange={set('nFilepo')}
                hint="A file name or reference for bills or reports you have submitted."
              />
            </div>
          </div>

          <p
            className="ix-claim-helper"
            style={{ margin: '12px 0 0' }}
          >
            Review the information before submitting. Claim approval
            and payment depend on the policy terms and backend review.
          </p>
        </section>
      </div>
    </Modal>
  )
}

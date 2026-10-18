import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { payment, policies, purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { Button, DataState, Icon, PageHeader, Panel, SelectInput, TextInput } from '../../components/ui'
import CoverageDial from '../../components/CoverageDial'
import { COVERAGE_MAX, COVERAGE_MIN, estimate, planFor } from '../../lib/premium'
import { dateTime, inr, inrShort } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other']
const STEPS = ['Cover', 'Nominee', 'Review and pay']

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Payment window failed to load.')))
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'))
    document.body.appendChild(s)
  })
}

export default function BuyPolicy() {
  const { policyNumber } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['available-policies'], queryFn: policies.available })
  const policy = useMemo(() => (list.data || []).find((p) => String(p.policyNumber) === policyNumber), [list.data, policyNumber])

  const [step, setStep] = useState(0)
  const [val, setVal] = useState({ coverage: 2_500_000, years: 1 })
  const [nominee, setNominee] = useState({ name: '', relation: '', contact: '' })
  const [errors, setErrors] = useState({})
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const plan = policy ? planFor(policy.coveredTypes) : null
  const est = policy ? estimate(policy.coveredTypes, val.coverage, val.years) : null

  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  function validateNominee() {
    const e = {}
    if (!nominee.name.trim()) e.name = 'Enter the nominee’s full name.'
    if (!nominee.relation) e.relation = 'Choose the relationship.'
    if (!/^[6-9]\d{9}$/.test(nominee.contact)) e.contact = 'Enter a 10-digit mobile number starting with 6–9.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function pay() {
    setError('')
    setPaying(true)
    let rzp
    try {
      const order = await payment.createOrder({ amount: est.total, currency: 'INR' })
      const Razorpay = await loadRazorpay()
      rzp = await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: Math.round(Number(order.amount) * 100),
          currency: order.currency || 'INR',
          name: 'InsureX',
          description: `${policy.coveredTypes} · ${inrShort(val.coverage)} · ${val.years} yr`,
          prefill: { name: user?.username, email: user?.email, contact: user?.contactNumber },
          theme: { color: '#0F3D3E' },
          handler: (r) => resolve(r),
          modal: { ondismiss: () => reject(new Error('CANCELLED')) },
        })
        checkout.on?.('payment.failed', (r) => reject(new Error(r?.error?.description || 'Payment failed.')))
        checkout.open()
      })

      try {
        const saved = await purchases.purchase({
          policyNumber: policy.policyNumber,
          coveredTypes: policy.coveredTypes,
          durationYears: val.years,
          coverageAmount: val.coverage,
          nomineeName: nominee.name.trim(),
          nomineeRelation: nominee.relation,
          nomineeContact: nominee.contact,
          paymentMethod: 'RAZORPAY',
          razorpayOrderId: rzp.razorpay_order_id,
          razorpayPaymentId: rzp.razorpay_payment_id,
          razorpaySignature: rzp.razorpay_signature,
        })
        setDone(saved)
        qc.invalidateQueries()
      } catch (err) {
        // Money has moved but the purchase did not save. Give the customer what support needs.
        setError(`${errorMessage(err, 'We could not record your purchase.')} Your payment was received. Keep this payment ID and contact support: ${rzp.razorpay_payment_id}`)
      }
    } catch (err) {
      if (err.message !== 'CANCELLED') setError(errorMessage(err, err.message))
    } finally {
      setPaying(false)
    }
  }

  if (done) {
    return (
      <Panel>
        <div className="empty">
          <div className="check-big"><Icon name="check" size={32} strokeWidth={3} /></div>
          <h4 style={{ fontSize: 24 }}>You are covered</h4>
          <p>{policy.coveredTypes} · {inrShort(val.coverage)} for {val.years} {val.years === 1 ? 'year' : 'years'}. A receipt is in your notifications.</p>
          <dl className="kv" style={{ maxWidth: 360, margin: '0 auto 24px', textAlign: 'left' }}>
            <dt>Amount paid</dt><dd>{inr(done.totalPremium ?? est.total)}</dd>
            <dt>Transaction</dt><dd>{done.transactionId || done.razorpayPaymentId || '—'}</dd>
            <dt>Paid on</dt><dd>{dateTime(done.paymentDateTime)}</dd>
          </dl>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Button variant="dark" onClick={() => nav('/app/purchases')}>See payment details</Button>
            <Button onClick={() => nav('/app/policies')}>My policies</Button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <>
      <PageHeader title="Buy a policy" subtitle={policy ? `${policy.coveredTypes} · policy #${policy.policyNumber}` : undefined}>
        <Link className="btn" to="/app/plans">Back to plans</Link>
      </PageHeader>

      <DataState query={list}>
        {() => !policy ? (
          <div className="alert error">That plan is not available any more. <Link to="/app/plans">Choose another plan</Link></div>
        ) : !plan ? (
          <div className="alert warn">This plan type is not priced for online purchase yet. Please choose another plan.</div>
        ) : (
          <>
            <ol className="steps" style={{ listStyle: 'none', padding: 0 }}>
              {STEPS.map((s, i) => (
                <li key={s} className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                  <span className="n">{i < step ? '✓' : i + 1}</span>{s}
                </li>
              ))}
            </ol>

            <div className="wizard">
              <div>
                {step === 0 && (
                  <Panel title={`${plan.label} cover`}>
                    <p className="muted" style={{ marginBottom: 16 }}>{plan.blurb}.</p>
                    <dl className="kv">
                      <dt>Cover amount</dt><dd>{inrShort(COVERAGE_MIN)} to {inrShort(COVERAGE_MAX)}</dd>
                      <dt>Term</dt><dd>1 to 5 years</dd>
                      <dt>Price</dt><dd>{inr(plan.yearly)} a year per ₹10 L of cover</dd>
                      <dt>Multi-year discount</dt><dd>5% off for 2 years or more</dd>
                      <dt>GST</dt><dd>0%</dd>
                    </dl>
                    <p className="faint" style={{ marginTop: 16 }}>Drag the sliders on the right. The total updates as you go.</p>
                  </Panel>
                )}

                {step === 1 && (
                  <Panel title="Who should receive the payout?">
                    <div className="form-grid">
                      <div className="full"><TextInput label="Nominee’s full name" value={nominee.name} onChange={(e) => setNominee({ ...nominee, name: e.target.value })} error={errors.name} autoFocus /></div>
                      <SelectInput label="Relationship" value={nominee.relation} onChange={(e) => setNominee({ ...nominee, relation: e.target.value })} options={RELATIONS} placeholder="Choose…" error={errors.relation} />
                      <TextInput label="Nominee’s mobile" inputMode="numeric" maxLength={10} value={nominee.contact} onChange={(e) => setNominee({ ...nominee, contact: e.target.value })} error={errors.contact} />
                    </div>
                  </Panel>
                )}

                {step === 2 && (
                  <Panel title="Review and pay">
                    <dl className="kv">
                      <dt>Plan</dt><dd>{policy.coveredTypes}</dd>
                      <dt>Coverage</dt><dd>{inr(val.coverage)}</dd>
                      <dt>Term</dt><dd>{val.years} {val.years === 1 ? 'year' : 'years'}</dd>
                      <dt>Nominee</dt><dd>{nominee.name} ({nominee.relation})</dd>
                      <dt>Nominee mobile</dt><dd>{nominee.contact}</dd>
                      <dt>Total payable</dt><dd>{inr(est.total)}</dd>
                    </dl>
                    <div className="alert info" style={{ marginTop: 16 }}>
                      You will pay through Razorpay: UPI, card, net banking or wallet. If something is wrong with your purchase, you can ask for a refund within 24 hours of paying.
                    </div>
                    {error && <div className="alert error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
                  </Panel>
                )}

                <div className="row" style={{ marginTop: 16 }}>
                  {step > 0 && <Button onClick={() => setStep(step - 1)} disabled={paying}>Back</Button>}
                  {step < 2 ? (
                    <Button variant="dark" onClick={() => { if (step === 1 && !validateNominee()) return; setStep(step + 1) }}>Continue</Button>
                  ) : (
                    <Button variant="primary" size="lg" loading={paying} onClick={pay}>Pay {inr(est.total)}</Button>
                  )}
                </div>
              </div>

              <CoverageDial value={val} onChange={setVal} planKey={plan.key} lockedPlan />
            </div>
          </>
        )}
      </DataState>
    </>
  )
}

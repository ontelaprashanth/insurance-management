
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { payment, plans, purchases } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import {
  Button,
  DataState,
  Icon,
  PageHeader,
  Panel,
  SelectInput,
  TextInput,
} from '../../components/ui'
import CoverageDial from '../../components/CoverageDial'
import { COVERAGE_MAX, COVERAGE_MIN, planFor } from '../../lib/premium'
import { dateTime, inr, inrShort } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'

const RELATIONS = [
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Other',
]

const STEPS = ['Cover', 'Nominee', 'Review and pay']

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay)
      return
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.Razorpay) resolve(window.Razorpay)
        else reject(new Error('Payment window failed to load.'))
      }, { once: true })

      existingScript.addEventListener('error', () => {
        reject(new Error('Could not load the Razorpay payment window.'))
      }, { once: true })

      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true

    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay)
      else reject(new Error('Payment window failed to load.'))
    }

    script.onerror = () => {
      reject(
        new Error(
          'Could not load the payment window. Check your internet connection.',
        ),
      )
    }

    document.body.appendChild(script)
  })
}

function normalizePlans(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  if (Array.isArray(data?.plans)) return data.plans
  return []
}

function isActivePlan(plan) {
  const value = plan?.isActive

  if (value === false || value === 0) return false

  return !['false', '0', 'no', 'inactive', 'disabled'].includes(
    String(value ?? '').trim().toLowerCase(),
  )
}

function calculatePremium(plan, coverage, years) {
  const basePremium = Number(plan?.basePremium)
  const baseCoverage = Number(plan?.baseCoverage)

  if (
    !Number.isFinite(basePremium) ||
    basePremium <= 0 ||
    !Number.isFinite(baseCoverage) ||
    baseCoverage <= 0
  ) {
    return null
  }

  const base = basePremium * (Number(coverage) / baseCoverage) * Number(years)
  const roundedBase = Math.round((base + Number.EPSILON) * 100) / 100
  const discount = years >= 2
    ? Math.round((roundedBase * 0.05 + Number.EPSILON) * 100) / 100
    : 0
  const taxable = Math.round((roundedBase - discount + Number.EPSILON) * 100) / 100

  // Current InsureX backend configuration uses 0% GST.
  const gst = 0
  const total = Math.round((taxable + gst + Number.EPSILON) * 100) / 100

  return {
    base: roundedBase,
    discount,
    taxable,
    gst,
    total,
  }
}

export default function BuyPolicy() {
  // The existing route parameter name is retained for compatibility.
  // Its value now represents the catalogue plan ID.
  const { policyNumber: planIdParam } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['insurance-plans'],
    queryFn: plans.available,
    staleTime: 60_000,
    retry: 1,
  })

  const catalogue = useMemo(
    () => normalizePlans(list.data).filter(isActivePlan),
    [list.data],
  )

  const policy = useMemo(
    () =>
      catalogue.find(
        (item) => String(item.planId) === String(planIdParam),
      ) ?? null,
    [catalogue, planIdParam],
  )

  const [step, setStep] = useState(0)
  const [val, setVal] = useState({
    coverage: 2_500_000,
    years: 1,
  })
  const [nominee, setNominee] = useState({
    name: '',
    relation: '',
    contact: '',
  })
  const [errors, setErrors] = useState({})
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const coveredType =
    policy?.coveredType || policy?.planName || policy?.planCode || 'Insurance'

  const planDetails = useMemo(
    () => (policy ? planFor(coveredType) : null),
    [policy, coveredType],
  )

  const est = useMemo(
    () => (policy ? calculatePremium(policy, val.coverage, val.years) : null),
    [policy, val.coverage, val.years],
  )

  const coverageIsValid =
    Number.isFinite(Number(val.coverage)) &&
    Number(val.coverage) >= COVERAGE_MIN &&
    Number(val.coverage) <= COVERAGE_MAX

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function validateNominee() {
    const nextErrors = {}

    if (!nominee.name.trim()) {
      nextErrors.name = 'Enter the nominee’s full name.'
    }

    if (!nominee.relation) {
      nextErrors.relation = 'Choose the relationship.'
    }

    if (!/^[6-9]\d{9}$/.test(nominee.contact.trim())) {
      nextErrors.contact =
        'Enter a 10-digit mobile number starting with 6–9.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function pay() {
    if (paying) return

    setError('')

    if (!policy || !est || !coverageIsValid) {
      setError('The selected plan or coverage amount is invalid.')
      return
    }

    if (!validateNominee()) {
      setStep(1)
      return
    }

    if (!Number.isFinite(est.total) || est.total <= 0) {
      setError('Unable to calculate the premium for this plan.')
      return
    }

    setPaying(true)

    let razorpayResponse

    try {
      // The backend currently accepts the amount supplied here.
      // The purchase endpoint separately checks the signed order
      // and its amount against the server-calculated premium.
      const order = await payment.createOrder({
        amount: est.total,
        currency: 'INR',
      })

      if (!order?.orderId || !order?.keyId || !order?.amount) {
        throw new Error('The server returned incomplete payment order details.')
      }

      const Razorpay = await loadRazorpay()

      razorpayResponse = await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: Math.round(Number(order.amount) * 100),
          currency: order.currency || 'INR',
          name: 'InsureX',
          description: `${coveredType} · ${inrShort(val.coverage)} · ${val.years} yr`,
          prefill: {
            name: user?.username,
            email: user?.email,
            contact: user?.contactNumber,
          },
          theme: {
            color: '#0F3D3E',
          },
          handler: (response) => resolve(response),
          modal: {
            ondismiss: () => reject(new Error('CANCELLED')),
          },
        })

        checkout.on?.('payment.failed', (response) => {
          reject(
            new Error(
              response?.error?.description || 'Payment failed.',
            ),
          )
        })

        checkout.open()
      })

      if (
        !razorpayResponse?.razorpay_order_id ||
        !razorpayResponse?.razorpay_payment_id ||
        !razorpayResponse?.razorpay_signature
      ) {
        throw new Error(
          'Razorpay did not return all required payment verification details.',
        )
      }

      try {
        const saved = await purchases.purchase({
          planId: Number(policy.planId),

          // Retained for compatibility with existing DTO fields.
          // The backend should use planId as the authoritative source.
          coveredTypes: coveredType,

          durationYears: Number(val.years),
          coverageAmount: Number(val.coverage),

          nomineeName: nominee.name.trim(),
          nomineeRelation: nominee.relation,
          nomineeContact: nominee.contact.trim(),

          paymentMethod: 'RAZORPAY',
          razorpayOrderId: razorpayResponse.razorpay_order_id,
          razorpayPaymentId: razorpayResponse.razorpay_payment_id,
          razorpaySignature: razorpayResponse.razorpay_signature,
        })

        setDone(saved)
        await qc.invalidateQueries()
      } catch (purchaseError) {
        setError(
          `${errorMessage(
            purchaseError,
            'We could not record your purchase.',
          )} If Razorpay charged you, do not retry immediately. Keep payment ID ${razorpayResponse.razorpay_payment_id} and contact InsureX support.`,
        )
      }
    } catch (paymentError) {
      if (paymentError?.message !== 'CANCELLED') {
        setError(
          errorMessage(
            paymentError,
            'Unable to complete the payment. Please try again.',
          ),
        )
      }
    } finally {
      setPaying(false)
    }
  }

  if (done) {
    return (
      <Panel>
        <div className="empty">
          <div className="check-big">
            <Icon name="check" size={32} strokeWidth={3} />
          </div>

          <h4 style={{ fontSize: 24 }}>You are covered</h4>

          <p>
            {coveredType} · {inrShort(val.coverage)} for {val.years}{' '}
            {val.years === 1 ? 'year' : 'years'}. Your purchase has been
            recorded.
          </p>

          <dl
            className="kv"
            style={{
              maxWidth: 360,
              margin: '0 auto 24px',
              textAlign: 'left',
            }}
          >
            <dt>Amount paid</dt>
            <dd>{inr(done.totalPremium ?? est?.total ?? 0)}</dd>

            <dt>Transaction</dt>
            <dd>
              {done.transactionId || done.razorpayPaymentId || '—'}
            </dd>

            <dt>Paid on</dt>
            <dd>{dateTime(done.paymentDateTime)}</dd>

            <dt>Policy number</dt>
            <dd>{done.policyNumber ?? 'Processing'}</dd>
          </dl>

          <div className="row" style={{ justifyContent: 'center' }}>
            <Button
              variant="dark"
              onClick={() => nav('/app/purchases')}
            >
              See payment details
            </Button>

            <Button onClick={() => nav('/app/policies')}>
              My policies
            </Button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <>
      <PageHeader
        title="Buy insurance"
        subtitle={
          policy
            ? `${policy.planName || coveredType} · ${policy.planCode || `Plan #${policy.planId}`}`
            : undefined
        }
      >
        <Link className="btn" to="/app/plans">
          Back to plans
        </Link>
      </PageHeader>

      <DataState query={list}>
        {() =>
          !policy ? (
            <div className="alert error" role="alert">
              This insurance plan is not available.{' '}
              <Link to="/app/plans">Choose another plan</Link>
            </div>
          ) : !est ? (
            <div className="alert warn" role="alert">
              This plan does not have valid pricing configured. Please contact
              support before purchasing.
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="alert error"
                  role="alert"
                  style={{ marginBottom: 16 }}
                >
                  {error}
                </div>
              )}

              <ol className="steps" style={{ listStyle: 'none', padding: 0 }}>
                {STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={`step ${
                      index === step
                        ? 'active'
                        : index < step
                          ? 'done'
                          : ''
                    }`}
                  >
                    <span className="n">
                      {index < step ? '✓' : index + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>

              <div className="wizard">
                <div>
                  {step === 0 && (
                    <Panel title={`${planDetails?.label || coveredType} cover`}>
                      <p className="muted" style={{ marginBottom: 16 }}>
                        {policy.description ||
                          planDetails?.blurb ||
                          'Insurance coverage designed around your needs.'}
                      </p>

                      <dl className="kv">
                        <dt>Plan code</dt>
                        <dd>{policy.planCode || '—'}</dd>

                        <dt>Cover amount</dt>
                        <dd>
                          {inrShort(COVERAGE_MIN)} to{' '}
                          {inrShort(COVERAGE_MAX)}
                        </dd>

                        <dt>Term</dt>
                        <dd>1 to 5 years</dd>

                        <dt>Base premium</dt>
                        <dd>
                          {inr(policy.basePremium)} per{' '}
                          {inr(policy.baseCoverage)} of cover, per year
                        </dd>

                        <dt>Multi-year discount</dt>
                        <dd>5% off for 2 years or more</dd>

                        <dt>GST</dt>
                        <dd>0%</dd>
                      </dl>

                      <p className="faint" style={{ marginTop: 16 }}>
                        Adjust the coverage and term to update your estimated
                        premium.
                      </p>

                      <dl className="kv">
                        <dt>Premium before discount</dt>
                        <dd>{inr(est.base)}</dd>

                        <dt>Discount</dt>
                        <dd>−{inr(est.discount)}</dd>

                        <dt>Total payable</dt>
                        <dd>{inr(est.total)}</dd>
                      </dl>
                    </Panel>
                  )}

                  {step === 1 && (
                    <Panel title="Who should receive the payout?">
                      <div className="form-grid">
                        <div className="full">
                          <TextInput
                            label="Nominee’s full name"
                            value={nominee.name}
                            onChange={(event) => {
                              setNominee({
                                ...nominee,
                                name: event.target.value,
                              })
                              setErrors({ ...errors, name: '' })
                            }}
                            error={errors.name}
                            autoFocus
                          />
                        </div>

                        <SelectInput
                          label="Relationship"
                          value={nominee.relation}
                          onChange={(event) => {
                            setNominee({
                              ...nominee,
                              relation: event.target.value,
                            })
                            setErrors({ ...errors, relation: '' })
                          }}
                          options={RELATIONS}
                          placeholder="Choose…"
                          error={errors.relation}
                        />

                        <TextInput
                          label="Nominee’s mobile"
                          inputMode="numeric"
                          maxLength={10}
                          value={nominee.contact}
                          onChange={(event) => {
                            const contact = event.target.value
                              .replace(/\D/g, '')
                              .slice(0, 10)

                            setNominee({ ...nominee, contact })
                            setErrors({ ...errors, contact: '' })
                          }}
                          error={errors.contact}
                        />
                      </div>
                    </Panel>
                  )}

                  {step === 2 && (
                    <Panel title="Review and pay">
                      <dl className="kv">
                        <dt>Insurance plan</dt>
                        <dd>{policy.planName || coveredType}</dd>

                        <dt>Plan code</dt>
                        <dd>{policy.planCode || '—'}</dd>

                        <dt>Coverage</dt>
                        <dd>{inr(val.coverage)}</dd>

                        <dt>Term</dt>
                        <dd>
                          {val.years}{' '}
                          {val.years === 1 ? 'year' : 'years'}
                        </dd>

                        <dt>Nominee</dt>
                        <dd>
                          {nominee.name} ({nominee.relation})
                        </dd>

                        <dt>Nominee mobile</dt>
                        <dd>{nominee.contact}</dd>

                        <dt>Base premium</dt>
                        <dd>{inr(est.base)}</dd>

                        <dt>Discount</dt>
                        <dd>−{inr(est.discount)}</dd>

                        <dt>GST</dt>
                        <dd>{inr(est.gst)}</dd>

                        <dt>Total payable</dt>
                        <dd>{inr(est.total)}</dd>
                      </dl>

                      <div className="alert info" style={{ marginTop: 16 }}>
                        Payment is processed through Razorpay. Please check
                        your plan, coverage, and nominee details before paying.
                        Do not make another payment if a previous payment
                        appears successful but your policy has not been
                        recorded.
                      </div>
                    </Panel>
                  )}

                  <div className="row" style={{ marginTop: 16 }}>
                    {step > 0 && (
                      <Button
                        onClick={() => setStep(step - 1)}
                        disabled={paying}
                      >
                        Back
                      </Button>
                    )}

                    {step < 2 ? (
                      <Button
                        variant="dark"
                        onClick={() => {
                          setError('')

                          if (step === 0) {
                            if (!coverageIsValid) {
                              setError('Choose a valid coverage amount.')
                              return
                            }

                            setStep(1)
                            return
                          }

                          if (!validateNominee()) return

                          setStep(2)
                        }}
                        disabled={paying}
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        loading={paying}
                        disabled={paying || !coverageIsValid || !est}
                        onClick={pay}
                      >
                        Pay {inr(est.total)}
                      </Button>
                    )}
                  </div>
                </div>

                <CoverageDial
                  value={val}
                  onChange={setVal}
                  planKey={planDetails?.key || String(policy.planCode || 'insurance').toLowerCase()}
                  lockedPlan
                />
              </div>
            </>
          )
        }
      </DataState>
    </>
  )
}

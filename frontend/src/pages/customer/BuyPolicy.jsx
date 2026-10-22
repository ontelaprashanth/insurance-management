
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  payment,
  plans,
  purchases,
  renewals,
  policies,
} from '../../api/endpoints'
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
import {
  COVERAGE_MAX,
  COVERAGE_MIN,
  planFor,
} from '../../lib/premium'
import {
  dateTime,
  inr,
  inrShort,
} from '../../lib/format'
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

    const scriptUrl =
      'https://checkout.razorpay.com/v1/checkout.js'

    const existingScript = document.querySelector(
      `script[src="${scriptUrl}"]`,
    )

    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () => {
          if (window.Razorpay) {
            resolve(window.Razorpay)
          } else {
            reject(new Error('Payment window failed to load.'))
          }
        },
        { once: true },
      )

      existingScript.addEventListener(
        'error',
        () => reject(
          new Error('Could not load the Razorpay payment window.'),
        ),
        { once: true },
      )

      return
    }

    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true

    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay)
      } else {
        reject(new Error('Payment window failed to load.'))
      }
    }

    script.onerror = () =>
      reject(new Error(
        'Could not load the payment window. Check your internet connection.',
      ))

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
  const requestedCoverage = Number(coverage)
  const duration = Number(years)

  if (
    !Number.isFinite(basePremium) ||
    basePremium <= 0 ||
    !Number.isFinite(baseCoverage) ||
    baseCoverage <= 0 ||
    !Number.isFinite(requestedCoverage) ||
    requestedCoverage <= 0 ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 5
  ) {
    return null
  }

  const roundMoney = (amount) =>
    Math.round((amount + Number.EPSILON) * 100) / 100

  const base = roundMoney(
    basePremium * (requestedCoverage / baseCoverage) * duration,
  )

  const discount =
    duration >= 2 ? roundMoney(base * 0.05) : 0

  const taxable = roundMoney(base - discount)
  const gst = 0
  const total = roundMoney(taxable + gst)

  return {
    base,
    discount,
    taxable,
    gst,
    total,
  }
}

function normalizePurchase(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  return []
}

function extractPolicyNumber(purchase) {
  return (
    purchase?.policyNumber ??
    purchase?.policy?.policyNumber ??
    null
  )
}

function normalizeOrder(order) {
  return {
    orderId: order?.orderId ?? order?.razorpayOrderId,
    keyId: order?.keyId ?? order?.razorpayKeyId,
    amount: Number(order?.amount ?? order?.totalPremium),
    currency: order?.currency || 'INR',
  }
}

function validOrder(order) {
  return Boolean(
    order?.orderId &&
    order?.keyId &&
    Number.isFinite(order?.amount) &&
    order.amount > 0 &&
    order.currency === 'INR',
  )
}

function getPurchaseError(error) {
  return errorMessage(
    error,
    'We could not record your purchase.',
  )
}

export default function BuyPolicy() {
  const { policyNumber: routeId } = useParams()
  const location = useLocation()

  const isRenewal =
    location.pathname.startsWith('/app/renew/')

  const originalPolicyNumber = isRenewal
    ? routeId
    : null

  const { user } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['insurance-plans'],
    queryFn: plans.available,
    staleTime: 60_000,
    retry: 1,
    enabled: !isRenewal,
  })

  const originalPolicyQuery = useQuery({
    queryKey: ['renewal-policy', originalPolicyNumber],
    queryFn: () => policies.get(originalPolicyNumber),
    enabled: isRenewal && Boolean(originalPolicyNumber),
    retry: 1,
  })

  const originalPurchasesQuery = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    enabled: isRenewal,
    retry: 1,
  })

  const catalogue = useMemo(
    () => normalizePlans(list.data).filter(isActivePlan),
    [list.data],
  )

  const policy = useMemo(
    () =>
      catalogue.find(
        (item) => String(item.planId) === String(routeId),
      ) ?? null,
    [catalogue, routeId],
  )

  const originalPolicy = originalPolicyQuery.data

  const originalPurchase = useMemo(() => {
    if (!isRenewal) return null

    return normalizePurchase(originalPurchasesQuery.data).find(
      (purchase) =>
        String(extractPolicyNumber(purchase)) ===
        String(originalPolicyNumber),
    ) ?? null
  }, [
    isRenewal,
    originalPurchasesQuery.data,
    originalPolicyNumber,
  ])

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

  const paymentLock = useRef(false)
  const [paymentUncertain, setPaymentUncertain] = useState(false)

  const renewalCoverage = Number(
    originalPurchase?.coverageAmount ?? 0,
  )

  const renewalYears = Number(
    originalPolicy?.durationYears ?? 0,
  )

  const renewalPremium = Number(
    originalPurchase?.totalPremium ?? 0,
  )

  const renewalDetailsReady =
    Number.isFinite(renewalCoverage) &&
    renewalCoverage > 0 &&
    Number.isInteger(renewalYears) &&
    renewalYears > 0 &&
    Number.isFinite(renewalPremium) &&
    renewalPremium > 0

  const coveredType = isRenewal
    ? (
      originalPolicy?.coveredTypes ||
      'Insurance'
    )
    : (
      policy?.coveredType ||
      policy?.planName ||
      policy?.planCode ||
      'Insurance'
    )

  const planDetails = useMemo(
    () => planFor(coveredType),
    [coveredType],
  )

  const est = useMemo(
    () =>
      isRenewal
        ? (
          renewalDetailsReady
            ? {
              base: Number(originalPurchase?.basePremium ?? renewalPremium),
              discount: Number(originalPurchase?.discountAmount ?? 0),
              taxable: Number(originalPurchase?.taxableAmount ?? renewalPremium),
              gst: Number(originalPurchase?.gstAmount ?? 0),
              total: renewalPremium,
            }
            : null
        )
        : (
          policy
            ? calculatePremium(policy, val.coverage, val.years)
            : null
        ),
    [
      isRenewal,
      renewalDetailsReady,
      originalPurchase,
      renewalPremium,
      policy,
      val.coverage,
      val.years,
    ],
  )

  const effectiveCoverage = isRenewal
    ? renewalCoverage
    : Number(val.coverage)

  const effectiveYears = isRenewal
    ? renewalYears
    : Number(val.years)

  const coverageIsValid = isRenewal
    ? renewalDetailsReady
    : (
      Number.isFinite(Number(val.coverage)) &&
      Number(val.coverage) >= COVERAGE_MIN &&
      Number(val.coverage) <= COVERAGE_MAX
    )

  const durationIsValid = isRenewal
    ? renewalDetailsReady
    : (
      Number.isInteger(Number(val.years)) &&
      Number(val.years) >= 1 &&
      Number(val.years) <= 5
    )

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [step])

  useEffect(() => {
    if (!isRenewal || !originalPurchase) return

    setNominee({
      name: originalPurchase.nomineeName || '',
      relation: originalPurchase.nomineeRelation || '',
      contact: originalPurchase.nomineeContact || '',
    })
  }, [isRenewal, originalPurchase])

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

  async function openCheckout(order) {
    const Razorpay = await loadRazorpay()

    return new Promise((resolve, reject) => {
      const checkout = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'InsureX',
        description: isRenewal
          ? `Renewal of policy #${originalPolicyNumber}`
          : `${coveredType} · ${inrShort(effectiveCoverage)} · ${effectiveYears} yr`,

        prefill: {
          name: user?.username || '',
          email: user?.email || '',
          contact: user?.contactNumber || '',
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
  }

  async function pay() {
    if (paying || paymentLock.current || paymentUncertain) return

    setError('')

    if (
      (!isRenewal && !policy) ||
      !est ||
      !coverageIsValid ||
      !durationIsValid
    ) {
      setError(
        'The selected policy, coverage, or duration is invalid.',
      )
      return
    }

    if (!isRenewal && !validateNominee()) {
      setStep(1)
      return
    }

    if (isRenewal && !originalPurchase) {
      setError('The original policy purchase was not found.')
      return
    }

    if (!Number.isFinite(est.total) || est.total <= 0) {
      setError('Unable to determine the payment amount.')
      return
    }

    paymentLock.current = true
    setPaying(true)

    let razorpayResponse = null

    try {
      const rawOrder = isRenewal
        ? await renewals.createOrder(originalPolicyNumber)
        : await payment.createOrder({
          planId: Number(policy.planId),
          coverageAmount: Number(val.coverage),
          durationYears: Number(val.years),
          currency: 'INR',
        })

      const order = normalizeOrder(rawOrder)

      if (!validOrder(order)) {
        throw new Error(
          'The server returned incomplete payment order details.',
        )
      }

      if (
        isRenewal &&
        Math.abs(order.amount - renewalPremium) > 0.009
      ) {
        throw new Error(
          'The renewal amount does not match the original paid premium. No payment was started.',
        )
      }

      razorpayResponse = await openCheckout(order)

      if (
        !razorpayResponse?.razorpay_order_id ||
        !razorpayResponse?.razorpay_payment_id ||
        !razorpayResponse?.razorpay_signature
      ) {
        throw new Error(
          'Razorpay did not return all required payment details.',
        )
      }

      try {
        const saved = isRenewal
          ? await renewals.confirm(originalPolicyNumber, {
            razorpayOrderId:
              razorpayResponse.razorpay_order_id,
            razorpayPaymentId:
              razorpayResponse.razorpay_payment_id,
            razorpaySignature:
              razorpayResponse.razorpay_signature,
          })
          : await purchases.purchase({
            planId: Number(policy.planId),
            coveredTypes: coveredType,
            durationYears: Number(val.years),
            coverageAmount: Number(val.coverage),

            nomineeName: nominee.name.trim(),
            nomineeRelation: nominee.relation,
            nomineeContact: nominee.contact.trim(),

            paymentMethod: 'RAZORPAY',

            razorpayOrderId:
              razorpayResponse.razorpay_order_id,
            razorpayPaymentId:
              razorpayResponse.razorpay_payment_id,
            razorpaySignature:
              razorpayResponse.razorpay_signature,
          })

        setDone(saved)
        await qc.invalidateQueries()
      } catch (purchaseError) {
        setPaymentUncertain(true)

        setError(
          `${getPurchaseError(purchaseError)} If Razorpay charged you, do not retry immediately. Keep payment ID ${razorpayResponse.razorpay_payment_id} and contact InsureX support.`,
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
      paymentLock.current = false
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

          <h4 style={{ fontSize: 24 }}>
            {isRenewal ? 'Policy renewed successfully' : 'You are covered'}
          </h4>

          <p>
            {isRenewal
              ? `Your original policy #${originalPolicyNumber} remains in your history. Your renewed policy has been recorded.`
              : `${coveredType} · ${inrShort(effectiveCoverage)} for ${effectiveYears} ${effectiveYears === 1 ? 'year' : 'years'}. Your purchase has been recorded.`}
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
              {done.transactionId ||
                done.razorpayPaymentId ||
                '—'}
            </dd>

            <dt>Paid on</dt>
            <dd>{dateTime(done.paymentDateTime)}</dd>

            <dt>Policy number</dt>
            <dd>
              {done.policyNumber ??
                done.policy?.policyNumber ??
                'Processing'}
            </dd>

            {isRenewal && (
              <>
                <dt>Original policy</dt>
                <dd>#{originalPolicyNumber}</dd>
              </>
            )}
          </dl>

          <div
            className="row"
            style={{ justifyContent: 'center' }}
          >
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

  const currentQuery = isRenewal
    ? {
      isLoading:
        originalPolicyQuery.isLoading ||
        originalPurchasesQuery.isLoading,
      isError:
        originalPolicyQuery.isError ||
        originalPurchasesQuery.isError,
      error:
        originalPolicyQuery.error ||
        originalPurchasesQuery.error,
      refetch: async () => {
        await Promise.all([
          originalPolicyQuery.refetch(),
          originalPurchasesQuery.refetch(),
        ])
      },
    }
    : list

  return (
    <>
      <PageHeader
        title={isRenewal ? 'Renew insurance' : 'Buy insurance'}
        subtitle={
          isRenewal
            ? `Renew policy #${originalPolicyNumber} at the original paid premium`
            : policy
              ? `${policy.planName || coveredType} · ${
                  policy.planCode || `Plan #${policy.planId}`
                }`
              : undefined
        }
      >
        <Link
          className="btn"
          to={isRenewal ? '/app/policies' : '/app/plans'}
        >
          {isRenewal ? 'Back to policies' : 'Back to plans'}
        </Link>
      </PageHeader>

      <DataState query={currentQuery}>
        {() =>
          (isRenewal && !originalPurchase) ||
          (!isRenewal && !policy) ? (
            <div className="alert error" role="alert">
              {isRenewal
                ? 'The original policy purchase could not be found.'
                : 'This insurance plan is not available.'}
            </div>
          ) : !est ? (
            <div className="alert warn" role="alert">
              Unable to determine valid insurance pricing.
              Please contact support.
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

              {paymentUncertain && (
                <div
                  className="alert warn"
                  role="alert"
                  style={{ marginBottom: 16 }}
                >
                  Payment confirmation is pending. Do not
                  make another payment for this policy.
                </div>
              )}

              <ol
                className="steps"
                style={{ listStyle: 'none', padding: 0 }}
              >
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
                    <Panel
                      title={
                        isRenewal
                          ? 'Original policy coverage'
                          : `${planDetails?.label || coveredType} cover`
                      }
                    >
                      <p
                        className="muted"
                        style={{ marginBottom: 16 }}
                      >
                        {isRenewal
                          ? 'Your renewal keeps the original coverage amount, duration, and paid premium.'
                          : policy.description ||
                            planDetails?.blurb ||
                            'Insurance coverage designed around your needs.'}
                      </p>

                      <dl className="kv">
                        {isRenewal && (
                          <>
                            <dt>Original policy</dt>
                            <dd>#{originalPolicyNumber}</dd>
                          </>
                        )}

                        <dt>Cover type</dt>
                        <dd>{coveredType}</dd>

                        <dt>Cover amount</dt>
                        <dd>{inr(effectiveCoverage)}</dd>

                        <dt>Term</dt>
                        <dd>{effectiveYears} yr</dd>

                        {!isRenewal && (
                          <>
                            <dt>Plan code</dt>
                            <dd>{policy.planCode || '—'}</dd>

                            <dt>Base premium</dt>
                            <dd>
                              {inr(policy.basePremium)} per{' '}
                              {inr(policy.baseCoverage)} of cover,
                              per year
                            </dd>

                            <dt>Multi-year discount</dt>
                            <dd>5% off for 2 years or more</dd>

                            <dt>GST</dt>
                            <dd>0%</dd>
                          </>
                        )}

                        <dt>Total payable</dt>
                        <dd>{inr(est.total)}</dd>
                      </dl>
                    </Panel>
                  )}

                  {step === 1 && (
                    <Panel title="Nominee details">
                      {isRenewal && (
                        <div className="alert info">
                          Renewal uses the nominee details
                          stored with the original purchase.
                        </div>
                      )}

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
                              setErrors({
                                ...errors,
                                name: '',
                              })
                            }}
                            error={errors.name}
                            disabled={isRenewal}
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
                            setErrors({
                              ...errors,
                              relation: '',
                            })
                          }}
                          options={RELATIONS}
                          placeholder="Choose…"
                          error={errors.relation}
                          disabled={isRenewal}
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
                            setNominee({
                              ...nominee,
                              contact,
                            })
                            setErrors({
                              ...errors,
                              contact: '',
                            })
                          }}
                          error={errors.contact}
                          disabled={isRenewal}
                        />
                      </div>
                    </Panel>
                  )}

                  {step === 2 && (
                    <Panel title="Review and pay">
                      <dl className="kv">
                        <dt>Purchase type</dt>
                        <dd>
                          {isRenewal
                            ? 'Policy renewal'
                            : 'New insurance'}
                        </dd>

                        {isRenewal && (
                          <>
                            <dt>Original policy</dt>
                            <dd>#{originalPolicyNumber}</dd>
                          </>
                        )}

                        <dt>Insurance</dt>
                        <dd>{coveredType}</dd>

                        <dt>Coverage</dt>
                        <dd>{inr(effectiveCoverage)}</dd>

                        <dt>Term</dt>
                        <dd>{effectiveYears} yr</dd>

                        <dt>Nominee</dt>
                        <dd>
                          {nominee.name || '—'}
                          {nominee.relation
                            ? ` (${nominee.relation})`
                            : ''}
                        </dd>

                        <dt>Nominee mobile</dt>
                        <dd>{nominee.contact || '—'}</dd>

                        <dt>Total payable</dt>
                        <dd>{inr(est.total)}</dd>
                      </dl>

                      <div
                        className="alert info"
                        style={{ marginTop: 16 }}
                      >
                        Payment is processed through Razorpay.
                        {isRenewal
                          ? ' Your renewal price is taken from the original paid purchase.'
                          : ' The backend independently verifies the payment before issuing your policy.'}
                        {' '}Do not pay again if a previous
                        payment appears successful but your
                        policy has not been recorded.
                      </div>
                    </Panel>
                  )}

                  <div
                    className="row"
                    style={{ marginTop: 16 }}
                  >
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
                            if (
                              !coverageIsValid ||
                              !durationIsValid
                            ) {
                              setError(
                                'Choose valid coverage and duration.',
                              )
                              return
                            }

                            setStep(1)
                            return
                          }

                          if (
                            !isRenewal &&
                            !validateNominee()
                          ) return

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
                        disabled={
                          paying ||
                          paymentUncertain ||
                          !coverageIsValid ||
                          !durationIsValid ||
                          !est
                        }
                        onClick={pay}
                      >
                        {isRenewal
                          ? `Renew for ${inr(est.total)}`
                          : `Pay ${inr(est.total)}`}
                      </Button>
                    )}
                  </div>
                </div>

                {!isRenewal && (
                  <CoverageDial
                    value={val}
                    onChange={setVal}
                    planKey={
                      planDetails?.key ||
                      String(
                        policy.planCode || 'insurance',
                      ).toLowerCase()
                    }
                    lockedPlan
                  />
                )}
              </div>
            </>
          )
        }
      </DataState>
    </>
  )
}

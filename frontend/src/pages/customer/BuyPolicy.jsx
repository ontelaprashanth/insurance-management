// =========================================================
// INSUREX — BUY POLICY / RENEW POLICY
// File: BuyPolicy.jsx
//
// - New insurance purchase
// - Policy renewal
// - Razorpay checkout
// - Server-side payment verification
// - Duplicate-click protection
// - Uncertain payment handling
// - Policy and payment cache synchronization
// - Responsive three-step checkout
//
// Important:
// The backend is authoritative for payment amounts,
// signatures, purchase completion, and renewal eligibility.
// A Razorpay checkout success alone does not issue a policy.
// =========================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom'
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

/* =========================================================
   CONSTANTS
========================================================= */

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

const STEPS = [
  'Cover',
  'Nominee',
  'Review and pay',
]

const RAZORPAY_SCRIPT =
  'https://checkout.razorpay.com/v1/checkout.js'

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }
  return []
}

function normalizePlans(data) {
  if (Array.isArray(data?.plans)) return data.plans
  return normalizeRows(data)
}

function isActivePlan(plan) {
  const value = plan?.isActive

  if (value === false || value === 0) return false

  return ![
    'false',
    '0',
    'no',
    'inactive',
    'disabled',
  ].includes(
    String(value ?? '').trim().toLowerCase(),
  )
}

function normalizedStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function extractPolicyNumber(purchase) {
  return (
    purchase?.policyNumber ??
    purchase?.policy?.policyNumber ??
    null
  )
}

function getRenewalSource(purchase) {
  return (
    purchase?.renewedFromPolicyNumber ??
    purchase?.renewalSourcePolicyNumber ??
    purchase?.renewedFromPurchase?.policyNumber ??
    purchase?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function isCompletedRenewal(purchase, sourceNumber) {
  return (
    String(getRenewalSource(purchase)) ===
      String(sourceNumber) &&
    normalizedStatus(purchase?.paymentStatus) === 'PAID'
  )
}

/* =========================================================
   PREMIUM ESTIMATE

   Display estimate only.
   The backend determines the payable amount.
========================================================= */

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
    Math.round(
      (amount + Number.EPSILON) * 100,
    ) / 100

  const base = roundMoney(
    basePremium *
      (requestedCoverage / baseCoverage) *
      duration,
  )

  const discount =
    duration >= 2
      ? roundMoney(base * 0.05)
      : 0

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

/* =========================================================
   RAZORPAY LOADER

   Reuses an existing script and supports concurrent callers.
========================================================= */

let razorpayScriptPromise = null

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay)
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    let script = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT}"]`,
    )

    const created = !script

    if (!script) {
      script = document.createElement('script')
      script.src = RAZORPAY_SCRIPT
      script.async = true
    }

    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    function onLoad() {
      cleanup()

      if (window.Razorpay) {
        resolve(window.Razorpay)
      } else {
        reject(
          new Error(
            'The Razorpay checkout window could not be initialized.',
          ),
        )
      }
    }

    function onError() {
      cleanup()

      if (created) {
        script.remove()
      }

      reject(
        new Error(
          'Could not load Razorpay checkout. Check your internet connection.',
        ),
      )
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)

    if (created) {
      document.body.appendChild(script)
    } else if (window.Razorpay) {
      onLoad()
    }
  }).catch((error) => {
    razorpayScriptPromise = null
    throw error
  })

  return razorpayScriptPromise
}

/* =========================================================
   ORDER HELPERS

   Existing backend order response contract preserved:
   amount is interpreted as INR, as in the original file.
========================================================= */

function normalizeOrder(order) {
  return {
    orderId:
      order?.orderId ??
      order?.razorpayOrderId,

    keyId:
      order?.keyId ??
      order?.razorpayKeyId,

    amount: Number(
      order?.amount ?? order?.totalPremium,
    ),

    currency: String(
      order?.currency || 'INR',
    ).toUpperCase(),
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
    'We could not confirm your insurance purchase.',
  )
}

/* =========================================================
   COMPONENT
========================================================= */

export default function BuyPolicy() {
  const { policyNumber: routeId } = useParams()

  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const isRenewal =
    location.pathname.startsWith('/app/renew/')

  const originalPolicyNumber = isRenewal
    ? routeId
    : null

  /* =======================================================
     STATE
  ======================================================= */

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
  const [paymentUncertain, setPaymentUncertain] =
    useState(false)

  const [paymentReference, setPaymentReference] =
    useState(null)

  const paymentLock = useRef(false)

  /* =======================================================
     QUERIES
  ======================================================= */

  const list = useQuery({
    queryKey: ['insurance-plans'],
    queryFn: plans.available,
    staleTime: 60_000,
    retry: 1,
    enabled: !isRenewal,
  })

  const originalPolicyQuery = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
    enabled:
      isRenewal &&
      Boolean(originalPolicyNumber),
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  })

  const originalPurchasesQuery = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    enabled: isRenewal,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  })

  /* =======================================================
     PLAN / ORIGINAL POLICY
  ======================================================= */

  const catalogue = useMemo(
    () =>
      normalizePlans(list.data)
        .filter(isActivePlan),
    [list.data],
  )

  const policy = useMemo(
    () =>
      catalogue.find(
        (item) =>
          String(item.planId) ===
          String(routeId),
      ) ?? null,
    [catalogue, routeId],
  )

  const originalPolicy = useMemo(() => {
    if (!isRenewal) return null

    return (
      normalizeRows(
        originalPolicyQuery.data,
      ).find(
        (item) =>
          String(
            item?.policyNumber ??
            item?.policy?.policyNumber,
          ) === String(originalPolicyNumber),
      ) ?? null
    )
  }, [
    isRenewal,
    originalPolicyQuery.data,
    originalPolicyNumber,
  ])

  const originalPurchase = useMemo(() => {
    if (!isRenewal) return null

    return (
      normalizeRows(
        originalPurchasesQuery.data,
      )
        .filter(
          (purchase) =>
            String(
              extractPolicyNumber(purchase),
            ) === String(originalPolicyNumber) &&
            normalizedStatus(
              purchase.paymentStatus,
            ) === 'PAID',
        )
        .sort(
          (a, b) =>
            Number(b.purchaseId || 0) -
            Number(a.purchaseId || 0),
        )[0] ?? null
    )
  }, [
    isRenewal,
    originalPurchasesQuery.data,
    originalPolicyNumber,
  ])

  const alreadyRenewed = useMemo(() => {
    if (!isRenewal) return false

    return normalizeRows(
      originalPurchasesQuery.data,
    ).some((purchase) =>
      isCompletedRenewal(
        purchase,
        originalPolicyNumber,
      ),
    )
  }, [
    isRenewal,
    originalPurchasesQuery.data,
    originalPolicyNumber,
  ])

  /* =======================================================
     RENEWAL DATA
  ======================================================= */

  const renewalCoverage = Number(
    originalPurchase?.coverageAmount ?? 0,
  )

  const renewalYears = Number(
    originalPolicy?.durationYears ??
    originalPolicy?.policy?.durationYears ??
    originalPurchase?.durationYears ??
    0,
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
        originalPolicy?.policy?.coveredTypes ||
        originalPurchase?.coveredTypes ||
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
                  base: Number(
                    originalPurchase?.basePremium ??
                    renewalPremium,
                  ),
                  discount: Number(
                    originalPurchase?.discountAmount ??
                    0,
                  ),
                  taxable: Number(
                    originalPurchase?.taxableAmount ??
                    renewalPremium,
                  ),
                  gst: Number(
                    originalPurchase?.gstAmount ??
                    0,
                  ),
                  total: renewalPremium,
                }
              : null
          )
        : (
            policy
              ? calculatePremium(
                  policy,
                  val.coverage,
                  val.years,
                )
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
        Number.isFinite(
          Number(val.coverage),
        ) &&
        Number(val.coverage) >= COVERAGE_MIN &&
        Number(val.coverage) <= COVERAGE_MAX
      )

  const durationIsValid = isRenewal
    ? renewalDetailsReady
    : (
        Number.isInteger(
          Number(val.years),
        ) &&
        Number(val.years) >= 1 &&
        Number(val.years) <= 5
      )

  const blockedRenewal =
    isRenewal && alreadyRenewed

  /* =======================================================
     EFFECTS
  ======================================================= */

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

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validateNominee() {
    const nextErrors = {}

    if (!nominee.name.trim()) {
      nextErrors.name =
        'Enter the nominee’s full name.'
    }

    if (!nominee.relation) {
      nextErrors.relation =
        'Choose the relationship.'
    }

    if (
      !/^[6-9]\d{9}$/.test(
        nominee.contact.trim(),
      )
    ) {
      nextErrors.contact =
        'Enter a valid 10-digit mobile number starting with 6–9.'
    }

    setErrors(nextErrors)

    return (
      Object.keys(nextErrors).length === 0
    )
  }

  /* =======================================================
     RAZORPAY CHECKOUT
  ======================================================= */

  async function openCheckout(order) {
    const Razorpay = await loadRazorpay()

    return new Promise((resolve, reject) => {
      let settled = false

      function resolveOnce(response) {
        if (settled) return
        settled = true
        resolve(response)
      }

      function rejectOnce(error) {
        if (settled) return
        settled = true
        reject(error)
      }

      const checkout = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,

        // Existing backend contract returns INR.
        amount: Math.round(
          order.amount * 100,
        ),

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

        handler: resolveOnce,

        modal: {
          ondismiss: () => {
            rejectOnce(
              new Error('CHECKOUT_DISMISSED'),
            )
          },
        },
      })

      checkout.on?.(
        'payment.failed',
        (response) => {
          rejectOnce(
            new Error(
              response?.error?.description ||
              'Payment failed.',
            ),
          )
        },
      )

      try {
        checkout.open()
      } catch (checkoutError) {
        rejectOnce(checkoutError)
      }
    })
  }

  /* =======================================================
     REFRESH RELATED DATA
  ======================================================= */

  async function refreshRelatedData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['my-purchases'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['my-policies'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['insurance-plans'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['my-claims'],
      }),
    ])
  }

  /* =======================================================
     PAYMENT

     1. Create backend order
     2. Open Razorpay checkout
     3. Receive Razorpay payment response
     4. Send proof to backend
     5. Backend verifies payment and records purchase
     6. Show success only after backend confirmation
  ======================================================= */

  async function pay() {
    if (
      paying ||
      paymentLock.current ||
      paymentUncertain ||
      done
    ) {
      return
    }

    setError('')

    if (
      (!isRenewal && !policy) ||
      !est ||
      !coverageIsValid ||
      !durationIsValid
    ) {
      setError(
        'The selected insurance plan, coverage, or duration is invalid.',
      )
      return
    }

    if (blockedRenewal) {
      setError(
        'This policy has already been renewed. Another renewal payment is not allowed.',
      )
      return
    }

    if (!isRenewal && !validateNominee()) {
      setStep(1)
      return
    }

    if (
      isRenewal &&
      (!originalPolicy || !originalPurchase)
    ) {
      setError(
        'The original policy or paid purchase could not be found.',
      )
      return
    }

    if (
      !Number.isFinite(est.total) ||
      est.total <= 0
    ) {
      setError(
        'Unable to determine the payable premium.',
      )
      return
    }

    paymentLock.current = true
    setPaying(true)

    let razorpayResponse = null
    let orderCreated = false
    let checkoutCompleted = false

    try {
      // Refresh renewal records before creating another order.
      if (isRenewal) {
        const latest = await originalPurchasesQuery.refetch()

        if (latest.error) {
          throw latest.error
        }

        if (
          normalizeRows(latest.data).some(
            (purchase) =>
              isCompletedRenewal(
                purchase,
                originalPolicyNumber,
              ),
          )
        ) {
          throw new Error(
            'This policy has already been renewed. Please check My Policies.',
          )
        }
      }

      const rawOrder = isRenewal
        ? await renewals.createOrder(
            originalPolicyNumber,
          )
        : await payment.createOrder({
            planId: Number(policy.planId),
            coverageAmount: Number(val.coverage),
            durationYears: Number(val.years),
            currency: 'INR',
          })

      orderCreated = true

      const order = normalizeOrder(rawOrder)

      if (!validOrder(order)) {
        throw new Error(
          'The backend returned incomplete payment order details.',
        )
      }

      setPaymentReference({
        orderId: order.orderId,
        paymentId: null,
      })

      if (
        isRenewal &&
        Math.abs(
          order.amount - renewalPremium,
        ) > 0.009
      ) {
        throw new Error(
          'The renewal amount differs from the original paid premium. No checkout was opened.',
        )
      }

      razorpayResponse = await openCheckout(order)

      checkoutCompleted = true

      if (
        !razorpayResponse?.razorpay_order_id ||
        !razorpayResponse?.razorpay_payment_id ||
        !razorpayResponse?.razorpay_signature
      ) {
        throw new Error(
          'Razorpay did not return complete payment confirmation details.',
        )
      }

      if (
        String(
          razorpayResponse.razorpay_order_id,
        ) !== String(order.orderId)
      ) {
        throw new Error(
          'The payment order reference does not match the created order.',
        )
      }

      setPaymentReference({
        orderId: order.orderId,
        paymentId:
          razorpayResponse.razorpay_payment_id,
      })

      // Backend verification is mandatory.
      const saved = isRenewal
        ? await renewals.confirm(
            originalPolicyNumber,
            {
              razorpayOrderId:
                razorpayResponse.razorpay_order_id,

              razorpayPaymentId:
                razorpayResponse.razorpay_payment_id,

              razorpaySignature:
                razorpayResponse.razorpay_signature,
            },
          )
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

      if (
        !saved ||
        saved.success === false
      ) {
        throw new Error(
          saved?.message ||
          'The backend did not confirm the insurance purchase.',
        )
      }

      setDone(saved)
      setPaymentUncertain(false)

      try {
        await refreshRelatedData()
      } catch (refreshError) {
        // Purchase has already been confirmed.
        // Cache refresh failure must not change success.
        console.error(
          'InsureX cache refresh failed:',
          refreshError,
        )
      }
    } catch (paymentError) {
      const cancelled =
        paymentError?.message ===
        'CHECKOUT_DISMISSED'

      if (cancelled) {
        setError(
          'Checkout was closed. If your bank shows a debit, check Payments before trying again.',
        )
      } else if (checkoutCompleted) {
        // Razorpay returned a successful checkout result,
        // but backend confirmation failed or was uncertain.
        // Never automatically repeat the purchase call.
        setPaymentUncertain(true)

        setError(
          `${getPurchaseError(paymentError)} ` +
          'Your payment may have succeeded, but the policy confirmation could not be verified. ' +
          'Do not pay again. Check Payments or contact InsureX support.',
        )
      } else {
        const networkUncertain =
          paymentError?.code === 'ERR_NETWORK' ||
          paymentError?.code === 'ECONNABORTED' ||
          paymentError?.code === 'ETIMEDOUT' ||
          (
            paymentError?.response &&
            paymentError.response.status >= 500
          )

        // If order creation itself was uncertain,
        // another order should not be created blindly.
        if (
          !orderCreated &&
          networkUncertain
        ) {
          setPaymentUncertain(true)
        }

        setError(
          errorMessage(
            paymentError,
            'Unable to start or complete checkout.',
          ),
        )
      }
    } finally {
      paymentLock.current = false
      setPaying(false)
    }
  }

  /* =======================================================
     SUCCESS
  ======================================================= */

  if (done) {
    return (
      <Panel>
        <div className="empty">
          <div className="check-big">
            <Icon
              name="check"
              size={32}
              strokeWidth={3}
            />
          </div>

          <h4 style={{ fontSize: 24 }}>
            {isRenewal
              ? 'Policy renewed successfully'
              : 'You are covered'}
          </h4>

          <p>
            {isRenewal
              ? `Your original policy #${originalPolicyNumber} remains in your history. Your renewed policy has been recorded.`
              : `${coveredType} · ${inrShort(effectiveCoverage)} for ${effectiveYears} ${
                  effectiveYears === 1
                    ? 'year'
                    : 'years'
                }. Your purchase has been recorded.`}
          </p>

          <dl
            className="kv"
            style={{
              maxWidth: 380,
              margin: '0 auto 24px',
              textAlign: 'left',
            }}
          >
            <dt>Amount paid</dt>
            <dd>
              {inr(
                done.totalPremium ??
                est?.total ??
                0,
              )}
            </dd>

            <dt>Transaction</dt>
            <dd>
              {done.transactionId ||
                done.razorpayPaymentId ||
                paymentReference?.paymentId ||
                '—'}
            </dd>

            <dt>Paid on</dt>
            <dd>
              {dateTime(done.paymentDateTime)}
            </dd>

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
            style={{
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <Button
              variant="dark"
              onClick={() =>
                navigate('/app/purchases')
              }
            >
              See payment details
            </Button>

            <Button
              onClick={() =>
                navigate('/app/policies')
              }
            >
              My policies
            </Button>
          </div>
        </div>
      </Panel>
    )
  }

  /* =======================================================
     QUERY STATUS
  ======================================================= */

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

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <PageHeader
        title={
          isRenewal
            ? 'Renew insurance'
            : 'Buy insurance'
        }
        subtitle={
          isRenewal
            ? `Renew policy #${originalPolicyNumber} at the original paid premium`
            : policy
              ? `${policy.planName || coveredType} · ${
                  policy.planCode ||
                  `Plan #${policy.planId}`
                }`
              : undefined
        }
      >
        <Link
          className="btn"
          to={
            isRenewal
              ? '/app/policies'
              : '/app/plans'
          }
        >
          {isRenewal
            ? 'Back to policies'
            : 'Back to plans'}
        </Link>
      </PageHeader>

      <style>{`
        .ix-checkout-alert {
          margin-bottom: 16px;
        }

        .ix-checkout-reference {
          margin-top: 10px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .ix-checkout-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .ix-checkout-actions > * {
          flex-shrink: 0;
        }

        .ix-checkout-success-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        @media (max-width: 640px) {
          .ix-checkout-actions {
            justify-content: stretch;
          }

          .ix-checkout-actions > * {
            flex: 1;
          }
        }
      `}</style>

      <DataState query={currentQuery}>
        {() =>
          (
            isRenewal &&
            (!originalPurchase || !originalPolicy)
          ) ||
          (!isRenewal && !policy) ? (
            <div
              className="alert error"
              role="alert"
            >
              {isRenewal
                ? 'The original policy or paid purchase could not be found in your account.'
                : 'This insurance plan is not available.'}
            </div>
          ) : blockedRenewal ? (
            <div
              className="alert info"
              role="status"
            >
              <ShieldCheck size={18} />
              <span>
                This policy has already been renewed.
                You can view the renewed policy in
                My Policies.
              </span>

              <Link
                className="btn"
                to="/app/policies"
              >
                My policies
              </Link>
            </div>
          ) : !est ? (
            <div
              className="alert warn"
              role="alert"
            >
              Unable to determine valid insurance
              pricing. Please contact support.
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="alert error ix-checkout-alert"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {paymentUncertain && (
                <div
                  className="alert warn ix-checkout-alert"
                  role="alert"
                >
                  <span>
                    Payment confirmation is uncertain.
                    Do not make another payment until
                    you verify the existing transaction.
                  </span>

                  {paymentReference && (
                    <div className="ix-checkout-reference">
                      <div>
                        Order ID:{' '}
                        <strong>
                          {paymentReference.orderId || '—'}
                        </strong>
                      </div>

                      {paymentReference.paymentId && (
                        <div>
                          Payment ID:{' '}
                          <strong>
                            {paymentReference.paymentId}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <Link
                      className="btn"
                      to="/app/purchases"
                    >
                      Check payment history
                    </Link>
                  </div>
                </div>
              )}

              {/* STEPS */}

              <ol
                className="steps"
                style={{
                  listStyle: 'none',
                  padding: 0,
                }}
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
                      {index < step
                        ? '✓'
                        : index + 1}
                    </span>

                    {label}
                  </li>
                ))}
              </ol>

              <div className="wizard">
                <div>
                  {/* STEP 1 — COVER */}

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
                        style={{
                          marginBottom: 16,
                        }}
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
                            <dd>
                              #{originalPolicyNumber}
                            </dd>
                          </>
                        )}

                        <dt>Cover type</dt>
                        <dd>{coveredType}</dd>

                        <dt>Cover amount</dt>
                        <dd>
                          {inr(effectiveCoverage)}
                        </dd>

                        <dt>Term</dt>
                        <dd>
                          {effectiveYears} yr
                        </dd>

                        {!isRenewal && (
                          <>
                            <dt>Plan code</dt>
                            <dd>
                              {policy.planCode || '—'}
                            </dd>

                            <dt>Base premium</dt>
                            <dd>
                              {inr(policy.basePremium)}
                              {' '}per{' '}
                              {inr(policy.baseCoverage)}
                              {' '}of cover, per year
                            </dd>

                            <dt>Multi-year discount</dt>
                            <dd>
                              5% off for 2 years or more
                            </dd>

                            <dt>GST</dt>
                            <dd>0%</dd>
                          </>
                        )}

                        <dt>Total payable</dt>
                        <dd>
                          {inr(est.total)}
                        </dd>
                      </dl>
                    </Panel>
                  )}

                  {/* STEP 2 — NOMINEE */}

                  {step === 1 && (
                    <Panel title="Nominee details">
                      {isRenewal && (
                        <div className="alert info">
                          Renewal uses the nominee
                          details stored with the
                          original purchase.
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
                            const contact =
                              event.target.value
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

                  {/* STEP 3 — REVIEW */}

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
                            <dd>
                              #{originalPolicyNumber}
                            </dd>
                          </>
                        )}

                        <dt>Insurance</dt>
                        <dd>{coveredType}</dd>

                        <dt>Coverage</dt>
                        <dd>
                          {inr(effectiveCoverage)}
                        </dd>

                        <dt>Term</dt>
                        <dd>
                          {effectiveYears} yr
                        </dd>

                        <dt>Nominee</dt>
                        <dd>
                          {nominee.name || '—'}
                          {nominee.relation
                            ? ` (${nominee.relation})`
                            : ''}
                        </dd>

                        <dt>Nominee mobile</dt>
                        <dd>
                          {nominee.contact || '—'}
                        </dd>

                        <dt>Total payable</dt>
                        <dd>
                          {inr(est.total)}
                        </dd>
                      </dl>

                      <div
                        className="alert info"
                        style={{
                          marginTop: 16,
                        }}
                      >
                        Payment is processed through
                        Razorpay. The backend verifies
                        the payment before recording
                        the insurance purchase.
                        {' '}Do not pay again if you
                        were charged but your policy
                        is not yet visible.
                      </div>
                    </Panel>
                  )}

                  {/* NAVIGATION */}

                  <div className="ix-checkout-actions">
                    {step > 0 && (
                      <Button
                        onClick={() =>
                          setStep((current) =>
                            Math.max(
                              0,
                              current - 1,
                            ),
                          )
                        }
                        disabled={paying}
                      >
                        Back
                      </Button>
                    )}

                    {step < 2 ? (
                      <Button
                        variant="dark"
                        disabled={
                          paying ||
                          paymentUncertain
                        }
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
                          ) {
                            return
                          }

                          setStep(2)
                        }}
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
                          blockedRenewal ||
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

                {/* COVERAGE SELECTOR */}

                {!isRenewal && (
                  <CoverageDial
                    value={val}
                    onChange={setVal}
                    planKey={
                      planDetails?.key ||
                      String(
                        policy.planCode ||
                        'insurance',
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

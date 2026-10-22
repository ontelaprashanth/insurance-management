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

import { planFor } from '../../lib/premium'

import {
  dateTime,
  inr,
  inrShort,
} from '../../lib/format'

import { ShieldCheck } from 'lucide-react'

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


/* InsureX green checkout — presentation only; payment logic unchanged */
const BUY_GREEN_STYLES = `
.ix-buy-page { --ix-green-950:#103e2d; --ix-green-800:#145c3e; --ix-green-700:#17814f; --ix-green-100:#d9f5e6; --ix-green-50:#f4fbf7; color:#163c2d; }
.ix-buy-page :is(h1,h2,h3,h4,strong,b,dt) { color:#103e2d; }
.ix-buy-page :is(.muted,p,dd,label) { color:#355a49; }
.ix-buy-page .wizard { display:grid; grid-template-columns:minmax(0,1fr) minmax(270px,360px); align-items:start; gap:20px; }
.ix-buy-page .wizard > * { min-width:0; }
.ix-buy-page .wizard > :first-child { display:grid; gap:16px; }
.ix-buy-page .wizard > :first-child > * { min-width:0; }
.ix-buy-page .wizard > :first-child > .panel,
.ix-buy-page .wizard > :first-child > section,
.ix-buy-page .wizard > :first-child > article { background:linear-gradient(150deg,#fff 0%,#f4fbf7 100%); }
.ix-buy-page .wizard :is(.panel,.card),.ix-buy-page .ix-buy-cover-card,.ix-buy-page .ix-buy-step-card { border:1px solid #cce9d9; border-radius:20px; box-shadow:0 8px 28px rgba(16,62,45,.075); }
.ix-buy-page .wizard :is(.panel,.card) { animation:ixBuyRise .55s cubic-bezier(.2,.8,.2,1) both; transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease; }
.ix-buy-page .wizard :is(.panel,.card):hover { transform:translateY(-4px); box-shadow:0 18px 38px rgba(16,62,45,.13); border-color:#7bcba2; }
.ix-buy-page .wizard .kv { display:grid; grid-template-columns:minmax(110px,1fr) minmax(0,1fr); column-gap:16px; row-gap:13px; }
.ix-buy-page .wizard .kv dt { font-weight:600; color:#426654; }
.ix-buy-page .wizard .kv dd { text-align:right; font-weight:700; overflow-wrap:anywhere; color:#103e2d; }
.ix-buy-page .steps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:0 0 22px; }
.ix-buy-page .steps .step { display:flex; align-items:center; justify-content:center; gap:10px; padding:15px 12px; min-width:0; border-radius:16px; border:1px solid #d3e9dc; background:#fff; color:#315a45; font-weight:700; box-shadow:0 5px 18px rgba(16,62,45,.05); animation:ixBuyRise .5s ease both; transition:transform .25s ease,background .25s ease,box-shadow .25s ease; }
.ix-buy-page .steps .step:nth-child(2){animation-delay:.09s}.ix-buy-page .steps .step:nth-child(3){animation-delay:.18s}
.ix-buy-page .steps .step:hover {transform:translateY(-3px);box-shadow:0 12px 25px rgba(16,62,45,.12)}
.ix-buy-page .steps .step.active { background:linear-gradient(120deg,#103e2d,#17814f);color:white;border-color:#17814f;box-shadow:0 10px 25px rgba(23,129,79,.22); }
.ix-buy-page .steps .step.done {background:#d9f5e6;border-color:#9cd6b7;color:#145c3e}
.ix-buy-page .steps .step .n {width:28px;height:28px;flex:none;display:grid;place-items:center;border-radius:50%;background:#e5f5ec;color:#145c3e;font-weight:800}
.ix-buy-page .steps .step.active .n {background:#fff;color:#145c3e}
.ix-buy-page .ix-checkout-actions {padding:14px;border:1px solid #d4e9dc;border-radius:16px;background:#f4fbf7;}
.ix-buy-page :is(.btn,button) { transition:transform .22s ease,box-shadow .22s ease,filter .22s ease; }
.ix-buy-page :is(.btn,button):not(:disabled):hover {transform:translateY(-2px);box-shadow:0 7px 17px rgba(16,62,45,.15)}
.ix-buy-page :is(.btn.primary,.btn.dark,button.primary,button.dark) { background:#17814f;color:#fff;border-color:#17814f; }
.ix-buy-page .alert {border-radius:14px;line-height:1.6;overflow-wrap:anywhere}
.ix-buy-page .alert.info {background:#eaf8ef;color:#184d34;border:1px solid #b8dfc8}
.ix-buy-page :is(input,select,textarea) { color:#103e2d; border-color:#bdd9c8; }
.ix-buy-page :is(input,select,textarea):focus {outline-color:#17814f;border-color:#17814f}
.ix-buy-page .form-grid {row-gap:16px}
.ix-buy-page .ix-buy-step-card {background:linear-gradient(145deg,#fff,#f4fbf7);padding:16px;animation:ixBuyRise .5s ease both;}
.ix-buy-page .ix-buy-step-card:nth-child(2){animation-delay:.12s}
.ix-buy-page .ix-buy-step-card:nth-child(3){animation-delay:.24s}
.ix-buy-page .ix-buy-hero {display:flex;align-items:center;gap:12px;margin-bottom:18px;padding:16px 18px;border-radius:18px;background:linear-gradient(115deg,#103e2d,#17814f);color:white;position:relative;overflow:hidden;animation:ixBuyRise .55s ease both}
.ix-buy-page .ix-buy-hero strong,.ix-buy-page .ix-buy-hero p {color:#fff}
.ix-buy-page .ix-buy-hero svg {flex:none;animation:ixBuyFloat 3s ease-in-out infinite}
.ix-buy-page .ix-buy-hero::after {content:'';position:absolute;inset:0;transform:translateX(-120%) skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent);animation:ixBuyShine 6s ease-in-out infinite;pointer-events:none}
.ix-buy-success {max-width:780px;margin:16px auto;padding:26px;border:1px solid #bfe6d0;border-radius:24px;background:linear-gradient(155deg,#fff,#e9f9f0);box-shadow:0 20px 55px rgba(16,62,45,.12);animation:ixBuyRise .65s ease both;color:#103e2d}
.ix-buy-success h4,.ix-buy-success strong,.ix-buy-success dd {color:#103e2d}
.ix-buy-success .check-big {background:#17814f;color:white;border-radius:50%;animation:ixBuyPop .7s cubic-bezier(.2,1.4,.4,1) both}
.ix-buy-success .btn,.ix-buy-success button {transition:transform .2s ease,box-shadow .2s ease}
.ix-buy-success .btn:hover,.ix-buy-success button:hover {transform:translateY(-3px);box-shadow:0 8px 20px rgba(16,62,45,.16)}
@keyframes ixBuyRise {from{opacity:0;transform:translateY(22px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ixBuyFloat {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ixBuyShine {0%,55%{transform:translateX(-120%) skewX(-20deg)}85%,100%{transform:translateX(130%) skewX(-20deg)}}
@keyframes ixBuyPop {from{opacity:0;transform:scale(.55) rotate(-20deg)}to{opacity:1;transform:scale(1) rotate(0)}}
@media(max-width:900px){.ix-buy-page .wizard{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){.ix-buy-page .steps{gap:6px}.ix-buy-page .steps .step{font-size:11px;gap:5px;padding:11px 5px;flex-direction:column;text-align:center}.ix-buy-page .steps .step .n{width:25px;height:25px}.ix-buy-page .wizard .kv{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.ix-buy-page .ix-checkout-actions>*{flex:1 1 130px}.ix-buy-success{padding:16px;margin:8px}}
@media(prefers-reduced-motion:reduce){.ix-buy-page *, .ix-buy-success *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`

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
    planId: null,
    coverage: 0,
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

  // Start at the actual selected plan's base coverage, not a
  // hardcoded ₹25 lakh (which mismatches Motor/Health plans).
  useEffect(() => {
    if (isRenewal || !policy) return
    const base = Number(policy.baseCoverage)
    if (Number.isFinite(base) && base > 0) {
      setVal({ planId: String(policy.planId), coverage: base, years: 1 })
    }
  }, [isRenewal, policy?.planId, policy?.baseCoverage])

  const planName = policy?.planName || policy?.planCode || 'Insurance plan'
  // Derive coverage from the selected plan immediately, even before the reset effect runs.
  const selectedCoverage =
    policy && val.planId === String(policy.planId)
      ? Number(val.coverage)
      : Number(policy?.baseCoverage ?? 0)
  const selectedYears =
    policy && val.planId === String(policy.planId) ? Number(val.years) : 1

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
                  selectedCoverage,
                  selectedYears,
                )
              : null
          ),
    [
      isRenewal,
      renewalDetailsReady,
      originalPurchase,
      renewalPremium,
      policy,
      selectedCoverage,
      selectedYears,
    ],
  )

  const effectiveCoverage = isRenewal
    ? renewalCoverage
    : selectedCoverage

  const effectiveYears = isRenewal
    ? renewalYears
    : selectedYears

  const coverageIsValid = isRenewal
    ? renewalDetailsReady
    : (
        Number.isFinite(
          selectedCoverage,
        ) &&
        selectedCoverage > 0
      )

  const durationIsValid = isRenewal
    ? renewalDetailsReady
    : (
        Number.isInteger(
          selectedYears,
        ) &&
        selectedYears >= 1 &&
        selectedYears <= 5
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
            coverageAmount: selectedCoverage,
            durationYears: selectedYears,
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
            durationYears: selectedYears,
            coverageAmount: selectedCoverage,

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
      <div className="ix-buy-success">
        <style>{BUY_GREEN_STYLES}</style>
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
      </div>
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
    <div className="ix-buy-page">
      <style>{BUY_GREEN_STYLES}</style>
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
              ? `${planName} · ${coveredType} · ${
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

      <div className="ix-buy-hero">
        <ShieldCheck size={27} aria-hidden="true" />
        <div>
          <strong>{isRenewal ? 'Secure policy renewal' : 'Secure insurance checkout'}</strong>
          <p style={{ margin: '3px 0 0', fontSize: 13 }}>
            {isRenewal ? 'Keep your original policy benefits and review your renewal.' : 'Choose your cover, confirm nominee details, and pay securely.'}
          </p>
        </div>
      </div>

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

                        {!isRenewal && (
                          <>
                            <dt>Selected plan</dt>
                            <dd>{planName}</dd>
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
                        <dd>{isRenewal ? coveredType : `${planName} (${coveredType})`}</dd>

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
                  <Panel title="Customize your coverage">
                    <p className="muted" style={{ marginBottom: 14 }}>
                      {planName} · {coveredType}. Base cover: {inr(policy.baseCoverage)}.
                      The backend confirms the final payable amount.
                    </p>
                    <div className="form-grid">
                      <div className="full">
                        <TextInput
                          label="Coverage amount (₹)"
                          type="number"
                          min="1"
                          step="1"
                          value={selectedCoverage || ''}
                          onChange={(event) => setVal((current) => ({
                            ...current,
                            coverage: event.target.value,
                          }))}
                        />
                      </div>
                      <div className="full">
                        <label htmlFor="ix-duration-years" style={{ display: 'block', marginBottom: 8 }}>
                          Duration (years)
                        </label>
                        <select
                          id="ix-duration-years"
                          value={selectedYears}
                          onChange={(event) => setVal((current) => ({
                            ...current,
                            years: Number(event.target.value),
                          }))}
                          style={{ width: '100%', minHeight: 44, borderRadius: 10, padding: 10 }}
                        >
                          {[1, 2, 3, 4, 5].map((years) => (
                            <option key={years} value={years}>
                              {years} {years === 1 ? 'year' : 'years'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="ix-side-breakdown" aria-live="polite" style={{ marginTop: 16, padding: 16, border: '1px solid #cce9d9', borderRadius: 14, background: '#f4fbf7' }}>
                      <strong style={{ display: 'block', marginBottom: 12 }}>{planName} — premium estimate</strong>
                      <dl className="kv" style={{ margin: 0 }}>
                        <dt>Selected plan</dt><dd>{planName}</dd>
                        <dt>Category</dt><dd>{coveredType}</dd>
                        <dt>Base coverage</dt><dd>{inr(policy.baseCoverage)}</dd>
                        <dt>Base premium / year</dt><dd>{inr(policy.basePremium)}</dd>
                        <dt>Selected coverage</dt><dd>{inr(effectiveCoverage)}</dd>
                        <dt>Duration</dt><dd>{effectiveYears} {effectiveYears === 1 ? 'year' : 'years'}</dd>
                        <dt>Calculated premium</dt><dd>{est ? inr(est.base) : '—'}</dd>
                        <dt>GST (estimated)</dt><dd>{est ? inr(est.gst) : '—'}</dd>
                        <dt>Multi-year discount</dt><dd>{est ? `− ${inr(est.discount)}` : '—'}</dd>
                        <dt>Estimated total</dt><dd><strong>{est ? inr(est.total) : '—'}</strong></dd>
                      </dl>
                      <p className="muted" style={{ margin: '12px 0 0', fontSize: 12 }}>
                        Estimate only. Your backend calculates the actual amount when the payment order is created.
                        Custom coverage and terms must also be accepted by the backend.
                      </p>
                    </div>
                  </Panel>
                )}
              </div>
            </>
          )
        }
      </DataState>
    </div>
  )
}

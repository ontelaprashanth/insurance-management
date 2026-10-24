export const PLANS = [
  {
    key: 'HLT-BASIC',
    code: 'HLT-BASIC',
    label: 'Basic Health',
    type: 'Health',
    coverage: 300000,
    yearly: 2999,
    active: true,
    blurb: 'Entry-level health coverage for eligible medical and hospitalization expenses.',
  },
  {
    key: 'HLT-FAMILY',
    code: 'HLT-FAMILY',
    label: 'Family Health',
    type: 'Health',
    coverage: 500000,
    yearly: 5999,
    active: true,
    blurb: 'Family health coverage for eligible hospitalization and medical expenses.',
  },
  {
    key: 'HLT-PREMIUM',
    code: 'HLT-PREMIUM',
    label: 'Premium Health',
    type: 'Health',
    coverage: 1000000,
    yearly: 9999,
    active: true,
    blurb: 'Higher-limit coverage for eligible medical and hospitalization expenses.',
  },
  {
    key: 'LIF-ESSENTIAL',
    code: 'LIF-ESSENTIAL',
    label: 'Essential Life',
    type: 'Life',
    coverage: 1000000,
    yearly: 3999,
    active: true,
    blurb: 'Basic life protection with a benefit payable on a covered death.',
  },
  {
    key: 'LIF-FAMILY',
    code: 'LIF-FAMILY',
    label: 'Family Protection',
    type: 'Life',
    coverage: 2500000,
    yearly: 7999,
    active: true,
    blurb: 'Life protection designed to provide financial support to beneficiaries.',
  },
  {
    key: 'LIF-PREMIUM',
    code: 'LIF-PREMIUM',
    label: 'Premium Life',
    type: 'Life',
    coverage: 5000000,
    yearly: 12999,
    active: true,
    blurb: 'Higher-value life protection for beneficiaries, subject to policy terms.',
  },
  {
    key: 'MTR-BIKE',
    code: 'MTR-BIKE',
    label: 'Two-Wheeler Protect',
    type: 'Motor',
    coverage: 100000,
    yearly: 1499,
    active: true,
    blurb: 'Two-wheeler coverage for eligible vehicle damage, subject to policy terms.',
  },
  {
    key: 'MTR-CAR',
    code: 'MTR-CAR',
    label: 'Car Protect',
    type: 'Motor',
    coverage: 500000,
    yearly: 4999,
    active: true,
    blurb: 'Car insurance coverage for eligible vehicle damage, subject to policy terms.',
  },
  {
    key: 'MTR-COMP',
    code: 'MTR-COMP',
    label: 'Comprehensive Motor',
    type: 'Motor',
    coverage: 1000000,
    yearly: 8999,
    active: true,
    blurb: 'Enhanced motor coverage for eligible damage and specified risks.',
  },
  {
    key: 'ACCIDENT',
    code: 'ACCIDENT',
    label: 'Accident Insurance',
    type: 'Accident Insurance',
    coverage: 1000000,
    yearly: 1499,
    active: false,
    blurb: 'Archived accident insurance plan retained for historical purchases.',
  },
]

export const ACTIVE_PLANS = PLANS.filter((plan) => plan.active)

export const COVERAGE_MIN = 100000
export const COVERAGE_MAX = 10000000
export const COVERAGE_STEP = 100000
export const MAX_YEARS = 5
export const MULTI_YEAR_DISCOUNT_RATE = 5
export const GST_RATE = 0

const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

const normalize = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

function matchesAlias(type, alias) {
  return (
    type === alias ||
    type === `${alias} insurance` ||
    type.startsWith(`${alias} `)
  )
}

/**
 * Find a plan using its code, key, or label.
 * For a broad category such as "Health", use plansForType()
 * because that category contains multiple tiers.
 */
export function planFor(identifier = '') {
  const value = normalize(identifier)

  if (!value) return null

  const exactMatch = ACTIVE_PLANS.find(
    (plan) =>
      normalize(plan.key) === value ||
      normalize(plan.code) === value ||
      normalize(plan.label) === value
  )

  if (exactMatch) return exactMatch

  const aliases = {
    health: ['health', 'medical'],
    life: ['life'],
    motor: ['motor', 'vehicle', 'auto'],
    accident: ['accident', 'personal accident'],
  }

  const matchingPlans = ACTIVE_PLANS.filter((plan) => {
    const planType = normalize(plan.type)

    return (aliases[planType] || [planType]).some((alias) =>
      matchesAlias(value, alias)
    )
  })

  return matchingPlans.length === 1 ? matchingPlans[0] : null
}

export function activePlans() {
  return [...ACTIVE_PLANS]
}

export function plansForType(type = '') {
  const value = normalize(type)

  if (!value) return [...ACTIVE_PLANS]

  const aliases = {
    health: ['health', 'medical'],
    life: ['life'],
    motor: ['motor', 'vehicle', 'auto'],
    accident: ['accident', 'personal accident'],
  }

  const acceptedAliases = aliases[value] || [value]

  return ACTIVE_PLANS.filter((plan) => {
    const planType = normalize(plan.type)

    return acceptedAliases.some(
      (alias) =>
        planType === alias ||
        planType === `${alias} insurance` ||
        planType.startsWith(`${alias} `)
    )
  })
}

/**
 * Proportional premium estimate:
 *
 * annual premium = listed annual premium
 *                 * selected coverage / listed plan coverage
 *
 * base premium = estimated annual premium * duration
 * discount = 5% of base premium for durations of 2+ years
 * GST = GST_RATE
 *
 * This is an estimate. The backend remains authoritative for checkout.
 */
export function estimate(planIdentifier, coverage, years = 1) {
  const plan = planFor(planIdentifier)
  const selectedCoverage = Number(coverage)
  const selectedYears = Number(years)

  if (!plan) return null

  if (
    !Number.isFinite(selectedCoverage) ||
    selectedCoverage <= 0 ||
    !Number.isFinite(selectedYears) ||
    !Number.isInteger(selectedYears) ||
    selectedYears < 1 ||
    selectedYears > MAX_YEARS
  ) {
    return null
  }

  const annualPremium = round2(
    plan.yearly * (selectedCoverage / plan.coverage)
  )

  const base = round2(annualPremium * selectedYears)

  const discount =
    selectedYears >= 2
      ? round2((base * MULTI_YEAR_DISCOUNT_RATE) / 100)
      : 0

  const taxable = round2(base - discount)
  const gst = round2((taxable * GST_RATE) / 100)
  const total = round2(taxable + gst)

  return {
    planCode: plan.code,
    planName: plan.label,
    coverage: selectedCoverage,
    years: selectedYears,
    annualPremium,
    base,
    discount,
    taxable,
    gstRate: GST_RATE,
    gst,
    total,
    perYear: round2(total / selectedYears),
  }
}

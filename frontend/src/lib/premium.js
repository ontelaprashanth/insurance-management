/* =========================================================
   INSUREX — PREMIUM CONFIGURATION
   Based on the supplied policies database records
========================================================= */

export const PLANS = [
  {
    key: 'HLT-BASIC',
    code: 'HLT-BASIC',
    label: 'Basic Health',
    type: 'Health',
    coverage: 300000,
    yearly: 2999,
    active: true,
    blurb:
      'Entry-level health coverage for eligible medical and hospitalization expenses.',
  },
  {
    key: 'HLT-FAMILY',
    code: 'HLT-FAMILY',
    label: 'Family Health',
    type: 'Health',
    coverage: 500000,
    yearly: 5999,
    active: true,
    blurb:
      'Family health coverage for eligible hospitalization and medical expenses.',
  },
  {
    key: 'HLT-PREMIUM',
    code: 'HLT-PREMIUM',
    label: 'Premium Health',
    type: 'Health',
    coverage: 1000000,
    yearly: 9999,
    active: true,
    blurb:
      'Higher-limit health coverage for eligible medical and hospitalization expenses.',
  },
  {
    key: 'LIF-ESSENTIAL',
    code: 'LIF-ESSENTIAL',
    label: 'Essential Life',
    type: 'Life',
    coverage: 1000000,
    yearly: 3999,
    active: true,
    blurb:
      'Basic life protection with a benefit payable on a covered death.',
  },
  {
    key: 'LIF-FAMILY',
    code: 'LIF-FAMILY',
    label: 'Family Protection',
    type: 'Life',
    coverage: 2500000,
    yearly: 7999,
    active: true,
    blurb:
      'Life protection designed to provide financial support to beneficiaries.',
  },
  {
    key: 'LIF-PREMIUM',
    code: 'LIF-PREMIUM',
    label: 'Premium Life',
    type: 'Life',
    coverage: 5000000,
    yearly: 12999,
    active: true,
    blurb:
      'Higher-value life protection for beneficiaries, subject to policy terms.',
  },
  {
    key: 'MTR-BIKE',
    code: 'MTR-BIKE',
    label: 'Two-Wheeler Protect',
    type: 'Motor',
    coverage: 100000,
    yearly: 1499,
    active: true,
    blurb:
      'Sample two-wheeler coverage for eligible vehicle damage, subject to policy terms.',
  },
  {
    key: 'MTR-CAR',
    code: 'MTR-CAR',
    label: 'Car Protect',
    type: 'Motor',
    coverage: 500000,
    yearly: 4999,
    active: true,
    blurb:
      'Sample car insurance coverage for eligible vehicle damage, subject to policy terms.',
  },
  {
    key: 'MTR-COMP',
    code: 'MTR-COMP',
    label: 'Comprehensive Motor',
    type: 'Motor',
    coverage: 1000000,
    yearly: 8999,
    active: true,
    blurb:
      'Sample enhanced motor coverage for eligible damage and specified risks.',
  },
  {
    key: 'ACCIDENT',
    code: 'ACCIDENT',
    label: 'Accident Insurance',
    type: 'Accident Insurance',
    coverage: 1000000,
    yearly: 1499,
    active: false,
    blurb:
      'Archived accident insurance plan retained for historical purchases.',
  },
]

/* =========================================================
   COVERAGE CONFIGURATION
========================================================= */

// These limits are retained for compatibility with existing UI.
// Individual plans have their own actual coverage amounts.
export const COVERAGE_MIN = 100000
export const COVERAGE_MAX = 5000000
export const COVERAGE_STEP = 100000

export const MAX_YEARS = 5

/* =========================================================
   NORMALIZATION
========================================================= */

const normalize = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

const r2 = (number) =>
  Math.round((number + Number.EPSILON) * 100) / 100

/* =========================================================
   PLAN LOOKUP
========================================================= */

/**
 * Finds a plan using its code, key, name, or policy type.
 *
 * If a broad category has multiple plans, returns null
 * rather than silently selecting the wrong premium.
 *
 * Examples:
 * planFor('HLT-BASIC')       -> Basic Health
 * planFor('Basic Health')    -> Basic Health
 * planFor('Health')          -> null (multiple tiers)
 * planFor('Medical')         -> null (ambiguous category)
 */
export function planFor(value = '') {
  const requested = normalize(value)

  if (!requested) return null

  const exactMatch = PLANS.find(
    (plan) =>
      normalize(plan.key) === requested ||
      normalize(plan.code) === requested ||
      normalize(plan.label) === requested,
  )

  if (exactMatch) return exactMatch

  const aliases = {
    health: ['health', 'medical'],
    life: ['life'],
    motor: ['motor', 'vehicle', 'auto'],
    accident: ['accident', 'personal accident'],
  }

  const matchingPlans = PLANS.filter((plan) => {
    const type = normalize(plan.type)
    const label = normalize(plan.label)

    if (
      type === requested ||
      label === requested
    ) {
      return true
    }

    return Object.entries(aliases).some(
      ([category, names]) => {
        const matchesCategory = names.some(
          (name) =>
            requested === name ||
            requested === `${name} insurance`,
        )

        return (
          matchesCategory &&
          normalize(plan.type) === category
        )
      },
    )
  })

  // A category can contain multiple coverage tiers.
  // Do not guess which tier the customer intended.
  return matchingPlans.length === 1
    ? matchingPlans[0]
    : null
}

/* =========================================================
   AVAILABLE PLANS
========================================================= */

/**
 * Returns only plans that are currently active.
 * The archived Accident plan is excluded.
 */
export function activePlans() {
  return PLANS.filter((plan) => plan.active)
}

/**
 * Returns all available plans for a given category.
 *
 * Examples:
 * plansForType('Health') -> 3 health tiers
 * plansForType('Motor')  -> 3 motor tiers
 */
export function plansForType(type = '') {
  const requested = normalize(type)

  if (!requested) return activePlans()

  return PLANS.filter(
    (plan) =>
      plan.active &&
      (
        normalize(plan.type) === requested ||
        normalize(plan.label) === requested
      ),
  )
}

/* =========================================================
   PREMIUM ESTIMATION
========================================================= */

/**
 * Calculates the premium for a specific plan.
 *
 * The database premiums are treated as yearly premiums
 * for each plan's listed coverage amount.
 *
 * Multi-year discount retained from the previous
 * implementation: 5% for 2 or more years.
 *
 * GST remains 0%, matching the previous configuration.
 *
 * IMPORTANT:
 * Pass a plan code or exact plan name to avoid selecting
 * the wrong premium when multiple tiers exist.
 */
export function estimate(
  planIdentifier,
  coverage,
  years,
) {
  const plan = planFor(planIdentifier)

  if (!plan || !plan.active) return null

  const requestedCoverage = Number(coverage)
  const requestedYears = Number(years)

  if (
    !Number.isFinite(requestedCoverage) ||
    !Number.isFinite(requestedYears) ||
    requestedCoverage <= 0 ||
    !Number.isInteger(requestedYears) ||
    requestedYears < 1 ||
    requestedYears > MAX_YEARS
  ) {
    return null
  }

  // A plan's stored premium is for its specified coverage.
  // Scale proportionally only if the caller requests a
  // different coverage amount.
  const base = r2(
    plan.yearly *
      (requestedCoverage / plan.coverage) *
      requestedYears,
  )

  const discount =
    requestedYears >= 2
      ? r2(base * 0.05)
      : 0

  const taxable = r2(base - discount)

  const gstRate = 0
  const gst = r2((taxable * gstRate) / 100)

  const total = r2(taxable + gst)

  return {
    planCode: plan.code,
    planName: plan.label,
    coverage: requestedCoverage,
    years: requestedYears,
    base,
    discount,
    taxable,
    gstRate,
    gst,
    total,
    perYear: r2(total / requestedYears),
  }
}

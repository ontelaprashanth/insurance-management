
export const PLANS = [
  {
    key: 'health',
    label: 'Health',
    yearly: 8999,
    blurb: 'Hospital stays, surgery and treatment costs',
  },
  {
    key: 'life',
    label: 'Life',
    yearly: 6999,
    blurb: 'Income protection for the people who depend on you',
  },
  {
    key: 'home',
    label: 'Home',
    yearly: 2999,
    blurb: 'Structure and contents against fire, theft and damage',
  },
  {
    key: 'motor',
    label: 'Motor',
    yearly: 2499,
    blurb: 'Own damage and third-party liability for your vehicle',
  },
  {
    key: 'accident',
    label: 'Accident',
    yearly: 1499,
    blurb: 'Lump-sum cover for injury and disability',
  },
  {
    key: 'travel',
    label: 'Travel',
    yearly: 799,
    blurb: 'Trip cancellation, medical and baggage cover',
  },
];

export const COVERAGE_MIN = 1_000_000;
export const COVERAGE_MAX = 10_000_000;
export const COVERAGE_STEP = 500_000;
export const MAX_YEARS = 5;

const normalize = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

/**
 * Matches supported policy names without relying on array order.
 */
export function planFor(coveredTypes = '') {
  const type = normalize(coveredTypes);

  if (!type) return null;

  const aliases = {
    health: ['health', 'medical'],
    life: ['life'],
    home: ['home', 'property'],
    motor: ['motor', 'vehicle', 'auto'],
    accident: ['accident', 'personal accident'],
    travel: ['travel', 'trip'],
  };

  const matches = PLANS.filter((plan) =>
    aliases[plan.key].some(
      (alias) =>
        type === alias ||
        type === `${alias} insurance` ||
        type.startsWith(`${alias} `)
    )
  );

  return matches.length === 1 ? matches[0] : null;
}

const r2 = (n) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export function estimate(coveredTypes, coverage, years) {
  const plan = planFor(coveredTypes);

  if (!plan || !Number.isFinite(Number(coverage)) ||
      !Number.isFinite(Number(years)) ||
      Number(coverage) <= 0 || Number(years) <= 0) {
    return null;
  }

  const validCoverage = Number(coverage);
  const validYears = Number(years);

  const base = r2(
    plan.yearly * (validCoverage / COVERAGE_MIN) * validYears
  );

  const discount =
    validYears >= 2 ? r2(base * 0.05) : 0;

  const taxable = r2(base - discount);
  const gstRate = 0;
  const gst = r2((taxable * gstRate) / 100);

  return {
    base,
    discount,
    taxable,
    gstRate,
    gst,
    total: r2(taxable + gst),
    perYear: r2((taxable + gst) / validYears),
  };
}

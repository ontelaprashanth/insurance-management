
import {
  COVERAGE_MAX,
  COVERAGE_MIN,
  COVERAGE_STEP,
  MAX_YEARS,
  PLANS,
  estimate,
} from '../lib/premium'

import {
  inr,
  inrShort,
} from '../lib/format'

/* =========================================================
   INSUREX — COVERAGE & PREMIUM CALCULATOR

   Insurance Plan Selection
   Coverage Amount
   Policy Duration
   Live Premium Estimation
   Premium Breakdown
========================================================= */

const clamp = (value, min, max) =>
  Math.min(
    max,
    Math.max(min, value),
  )

export default function CoverageDial({
  value,
  onChange,
  planKey,
  onPlanChange,
  showPlans = true,
  lockedPlan = false,
}) {
  /* =======================================================
     SELECT INSURANCE PLAN
  ======================================================= */

  const plan =
    PLANS.find(
      (item) => item.key === planKey,
    ) || PLANS[0]

  /* =======================================================
     NORMALIZE COVERAGE & DURATION
  ======================================================= */

  const coverage = clamp(
    Number(value?.coverage) || COVERAGE_MIN,
    COVERAGE_MIN,
    COVERAGE_MAX,
  )

  const years = clamp(
    Number(value?.years) || 1,
    1,
    MAX_YEARS,
  )

  /* =======================================================
     CALCULATE PREMIUM
  ======================================================= */

  const est = plan
    ? estimate(
        plan.key,
        coverage,
        years,
      )
    : null

  /* =======================================================
     SLIDER PROGRESS
  ======================================================= */

  const coverageRange =
    COVERAGE_MAX - COVERAGE_MIN

  const yearRange =
    MAX_YEARS - 1

  const coveragePercent =
    coverageRange > 0
      ? ((coverage - COVERAGE_MIN) /
          coverageRange) *
        100
      : 0

  const yearsPercent =
    yearRange > 0
      ? ((years - 1) / yearRange) * 100
      : 0

  /* =======================================================
     UPDATE COVERAGE
  ======================================================= */

  const updateCoverage = (event) => {
    if (!onChange) return

    const nextCoverage = clamp(
      Number(event.target.value),
      COVERAGE_MIN,
      COVERAGE_MAX,
    )

    onChange({
      ...value,
      coverage: nextCoverage,
      years,
    })
  }

  /* =======================================================
     UPDATE POLICY DURATION
  ======================================================= */

  const updateYears = (event) => {
    if (!onChange) return

    const nextYears = clamp(
      Number(event.target.value),
      1,
      MAX_YEARS,
    )

    onChange({
      ...value,
      coverage,
      years: nextYears,
    })
  }

  /* =======================================================
     CHANGE PLAN
  ======================================================= */

  const changePlan = (key) => {
    if (
      lockedPlan ||
      !onPlanChange ||
      key === plan?.key
    ) {
      return
    }

    onPlanChange(key)
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className="dial"
      aria-label="Insurance premium calculator"
    >
      {/* PREMIUM HEADER */}

      <h3>
        {lockedPlan && plan
          ? `${plan.label} insurance`
          : 'Your premium'}
      </h3>

      <div
        className="big"
        aria-live="polite"
        aria-atomic="true"
      >
        {est
          ? inr(est.perYear)
          : '—'}

        <small>
          / year
        </small>
      </div>

      {/* COVERAGE SUMMARY */}

      <div className="cover">
        Covers you for{' '}
        <b>
          {inrShort(coverage)}
        </b>{' '}
        over{' '}
        <b>
          {years}{' '}
          {years === 1
            ? 'year'
            : 'years'}
        </b>
      </div>

      {/* CONTROLS */}

      <div className="dial-controls">

        {/* INSURANCE TYPE */}

        {showPlans && !lockedPlan && (
          <div>
            <label id="plan-l">
              Cover type
            </label>

            <div
              className="chips"
              role="group"
              aria-labelledby="plan-l"
            >
              {PLANS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="chip"
                  aria-pressed={
                    item.key === plan?.key
                  }
                  onClick={() =>
                    changePlan(item.key)
                  }
                  disabled={!onPlanChange}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COVERAGE SLIDER */}

        <div>
          <label htmlFor="dial-cov">
            Coverage amount

            <b>
              {inrShort(coverage)}
            </b>
          </label>

          <input
            id="dial-cov"
            type="range"
            min={COVERAGE_MIN}
            max={COVERAGE_MAX}
            step={COVERAGE_STEP}
            value={coverage}
            style={{
              '--pct':
                `${coveragePercent}%`,
            }}
            onChange={updateCoverage}
            disabled={!onChange}
            aria-label="Coverage amount"
            aria-valuetext={inr(coverage)}
          />
        </div>

        {/* POLICY DURATION SLIDER */}

        <div>
          <label htmlFor="dial-yrs">
            Policy term

            <b>
              {years}{' '}
              {years === 1
                ? 'year'
                : 'years'}
            </b>
          </label>

          <input
            id="dial-yrs"
            type="range"
            min={1}
            max={MAX_YEARS}
            step={1}
            value={years}
            style={{
              '--pct':
                `${yearsPercent}%`,
            }}
            onChange={updateYears}
            disabled={!onChange}
            aria-label="Policy duration"
            aria-valuetext={`${years} years`}
          />
        </div>

      </div>

      {/* PREMIUM BREAKDOWN */}

      {est && (
        <div className="dial-break">

          <div>
            <span>
              Base premium
            </span>

            <span>
              {inr(est.base)}
            </span>
          </div>

          {est.discount > 0 && (
            <div className="save">
              <span>
                Multi-year discount
              </span>

              <span>
                −{inr(est.discount)}
              </span>
            </div>
          )}

          <div>
            <span>
              GST ({est.gstRate}%)
            </span>

            <span>
              {inr(est.gst)}
            </span>
          </div>

          <div className="total">
            <span>
              Total payable
            </span>

            <span>
              {inr(est.total)}
            </span>
          </div>

        </div>
      )}
    </section>
  )
}

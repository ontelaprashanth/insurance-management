import React, { useId, useMemo } from 'react'

import {
  COVERAGE_MAX,
  COVERAGE_MIN,
  COVERAGE_STEP,
  MAX_YEARS,
  PLANS,
  estimate,
} from '../lib/premium'

import { inr, inrShort } from '../lib/format'

const ACTIVE_PLANS = PLANS.filter((plan) => plan.active !== false)

const clamp = (value, min, max) => {
  const number = Number(value)

  if (!Number.isFinite(number)) return min

  return Math.min(Math.max(number, min), max)
}

export default function CoverageDial({
  value = {},
  onChange,
  planKey,
  onPlanChange,
  showPlans = true,
  lockedPlan = false,
  planLabel,
  premiumEstimate,
  coverageMin = COVERAGE_MIN,
  coverageMax = COVERAGE_MAX,
  coverageStep = COVERAGE_STEP,
  durationMax = MAX_YEARS,
}) {
  const id = useId()

  const coverageId = `${id}-coverage`
  const yearsId = `${id}-years`

  const selectedPlan =
    ACTIVE_PLANS.find((plan) => plan.key === planKey) ||
    ACTIVE_PLANS[0] ||
    PLANS[0]

  const minCoverage = Math.max(
    1,
    Number(coverageMin) || COVERAGE_MIN,
  )

  const maxCoverage = Math.max(
    minCoverage,
    Number(coverageMax) || COVERAGE_MAX,
  )

  const stepCoverage = Math.max(
    1,
    Number(coverageStep) || COVERAGE_STEP,
  )

  const maxDuration = Math.max(
    1,
    Math.min(
      MAX_YEARS,
      Math.floor(Number(durationMax) || MAX_YEARS),
    ),
  )

  const defaultCoverage = clamp(
    selectedPlan?.coverage ?? minCoverage,
    minCoverage,
    maxCoverage,
  )

  const coverage = clamp(
    value.coverage ?? defaultCoverage,
    minCoverage,
    maxCoverage,
  )

  const years = clamp(value.years ?? 1, 1, maxDuration)

  const calculatedEstimate = useMemo(
    () => estimate(selectedPlan?.key, coverage, years),
    [selectedPlan?.key, coverage, years],
  )

  // Use the live estimate on the landing page.
  // Preserve an explicitly supplied estimate for locked-plan flows.
  const est =
    lockedPlan && premiumEstimate
      ? premiumEstimate
      : calculatedEstimate

  const total = Number(est?.total) || 0
  const perYear = Number(est?.perYear) || 0
  const base = Number(est?.base) || 0
  const discount = Number(est?.discount) || 0
  const gst = Number(est?.gst) || 0
  const gstRate = Number(est?.gstRate) || 0

  const displayPlanName =
    planLabel ||
    selectedPlan?.label ||
    selectedPlan?.name ||
    'Insurance plan'

  const updateCoverage = (nextCoverage) => {
    onChange?.({
      ...value,
      coverage: clamp(nextCoverage, minCoverage, maxCoverage),
      years,
    })
  }

  const updateYears = (nextYears) => {
    onChange?.({
      ...value,
      coverage,
      years: clamp(nextYears, 1, maxDuration),
    })
  }

  const choosePlan = (nextPlanKey) => {
    if (lockedPlan || nextPlanKey === selectedPlan?.key) return

    const nextPlan = ACTIVE_PLANS.find(
      (plan) => plan.key === nextPlanKey,
    )

    if (!nextPlan) return

    const nextCoverage = clamp(
      nextPlan.coverage,
      minCoverage,
      maxCoverage,
    )

    onChange?.({
      ...value,
      coverage: nextCoverage,
      years,
    })

    onPlanChange?.(nextPlan.key)
  }

  return (
    <section
      className="dial ix-dial-animated"
      aria-label="Coverage and premium calculator"
    >
      <div className="dial-header">
        <div className="dial-heading">
          <span className="dial-eyebrow">
            PREMIUM CALCULATOR
          </span>

          <h3>{displayPlanName}</h3>

          <p>
            Adjust your coverage and policy duration to view
            the estimated premium.
          </p>
        </div>

        <div className="dial-shield" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>

      {showPlans && !lockedPlan && (
        <div className="dial-plans">
          <span className="dial-label">Choose a plan</span>

          <div className="dial-plan-options">
            {ACTIVE_PLANS.map((plan) => {
              const active = plan.key === selectedPlan?.key

              return (
                <button
                  key={plan.key}
                  type="button"
                  className={`dial-plan-chip${active ? ' active' : ''}`}
                  onClick={() => choosePlan(plan.key)}
                  aria-pressed={active}
                >
                  {plan.label || plan.name || plan.key}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="dial-premium">
        <div className="dial-premium-main">
          <span className="dial-label">
            Estimated premium
          </span>

          <div className="dial-price" aria-live="polite">
            {inr(total)}
          </div>

          <span className="dial-price-caption">
            Estimated total for {years}{' '}
            {years === 1 ? 'year' : 'years'}
          </span>
        </div>

        <div className="dial-price-tag">
          <span>Per year</span>
          <strong aria-live="polite">{inr(perYear)}</strong>
        </div>
      </div>

      <div className="dial-control">
        <div className="dial-control-heading">
          <label htmlFor={coverageId} className="dial-label">
            Coverage amount
          </label>

          <strong className="dial-control-value">
            {inrShort(coverage)}
          </strong>
        </div>

        <input
          id={coverageId}
          className="dial-range"
          type="range"
          min={minCoverage}
          max={maxCoverage}
          step={stepCoverage}
          value={coverage}
          onChange={(event) => updateCoverage(event.target.value)}
          aria-label="Coverage amount"
          aria-valuetext={inr(coverage)}
        />

        <div className="dial-range-labels">
          <span>{inrShort(minCoverage)}</span>
          <span>{inrShort(maxCoverage)}</span>
        </div>
      </div>

      <div className="dial-control">
        <div className="dial-control-heading">
          <label htmlFor={yearsId} className="dial-label">
            Policy duration
          </label>

          <strong className="dial-control-value">
            {years} {years === 1 ? 'year' : 'years'}
          </strong>
        </div>

        <input
          id={yearsId}
          className="dial-range"
          type="range"
          min={1}
          max={maxDuration}
          step={1}
          value={years}
          onChange={(event) => updateYears(event.target.value)}
          aria-label="Policy duration in years"
          aria-valuetext={`${years} ${
            years === 1 ? 'year' : 'years'
          }`}
        />

        <div className="dial-range-labels">
          <span>1 year</span>
          <span>
            {maxDuration} {maxDuration === 1 ? 'year' : 'years'}
          </span>
        </div>
      </div>

      <div className="dial-breakdown">
        <div className="dial-breakdown-row">
          <span>Base premium</span>
          <strong>{inr(base)}</strong>
        </div>

        <div className="dial-breakdown-row">
          <span>
            Multi-year discount {years >= 2 ? '(5%)' : ''}
          </span>

          <strong className={discount > 0 ? 'dial-discount' : ''}>
            {discount > 0 ? `−${inr(discount)}` : inr(0)}
          </strong>
        </div>

        <div className="dial-breakdown-row">
          <span>GST ({gstRate}%)</span>
          <strong>{inr(gst)}</strong>
        </div>

        <div className="dial-breakdown-row dial-breakdown-total">
          <span>Estimated payable</span>
          <strong>{inr(total)}</strong>
        </div>
      </div>

      <p className="dial-disclaimer">
        This calculator estimates the premium proportionally from
        the selected plan's listed coverage and annual premium.
        A 5% multi-year discount is estimated for terms of two years
        or more. Final pricing and applicable taxes are confirmed
        during purchase.
      </p>
    </section>
  )
}

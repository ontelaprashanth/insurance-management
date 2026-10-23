
import React, { useMemo } from 'react'
import {
  COVERAGE_MAX,
  COVERAGE_MIN,
  COVERAGE_STEP,
  MAX_YEARS,
  PLANS,
  estimate,
} from '../lib/premium'
import { inr, inrShort } from '../lib/format'

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value) || min, min), max)

export default function CoverageDial({
  value = {},
  onChange,
  planKey,
  onPlanChange,
  showPlans = true,
  lockedPlan = false,

  // Optional overrides for pages using backend policy data.
  planLabel,
  premiumEstimate,
  coverageMin = COVERAGE_MIN,
  coverageMax = COVERAGE_MAX,
  coverageStep = COVERAGE_STEP,
  durationMax = MAX_YEARS,
}) {
  const selectedPlan =
    PLANS.find((item) => item.key === planKey) || PLANS[0]

  const minCoverage = Math.max(1, Number(coverageMin) || COVERAGE_MIN)
  const maxCoverage = Math.max(
    minCoverage,
    Number(coverageMax) || COVERAGE_MAX,
  )
  const stepCoverage = Math.max(1, Number(coverageStep) || COVERAGE_STEP)
  const maxDuration = Math.max(1, Number(durationMax) || MAX_YEARS)

  const coverage = clamp(
    value.coverage ?? minCoverage,
    minCoverage,
    maxCoverage,
  )

  const years = clamp(value.years ?? 1, 1, maxDuration)

  const calculatedEstimate = useMemo(
    () => estimate(selectedPlan.key, coverage, years),
    [selectedPlan.key, coverage, years],
  )

  // When supplied, use the parent page's estimate so that the calculator
  // displays the same premium calculation as the purchase page.
  const est = premiumEstimate ?? calculatedEstimate

  const displayPlanName =
    planLabel ||
    selectedPlan.label ||
    selectedPlan.name ||
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
    if (lockedPlan) return
    onPlanChange?.(nextPlanKey)
  }

  return (
    <section className="dial" aria-label="Coverage and premium calculator">
      <div className="dial-header">
        <div className="dial-heading">
          <span className="dial-eyebrow">PREMIUM CALCULATOR</span>
          <h3>
            {displayPlanName}
          </h3>
          <p>Adjust your cover and policy term to see the estimate.</p>
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
            {PLANS.map((plan) => {
              const active = plan.key === selectedPlan.key

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
        <div>
          <span className="dial-label">Estimated premium</span>
          <div className="dial-price">
            {inr(est.total ?? est.perYear ?? 0)}
          </div>
          <span className="dial-price-caption">
            Estimated total for {years} {years === 1 ? 'year' : 'years'}
          </span>
        </div>

        <div className="dial-price-tag">
          <span>Per year</span>
          <strong>
            {inr(est.perYear ?? (Number(est.total || 0) / years))}
          </strong>
        </div>
      </div>

      <div className="dial-control">
        <div className="dial-control-heading">
          <label htmlFor="dial-coverage" className="dial-label">
            Coverage amount
          </label>
          <strong className="dial-control-value">
            {inrShort(coverage)}
          </strong>
        </div>

        <input
          id="dial-coverage"
          className="dial-range"
          type="range"
          min={minCoverage}
          max={maxCoverage}
          step={stepCoverage}
          value={coverage}
          onChange={(event) => updateCoverage(event.target.value)}
          aria-label="Coverage amount"
        />

        <div className="dial-range-labels">
          <span>{inrShort(minCoverage)}</span>
          <span>{inrShort(maxCoverage)}</span>
        </div>
      </div>

      <div className="dial-control">
        <div className="dial-control-heading">
          <label htmlFor="dial-years" className="dial-label">
            Policy duration
          </label>
          <strong className="dial-control-value">
            {years} {years === 1 ? 'year' : 'years'}
          </strong>
        </div>

        <input
          id="dial-years"
          className="dial-range"
          type="range"
          min={1}
          max={maxDuration}
          step={1}
          value={years}
          onChange={(event) => updateYears(event.target.value)}
          aria-label="Policy duration in years"
        />

        <div className="dial-duration-options">
          {Array.from({ length: maxDuration }, (_, index) => index + 1).map(
            (duration) => (
              <button
                key={duration}
                type="button"
                className={`dial-duration-chip${years === duration ? ' active' : ''}`}
                onClick={() => updateYears(duration)}
                aria-pressed={years === duration}
              >
                {duration}Y
              </button>
            ),
          )}
        </div>
      </div>

      <div className="dial-breakdown">
        <div className="dial-breakdown-row">
          <span>Base premium</span>
          <strong>{inr(est.base ?? est.perYear ?? 0)}</strong>
        </div>

        {Number(est.discount || 0) > 0 && (
          <div className="dial-breakdown-row dial-discount">
            <span>Discount</span>
            <strong>−{inr(est.discount)}</strong>
          </div>
        )}

        {Number(est.gst || 0) > 0 && (
          <div className="dial-breakdown-row">
            <span>GST{est.gstRate != null ? ` (${est.gstRate}%)` : ''}</span>
            <strong>{inr(est.gst)}</strong>
          </div>
        )}

        <div className="dial-breakdown-row dial-breakdown-total">
          <span>Estimated total</span>
          <strong>{inr(est.total ?? est.perYear ?? 0)}</strong>
        </div>
      </div>

      <p className="dial-disclaimer">
        This is an estimate. The final premium and payable amount are
        determined by the insurance platform when your purchase is processed.
      </p>
    </section>
  )
}

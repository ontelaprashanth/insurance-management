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
  planLabel,
  premiumEstimate,
  coverageMin = COVERAGE_MIN,
  coverageMax = COVERAGE_MAX,
  coverageStep = COVERAGE_STEP,
  durationMax = MAX_YEARS,
}) {
  const selectedPlan =
    PLANS.find((item) => item.key === planKey) || PLANS[0]

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
    Number(durationMax) || MAX_YEARS,
  )

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

  const est = premiumEstimate ?? calculatedEstimate
  const total = Number(est.total ?? est.perYear ?? 0)

  const perYear = Number(
    est.perYear ?? total / Math.max(1, years),
  )

  const displayPlanName =
    planLabel ||
    selectedPlan.label ||
    selectedPlan.name ||
    'Insurance plan'

  const coveragePercent =
    maxCoverage > minCoverage
      ? ((coverage - minCoverage) /
          (maxCoverage - minCoverage)) *
        100
      : 0

  const durationPercent =
    maxDuration > 1
      ? ((years - 1) / (maxDuration - 1)) * 100
      : 100

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
    if (!lockedPlan) onPlanChange?.(nextPlanKey)
  }

  return (
    <section
      className="dial ix-dial-animated"
      aria-label="Coverage and premium calculator"
    >
      <style>{`
        .ix-dial-animated {
          --dial-green: #047857;
          --dial-green-dark: #065f46;
          --dial-green-light: #d1fae5;
          --dial-border: #d1fae5;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid var(--dial-border);
          border-radius: 22px;
          padding: clamp(18px, 3vw, 28px);
          background:
            radial-gradient(ellipse at 100% 0%, rgba(16,185,129,.10), transparent 42%),
            linear-gradient(145deg, #ffffff 0%, #f7fdf9 100%);
          box-shadow: 0 8px 28px rgba(6,95,70,.07);
          animation: ixDialEnter .65s cubic-bezier(.2,.75,.25,1) both;
          transition: box-shadow .3s ease, border-color .3s ease;
        }

        .ix-dial-animated::before {
          content: "";
          position: absolute;
          top: 0;
          left: -110%;
          width: 65%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #34d399, #059669, transparent);
          animation: ixDialShimmer 1.4s ease-out .25s both;
          pointer-events: none;
        }

        .ix-dial-animated:hover {
          border-color: #a7f3d0;
          box-shadow: 0 14px 38px rgba(6,95,70,.11);
        }

        .ix-dial-animated .dial-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          animation: ixDialItemEnter .5s ease-out .06s both;
        }

        .ix-dial-animated .dial-eyebrow {
          display: inline-block;
          color: var(--dial-green);
          font-size: .7rem;
          font-weight: 800;
          letter-spacing: .13em;
          margin-bottom: 8px;
        }

        .ix-dial-animated .dial-heading h3 {
          margin: 0;
          color: #102a22;
          font-size: clamp(1.2rem, 2.5vw, 1.55rem);
          font-weight: 800;
          letter-spacing: -.035em;
          line-height: 1.25;
        }

        .ix-dial-animated .dial-heading p {
          margin: 8px 0 0;
          color: #64756d;
          font-size: .91rem;
          line-height: 1.6;
        }

        .ix-dial-animated .dial-shield {
          display: grid;
          place-items: center;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          color: #047857;
          background: linear-gradient(145deg, #ecfdf5, #d1fae5);
          box-shadow: inset 0 0 0 1px rgba(5,150,105,.1);
          animation: ixShieldFloat 3.5s ease-in-out 1s infinite;
        }

        .ix-dial-animated .dial-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 24px 0;
          padding: 20px;
          border: 1px solid rgba(167,243,208,.7);
          border-radius: 18px;
          background: linear-gradient(120deg, #ecfdf5, #f7fef9 65%, #ffffff);
          animation: ixDialItemEnter .55s ease-out .14s both;
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .ix-dial-animated .dial-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(6,95,70,.08);
        }

        .ix-dial-animated .dial-label {
          display: block;
          color: #61736a;
          font-size: .82rem;
          font-weight: 650;
        }

        .ix-dial-animated .dial-price {
          margin-top: 5px;
          color: #065f46;
          font-size: clamp(1.8rem, 5vw, 2.35rem);
          font-weight: 850;
          letter-spacing: -.055em;
          line-height: 1.2;
          font-variant-numeric: tabular-nums;
          animation: ixPriceAppear .45s ease-out both;
        }

        .ix-dial-animated .dial-price-caption {
          display: block;
          margin-top: 6px;
          color: #61736a;
          font-size: .8rem;
        }

        .ix-dial-animated .dial-price-tag {
          min-width: 112px;
          padding-left: 17px;
          border-left: 1px solid #b7e8d0;
        }

        .ix-dial-animated .dial-price-tag span {
          display: block;
          margin-bottom: 5px;
          color: #61736a;
          font-size: .78rem;
        }

        .ix-dial-animated .dial-price-tag strong {
          color: #065f46;
          font-size: 1.05rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .ix-dial-animated .dial-control {
          margin-top: 23px;
          animation: ixDialItemEnter .55s ease-out both;
        }

        .ix-dial-animated .dial-control:nth-of-type(3) {
          animation-delay: .22s;
        }

        .ix-dial-animated .dial-control:nth-of-type(4) {
          animation-delay: .3s;
        }

        .ix-dial-animated .dial-control-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .ix-dial-animated .dial-control-value {
          color: #065f46;
          font-size: 1rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          transition: color .2s ease, transform .2s ease;
        }

        .ix-dial-animated .dial-control:focus-within .dial-control-value {
          color: #047857;
          transform: scale(1.035);
        }

        .ix-dial-animated .dial-range {
          display: block;
          width: 100%;
          height: 7px;
          margin: 0;
          border: 0;
          border-radius: 999px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          background: linear-gradient(
            90deg,
            #047857 0%,
            #10b981 var(--dial-progress, 50%),
            #dce9e2 var(--dial-progress, 50%),
            #dce9e2 100%
          );
          transition: filter .2s ease;
        }

        .ix-dial-animated .dial-range:hover {
          filter: saturate(1.18);
        }

        .ix-dial-animated .dial-range::-webkit-slider-thumb {
          width: 21px;
          height: 21px;
          border: 4px solid #ffffff;
          border-radius: 50%;
          appearance: none;
          -webkit-appearance: none;
          background: #047857;
          box-shadow: 0 0 0 2px #047857, 0 3px 9px rgba(6,95,70,.25);
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .ix-dial-animated .dial-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: 4px solid #ffffff;
          border-radius: 50%;
          background: #047857;
          box-shadow: 0 0 0 2px #047857, 0 3px 9px rgba(6,95,70,.25);
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .ix-dial-animated .dial-range:hover::-webkit-slider-thumb,
        .ix-dial-animated .dial-range:focus-visible::-webkit-slider-thumb {
          transform: scale(1.17);
          box-shadow: 0 0 0 5px rgba(16,185,129,.15), 0 3px 9px rgba(6,95,70,.25);
        }

        .ix-dial-animated .dial-range:hover::-moz-range-thumb,
        .ix-dial-animated .dial-range:focus-visible::-moz-range-thumb {
          transform: scale(1.17);
          box-shadow: 0 0 0 5px rgba(16,185,129,.15), 0 3px 9px rgba(6,95,70,.25);
        }

        .ix-dial-animated .dial-range:focus-visible {
          outline: 3px solid rgba(16,185,129,.25);
          outline-offset: 7px;
        }

        .ix-dial-animated .dial-range-labels {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 11px;
          color: #7a8a82;
          font-size: .77rem;
          font-weight: 600;
        }

        .ix-dial-animated .dial-disclaimer {
          margin: 24px 0 0;
          padding-top: 15px;
          border-top: 1px solid #e3eee7;
          color: #74837b;
          font-size: .76rem;
          line-height: 1.65;
          animation: ixDialItemEnter .5s ease-out .35s both;
        }

        @keyframes ixDialEnter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ixDialItemEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ixDialShimmer {
          from { left: -110%; }
          to { left: 150%; }
        }

        @keyframes ixShieldFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes ixPriceAppear {
          from {
            opacity: .45;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 480px) {
          .ix-dial-animated {
            padding: 17px;
            border-radius: 18px;
          }

          .ix-dial-animated .dial-premium {
            align-items: flex-start;
            padding: 15px;
            gap: 12px;
          }

          .ix-dial-animated .dial-price-tag {
            min-width: 88px;
            padding-left: 12px;
          }

          .ix-dial-animated .dial-price-tag strong {
            font-size: .91rem;
          }

          .ix-dial-animated .dial-shield {
            flex-basis: 40px;
            width: 40px;
            height: 40px;
            border-radius: 13px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-dial-animated,
          .ix-dial-animated *,
          .ix-dial-animated::before {
            animation: none !important;
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="dial-header">
        <div className="dial-heading">
          <span className="dial-eyebrow">PREMIUM CALCULATOR</span>
          <h3>{displayPlanName}</h3>
          <p>
            Adjust your cover and policy term to see the estimate.
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
          <div className="dial-price" aria-live="polite">
            {inr(total)}
          </div>
          <span className="dial-price-caption">
            Estimated total for {years} {years === 1 ? 'year' : 'years'}
          </span>
        </div>

        <div className="dial-price-tag">
          <span>Per year</span>
          <strong aria-live="polite">{inr(perYear)}</strong>
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
          style={{ '--dial-progress': `${coveragePercent}%` }}
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
          style={{ '--dial-progress': `${durationPercent}%` }}
          type="range"
          min={1}
          max={maxDuration}
          step={1}
          value={years}
          onChange={(event) => updateYears(event.target.value)}
          aria-label="Policy duration in years"
        />
      </div>

      <p className="dial-disclaimer">
        This is an estimate. The final premium and payable amount are
        determined by the insurance platform when your purchase is processed.
      </p>
    </section>
  )
}

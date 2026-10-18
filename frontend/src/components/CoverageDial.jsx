import { COVERAGE_MAX, COVERAGE_MIN, COVERAGE_STEP, MAX_YEARS, PLANS, estimate } from '../lib/premium'
import { inr, inrShort } from '../lib/format'

/**
 * The signature interaction: drag coverage and years, watch the premium move.
 * Controlled when `value` is passed, otherwise keeps its own state via the parent.
 */
export default function CoverageDial({ value, onChange, planKey, onPlanChange, showPlans = true, lockedPlan }) {
  const { coverage, years } = value
  const plan = PLANS.find((p) => p.key === planKey) || PLANS[0]
  const est = estimate(plan.key, coverage, years)
  const pct = ((coverage - COVERAGE_MIN) / (COVERAGE_MAX - COVERAGE_MIN)) * 100
  const yPct = ((years - 1) / (MAX_YEARS - 1)) * 100

  return (
    <div className="dial">
      <h3>{lockedPlan ? `${plan.label} insurance` : 'Your premium'}</h3>
      <div className="big" aria-live="polite">
        {est ? inr(est.perYear) : '—'}<small>/ year</small>
      </div>
      <div className="cover">
        covers you for <b>{inrShort(coverage)}</b> over {years} {years === 1 ? 'year' : 'years'}
      </div>

      <div className="dial-controls">
        {showPlans && !lockedPlan && (
          <div>
            <label id="plan-l">Cover type</label>
            <div className="chips" role="group" aria-labelledby="plan-l">
              {PLANS.map((p) => (
                <button type="button" key={p.key} className="chip" aria-pressed={p.key === plan.key} onClick={() => onPlanChange(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label htmlFor="dial-cov">Coverage amount <b>{inrShort(coverage)}</b></label>
          <input id="dial-cov" type="range" min={COVERAGE_MIN} max={COVERAGE_MAX} step={COVERAGE_STEP} value={coverage}
            style={{ '--pct': `${pct}%` }} onChange={(e) => onChange({ ...value, coverage: Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="dial-yrs">Policy term <b>{years} {years === 1 ? 'year' : 'years'}</b></label>
          <input id="dial-yrs" type="range" min={1} max={MAX_YEARS} step={1} value={years}
            style={{ '--pct': `${yPct}%` }} onChange={(e) => onChange({ ...value, years: Number(e.target.value) })} />
        </div>
      </div>

      {est && (
        <div className="dial-break">
          <div><span>Base premium</span><span>{inr(est.base)}</span></div>
          {est.discount > 0 && <div className="save"><span>2+ year discount (5%)</span><span>−{inr(est.discount)}</span></div>}
          <div><span>GST ({est.gstRate}%)</span><span>{inr(est.gst)}</span></div>
          <div className="total"><span>Total payable</span><span>{inr(est.total)}</span></div>
        </div>
      )}
    </div>
  )
}

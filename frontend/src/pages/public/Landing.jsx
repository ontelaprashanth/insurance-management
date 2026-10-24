
import { useState } from 'react'
import { Link } from 'react-router-dom'

import CoverageDial from '../../components/CoverageDial'
import { Logo } from '../../components/ui'
import { PLANS } from '../../lib/premium'
import { inr, inrShort } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'

const ACTIVE_PLANS = PLANS.filter((plan) => plan.active !== false)

const DEFAULT_PLAN =
  ACTIVE_PLANS.find((plan) => plan.key === 'HLT-BASIC') ||
  ACTIVE_PLANS[0]

export default function Landing() {
  const { user } = useAuth()

  const [plan, setPlan] = useState(DEFAULT_PLAN?.key ?? '')
  const [val, setVal] = useState({
    coverage: DEFAULT_PLAN?.coverage ?? 300000,
    years: 1,
  })

  const selectedPlan =
    ACTIVE_PLANS.find((item) => item.key === plan) ||
    DEFAULT_PLAN

  return (
    <div className="land">
      <header className="land-nav">
        <Link to="/" className="brand">
          <Logo />
          <span>InsureX</span>
        </Link>

        <div className="row">
          {user ? (
            <Link
              className="btn dark"
              to={user.role === 'ADMIN' ? '/admin' : '/app'}
            >
              Open portal
            </Link>
          ) : (
            <>
              <Link className="btn ghost" to="/login">
                Sign in
              </Link>

              <Link className="btn dark" to="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="land-hero">
        <div className="land-hero-content">
          <span className="land-eyebrow">
            INSURANCE, MADE CLEAR
          </span>

          <h1>
            Know your premium before you sign anything.
          </h1>

          <p className="lead">
            Choose a specific insurance plan, adjust your coverage
            and policy duration, and explore your estimated premium
            before purchasing. Track your policy and follow claims
            from filing to settlement through InsureX.
          </p>

          <div className="row wrap land-hero-actions">
            <Link className="btn primary lg" to="/register">
              Get covered
            </Link>

            <Link className="btn lg" to="/login">
              I already have an account
            </Link>
          </div>

          <div className="land-trust-points">
            <span>✓ Clear premium estimates</span>
            <span>✓ Multiple coverage options</span>
            <span>✓ Policy and claim tracking</span>
          </div>
        </div>

        {selectedPlan && (
          <CoverageDial
            value={val}
            onChange={setVal}
            planKey={selectedPlan.key}
            onPlanChange={(nextPlanKey) => {
              const nextPlan = ACTIVE_PLANS.find(
                (item) => item.key === nextPlanKey,
              )

              if (!nextPlan) return

              setPlan(nextPlan.key)

              setVal((previous) => ({
                ...previous,
                coverage: nextPlan.coverage,
              }))
            }}
          />
        )}
      </section>

      <section className="plans" aria-labelledby="plans-h">
        <div className="land-section-heading">
          <span className="land-eyebrow">EXPLORE YOUR OPTIONS</span>

          <h2 id="plans-h">Insurance plans for different needs</h2>

          <p className="muted">
            Compare the available coverage amounts and listed
            annual premiums to find a plan that suits you.
          </p>
        </div>

        <div className="plan-list">
          {ACTIVE_PLANS.map((p) => (
            <article className="plan-line" key={p.key}>
              <div className="land-plan-heading">
                <div>
                  <b>{p.label}</b>
                  <span className="land-plan-code">{p.code}</span>
                </div>

                <span className="land-plan-type">{p.type}</span>
              </div>

              <p className="muted">{p.blurb}</p>

              <div className="land-plan-details">
                <div>
                  <span className="land-detail-label">
                    Coverage
                  </span>

                  <strong>{inrShort(p.coverage)}</strong>
                </div>

                <div className="land-plan-price">
                  <span className="land-detail-label">
                    Listed annual premium
                  </span>

                  <strong>{inr(p.yearly)}</strong>
                  <span className="land-price-unit">/ year</span>
                </div>
              </div>

              <button
                type="button"
                className="btn land-plan-select"
                onClick={() => {
                  setPlan(p.key)

                  setVal((previous) => ({
                    ...previous,
                    coverage: p.coverage,
                  }))

                  document
                    .querySelector('.ix-dial-animated')
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    })
                }}
              >
                Calculate this plan
              </button>
            </article>
          ))}
        </div>

        <p className="faint land-pricing-note">
          Listed premiums are based on the plan prices supplied
          for InsureX. Multi-year discounts and final payable
          amounts depend on the calculator configuration and
          the applicable purchase terms. Confirm the final
          premium before completing a purchase.
        </p>
      </section>

      <footer className="land-foot">
        InsureX — insurance management portal
      </footer>
    </div>
  )
}

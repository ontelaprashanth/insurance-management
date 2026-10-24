
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

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
  const calculatorRef = useRef(null)

  const [plan, setPlan] = useState(DEFAULT_PLAN?.key ?? '')
  const [val, setVal] = useState({
    coverage: DEFAULT_PLAN?.coverage ?? 300000,
    years: 1,
  })

  const selectedPlan =
    ACTIVE_PLANS.find((item) => item.key === plan) || DEFAULT_PLAN

  const openCalculator = () => {
    if (calculatorRef.current) {
      calculatorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }

  const selectPlan = (key) => {
    const nextPlan = ACTIVE_PLANS.find((item) => item.key === key)

    if (!nextPlan) return

    setPlan(nextPlan.key)
    setVal((current) => ({
      ...current,
      coverage: nextPlan.coverage,
    }))

    calculatorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const portalPath =
    user?.role === 'ADMIN' ? '/app/admin' : '/app'

  return (
    <main className="ix-landing">
      <style>{`
        .ix-landing {
          --ix-green: #059669;
          --ix-green-dark: #047857;
          --ix-deep: #123f2e;
          --ix-text: #183b2e;
          --ix-muted: #687e73;
          --ix-border: #dcebe2;
          min-height: 100vh;
          overflow: hidden;
          color: var(--ix-text);
          background:
            radial-gradient(ellipse at 5% 5%, rgba(16,185,129,.10), transparent 32%),
            radial-gradient(ellipse at 95% 18%, rgba(167,243,208,.18), transparent 32%),
            #fbfefc;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .ix-landing *,
        .ix-landing *::before,
        .ix-landing *::after {
          box-sizing: border-box;
        }

        .ix-wrap {
          width: min(1120px, calc(100% - 36px));
          margin: 0 auto;
        }

        .ix-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 72px;
          border-bottom: 1px solid #e5f0e9;
        }

        .ix-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .ix-nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .ix-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 9px 13px;
          border: 1px solid transparent;
          border-radius: 9px;
          color: #315b48;
          background: transparent;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          transition: background .2s ease, transform .2s ease;
        }

        .ix-nav-link:hover {
          background: #eef9f2;
          transform: translateY(-1px);
        }

        .ix-nav-link-primary {
          color: white;
          background: var(--ix-green);
        }

        .ix-nav-link-primary:hover {
          color: white;
          background: var(--ix-green-dark);
        }

        .ix-hero {
          padding: 55px 0 24px;
          text-align: center;
          animation: ix-rise .6s ease both;
        }

        .ix-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding: 7px 12px;
          border: 1px solid #ccebd9;
          border-radius: 999px;
          color: #08744f;
          background: #effbf4;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .ix-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 4px rgba(16,185,129,.12);
        }

        .ix-hero h1 {
          max-width: 800px;
          margin: 0 auto;
          color: #103d2c;
          font-size: clamp(34px, 5vw, 56px);
          font-weight: 850;
          letter-spacing: -.05em;
          line-height: 1.1;
        }

        .ix-hero h1 span {
          color: var(--ix-green);
        }

        .ix-hero-copy {
          max-width: 620px;
          margin: 17px auto 0;
          color: var(--ix-muted);
          font-size: 14px;
          line-height: 1.8;
        }

        .ix-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 23px;
        }

        .ix-open-calculator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 38px;
          padding: 9px 14px;
          border: 1px solid var(--ix-green);
          border-radius: 9px;
          color: #fff;
          background: var(--ix-green);
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(5,150,105,.14);
          transition: background .2s ease, transform .2s ease,
            box-shadow .2s ease;
        }

        .ix-open-calculator:hover {
          background: var(--ix-green-dark);
          transform: translateY(-2px);
          box-shadow: 0 7px 16px rgba(5,150,105,.20);
        }

        .ix-open-calculator:focus-visible,
        .ix-plan-button:focus-visible,
        .ix-nav-link:focus-visible {
          outline: 3px solid #a7f3d0;
          outline-offset: 3px;
        }

        .ix-secondary-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 38px;
          padding: 9px 13px;
          border: 1px solid var(--ix-border);
          border-radius: 9px;
          color: #285b44;
          background: white;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          transition: background .2s ease, border-color .2s ease;
        }

        .ix-secondary-link:hover {
          border-color: #a5dabb;
          background: #f3fbf6;
        }

        .ix-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 17px;
          margin-top: 22px;
          color: #587367;
          font-size: 11px;
          font-weight: 650;
        }

        .ix-trust span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ix-trust svg {
          color: var(--ix-green);
        }

        .ix-calculator-section {
          padding: 14px 0 64px;
          scroll-margin-top: 24px;
        }

        .ix-dial-animated {
          position: relative;
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
          padding: 23px;
          overflow: hidden;
          border: 1px solid #d4e9dc;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 16px 45px rgba(18,77,51,.085);
          animation: ix-card-in .65s ease both;
          scroll-margin-top: 25px;
        }

        .ix-dial-animated::before {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #059669, #a7f3d0, #059669);
          background-size: 200% 100%;
          content: "";
          animation: ix-shimmer 4s linear infinite;
        }

        .ix-calc-heading {
          margin-bottom: 18px;
          text-align: center;
        }

        .ix-calc-heading h2 {
          margin: 0;
          color: #124532;
          font-size: 21px;
          font-weight: 850;
          letter-spacing: -.035em;
        }

        .ix-calc-heading p {
          margin: 7px 0 0;
          color: #708579;
          font-size: 12px;
          line-height: 1.7;
        }

        /* Styling for the existing CoverageDial component */
        .ix-landing .dial-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .ix-landing .dial-heading {
          color: #153f2f;
          font-size: 16px;
          font-weight: 800;
        }

        .ix-landing .dial-eyebrow {
          color: #07815a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .ix-landing .dial-shield {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          border-radius: 10px;
          color: #047857;
          background: #e9f9ef;
        }

        .ix-landing .dial-label {
          margin-bottom: 8px;
          color: #526e61;
          font-size: 12px;
          font-weight: 750;
        }

        .ix-landing .dial-plan-options {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 7px;
        }

        .ix-landing .dial-plan-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid #e0ebe4;
          border-radius: 9px;
          color: #355c4b;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: border-color .2s ease, background .2s ease,
            transform .2s ease;
        }

        .ix-landing .dial-plan-chip:hover {
          border-color: #9bdabb;
          background: #f5fcf7;
          transform: translateX(2px);
        }

        .ix-landing .dial-plan-chip.active,
        .ix-landing .dial-plan-chip[aria-pressed="true"] {
          border-color: #34b981;
          color: #075c40;
          background: #edfbf3;
        }

        .ix-landing .dial-premium {
          border-radius: 12px;
          background: #effbf4;
        }

        .ix-landing .dial-premium-main {
          color: #075c40;
        }

        .ix-landing .dial-price {
          color: #047857;
          font-weight: 850;
        }

        .ix-landing .dial-price-caption {
          color: #708579;
          font-size: 11px;
        }

        .ix-landing .dial-price-tag {
          border-radius: 7px;
          color: #047857;
          background: #d8f7e6;
        }

        .ix-landing .dial-control {
          padding: 12px;
          border: 1px solid #e1eee6;
          border-radius: 11px;
          background: #fff;
        }

        .ix-landing .dial-control-heading {
          color: #456657;
          font-size: 12px;
          font-weight: 750;
        }

        .ix-landing .dial-control-value {
          color: #124532;
          font-size: 15px;
          font-weight: 800;
        }

        .ix-landing .dial-range {
          accent-color: #059669;
          cursor: pointer;
        }

        .ix-landing .dial-range-labels {
          color: #71867c;
          font-size: 10px;
        }

        .ix-landing .dial-breakdown {
          border-color: #e0ebe4;
        }

        .ix-landing .dial-breakdown-row {
          color: #526e61;
          font-size: 12px;
        }

        .ix-landing .dial-breakdown-total {
          color: #075c40;
          font-weight: 850;
        }

        .ix-landing .dial-disclaimer {
          color: #7b8e84;
          font-size: 10px;
          line-height: 1.6;
        }

        .ix-plans-section {
          padding: 60px 0 70px;
          border-top: 1px solid #e5f0e9;
          background: rgba(245,252,247,.85);
        }

        .ix-section-heading {
          max-width: 650px;
          margin: 0 auto 28px;
          text-align: center;
        }

        .ix-section-kicker {
          margin-bottom: 9px;
          color: #07815a;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .ix-section-heading h2 {
          margin: 0;
          color: #103d2d;
          font-size: clamp(26px, 3.5vw, 35px);
          font-weight: 850;
          letter-spacing: -.04em;
        }

        .ix-section-heading p {
          margin: 10px 0 0;
          color: #667d71;
          font-size: 13px;
          line-height: 1.75;
        }

        .ix-plan-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .ix-plan-card {
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 20px;
          border: 1px solid #dfebe3;
          border-radius: 15px;
          background: white;
          box-shadow: 0 4px 15px rgba(20,74,48,.025);
          animation: ix-rise .55s ease both;
          transition: transform .22s ease, border-color .22s ease,
            box-shadow .22s ease;
        }

        .ix-plan-card:hover {
          transform: translateY(-4px);
          border-color: #a9dec0;
          box-shadow: 0 13px 28px rgba(20,74,48,.07);
        }

        .ix-plan-meta {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
        }

        .ix-plan-type {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 7px;
          color: #08744f;
          background: #eaf9f0;
          font-size: 10px;
          font-weight: 800;
        }

        .ix-plan-code {
          padding-top: 4px;
          color: #82958a;
          font-size: 10px;
          font-weight: 750;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .ix-plan-card h3 {
          margin: 0;
          color: #163f2f;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -.025em;
        }

        .ix-plan-description {
          flex: 1;
          margin: 9px 0 16px;
          color: #6b8075;
          font-size: 12px;
          line-height: 1.7;
        }

        .ix-plan-coverage {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 0;
          border-top: 1px solid #edf3ef;
          border-bottom: 1px solid #edf3ef;
        }

        .ix-plan-coverage span:first-child {
          color: #74887d;
          font-size: 11px;
        }

        .ix-plan-coverage strong {
          color: #124532;
          font-size: 14px;
          font-weight: 850;
        }

        .ix-plan-price {
          margin: 15px 0;
        }

        .ix-plan-price strong {
          color: #047857;
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -.035em;
        }

        .ix-plan-price span {
          margin-left: 4px;
          color: #82948a;
          font-size: 11px;
        }

        .ix-plan-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          min-height: 40px;
          margin-top: auto;
          padding: 10px;
          border: 1px solid #cfe8d9;
          border-radius: 9px;
          color: #08744f;
          background: #f2fbf5;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: color .2s ease, background .2s ease,
            border-color .2s ease, transform .2s ease;
        }

        .ix-plan-button:hover {
          border-color: #059669;
          color: white;
          background: #059669;
          transform: translateY(-1px);
        }

        .ix-bottom-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 30px;
          padding: 22px;
          border: 1px solid #ccebd8;
          border-radius: 15px;
          background: linear-gradient(120deg, #effcf4, white);
        }

        .ix-bottom-cta h3 {
          margin: 0;
          color: #124532;
          font-size: 16px;
          font-weight: 800;
        }

        .ix-bottom-cta p {
          margin: 6px 0 0;
          color: #6a8175;
          font-size: 12px;
          line-height: 1.65;
        }

        .ix-footer {
          padding: 22px 0;
          border-top: 1px solid #e2eee6;
          color: #7a8e83;
          font-size: 11px;
        }

        .ix-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        @keyframes ix-rise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-card-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ix-shimmer {
          from { background-position: 100% 0; }
          to { background-position: -100% 0; }
        }

        @media (max-width: 850px) {
          .ix-plan-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 580px) {
          .ix-wrap {
            width: calc(100% - 28px);
          }

          .ix-nav {
            min-height: 64px;
          }

          .ix-nav-actions {
            gap: 4px;
          }

          .ix-nav-link {
            min-height: 35px;
            padding: 8px 9px;
            font-size: 11px;
          }

          .ix-hero {
            padding-top: 40px;
          }

          .ix-hero h1 {
            font-size: clamp(32px, 9vw, 43px);
          }

          .ix-hero-copy {
            font-size: 13px;
          }

          .ix-trust {
            gap: 11px;
            font-size: 10px;
          }

          .ix-calculator-section {
            padding: 12px 0 45px;
          }

          .ix-dial-animated {
            padding: 17px 12px;
            border-radius: 15px;
          }

          .ix-calc-heading h2 {
            font-size: 19px;
          }

          .ix-plan-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .ix-plans-section {
            padding: 45px 0;
          }

          .ix-bottom-cta {
            align-items: stretch;
            flex-direction: column;
            padding: 18px;
          }

          .ix-bottom-cta .ix-open-calculator {
            width: 100%;
          }

          .ix-footer-inner {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-landing *,
          .ix-landing *::before,
          .ix-landing *::after {
            animation: none !important;
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      <header className="ix-wrap ix-nav">
        <Link to="/app" className="ix-brand" aria-label="InsureX home">
          <Logo />
        </Link>

        <nav className="ix-nav-actions" aria-label="Main navigation">
          {user ? (
            <Link
              to={portalPath}
              className="ix-nav-link ix-nav-link-primary"
            >
              Open Portal <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link to="/app/login" className="ix-nav-link">
                Sign in
              </Link>
              <Link
                to="/app/register"
                className="ix-nav-link ix-nav-link-primary"
              >
                Get started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="ix-wrap ix-hero">
        <div className="ix-eyebrow">
          <span className="ix-eyebrow-dot" />
          Insurance made easier
        </div>

        <h1>
          Find the right cover.
          <br />
          Know your <span>premium.</span>
        </h1>

        <p className="ix-hero-copy">
          Compare insurance plans, adjust your coverage, and estimate
          your premium in one place. Explore your options before making
          your decision.
        </p>

        <div className="ix-hero-actions">
          <button
            type="button"
            className="ix-open-calculator"
            onClick={openCalculator}
          >
            <Calculator size={15} />
            Open Insurance Calculator
          </button>

          <a href="#insurance-plans" className="ix-secondary-link">
            Explore plans <ArrowRight size={14} />
          </a>
        </div>

        <div className="ix-trust">
          <span>
            <CheckCircle2 size={14} />
            Adjustable coverage
          </span>
          <span>
            <ShieldCheck size={14} />
            Plan comparisons
          </span>
          <span>
            <Sparkles size={14} />
            Premium estimates
          </span>
        </div>
      </section>

      <section className="ix-wrap ix-calculator-section">
        <div className="ix-dial-animated" ref={calculatorRef}>
          <div className="ix-calc-heading">
            <h2>Insurance Premium Calculator</h2>
            <p>
              Select your plan and customise your coverage and policy duration.
            </p>
          </div>

          {selectedPlan && (
            <CoverageDial
              value={val}
              onChange={setVal}
              planKey={selectedPlan.key}
              onPlanChange={setPlan}
              showPlans
              lockedPlan={false}
            />
          )}
        </div>
      </section>

      <section className="ix-plans-section" id="insurance-plans">
        <div className="ix-wrap">
          <div className="ix-section-heading">
            <div className="ix-section-kicker">Find your protection</div>
            <h2>Explore insurance plans</h2>
            <p>
              Compare available plans by their listed coverage and yearly
              premium, then select one to open the calculator.
            </p>
          </div>

          <div className="ix-plan-grid">
            {ACTIVE_PLANS.map((item, index) => (
              <article
                className="ix-plan-card"
                key={item.key}
                style={{
                  animationDelay: `${Math.min(index, 5) * 60}ms`,
                }}
              >
                <div className="ix-plan-meta">
                  <span className="ix-plan-type">
                    <ShieldCheck size={12} />
                    {item.type}
                  </span>
                  <span className="ix-plan-code">{item.key}</span>
                </div>

                <h3>{item.label}</h3>

                <p className="ix-plan-description">{item.blurb}</p>

                <div className="ix-plan-coverage">
                  <span>Base coverage</span>
                  <strong>{inrShort(item.coverage)}</strong>
                </div>

                <div className="ix-plan-price">
                  <strong>{inr(item.yearly)}</strong>
                  <span>/ year</span>
                </div>

                <button
                  type="button"
                  className="ix-plan-button"
                  onClick={() => selectPlan(item.key)}
                >
                  Calculate this plan
                  <ArrowRight size={14} />
                </button>
              </article>
            ))}
          </div>

          <div className="ix-bottom-cta">
            <div>
              <h3>Ready to estimate your premium?</h3>
              <p>
                Adjust your coverage and policy duration in the calculator.
              </p>
            </div>

            <button
              type="button"
              className="ix-open-calculator"
              onClick={openCalculator}
            >
              <Calculator size={15} />
              Open calculator
            </button>
          </div>
        </div>
      </section>

      <footer className="ix-footer">
        <div className="ix-wrap ix-footer-inner">
          <span>
            © {new Date().getFullYear()} InsureX Insurance Platform
          </span>
          <button
            type="button"
            className="ix-secondary-link"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          >
            Back to top ↑
          </button>
        </div>
      </footer>
    </main>
  )
}

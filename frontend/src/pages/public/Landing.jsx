
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import CoverageDial from '../../components/CoverageDial'
import Logo from '../../components/Logo'
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
    calculatorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const selectPlan = (nextPlanKey) => {
    const nextPlan = ACTIVE_PLANS.find(
      (item) => item.key === nextPlanKey,
    )

    if (!nextPlan) return

    setPlan(nextPlan.key)
    setVal((previous) => ({
      ...previous,
      coverage: nextPlan.coverage,
    }))

    window.setTimeout(openCalculator, 80)
  }

  const portalPath =
    user?.role === 'ADMIN' ? '/app/admin' : '/app'

  return (
    <main className="land-premium">
      <style>{`
        .land-premium {
          --land-green: #059669;
          --land-dark: #065f46;
          --land-deep: #064e3b;
          --land-text: #102a22;
          --land-muted: #60756c;
          --land-border: #dcebe4;
          --land-soft: #f0fdf6;
          min-height: 100vh;
          overflow: hidden;
          color: var(--land-text);
          background:
            radial-gradient(ellipse at 8% 4%, rgba(16,185,129,.10), transparent 34%),
            radial-gradient(ellipse at 92% 20%, rgba(167,243,208,.24), transparent 32%),
            #fbfefc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .land-premium * {
          box-sizing: border-box;
        }

        .land-container {
          width: min(1160px, calc(100% - 40px));
          margin: 0 auto;
        }

        .land-nav {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 76px;
          border-bottom: 1px solid rgba(220,235,228,.85);
        }

        .land-brand {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          text-decoration: none;
        }

        .land-nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .land-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 39px;
          padding: 9px 14px;
          border: 1px solid transparent;
          border-radius: 9px;
          color: #31594a;
          font-size: 13px;
          font-weight: 650;
          text-decoration: none;
          transition: background .2s ease, transform .2s ease,
            border-color .2s ease;
        }

        .land-nav-link:hover {
          background: #edf9f2;
          transform: translateY(-1px);
        }

        .land-nav-link-primary {
          color: #fff;
          background: var(--land-green);
          box-shadow: 0 4px 12px rgba(5,150,105,.15);
        }

        .land-nav-link-primary:hover {
          color: #fff;
          background: #047857;
        }

        .land-hero {
          position: relative;
          padding: 64px 0 30px;
          text-align: center;
          animation: land-fade-up .65s ease both;
        }

        .land-eyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 19px;
          padding: 7px 12px;
          border: 1px solid #c8ead8;
          border-radius: 999px;
          color: #08744f;
          background: rgba(236,253,245,.85);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .land-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 4px rgba(16,185,129,.12);
        }

        .land-hero h1 {
          max-width: 800px;
          margin: 0 auto;
          color: #103d2d;
          font-size: clamp(34px, 5vw, 58px);
          font-weight: 850;
          letter-spacing: -.055em;
          line-height: 1.09;
        }

        .land-hero h1 span {
          color: var(--land-green);
        }

        .land-hero-copy {
          max-width: 630px;
          margin: 19px auto 0;
          color: var(--land-muted);
          font-size: 15px;
          line-height: 1.8;
        }

        .land-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 25px;
        }

        .land-open-calculator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 39px;
          padding: 9px 14px;
          border: 1px solid #059669;
          border-radius: 9px;
          color: #fff;
          background: #059669;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(5,150,105,.15);
          transition: background .2s ease, transform .2s ease,
            box-shadow .2s ease;
        }

        .land-open-calculator:hover {
          background: #047857;
          transform: translateY(-2px);
          box-shadow: 0 7px 16px rgba(5,150,105,.22);
        }

        .land-open-calculator:active {
          transform: translateY(0);
        }

        .land-secondary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 39px;
          padding: 9px 13px;
          border: 1px solid #d9e9e0;
          border-radius: 9px;
          color: #245b44;
          background: #fff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: border-color .2s ease, background .2s ease;
        }

        .land-secondary-action:hover {
          border-color: #91d6b4;
          background: #f4fcf7;
        }

        .land-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 24px;
          color: #577267;
          font-size: 12px;
          font-weight: 600;
        }

        .land-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .land-trust-item svg {
          color: #059669;
        }

        .land-calculator-section {
          padding: 14px 0 70px;
          scroll-margin-top: 35px;
        }

        .ix-dial-animated {
          position: relative;
          width: 100%;
          max-width: 690px;
          margin: 0 auto;
          padding: 23px;
          overflow: hidden;
          border: 1px solid rgba(190,224,204,.9);
          border-radius: 20px;
          background: rgba(255,255,255,.97);
          box-shadow:
            0 18px 55px rgba(18,77,51,.09),
            0 3px 10px rgba(18,77,51,.035);
          animation: land-card-in .7s ease both;
          scroll-margin-top: 35px;
        }

        .ix-dial-animated::before {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #059669, #6ee7b7, #059669);
          background-size: 200% 100%;
          content: "";
          animation: land-shimmer 4s linear infinite;
        }

        .land-calculator-heading {
          margin-bottom: 16px;
          text-align: center;
        }

        .land-calculator-heading h2 {
          margin: 0;
          color: #124532;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -.035em;
        }

        .land-calculator-heading p {
          margin: 7px 0 0;
          color: #70867b;
          font-size: 12px;
          line-height: 1.6;
        }

        /* CoverageDial component styles */
        .land-premium .dial-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .land-premium .dial-heading {
          color: #153f2f;
          font-size: 17px;
          font-weight: 800;
        }

        .land-premium .dial-eyebrow {
          color: #07815a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .land-premium .dial-shield {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 37px;
          height: 37px;
          flex-shrink: 0;
          border-radius: 11px;
          color: #047857;
          background: #e8f9ef;
        }

        .land-premium .dial-label {
          margin-bottom: 8px;
          color: #526e61;
          font-size: 12px;
          font-weight: 750;
        }

        .land-premium .dial-plan-options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .land-premium .dial-plan-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 43px;
          padding: 10px 13px;
          border: 1px solid #e0ebe4;
          border-radius: 10px;
          color: #355c4b;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: border-color .2s ease, background .2s ease,
            transform .2s ease, box-shadow .2s ease;
        }

        .land-premium .dial-plan-chip:hover {
          border-color: #9bdabb;
          background: #f5fcf7;
          transform: translateX(2px);
        }

        .land-premium .dial-plan-chip.active,
        .land-premium .dial-plan-chip[aria-pressed="true"] {
          border-color: #34b981;
          color: #075c40;
          background: #edfbf3;
          box-shadow: inset 3px 0 #059669;
        }

        .land-premium .dial-premium {
          border-radius: 14px;
          background: #f0fbf5;
        }

        .land-premium .dial-premium-main {
          color: #075c40;
        }

        .land-premium .dial-price {
          color: #047857;
          font-weight: 850;
          letter-spacing: -.035em;
        }

        .land-premium .dial-price-caption {
          color: #70867b;
          font-size: 11px;
        }

        .land-premium .dial-price-tag {
          border-radius: 7px;
          color: #047857;
          background: #d8f7e6;
        }

        .land-premium .dial-control {
          padding: 13px;
          border: 1px solid #e1eee6;
          border-radius: 12px;
          background: #fff;
        }

        .land-premium .dial-control-heading {
          color: #456657;
          font-size: 12px;
          font-weight: 750;
        }

        .land-premium .dial-control-value {
          color: #124532;
          font-size: 15px;
          font-weight: 800;
        }

        .land-premium .dial-range {
          accent-color: #059669;
          cursor: pointer;
        }

        .land-premium .dial-range-labels {
          color: #71867c;
          font-size: 10px;
        }

        .land-premium .dial-breakdown {
          border-color: #e0ebe4;
        }

        .land-premium .dial-breakdown-row {
          color: #526e61;
          font-size: 12px;
        }

        .land-premium .dial-breakdown-total {
          color: #075c40;
          font-weight: 850;
        }

        .land-premium .dial-disclaimer {
          color: #7b8e84;
          font-size: 10px;
          line-height: 1.6;
        }

        .land-plans-section {
          padding: 66px 0 76px;
          border-top: 1px solid #e5f0e9;
          background: rgba(245,252,247,.85);
        }

        .land-section-heading {
          max-width: 650px;
          margin: 0 auto 30px;
          text-align: center;
        }

        .land-section-kicker {
          margin-bottom: 10px;
          color: #07815a;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .land-section-heading h2 {
          margin: 0;
          color: #103d2d;
          font-size: clamp(26px, 3.5vw, 36px);
          font-weight: 850;
          letter-spacing: -.045em;
        }

        .land-section-heading p {
          margin: 11px 0 0;
          color: #667d71;
          font-size: 13px;
          line-height: 1.75;
        }

        .land-plan-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .land-plan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 21px;
          border: 1px solid #dfebe3;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 4px 15px rgba(20,74,48,.025);
          animation: land-fade-up .55s ease both;
          transition: transform .23s ease, border-color .23s ease,
            box-shadow .23s ease;
        }

        .land-plan-card:hover {
          transform: translateY(-5px);
          border-color: #a9dec0;
          box-shadow: 0 15px 32px rgba(20,74,48,.075);
        }

        .land-plan-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 15px;
        }

        .land-plan-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 7px;
          color: #08744f;
          background: #eaf9f0;
          font-size: 10px;
          font-weight: 800;
        }

        .land-plan-code {
          padding-top: 4px;
          color: #8a9c91;
          font-size: 10px;
          font-weight: 750;
          text-align: right;
        }

        .land-plan-card h3 {
          margin: 0;
          color: #163f2f;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -.025em;
        }

        .land-plan-description {
          min-height: 61px;
          margin: 9px 0 17px;
          color: #6b8075;
          font-size: 12px;
          line-height: 1.7;
        }

        .land-plan-coverage {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 0;
          border-top: 1px solid #edf3ef;
          border-bottom: 1px solid #edf3ef;
        }

        .land-plan-coverage-label {
          color: #74887d;
          font-size: 11px;
        }

        .land-plan-coverage-value {
          color: #124532;
          font-size: 15px;
          font-weight: 850;
        }

        .land-plan-price {
          margin-top: 16px;
        }

        .land-plan-price strong {
          color: #047857;
          font-size: 23px;
          font-weight: 850;
          letter-spacing: -.04em;
        }

        .land-plan-price span {
          margin-left: 4px;
          color: #82948a;
          font-size: 11px;
        }

        .land-plan-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 41px;
          margin-top: auto;
          padding: 10px 12px;
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

        .land-plan-button:hover {
          border-color: #059669;
          color: #fff;
          background: #059669;
          transform: translateY(-1px);
        }

        .land-bottom-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 34px;
          padding: 23px 25px;
          border: 1px solid #ccebd8;
          border-radius: 16px;
          background: linear-gradient(120deg, #effcf4, #fff);
        }

        .land-bottom-cta h3 {
          margin: 0;
          color: #124532;
          font-size: 17px;
          font-weight: 800;
        }

        .land-bottom-cta p {
          margin: 6px 0 0;
          color: #6a8175;
          font-size: 12px;
          line-height: 1.6;
        }

        .land-bottom-cta a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-shrink: 0;
          padding: 11px 15px;
          border-radius: 9px;
          color: #fff;
          background: #059669;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          transition: background .2s ease, transform .2s ease;
        }

        .land-bottom-cta a:hover {
          background: #047857;
          transform: translateY(-2px);
        }

        .land-footer {
          padding: 24px 0;
          border-top: 1px solid #e2eee6;
          color: #7a8e83;
          font-size: 11px;
        }

        .land-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .land-footer a {
          color: #08744f;
          font-weight: 700;
          text-decoration: none;
        }

        @keyframes land-fade-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes land-card-in {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes land-shimmer {
          from { background-position: 100% 0; }
          to { background-position: -100% 0; }
        }

        @media (max-width: 900px) {
          .land-plan-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .land-hero {
            padding-top: 52px;
          }
        }

        @media (max-width: 600px) {
          .land-container {
            width: min(100% - 28px, 1160px);
          }

          .land-nav {
            min-height: 65px;
            gap: 10px;
          }

          .land-nav-actions {
            gap: 5px;
          }

          .land-nav-link {
            min-height: 35px;
            padding: 8px 10px;
            font-size: 11px;
          }

          .land-hero {
            padding: 43px 0 22px;
          }

          .land-hero h1 {
            font-size: clamp(33px, 9vw, 45px);
          }

          .land-hero-copy {
            font-size: 13px;
          }

          .land-trust-row {
            gap: 12px;
            font-size: 11px;
          }

          .land-calculator-section {
            padding: 12px 0 48px;
          }

          .ix-dial-animated {
            padding: 17px 13px;
            border-radius: 15px;
          }

          .land-calculator-heading h2 {
            font-size: 19px;
          }

          .land-plan-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .land-plan-description {
            min-height: 0;
          }

          .land-plans-section {
            padding: 48px 0;
          }

          .land-bottom-cta {
            align-items: stretch;
            flex-direction: column;
            padding: 19px;
          }

          .land-bottom-cta a {
            width: 100%;
          }

          .land-footer-inner {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .land-premium *,
          .land-premium *::before,
          .land-premium *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <header className="land-container land-nav">
        <Link
          to="/app"
          className="land-brand"
          aria-label="InsureX home"
        >
          <Logo />
        </Link>

        <nav className="land-nav-actions" aria-label="Main navigation">
          {user ? (
            <Link
              to={portalPath}
              className="land-nav-link land-nav-link-primary"
            >
              Open Portal <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link to="/app/login" className="land-nav-link">
                Sign in
              </Link>
              <Link
                to="/app/register"
                className="land-nav-link land-nav-link-primary"
              >
                Get started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="land-container land-hero">
        <div className="land-eyebrow">
          <span className="land-eyebrow-dot" />
          Insurance made easier
        </div>

        <h1>
          Know your premium
          <br />
          before you <span>choose.</span>
        </h1>

        <p className="land-hero-copy">
          Compare insurance plans, adjust your coverage, and estimate
          your premium in one place. Explore your options and make a
          more informed decision.
        </p>

        <div className="land-hero-actions">
          <button
            type="button"
            className="land-open-calculator"
            onClick={openCalculator}
          >
            <Calculator size={15} />
            Open Insurance Calculator
          </button>

          <a href="#insurance-plans" className="land-secondary-action">
            Explore plans <ChevronRight size={15} />
          </a>
        </div>

        <div className="land-trust-row">
          <span className="land-trust-item">
            <CheckCircle2 size={15} />
            Adjustable coverage
          </span>
          <span className="land-trust-item">
            <ShieldCheck size={15} />
            Compare plan options
          </span>
          <span className="land-trust-item">
            <Sparkles size={15} />
            Instant estimates
          </span>
        </div>
      </section>

      <section
        className="land-container land-calculator-section"
        aria-label="Insurance premium calculator"
      >
        <div className="ix-dial-animated" ref={calculatorRef}>
          <div className="land-calculator-heading">
            <h2>Insurance Premium Calculator</h2>
            <p>
              Choose a plan, adjust coverage, and estimate your premium.
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

      <section
        className="land-plans-section"
        id="insurance-plans"
      >
        <div className="land-container">
          <div className="land-section-heading">
            <div className="land-section-kicker">
              Find your protection
            </div>
            <h2>Explore our insurance plans</h2>
            <p>
              Browse available plans and choose one to calculate an
              estimate using its listed coverage and yearly premium.
            </p>
          </div>

          <div className="land-plan-grid">
            {ACTIVE_PLANS.map((item, index) => (
              <article
                className="land-plan-card"
                key={item.key}
                style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
              >
                <div className="land-plan-top">
                  <span className="land-plan-type">
                    <ShieldCheck size={13} />
                    {item.type}
                  </span>
                  <span className="land-plan-code">{item.key}</span>
                </div>

                <h3>{item.label}</h3>

                <p className="land-plan-description">
                  {item.blurb}
                </p>

                <div className="land-plan-coverage">
                  <span className="land-plan-coverage-label">
                    Base coverage
                  </span>
                  <span className="land-plan-coverage-value">
                    {inrShort(item.coverage)}
                  </span>
                </div>

                <div className="land-plan-price">
                  <strong>{inr(item.yearly)}</strong>
                  <span>/ year</span>
                </div>

                <button
                  type="button"
                  className="land-plan-button"
                  onClick={() => selectPlan(item.key)}
                >
                  Calculate this plan
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>

          <div className="land-bottom-cta">
            <div>
              <h3>Ready to estimate your premium?</h3>
              <p>
                Open the calculator and customise your coverage and policy
                duration.
              </p>
            </div>

            <button
              type="button"
              className="land-open-calculator"
              onClick={openCalculator}
            >
              <Calculator size={15} />
              Open calculator
            </button>
          </div>
        </div>
      </section>

      <footer className="land-footer">
        <div className="land-container land-footer-inner">
          <span>
            © {new Date().getFullYear()} InsureX Insurance Platform
          </span>
          <a href="#top" onClick={(event) => {
            event.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}>
            Back to top ↑
          </a>
        </div>
      </footer>
    </main>
  )
}

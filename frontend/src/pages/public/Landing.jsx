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

    document
      .querySelector('.ix-dial-animated')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
  }

  return (
    <div className="land land-premium">
      <style>{`
        .land-premium {
          --land-green: #087f5b;
          --land-green-dark: #075c45;
          --land-green-light: #e7f7ef;
          --land-text: #172b25;
          --land-muted: #64756d;
          --land-border: #dce9e2;
          --land-surface: #ffffff;
          --land-bg: #f5faf7;
          color: var(--land-text);
          background: var(--land-bg);
          min-height: 100vh;
          overflow: hidden;
          font-family: inherit;
        }

        .land-premium *,
        .land-premium *::before,
        .land-premium *::after {
          box-sizing: border-box;
        }

        .land-premium a {
          text-decoration: none;
        }

        .land-premium .land-nav {
          width: min(1240px, calc(100% - 48px));
          min-height: 82px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 1px solid rgba(8, 127, 91, 0.12);
        }

        .land-premium .brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: var(--land-green-dark);
          font-size: 23px;
          font-weight: 850;
          letter-spacing: -0.7px;
          transition: transform 180ms ease;
        }

        .land-premium .brand:hover {
          transform: translateY(-2px);
        }

        .land-premium .brand svg {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
        }

        .land-premium .row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .land-premium .wrap {
          flex-wrap: wrap;
        }

        .land-premium .btn {
          display: inline-flex;
          min-height: 43px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 19px;
          border: 1px solid var(--land-border);
          border-radius: 11px;
          background: #fff;
          color: var(--land-text);
          font: inherit;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          text-align: center;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }

        .land-premium .btn:hover {
          transform: translateY(-2px);
          border-color: #9dcab5;
          box-shadow: 0 7px 18px rgba(17, 69, 47, 0.09);
        }

        .land-premium .btn:focus-visible,
        .land-premium a:focus-visible,
        .land-premium button:focus-visible {
          outline: 3px solid rgba(8, 127, 91, 0.28);
          outline-offset: 3px;
        }

        .land-premium .btn.dark {
          color: #fff;
          border-color: var(--land-green-dark);
          background: var(--land-green-dark);
        }

        .land-premium .btn.dark:hover {
          background: #064b39;
        }

        .land-premium .btn.ghost {
          background: transparent;
        }

        .land-premium .btn.primary {
          color: #fff;
          border-color: var(--land-green);
          background: var(--land-green);
        }

        .land-premium .btn.primary:hover {
          border-color: var(--land-green-dark);
          background: var(--land-green-dark);
        }

        .land-premium .btn.lg {
          min-height: 50px;
          padding: 13px 22px;
          font-size: 15px;
        }

        .land-premium .land-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.92fr);
          align-items: center;
          gap: clamp(30px, 5vw, 72px);
          width: min(1240px, calc(100% - 48px));
          margin: 0 auto;
          padding: 74px 0 82px;
        }

        .land-premium .land-hero::before {
          position: absolute;
          z-index: 0;
          top: 12px;
          left: -120px;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(51, 177, 117, 0.09),
            rgba(51, 177, 117, 0)
          );
          content: "";
          pointer-events: none;
        }

        .land-premium .land-hero-content {
          position: relative;
          z-index: 1;
          animation: landFadeUp 650ms ease both;
        }

        .land-premium .land-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 18px;
          color: var(--land-green);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.8px;
          line-height: 1.5;
          text-transform: uppercase;
        }

        .land-premium .land-eyebrow::before {
          width: 23px;
          height: 2px;
          border-radius: 10px;
          background: #21a477;
          content: "";
        }

        .land-premium .land-hero h1 {
          max-width: 690px;
          margin: 0;
          color: #153a2d;
          font-size: clamp(38px, 4.5vw, 62px);
          font-weight: 850;
          letter-spacing: -2.5px;
          line-height: 1.09;
        }

        .land-premium .lead {
          max-width: 600px;
          margin: 24px 0 27px;
          color: var(--land-muted);
          font-size: 16px;
          line-height: 1.85;
        }

        .land-premium .land-hero-actions {
          gap: 13px;
        }

        .land-premium .land-trust-points {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 19px;
          margin-top: 29px;
        }

        .land-premium .land-trust-points span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #526a5f;
          font-size: 12px;
          font-weight: 650;
        }

        .land-premium .land-trust-points span::first-letter {
          color: var(--land-green);
        }

        /* Calculator wrapper: the calculator component keeps its own
           structure, while these rules improve its overall appearance. */
        .land-premium .ix-dial-animated {
          position: relative;
          z-index: 1;
          min-width: 0;
          padding: clamp(22px, 2.5vw, 31px);
          border: 1px solid rgba(8, 127, 91, 0.15);
          border-radius: 24px;
          background: var(--land-surface);
          box-shadow:
            0 24px 65px rgba(21, 74, 49, 0.09),
            0 3px 10px rgba(21, 74, 49, 0.035);
          animation: landFadeUp 750ms 100ms ease both;
        }

        .land-premium .dial-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 23px;
        }

        .land-premium .dial-heading {
          min-width: 0;
        }

        .land-premium .dial-eyebrow {
          display: block;
          margin: 0 0 8px;
          color: var(--land-green);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.6px;
        }

        .land-premium .dial-heading h3 {
          margin: 0;
          color: #183c2f;
          font-size: 23px;
          font-weight: 850;
          letter-spacing: -0.7px;
          line-height: 1.3;
        }

        .land-premium .dial-heading p {
          margin: 8px 0 0;
          color: var(--land-muted);
          font-size: 13px;
          line-height: 1.65;
        }

        .land-premium .dial-shield {
          display: grid;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          place-items: center;
          border: 1px solid #d6eee1;
          border-radius: 15px;
          background: #edfaf3;
          color: var(--land-green);
        }

        .land-premium .dial-plans {
          margin-bottom: 23px;
        }

        .land-premium .dial-label {
          display: block;
          margin-bottom: 10px;
          color: #52665c;
          font-size: 12px;
          font-weight: 750;
        }

        .land-premium .dial-plan-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .land-premium .dial-plan-chip {
          min-width: 0;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid #e0eae4;
          border-radius: 10px;
          background: #fff;
          color: #53665c;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.4;
          text-align: left;
          cursor: pointer;
          overflow-wrap: anywhere;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .land-premium .dial-plan-chip:hover {
          transform: translateY(-1px);
          border-color: #8ac9ac;
          background: #f4fbf7;
        }

        .land-premium .dial-plan-chip.active {
          border-color: var(--land-green);
          background: #eaf8f0;
          color: #076548;
          box-shadow: inset 0 0 0 1px rgba(8, 127, 91, 0.08);
        }

        .land-premium .dial-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 25px;
          padding: 21px;
          border: 1px solid #d5eee0;
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(89, 200, 145, 0.16),
              transparent 45%
            ),
            linear-gradient(135deg, #f0fbf4, #e5f6ec);
        }

        .land-premium .dial-premium-main {
          min-width: 0;
        }

        .land-premium .dial-premium .dial-label {
          margin-bottom: 8px;
          color: #4d7260;
        }

        .land-premium .dial-price {
          color: #075c43;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 900;
          letter-spacing: -1.1px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .land-premium .dial-price-caption {
          display: block;
          margin-top: 7px;
          color: #587565;
          font-size: 11px;
          line-height: 1.5;
        }

        .land-premium .dial-price-tag {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
          color: #547464;
          font-size: 11px;
        }

        .land-premium .dial-price-tag strong {
          color: #086747;
          font-size: 16px;
          font-weight: 850;
        }

        .land-premium .dial-control {
          margin: 0 0 24px;
        }

        .land-premium .dial-control-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .land-premium .dial-control-heading .dial-label {
          margin: 0;
        }

        .land-premium .dial-control-value {
          color: #1c513b;
          font-size: 15px;
          font-weight: 850;
          text-align: right;
        }

        .land-premium .dial-range {
          display: block;
          width: 100%;
          height: 6px;
          margin: 13px 0;
          border-radius: 20px;
          background: #dcebe2;
          accent-color: var(--land-green);
          cursor: pointer;
        }

        .land-premium .dial-range:focus-visible {
          outline: 3px solid rgba(8, 127, 91, 0.22);
          outline-offset: 5px;
        }

        .land-premium .dial-range-labels {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #7b8c82;
          font-size: 11px;
        }

        .land-premium .dial-breakdown {
          display: grid;
          gap: 12px;
          margin-top: 7px;
          padding-top: 19px;
          border-top: 1px solid #e5eee8;
        }

        .land-premium .dial-breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          color: #65786d;
          font-size: 12px;
        }

        .land-premium .dial-breakdown-row strong {
          color: #263d32;
          font-size: 12px;
          font-weight: 800;
          text-align: right;
        }

        .land-premium .dial-breakdown-row .dial-discount {
          color: #07835a;
        }

        .land-premium .dial-breakdown-total {
          margin-top: 2px;
          padding-top: 14px;
          border-top: 1px dashed #dce9e1;
          color: #183e2e;
          font-size: 13px;
          font-weight: 850;
        }

        .land-premium .dial-breakdown-total strong {
          color: #087451;
          font-size: 16px;
        }

        .land-premium .dial-disclaimer {
          margin: 18px 0 0;
          color: #78877f;
          font-size: 10.5px;
          line-height: 1.7;
        }

        .land-premium .plans {
          width: min(1240px, calc(100% - 48px));
          margin: 0 auto;
          padding: 65px 0 75px;
          border-top: 1px solid #e2eee6;
        }

        .land-premium .land-section-heading {
          max-width: 700px;
          margin-bottom: 30px;
        }

        .land-premium .land-section-heading .land-eyebrow {
          margin-bottom: 10px;
        }

        .land-premium .land-section-heading h2 {
          margin: 0;
          color: #173c2e;
          font-size: clamp(27px, 3.2vw, 39px);
          font-weight: 850;
          letter-spacing: -1.25px;
          line-height: 1.2;
        }

        .land-premium .land-section-heading .muted {
          margin: 13px 0 0;
          color: var(--land-muted);
          font-size: 14px;
          line-height: 1.8;
        }

        .land-premium .plan-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .land-premium .plan-line {
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 23px;
          border: 1px solid var(--land-border);
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 4px 15px rgba(20, 67, 46, 0.025);
          animation: landFadeUp 600ms ease both;
          transition:
            transform 200ms ease,
            box-shadow 200ms ease,
            border-color 200ms ease;
        }

        .land-premium .plan-line:hover {
          transform: translateY(-4px);
          border-color: #b6d9c5;
          box-shadow: 0 16px 32px rgba(20, 67, 46, 0.075);
        }

        .land-premium .land-plan-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .land-premium .land-plan-heading > div {
          min-width: 0;
        }

        .land-premium .land-plan-heading b {
          display: block;
          color: #1c4333;
          font-size: 17px;
          font-weight: 850;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .land-premium .land-plan-code {
          display: inline-block;
          margin-top: 6px;
          color: #7b8b81;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.4px;
          overflow-wrap: anywhere;
        }

        .land-premium .land-plan-type {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          padding: 6px 9px;
          border: 1px solid #d9eee1;
          border-radius: 20px;
          background: #eff9f3;
          color: #16704e;
          font-size: 10px;
          font-weight: 800;
        }

        .land-premium .plan-line > .muted {
          min-height: 56px;
          margin: 17px 0 19px;
          color: #6b7b71;
          font-size: 12px;
          line-height: 1.75;
        }

        .land-premium .land-plan-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: auto;
          padding: 16px 0;
          border-top: 1px solid #edf2ee;
          border-bottom: 1px solid #edf2ee;
        }

        .land-premium .land-plan-details > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .land-premium .land-detail-label {
          color: #77877d;
          font-size: 10px;
          line-height: 1.5;
        }

        .land-premium .land-plan-details strong {
          color: #214a37;
          font-size: 16px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .land-premium .land-plan-price {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px;
        }

        .land-premium .land-plan-price .land-detail-label {
          width: 100%;
        }

        .land-premium .land-price-unit {
          color: #718278;
          font-size: 10px;
        }

        .land-premium .land-plan-select {
          width: 100%;
          margin-top: 17px;
          border-color: #d3e9dc;
          background: #f1faf4;
          color: #08714e;
        }

        .land-premium .land-plan-select:hover {
          border-color: var(--land-green);
          background: #e2f6ea;
        }

        .land-premium .land-pricing-note {
          max-width: 850px;
          margin: 23px 0 0;
          color: #7a8980;
          font-size: 11px;
          line-height: 1.8;
        }

        .land-premium .land-foot {
          padding: 24px;
          border-top: 1px solid #e0ebe4;
          background: #eff7f2;
          color: #61756a;
          font-size: 12px;
          text-align: center;
        }

        @keyframes landFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 1400px) {
          .land-premium .land-hero {
            padding-top: 88px;
            padding-bottom: 92px;
          }
        }

        @media (max-width: 1000px) {
          .land-premium .land-hero {
            grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
            gap: 27px;
            padding-top: 55px;
          }

          .land-premium .land-hero h1 {
            font-size: clamp(34px, 4.2vw, 48px);
            letter-spacing: -1.7px;
          }

          .land-premium .plan-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .land-premium .ix-dial-animated {
            padding: 22px;
          }
        }

        @media (max-width: 760px) {
          .land-premium .land-nav,
          .land-premium .land-hero,
          .land-premium .plans {
            width: min(100% - 32px, 600px);
          }

          .land-premium .land-nav {
            min-height: 70px;
            gap: 12px;
          }

          .land-premium .brand {
            gap: 8px;
            font-size: 20px;
          }

          .land-premium .brand svg {
            width: 31px;
            height: 31px;
          }

          .land-premium .land-nav .row {
            gap: 7px;
          }

          .land-premium .land-nav .btn {
            min-height: 39px;
            padding: 9px 11px;
            font-size: 12px;
          }

          .land-premium .land-hero {
            grid-template-columns: minmax(0, 1fr);
            gap: 33px;
            padding-top: 48px;
            padding-bottom: 53px;
          }

          .land-premium .land-hero h1 {
            max-width: 570px;
            font-size: clamp(36px, 8vw, 52px);
            letter-spacing: -1.8px;
          }

          .land-premium .lead {
            margin: 18px 0 23px;
            font-size: 14px;
            line-height: 1.8;
          }

          .land-premium .land-trust-points {
            gap: 10px 15px;
            margin-top: 22px;
          }

          .land-premium .land-trust-points span {
            font-size: 11px;
          }

          .land-premium .ix-dial-animated {
            width: 100%;
            max-width: 570px;
            margin: 0 auto;
          }

          .land-premium .plans {
            padding-top: 47px;
            padding-bottom: 53px;
          }

          .land-premium .plan-list {
            gap: 13px;
          }

          .land-premium .plan-line {
            padding: 18px;
          }

          .land-premium .land-plan-heading {
            flex-direction: column;
            gap: 9px;
          }

          .land-premium .land-plan-type {
            align-self: flex-start;
          }
        }

        @media (max-width: 480px) {
          .land-premium .land-nav,
          .land-premium .land-hero,
          .land-premium .plans {
            width: calc(100% - 24px);
          }

          .land-premium .land-nav {
            min-height: 64px;
          }

          .land-premium .brand {
            font-size: 18px;
          }

          .land-premium .land-nav .btn {
            padding: 8px 9px;
            font-size: 11px;
          }

          .land-premium .land-hero {
            padding-top: 38px;
          }

          .land-premium .land-hero h1 {
            font-size: clamp(33px, 9vw, 42px);
            letter-spacing: -1.4px;
          }

          .land-premium .land-hero-actions {
            align-items: stretch;
          }

          .land-premium .land-hero-actions .btn {
            flex: 1 1 100%;
          }

          .land-premium .land-trust-points {
            display: grid;
            grid-template-columns: 1fr;
          }

          .land-premium .ix-dial-animated {
            padding: 18px;
            border-radius: 18px;
          }

          .land-premium .dial-heading h3 {
            font-size: 21px;
          }

          .land-premium .dial-shield {
            width: 41px;
            height: 41px;
            flex-basis: 41px;
          }

          .land-premium .dial-premium {
            align-items: flex-start;
            gap: 10px;
            padding: 15px;
          }

          .land-premium .dial-price {
            font-size: 27px;
          }

          .land-premium .dial-price-tag strong {
            font-size: 14px;
          }

          .land-premium .dial-plan-options {
            gap: 7px;
          }

          .land-premium .dial-plan-chip {
            padding: 9px;
            font-size: 11px;
          }

          .land-premium .plan-list {
            grid-template-columns: minmax(0, 1fr);
          }

          .land-premium .plan-line {
            padding: 20px;
          }

          .land-premium .land-plan-heading {
            flex-direction: row;
            align-items: flex-start;
          }

          .land-premium .land-plan-details {
            grid-template-columns: 1fr 1fr;
          }

          .land-premium .land-section-heading h2 {
            font-size: 29px;
            letter-spacing: -0.8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .land-premium *,
          .land-premium *::before,
          .land-premium *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

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
            onPlanChange={setPlan}
            showPlans
            lockedPlan={false}
          />
        )}
      </section>

      <section className="plans" aria-labelledby="plans-h">
        <div className="land-section-heading">
          <span className="land-eyebrow">
            EXPLORE YOUR OPTIONS
          </span>

          <h2 id="plans-h">
            Insurance plans for different needs
          </h2>

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
                onClick={() => selectPlan(p.key)}
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
          applicable purchase terms. Confirm the final premium
          before completing a purchase.
        </p>
      </section>

      <footer className="land-foot">
        InsureX — insurance management portal
      </footer>
    </div>
  )
}

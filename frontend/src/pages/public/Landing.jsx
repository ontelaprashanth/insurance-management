
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  Shield,
  ShieldCheck,
  Sparkles,
  Wallet,
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

const PLAN_ICONS = {
  Health: HeartPulse,
  Life: ShieldCheck,
  Motor: Shield,
  'Accident Insurance': ShieldCheck,
}

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

  const selectPlan = (nextPlanKey, scroll = true) => {
    const nextPlan = ACTIVE_PLANS.find(
      (item) => item.key === nextPlanKey,
    )

    if (!nextPlan) return

    setPlan(nextPlan.key)

    setVal((previous) => ({
      ...previous,
      coverage: nextPlan.coverage,
    }))

    if (scroll) {
      document
        .querySelector('.ix-dial-animated')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
    }
  }

  return (
    <div className="land land-premium">
      <style>{`
        .land-premium {
          --green: #087f5b;
          --green-dark: #07533d;
          --green-deep: #103e2e;
          --green-light: #e9f8ef;
          --ink: #18372a;
          --muted: #708077;
          --line: #e0ebe4;
          --surface: #ffffff;
          --page: #f6faf7;
          min-height: 100vh;
          overflow: hidden;
          color: var(--ink);
          background: var(--page);
          font-family: inherit;
        }

        .land-premium *,
        .land-premium *::before,
        .land-premium *::after {
          box-sizing: border-box;
        }

        .land-premium a {
          color: inherit;
          text-decoration: none;
        }

        .land-premium button,
        .land-premium input {
          font: inherit;
        }

        .land-premium button:focus-visible,
        .land-premium a:focus-visible,
        .land-premium input:focus-visible {
          outline: 3px solid rgba(8,127,91,.28);
          outline-offset: 4px;
        }

        .land-premium .land-container {
          width: min(1200px, calc(100% - 48px));
          margin-inline: auto;
        }

        .land-premium .land-nav {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          width: min(1200px, calc(100% - 48px));
          min-height: 78px;
          margin-inline: auto;
          border-bottom: 1px solid rgba(8,127,91,.11);
        }

        .land-premium .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--green-dark);
          font-size: 23px;
          font-weight: 900;
          letter-spacing: -.8px;
          transition: transform .22s ease;
        }

        .land-premium .brand:hover {
          transform: translateY(-2px);
        }

        .land-premium .brand svg {
          width: 35px;
          height: 35px;
        }

        .land-premium .land-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .land-premium .land-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 44px;
          padding: 11px 18px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: white;
          color: var(--ink);
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          cursor: pointer;
          transition:
            transform .22s ease,
            background .22s ease,
            border-color .22s ease,
            box-shadow .22s ease;
        }

        .land-premium .land-btn:hover {
          transform: translateY(-2px);
          border-color: #a8d5ba;
          box-shadow: 0 8px 22px rgba(20,75,48,.09);
        }

        .land-premium .land-btn-primary {
          border-color: var(--green);
          background: var(--green);
          color: white;
          box-shadow: 0 5px 15px rgba(8,127,91,.15);
        }

        .land-premium .land-btn-primary:hover {
          border-color: var(--green-dark);
          background: var(--green-dark);
          box-shadow: 0 10px 24px rgba(8,127,91,.22);
        }

        .land-premium .land-btn-dark {
          border-color: var(--green-dark);
          background: var(--green-dark);
          color: white;
        }

        .land-premium .land-btn-dark:hover {
          background: #043e2d;
        }

        .land-premium .land-hero {
          position: relative;
          isolation: isolate;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(380px, .88fr);
          align-items: center;
          gap: clamp(35px, 5.5vw, 76px);
          padding-top: 76px;
          padding-bottom: 85px;
        }

        .land-premium .land-hero::before {
          position: absolute;
          z-index: -1;
          top: -95px;
          left: -180px;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(61,180,119,.13),
            rgba(61,180,119,0) 70%
          );
          content: "";
          pointer-events: none;
          animation: landGlow 9s ease-in-out infinite alternate;
        }

        .land-premium .land-hero::after {
          position: absolute;
          z-index: -1;
          right: -210px;
          bottom: -150px;
          width: 470px;
          height: 470px;
          border: 1px solid rgba(8,127,91,.07);
          border-radius: 50%;
          box-shadow:
            0 0 0 40px rgba(8,127,91,.018),
            0 0 0 80px rgba(8,127,91,.014);
          content: "";
          pointer-events: none;
        }

        .land-premium .land-hero-content {
          min-width: 0;
          animation: landEnter .75s cubic-bezier(.2,.75,.25,1) both;
        }

        .land-premium .land-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 20px;
          color: var(--green);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
          line-height: 1.5;
        }

        .land-premium .land-eyebrow::before {
          width: 24px;
          height: 2px;
          border-radius: 5px;
          background: #31ad78;
          content: "";
        }

        .land-premium .land-hero h1 {
          max-width: 650px;
          margin: 0;
          color: #123c2b;
          font-size: clamp(39px, 4.7vw, 63px);
          font-weight: 900;
          letter-spacing: -2.8px;
          line-height: 1.08;
        }

        .land-premium .land-gradient-text {
          color: #087f5b;
          background: linear-gradient(100deg,#087f5b 5%,#20a56e 55%,#57b985);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .land-premium .land-lead {
          max-width: 570px;
          margin: 23px 0 26px;
          color: #6b7c72;
          font-size: 15px;
          line-height: 1.9;
        }

        .land-premium .land-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .land-premium .land-hero-actions .land-btn {
          min-height: 49px;
          padding: 13px 20px;
          font-size: 13px;
        }

        .land-premium .land-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 18px;
          margin-top: 29px;
        }

        .land-premium .land-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #536d5e;
          font-size: 11px;
          font-weight: 750;
        }

        .land-premium .land-trust-item svg {
          color: var(--green);
        }

        /* Calculator card */
        .land-premium .ix-dial-animated {
          position: relative;
          min-width: 0;
          padding: 27px;
          border: 1px solid rgba(8,127,91,.15);
          border-radius: 25px;
          background: rgba(255,255,255,.97);
          box-shadow:
            0 25px 75px rgba(20,72,46,.09),
            0 4px 12px rgba(20,72,46,.035);
          animation: landEnter .8s .12s cubic-bezier(.2,.75,.25,1) both;
          transition: box-shadow .3s ease, transform .3s ease;
        }

        .land-premium .ix-dial-animated:hover {
          box-shadow:
            0 30px 85px rgba(20,72,46,.12),
            0 4px 12px rgba(20,72,46,.035);
        }

        /* Plan picker becomes a vertical list */
        .land-premium .dial-plans {
          margin-bottom: 22px;
        }

        .land-premium .dial-plans > label,
        .land-premium .dial-label {
          display: block;
          margin-bottom: 10px;
          color: #4e6859;
          font-size: 12px;
          font-weight: 850;
        }

        .land-premium .dial-plan-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .land-premium .dial-plan-chip {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-width: 0;
          min-height: 58px;
          padding: 11px 13px;
          overflow: hidden;
          border: 1px solid #e4ece6;
          border-radius: 13px;
          background: #fff;
          color: #4d6457;
          font-size: 12px;
          font-weight: 800;
          text-align: left;
          cursor: pointer;
          transition:
            transform .2s ease,
            border-color .2s ease,
            background .2s ease,
            box-shadow .2s ease;
        }

        .land-premium .dial-plan-chip::before {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 3px;
          background: transparent;
          content: "";
          transition: background .2s ease;
        }

        .land-premium .dial-plan-chip:hover {
          transform: translateX(3px);
          border-color: #add9be;
          background: #f8fcf9;
        }

        .land-premium .dial-plan-chip.active {
          border-color: #72bb95;
          background: linear-gradient(105deg,#eaf8ef,#f8fcf9);
          color: #075c40;
          box-shadow: 0 4px 13px rgba(8,127,91,.07);
        }

        .land-premium .dial-plan-chip.active::before {
          background: #07845a;
        }

        .land-premium .dial-plan-chip > span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .land-premium .dial-plan-chip > span:last-child {
          flex-shrink: 0;
          color: #087f5b;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .land-premium .dial-plan-chip.active > span:last-child {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .land-premium .dial-plan-chip.active > span:last-child::after {
          display: inline-grid;
          width: 19px;
          height: 19px;
          place-items: center;
          border-radius: 50%;
          background: #087f5b;
          color: #fff;
          content: "✓";
          font-size: 11px;
        }

        .land-premium .dial-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 19px;
        }

        .land-premium .dial-heading {
          min-width: 0;
        }

        .land-premium .dial-heading h3 {
          margin: 0;
          color: #153d2c;
          font-size: 23px;
          font-weight: 900;
          letter-spacing: -.7px;
          line-height: 1.3;
        }

        .land-premium .dial-heading p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .land-premium .dial-eyebrow {
          display: block;
          margin-bottom: 7px;
          color: var(--green);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.7px;
        }

        .land-premium .dial-shield {
          display: grid;
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          place-items: center;
          border: 1px solid #d4eddf;
          border-radius: 15px;
          background: #edfaf2;
          color: var(--green);
        }

        .land-premium .dial-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 24px;
          padding: 19px;
          border: 1px solid #d6eee0;
          border-radius: 16px;
          background:
            radial-gradient(circle at 95% 5%,rgba(76,190,128,.18),transparent 45%),
            linear-gradient(135deg,#f0fbf4,#e6f7ed);
          animation: landPriceIn .35s ease both;
        }

        .land-premium .dial-premium .dial-label {
          margin-bottom: 7px;
          color: #547561;
        }

        .land-premium .dial-price {
          color: #075a40;
          font-size: clamp(26px,3vw,34px);
          font-weight: 950;
          letter-spacing: -1px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .land-premium .dial-price-caption {
          display: block;
          margin-top: 6px;
          color: #678272;
          font-size: 10px;
          line-height: 1.6;
        }

        .land-premium .dial-price-tag {
          display: flex;
          flex-shrink: 0;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
          color: #62816e;
          font-size: 10px;
        }

        .land-premium .dial-price-tag strong {
          color: #08734e;
          font-size: 15px;
          font-weight: 900;
        }

        .land-premium .dial-control {
          margin: 0 0 23px;
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
          color: #1b573c;
          font-size: 14px;
          font-weight: 900;
          text-align: right;
        }

        .land-premium .dial-range {
          display: block;
          width: 100%;
          height: 6px;
          margin: 13px 0;
          border-radius: 30px;
          accent-color: var(--green);
          cursor: pointer;
        }

        .land-premium .dial-range-labels {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #829087;
          font-size: 10px;
        }

        .land-premium .dial-breakdown {
          display: grid;
          gap: 12px;
          margin-top: 8px;
          padding-top: 18px;
          border-top: 1px solid #e7efe9;
        }

        .land-premium .dial-breakdown-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          color: #697c70;
          font-size: 12px;
        }

        .land-premium .dial-breakdown-row strong {
          color: #274537;
          font-size: 12px;
          font-weight: 850;
          text-align: right;
        }

        .land-premium .dial-breakdown-total {
          margin-top: 2px;
          padding-top: 14px;
          border-top: 1px dashed #dce9e0;
          color: #193e2c;
          font-weight: 900;
        }

        .land-premium .dial-breakdown-total strong {
          color: var(--green);
          font-size: 16px;
        }

        .land-premium .dial-disclaimer {
          margin: 17px 0 0;
          color: #819087;
          font-size: 10px;
          line-height: 1.75;
        }

        /* Plans section */
        .land-premium .plans {
          padding-top: 66px;
          padding-bottom: 78px;
          border-top: 1px solid #e3eee7;
        }

        .land-premium .land-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 30px;
        }

        .land-premium .land-section-copy {
          max-width: 680px;
        }

        .land-premium .land-section-heading h2 {
          margin: 0;
          color: #153d2c;
          font-size: clamp(28px,3.3vw,40px);
          font-weight: 900;
          letter-spacing: -1.3px;
          line-height: 1.2;
        }

        .land-premium .land-section-heading p {
          max-width: 640px;
          margin: 12px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .land-premium .land-section-icon {
          display: grid;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          place-items: center;
          border: 1px solid #d8ece0;
          border-radius: 17px;
          background: #ebf8f0;
          color: var(--green);
        }

        .land-premium .plan-list {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 17px;
        }

        .land-premium .plan-line {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 23px;
          overflow: hidden;
          border: 1px solid #e0ebe4;
          border-radius: 18px;
          background: white;
          box-shadow: 0 3px 13px rgba(20,67,46,.025);
          animation: landEnter .6s ease both;
          transition:
            transform .25s ease,
            border-color .25s ease,
            box-shadow .25s ease;
        }

        .land-premium .plan-line::after {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg,#087f5b,#69c58d);
          content: "";
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .3s ease;
        }

        .land-premium .plan-line:hover {
          transform: translateY(-5px);
          border-color: #b5d9c3;
          box-shadow: 0 18px 36px rgba(20,67,46,.08);
        }

        .land-premium .plan-line:hover::after {
          transform: scaleX(1);
        }

        .land-premium .land-plan-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .land-premium .land-plan-title {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          gap: 11px;
        }

        .land-premium .land-plan-icon {
          display: grid;
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          place-items: center;
          border: 1px solid #dcefe3;
          border-radius: 12px;
          background: #eff9f3;
          color: var(--green);
          transition: transform .25s ease;
        }

        .land-premium .plan-line:hover .land-plan-icon {
          transform: rotate(-5deg) scale(1.06);
        }

        .land-premium .land-plan-title > div {
          min-width: 0;
        }

        .land-premium .land-plan-heading b {
          display: block;
          color: #1b4431;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .land-premium .land-plan-code {
          display: inline-block;
          margin-top: 5px;
          color: #829087;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .5px;
          overflow-wrap: anywhere;
        }

        .land-premium .land-plan-type {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          padding: 6px 8px;
          border: 1px solid #dcefe3;
          border-radius: 20px;
          background: #f0f9f3;
          color: #14704c;
          font-size: 9px;
          font-weight: 900;
        }

        .land-premium .land-plan-description {
          min-height: 58px;
          margin: 17px 0;
          color: #718077;
          font-size: 11px;
          line-height: 1.8;
        }

        .land-premium .land-plan-details {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(0,1fr);
          gap: 10px;
          margin-top: auto;
          padding: 15px 0;
          border-top: 1px solid #edf2ee;
          border-bottom: 1px solid #edf2ee;
        }

        .land-premium .land-plan-details > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
          gap: 7px;
        }

        .land-premium .land-detail-label {
          color: #819087;
          font-size: 9px;
          line-height: 1.5;
        }

        .land-premium .land-plan-details strong {
          color: #204a35;
          font-size: 15px;
          font-weight: 900;
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
          color: #819087;
          font-size: 9px;
        }

        .land-premium .land-plan-select {
          width: 100%;
          justify-content: space-between;
          margin-top: 16px;
          padding: 11px 13px;
          border-color: #d9ecdf;
          background: #f2faf5;
          color: #08734e;
          font-size: 11px;
        }

        .land-premium .land-plan-select svg {
          transition: transform .2s ease;
        }

        .land-premium .land-plan-select:hover {
          border-color: #9dceb0;
          background: #e5f6eb;
        }

        .land-premium .land-plan-select:hover svg {
          transform: translateX(3px);
        }

        .land-premium .land-pricing-note {
          max-width: 900px;
          margin: 22px 0 0;
          color: #849188;
          font-size: 10px;
          line-height: 1.8;
        }

        .land-premium .land-foot {
          padding: 23px 16px;
          border-top: 1px solid #e0ebe4;
          background: #eef7f1;
          color: #687b6f;
          font-size: 11px;
          text-align: center;
        }

        @keyframes landEnter {
          from {
            opacity: 0;
            transform: translateY(17px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes landPriceIn {
          from {
            opacity: .65;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes landGlow {
          from { transform: translate3d(0,0,0) scale(1); }
          to { transform: translate3d(25px,15px,0) scale(1.08); }
        }

        @media (min-width: 761px) {
          .land-premium .plan-line:nth-child(3n + 2) {
            animation-delay: 70ms;
          }

          .land-premium .plan-line:nth-child(3n + 3) {
            animation-delay: 140ms;
          }
        }

        @media (max-width: 1000px) {
          .land-premium .land-hero {
            grid-template-columns: minmax(0,1fr) minmax(330px,.9fr);
            gap: 28px;
            padding-top: 57px;
          }

          .land-premium .land-hero h1 {
            font-size: clamp(36px,4.3vw,49px);
            letter-spacing: -1.8px;
          }

          .land-premium .ix-dial-animated {
            padding: 21px;
          }

          .land-premium .plan-list {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 760px) {
          .land-premium .land-container,
          .land-premium .land-nav {
            width: calc(100% - 32px);
          }

          .land-premium .land-nav {
            min-height: 70px;
          }

          .land-premium .brand {
            gap: 8px;
            font-size: 20px;
          }

          .land-premium .brand svg {
            width: 31px;
            height: 31px;
          }

          .land-premium .land-nav-actions {
            gap: 7px;
          }

          .land-premium .land-nav .land-btn {
            min-height: 39px;
            padding: 9px 11px;
            font-size: 11px;
          }

          .land-premium .land-hero {
            grid-template-columns: minmax(0,1fr);
            gap: 32px;
            padding-top: 45px;
            padding-bottom: 52px;
          }

          .land-premium .land-hero h1 {
            max-width: 570px;
            font-size: clamp(37px,8vw,52px);
            letter-spacing: -1.8px;
          }

          .land-premium .land-lead {
            margin: 18px 0 22px;
            font-size: 13px;
          }

          .land-premium .land-trust {
            gap: 11px 15px;
            margin-top: 22px;
          }

          .land-premium .ix-dial-animated {
            width: 100%;
            max-width: 570px;
            margin-inline: auto;
          }

          .land-premium .plans {
            padding-top: 48px;
            padding-bottom: 54px;
          }

          .land-premium .land-section-heading {
            align-items: flex-start;
          }

          .land-premium .plan-list {
            gap: 13px;
          }

          .land-premium .plan-line {
            padding: 18px;
          }
        }

        @media (max-width: 480px) {
          .land-premium .land-container,
          .land-premium .land-nav {
            width: calc(100% - 24px);
          }

          .land-premium .land-nav {
            min-height: 64px;
          }

          .land-premium .brand {
            font-size: 18px;
          }

          .land-premium .land-nav .land-btn {
            padding: 8px 9px;
            font-size: 10px;
          }

          .land-premium .land-hero {
            padding-top: 37px;
          }

          .land-premium .land-hero h1 {
            font-size: clamp(33px,9vw,42px);
            letter-spacing: -1.5px;
          }

          .land-premium .land-hero-actions {
            align-items: stretch;
          }

          .land-premium .land-hero-actions .land-btn {
            flex: 1 1 100%;
          }

          .land-premium .land-trust {
            display: grid;
            grid-template-columns: 1fr;
          }

          .land-premium .ix-dial-animated {
            padding: 17px;
            border-radius: 19px;
          }

          .land-premium .dial-heading h3 {
            font-size: 21px;
          }

          .land-premium .dial-shield {
            width: 41px;
            height: 41px;
            flex-basis: 41px;
          }

          .land-premium .dial-plan-chip {
            min-height: 54px;
            padding: 10px 11px;
            font-size: 11px;
          }

          .land-premium .dial-premium {
            padding: 15px;
          }

          .land-premium .dial-price {
            font-size: 26px;
          }

          .land-premium .dial-price-tag strong {
            font-size: 13px;
          }

          .land-premium .land-section-heading h2 {
            font-size: 29px;
            letter-spacing: -.9px;
          }

          .land-premium .land-section-icon {
            width: 43px;
            height: 43px;
            flex-basis: 43px;
          }

          .land-premium .plan-list {
            grid-template-columns: minmax(0,1fr);
          }

          .land-premium .plan-line {
            padding: 19px;
          }

          .land-premium .land-plan-description {
            min-height: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .land-premium *,
          .land-premium *::before,
          .land-premium *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <header className="land-nav">
        <Link to="/" className="brand" aria-label="InsureX home">
          <Logo />
          <span>InsureX</span>
        </Link>

        <div className="land-nav-actions">
          {user ? (
            <Link
              className="land-btn land-btn-dark"
              to={user.role === 'ADMIN' ? '/admin' : '/app'}
            >
              Open portal <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link className="land-btn" to="/login">
                Sign in
              </Link>

              <Link className="land-btn land-btn-dark" to="/register">
                Get started <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="land-container land-hero">
          <div className="land-hero-content">
            <span className="land-eyebrow">
              INSURANCE, MADE CLEAR
            </span>

            <h1>
              Protection for life.
              <br />
              Clarity for <span className="land-gradient-text">every decision.</span>
            </h1>

            <p className="land-lead">
              Explore insurance plans, customize your coverage,
              and estimate your premium before you purchase.
              Manage policies and track claims through one
              straightforward insurance platform.
            </p>

            <div className="land-hero-actions">
              <Link
                className="land-btn land-btn-primary"
                to={user ? (user.role === 'ADMIN' ? '/admin' : '/app') : '/register'}
              >
                {user ? 'Open your portal' : 'Explore InsureX'}
                <ArrowRight size={16} />
              </Link>

              <a className="land-btn" href="#plans">
                Explore plans <ArrowDown size={15} />
              </a>
            </div>

            <div className="land-trust">
              <span className="land-trust-item">
                <CheckCircle2 size={15} /> Transparent estimates
              </span>
              <span className="land-trust-item">
                <ShieldCheck size={15} /> Multiple plan options
              </span>
              <span className="land-trust-item">
                <Wallet size={15} /> Premium preview
              </span>
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

        <section
          className="land-container plans"
          id="plans"
          aria-labelledby="plans-h"
        >
          <div className="land-section-heading">
            <div className="land-section-copy">
              <span className="land-eyebrow">
                FIND YOUR COVER
              </span>

              <h2 id="plans-h">
                A plan for what matters to you.
              </h2>

              <p>
                Compare our available plans, review their listed
                coverage and annual premiums, then select a plan
                to customize your estimate.
              </p>
            </div>

            <div className="land-section-icon" aria-hidden="true">
              <Sparkles size={24} />
            </div>
          </div>

          <div className="plan-list">
            {ACTIVE_PLANS.map((p) => {
              const PlanIcon = PLAN_ICONS[p.type] || ShieldCheck

              return (
                <article className="plan-line" key={p.key}>
                  <div className="land-plan-heading">
                    <div className="land-plan-title">
                      <span className="land-plan-icon">
                        <PlanIcon size={19} />
                      </span>

                      <div>
                        <b>{p.label}</b>
                        <span className="land-plan-code">
                          {p.code}
                        </span>
                      </div>
                    </div>

                    <span className="land-plan-type">{p.type}</span>
                  </div>

                  <p className="land-plan-description">
                    {p.description || p.blurb || 'Explore this insurance plan and its available coverage.'}
                  </p>

                  <div className="land-plan-details">
                    <div>
                      <span className="land-detail-label">
                        Listed coverage
                      </span>

                      <strong>{inrShort(p.coverage)}</strong>
                    </div>

                    <div className="land-plan-price">
                      <span className="land-detail-label">
                        Annual premium
                      </span>

                      <strong>{inr(p.yearly)}</strong>
                      <span className="land-price-unit">/ year</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="land-btn land-plan-select"
                    onClick={() => selectPlan(p.key)}
                  >
                    <span>Calculate this plan</span>
                    <ChevronRight size={17} />
                  </button>
                </article>
              )
            })}
          </div>

          <p className="land-pricing-note">
            Premiums shown are the listed annual prices for the plans
            supplied to InsureX. Adjustable coverage values produce
            estimates based on the selected plan's listed premium.
            Final prices, eligibility, discounts, and benefits are
            subject to applicable policy terms and backend validation.
          </p>
        </section>
      </main>

      <footer className="land-foot">
        InsureX Insurance Platform · Clear coverage. Confident decisions.
      </footer>
    </div>
  )
}

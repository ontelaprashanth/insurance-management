import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import CoverageDial from '../../components/CoverageDial'
import Logo from '../../components/Logo'
import { PLANS } from '../../lib/premium'
import { inr, inrShort } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'

const ACTIVE_PLANS = PLANS.filter((plan) => plan.active !== false)

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Protection that matters',
    description:
      'Explore insurance options designed to help protect the people and things that matter to you.',
  },
  {
    icon: '⚡',
    title: 'A simpler experience',
    description:
      'Explore plans, manage policies, and follow your insurance activity from one place.',
  },
  {
    icon: '🔒',
    title: 'Your own secure space',
    description:
      'Access your account to manage your policies, purchases, claims, and notifications.',
  },
]

const STYLES = `
  .ix-landing {
    --ix-green: #047857;
    --ix-green-dark: #065f46;
    --ix-green-light: #d1fae5;
    --ix-text: #102a23;
    --ix-muted: #5b6f68;
    --ix-border: #dce9e3;
    min-height: 100vh;
    overflow: hidden;
    color: var(--ix-text);
    background: #f7fbf8;
    font-family: inherit;
  }

  .ix-landing * {
    box-sizing: border-box;
  }

  .ix-landing a {
    text-decoration: none;
  }

  .ix-landing button,
  .ix-landing a {
    -webkit-tap-highlight-color: transparent;
  }

  .ix-landing button:focus-visible,
  .ix-landing a:focus-visible {
    outline: 3px solid #34d399;
    outline-offset: 4px;
  }

  .ix-landing-nav {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding: 20px 32px;
  }

  .ix-landing-nav-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
  }

  .ix-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 11px 20px;
    border: 1px solid transparent;
    border-radius: 12px;
    font: inherit;
    font-size: 14px;
    font-weight: 750;
    cursor: pointer;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease,
      border-color 180ms ease;
  }

  .ix-btn:hover {
    transform: translateY(-2px);
  }

  .ix-btn-primary {
    color: #fff;
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 7px 18px rgb(4 120 87 / 17%);
  }

  .ix-btn-primary:hover {
    background: linear-gradient(135deg, #047857, #065f46);
    box-shadow: 0 10px 24px rgb(4 120 87 / 23%);
  }

  .ix-btn-outline {
    color: #065f46;
    background: #fff;
    border-color: #cfe1d8;
  }

  .ix-btn-outline:hover {
    background: #ecfdf5;
    border-color: #86c9ad;
  }

  .ix-btn-quiet {
    color: #065f46;
    background: #e9f8f0;
    border-color: #d1eadc;
  }

  .ix-hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
    align-items: center;
    gap: clamp(36px, 6vw, 76px);
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding: 76px 32px 88px;
  }

  .ix-hero::before {
    position: absolute;
    z-index: 0;
    top: 5%;
    right: -10%;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(110 231 183 / 22%), transparent 70%);
    content: '';
    pointer-events: none;
  }

  .ix-hero-copy,
  .ix-hero-visual {
    position: relative;
    z-index: 1;
    min-width: 0;
    animation: ix-rise-in 650ms ease both;
  }

  .ix-hero-visual {
    animation-delay: 120ms;
  }

  .ix-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid #cdebdc;
    border-radius: 999px;
    color: #047857;
    background: #ecfdf5;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .ix-eyebrow-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 4px rgb(16 185 129 / 12%);
  }

  .ix-hero h1 {
    max-width: 700px;
    margin: 22px 0 18px;
    color: #102a23;
    font-size: clamp(40px, 5.2vw, 68px);
    font-weight: 850;
    line-height: 1.08;
    letter-spacing: -0.055em;
  }

  .ix-hero h1 span {
    color: #047857;
  }

  .ix-hero-description {
    max-width: 590px;
    margin: 0;
    color: #526960;
    font-size: clamp(15px, 1.5vw, 18px);
    line-height: 1.85;
  }

  .ix-hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 30px;
  }

  .ix-hero-note {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px 18px;
    margin-top: 22px;
    color: #587067;
    font-size: 12px;
    font-weight: 650;
  }

  .ix-hero-note span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .ix-hero-note strong {
    color: #047857;
  }

  .ix-visual-card {
    position: relative;
    overflow: hidden;
    padding: clamp(22px, 3vw, 32px);
    border: 1px solid rgb(255 255 255 / 80%);
    border-radius: 28px;
    background: linear-gradient(145deg, #fff, #f0faf4);
    box-shadow:
      0 25px 70px rgb(16 42 35 / 10%),
      0 4px 14px rgb(16 42 35 / 4%);
    transition:
      transform 240ms ease,
      box-shadow 240ms ease;
  }

  .ix-visual-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 32px 80px rgb(16 42 35 / 14%);
  }

  .ix-visual-card::before {
    position: absolute;
    top: -80px;
    right: -70px;
    width: 210px;
    height: 210px;
    border-radius: 50%;
    background: rgb(167 243 208 / 30%);
    content: '';
    pointer-events: none;
  }

  .ix-visual-top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .ix-visual-label {
    color: #5a7167;
    font-size: 12px;
    font-weight: 750;
  }

  .ix-visual-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 999px;
    color: #047857;
    background: #dcfce7;
    font-size: 11px;
    font-weight: 800;
  }

  .ix-visual-shield {
    display: grid;
    place-items: center;
    width: 88px;
    height: 88px;
    margin: 30px auto 20px;
    border: 1px solid #c8eedb;
    border-radius: 26px;
    color: #047857;
    background: linear-gradient(145deg, #ecfdf5, #d1fae5);
    box-shadow: 0 12px 30px rgb(4 120 87 / 10%);
    font-size: 42px;
    animation: ix-shield-float 4s ease-in-out infinite;
  }

  .ix-visual-card h2 {
    position: relative;
    margin: 0;
    color: #17392e;
    font-size: 23px;
    font-weight: 850;
    text-align: center;
    letter-spacing: -0.03em;
  }

  .ix-visual-caption {
    position: relative;
    max-width: 300px;
    margin: 9px auto 24px;
    color: #60766d;
    font-size: 13px;
    line-height: 1.7;
    text-align: center;
  }

  .ix-visual-divider {
    height: 1px;
    margin: 0 0 18px;
    background: #dfede5;
  }

  .ix-visual-list {
    display: grid;
    gap: 13px;
  }

  .ix-visual-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e3efe8;
    border-radius: 14px;
    background: rgb(255 255 255 / 84%);
    transition:
      transform 180ms ease,
      border-color 180ms ease;
  }

  .ix-visual-item:hover {
    transform: translateX(3px);
    border-color: #9dd8b8;
  }

  .ix-visual-item-icon {
    display: grid;
    flex: 0 0 38px;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #ecfdf5;
    font-size: 18px;
  }

  .ix-visual-item-text {
    min-width: 0;
  }

  .ix-visual-item-text strong {
    display: block;
    color: #23463a;
    font-size: 13px;
    font-weight: 800;
  }

  .ix-visual-item-text small {
    display: block;
    margin-top: 3px;
    color: #71847b;
    font-size: 11px;
    line-height: 1.5;
  }

  .ix-section {
    padding: 72px 32px;
  }

  .ix-section-inner {
    width: 100%;
    max-width: 1176px;
    margin: 0 auto;
  }

  .ix-section-heading {
    max-width: 650px;
    margin: 0 auto 36px;
    text-align: center;
  }

  .ix-section-heading .ix-eyebrow {
    margin-bottom: 15px;
  }

  .ix-section-heading h2 {
    margin: 0;
    color: #15372c;
    font-size: clamp(28px, 3.4vw, 42px);
    font-weight: 850;
    line-height: 1.18;
    letter-spacing: -0.04em;
  }

  .ix-section-heading p {
    margin: 13px 0 0;
    color: #60766d;
    font-size: 15px;
    line-height: 1.8;
  }

  .ix-feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }

  .ix-feature-card {
    min-width: 0;
    padding: 25px;
    border: 1px solid #dfebe4;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 6px 24px rgb(16 42 35 / 3%);
    animation: ix-rise-in 650ms ease both;
    transition:
      transform 220ms ease,
      border-color 220ms ease,
      box-shadow 220ms ease;
  }

  .ix-feature-card:nth-child(2) {
    animation-delay: 90ms;
  }

  .ix-feature-card:nth-child(3) {
    animation-delay: 180ms;
  }

  .ix-feature-card:hover {
    transform: translateY(-5px);
    border-color: #addfc3;
    box-shadow: 0 18px 36px rgb(16 42 35 / 8%);
  }

  .ix-feature-icon {
    display: grid;
    place-items: center;
    width: 50px;
    height: 50px;
    margin-bottom: 20px;
    border: 1px solid #d3eee0;
    border-radius: 15px;
    background: #ecfdf5;
    font-size: 24px;
  }

  .ix-feature-card h3 {
    margin: 0 0 10px;
    color: #17392e;
    font-size: 17px;
    font-weight: 850;
  }

  .ix-feature-card p {
    margin: 0;
    color: #63796f;
    font-size: 13px;
    line-height: 1.8;
  }

  .ix-plan-section {
    background: linear-gradient(180deg, #edf8f1, #f7fbf8);
  }

  .ix-plan-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .ix-plan-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 23px;
    border: 1px solid #dcebe2;
    border-radius: 19px;
    background: #fff;
    box-shadow: 0 5px 20px rgb(16 42 35 / 3%);
    transition:
      transform 200ms ease,
      border-color 200ms ease,
      box-shadow 200ms ease;
  }

  .ix-plan-card:hover {
    transform: translateY(-4px);
    border-color: #a7d9bc;
    box-shadow: 0 16px 34px rgb(16 42 35 / 7%);
  }

  .ix-plan-tag {
    align-self: flex-start;
    padding: 6px 10px;
    border-radius: 999px;
    color: #047857;
    background: #ecfdf5;
    font-size: 11px;
    font-weight: 800;
  }

  .ix-plan-card h3 {
    margin: 15px 0 8px;
    color: #193b30;
    font-size: 18px;
    font-weight: 850;
  }

  .ix-plan-card p {
    flex: 1;
    margin: 0 0 18px;
    color: #64796f;
    font-size: 13px;
    line-height: 1.75;
  }

  .ix-plan-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid #e5efe9;
  }

  .ix-plan-footer small {
    display: block;
    margin-bottom: 4px;
    color: #71847b;
    font-size: 11px;
  }

  .ix-plan-footer strong {
    color: #047857;
    font-size: 16px;
    font-weight: 850;
  }

  .ix-plan-footer .ix-btn {
    flex: 0 0 auto;
    min-height: 38px;
    padding: 9px 12px;
    font-size: 12px;
  }

  .ix-cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: clamp(25px, 4vw, 42px);
    border: 1px solid #087c5b;
    border-radius: 24px;
    color: #fff;
    background: linear-gradient(125deg, #065f46, #047857 65%, #059669);
    box-shadow: 0 18px 45px rgb(4 120 87 / 15%);
  }

  .ix-cta h2 {
    margin: 0;
    font-size: clamp(23px, 3vw, 32px);
    font-weight: 850;
    line-height: 1.2;
    letter-spacing: -0.035em;
  }

  .ix-cta p {
    max-width: 590px;
    margin: 10px 0 0;
    color: #d4f5e5;
    font-size: 14px;
    line-height: 1.7;
  }

  .ix-cta .ix-btn {
    flex: 0 0 auto;
    color: #065f46;
    background: #fff;
  }

  .ix-cta .ix-btn:hover {
    background: #ecfdf5;
  }

  .ix-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding: 27px 32px;
    border-top: 1px solid #e0ebe4;
    color: #71847b;
    font-size: 12px;
  }

  .ix-footer-links {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
  }

  .ix-footer a {
    color: #42685a;
    font-weight: 700;
  }

  .ix-footer a:hover {
    color: #047857;
  }

  .ix-calculator-trigger {
    position: fixed;
    z-index: 20;
    right: 22px;
    bottom: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 49px;
    padding: 13px 19px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 999px;
    color: #fff;
    background: linear-gradient(135deg, #059669, #065f46);
    box-shadow: 0 10px 28px rgb(4 120 87 / 30%);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .ix-calculator-trigger:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 34px rgb(4 120 87 / 38%);
  }

  .ix-modal-backdrop {
    position: fixed;
    z-index: 100;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
    padding: 22px;
    background: rgb(8 27 21 / 67%);
    backdrop-filter: blur(7px);
    animation: ix-fade-in 180ms ease both;
  }

  .ix-modal {
    position: relative;
    width: 100%;
    max-width: 760px;
    max-height: min(90vh, 850px);
    overflow-y: auto;
    padding: clamp(20px, 4vw, 34px);
    border: 1px solid #d8e8df;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 30px 100px rgb(0 0 0 / 25%);
    animation: ix-modal-in 220ms ease both;
  }

  .ix-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
  }

  .ix-modal-header h2 {
    margin: 0;
    color: #15372c;
    font-size: clamp(23px, 4vw, 30px);
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  .ix-modal-header p {
    margin: 8px 0 0;
    color: #60766d;
    font-size: 13px;
    line-height: 1.7;
  }

  .ix-modal-close {
    display: grid;
    flex: 0 0 40px;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid #dce9e2;
    border-radius: 12px;
    color: #31594a;
    background: #f5faf7;
    font: inherit;
    font-size: 22px;
    cursor: pointer;
    transition:
      transform 180ms ease,
      background 180ms ease;
  }

  .ix-modal-close:hover {
    transform: rotate(5deg);
    background: #e8f8ef;
  }

  .ix-modal-content {
    min-width: 0;
  }

  @keyframes ix-rise-in {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes ix-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes ix-modal-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes ix-shield-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  @media (max-width: 900px) {
    .ix-hero {
      grid-template-columns: minmax(0, 1fr) minmax(270px, 0.8fr);
      gap: 30px;
      padding-top: 58px;
      padding-bottom: 68px;
    }

    .ix-hero h1 {
      font-size: clamp(38px, 5.5vw, 54px);
    }

    .ix-feature-grid,
    .ix-plan-grid {
      gap: 14px;
    }

    .ix-feature-card,
    .ix-plan-card {
      padding: 20px;
    }
  }

  @media (max-width: 700px) {
    .ix-landing-nav {
      padding: 16px 18px;
    }

    .ix-landing-nav-actions {
      gap: 8px;
    }

    .ix-landing-nav-actions .ix-btn {
      min-height: 40px;
      padding: 9px 12px;
      font-size: 12px;
    }

    .ix-hero {
      grid-template-columns: minmax(0, 1fr);
      gap: 38px;
      padding: 44px 20px 58px;
    }

    .ix-hero h1 {
      max-width: 580px;
      font-size: clamp(39px, 10vw, 56px);
    }

    .ix-hero-description {
      font-size: 15px;
    }

    .ix-hero-visual {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .ix-section {
      padding: 54px 20px;
    }

    .ix-feature-grid,
    .ix-plan-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
    }

    .ix-feature-card {
      padding: 22px;
    }

    .ix-feature-icon {
      margin-bottom: 15px;
    }

    .ix-cta {
      align-items: flex-start;
      flex-direction: column;
    }

    .ix-footer {
      padding: 24px 20px;
    }

    .ix-calculator-trigger {
      right: 14px;
      bottom: 14px;
      min-height: 46px;
      padding: 12px 15px;
      font-size: 12px;
    }

    .ix-modal-backdrop {
      align-items: flex-start;
      padding: 12px;
    }

    .ix-modal {
      margin: auto 0;
      max-height: calc(100dvh - 24px);
      padding: 20px;
      border-radius: 19px;
    }
  }

  @media (max-width: 420px) {
    .ix-landing-nav {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }

    .ix-landing-nav-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .ix-hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .ix-hero-actions .ix-btn {
      width: 100%;
    }

    .ix-hero-note {
      gap: 9px 12px;
    }

    .ix-plan-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .ix-plan-footer .ix-btn {
      width: 100%;
    }

    .ix-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ix-landing *,
    .ix-landing *::before,
    .ix-landing *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`

function getPlanName(plan) {
  return (
    plan?.name ||
    plan?.planName ||
    plan?.policyName ||
    plan?.policyType ||
    'Insurance Plan'
  )
}

function getPlanDescription(plan) {
  return (
    plan?.description ||
    plan?.details ||
    plan?.coverageDescription ||
    'Explore this plan and review its coverage options.'
  )
}

function getPlanPremium(plan) {
  const candidates = [
    plan?.annualPremium,
    plan?.premiumAmount,
    plan?.premium,
    plan?.basePremium,
    plan?.price,
  ]

  return candidates.find(
    (value) => value !== undefined && value !== null && Number.isFinite(Number(value)),
  )
}

export default function Landing() {
  const { user } = useAuth()
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [coverage, setCoverage] = useState(1000000)
  const [years, setYears] = useState(1)
  const modalRef = useRef(null)

  const plans = useMemo(() => ACTIVE_PLANS.slice(0, 3), [])

  const chosenPlan = useMemo(
    () => ACTIVE_PLANS.find((plan) => {
      const identifier = plan?.id ?? plan?.policyNumber ?? plan?.planId ?? plan?.name
      return String(identifier) === String(selectedPlan)
    }) || ACTIVE_PLANS[0],
    [selectedPlan],
  )

  const planIdentifier = chosenPlan
    ? String(
        chosenPlan.id ??
        chosenPlan.policyNumber ??
        chosenPlan.planId ??
        chosenPlan.name ??
        '',
      )
    : ''

  const openCalculator = () => {
    setCalculatorOpen(true)
  }

  const closeCalculator = () => {
    setCalculatorOpen(false)
  }

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      closeCalculator()
    }
  }

  return (
    <main className="ix-landing">
      <style>{STYLES}</style>

      <header className="ix-landing-nav">
        <Link
          to={user ? (user.role === 'ADMIN' ? '/admin' : '/app') : '/'}
          aria-label="InsureX home"
        >
          <Logo />
        </Link>

        <nav className="ix-landing-nav-actions" aria-label="Main navigation">
          {user ? (
            <Link
              to={user.role === 'ADMIN' ? '/admin' : '/app'}
              className="ix-btn ix-btn-primary"
            >
              Go to Dashboard <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="ix-btn ix-btn-outline">
                Sign In
              </Link>
              <Link to="/register" className="ix-btn ix-btn-primary">
                Get Started <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="ix-hero">
        <div className="ix-hero-copy">
          <div className="ix-eyebrow">
            <span className="ix-eyebrow-dot" />
            Insurance made simpler
          </div>

          <h1>
            Protect what matters.
            <br />
            <span>Plan with confidence.</span>
          </h1>

          <p className="ix-hero-description">
            Explore insurance plans, estimate your coverage, and manage your
            insurance journey through one convenient platform. A clearer way
            to take the next step toward financial protection.
          </p>

          <div className="ix-hero-actions">
            {user ? (
              <Link
                to={user.role === 'ADMIN' ? '/admin' : '/app'}
                className="ix-btn ix-btn-primary"
              >
                Open Dashboard <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <>
                <Link to="/register" className="ix-btn ix-btn-primary">
                  Get Started <span aria-hidden="true">→</span>
                </Link>
                <Link to="/login" className="ix-btn ix-btn-outline">
                  Sign In to Your Account
                </Link>
              </>
            )}
          </div>

          <div className="ix-hero-note">
            <span><strong>✓</strong> Explore available plans</span>
            <span><strong>✓</strong> Estimate your coverage</span>
            <span><strong>✓</strong> Manage in one place</span>
          </div>
        </div>

        <div className="ix-hero-visual">
          <div className="ix-visual-card">
            <div className="ix-visual-top">
              <span className="ix-visual-label">YOUR INSURANCE JOURNEY</span>
              <span className="ix-visual-status">
                <span aria-hidden="true">●</span> InsureX
              </span>
            </div>

            <div className="ix-visual-shield" aria-hidden="true">
              🛡️
            </div>

            <h2>Confidence starts here</h2>
            <p className="ix-visual-caption">
              A convenient place to explore plans and keep track of your
              insurance information.
            </p>

            <div className="ix-visual-divider" />

            <div className="ix-visual-list">
              <div className="ix-visual-item">
                <div className="ix-visual-item-icon" aria-hidden="true">📋</div>
                <div className="ix-visual-item-text">
                  <strong>Explore insurance plans</strong>
                  <small>Review available options and coverage details.</small>
                </div>
              </div>

              <div className="ix-visual-item">
                <div className="ix-visual-item-icon" aria-hidden="true">📈</div>
                <div className="ix-visual-item-text">
                  <strong>Estimate your premium</strong>
                  <small>Use the calculator to explore an estimate.</small>
                </div>
              </div>

              <div className="ix-visual-item">
                <div className="ix-visual-item-icon" aria-hidden="true">🔐</div>
                <div className="ix-visual-item-text">
                  <strong>Manage your account</strong>
                  <small>Access your insurance activity after signing in.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ix-section">
        <div className="ix-section-inner">
          <div className="ix-section-heading">
            <div className="ix-eyebrow">Built around your needs</div>
            <h2>A more convenient way to manage insurance</h2>
            <p>
              Find the information you need, explore your options, and keep
              your insurance activity organized in one place.
            </p>
          </div>

          <div className="ix-feature-grid">
            {FEATURES.map((feature) => (
              <article className="ix-feature-card" key={feature.title}>
                <div className="ix-feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {plans.length > 0 && (
        <section className="ix-section ix-plan-section">
          <div className="ix-section-inner">
            <div className="ix-section-heading">
              <div className="ix-eyebrow">Explore your options</div>
              <h2>Find a plan that fits your needs</h2>
              <p>
                Start by exploring the available insurance plans. Sign in to
                review the full details and continue with your selected plan.
              </p>
            </div>

            <div className="ix-plan-grid">
              {plans.map((plan, index) => {
                const planName = getPlanName(plan)
                const premium = getPlanPremium(plan)

                return (
                  <article className="ix-plan-card" key={String(
                    plan.id ?? plan.policyNumber ?? plan.planId ?? plan.name ?? index,
                  )}>
                    <span className="ix-plan-tag">
                      {index === 0 ? 'Explore coverage' : 'Available plan'}
                    </span>

                    <h3>{planName}</h3>
                    <p>{getPlanDescription(plan)}</p>

                    <div className="ix-plan-footer">
                      <div>
                        <small>Indicative annual premium</small>
                        <strong>
                          {premium !== undefined
                            ? inr(Number(premium))
                            : 'View plan details'}
                        </strong>
                      </div>

                      <Link
                        to={user ? '/app/plans' : '/login'}
                        className="ix-btn ix-btn-quiet"
                      >
                        Explore <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="ix-section">
        <div className="ix-section-inner">
          <div className="ix-cta">
            <div>
              <h2>Ready to take the next step?</h2>
              <p>
                Create an account to explore plans and manage your insurance
                activity, or sign in to continue where you left off.
              </p>
            </div>

            {user ? (
              <Link
                to={user.role === 'ADMIN' ? '/admin' : '/app'}
                className="ix-btn"
              >
                Go to Dashboard <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link to="/register" className="ix-btn">
                Create Your Account <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="ix-footer">
        <span>© {new Date().getFullYear()} InsureX Insurance Platform</span>
        <div className="ix-footer-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register">Get Started</Link>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
      </footer>

      <button
        type="button"
        className="ix-calculator-trigger"
        onClick={openCalculator}
        aria-haspopup="dialog"
        aria-expanded={calculatorOpen}
      >
        <span aria-hidden="true">⌁</span>
        Open Insurance Calculator
      </button>

      {calculatorOpen && (
        <div
          className="ix-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCalculator()
            }
          }}
          onKeyDown={handleModalKeyDown}
        >
          <section
            ref={modalRef}
            className="ix-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ix-calculator-title"
          >
            <div className="ix-modal-header">
              <div>
                <h2 id="ix-calculator-title">Insurance Calculator</h2>
                <p>
                  Adjust your coverage and plan to explore an estimated premium.
                  Final premiums depend on the selected policy terms.
                </p>
              </div>

              <button
                type="button"
                className="ix-modal-close"
                onClick={closeCalculator}
                aria-label="Close insurance calculator"
              >
                ×
              </button>
            </div>

            <div className="ix-modal-content">
              {ACTIVE_PLANS.length > 0 ? (
                <CoverageDial
                  value={coverage}
                  onChange={setCoverage}
                  planKey={planIdentifier}
                  onPlanChange={setSelectedPlan}
                  showPlans
                  lockedPlan={false}
                  planLabel={chosenPlan ? getPlanName(chosenPlan) : undefined}
                  coverageMin={100000}
                  coverageMax={10000000}
                  coverageStep={100000}
                  durationMax={5}
                />
              ) : (
                <p>
                  No active insurance plans are available for calculation at
                  the moment. Please check again later.
                </p>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 20,
              }}>
                <button
                  type="button"
                  className="ix-btn ix-btn-outline"
                  onClick={closeCalculator}
                >
                  Close
                </button>
                <Link
                  to={user ? '/app/plans' : '/register'}
                  className="ix-btn ix-btn-primary"
                  onClick={closeCalculator}
                >
                  {user ? 'View Plans' : 'Get Started'}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

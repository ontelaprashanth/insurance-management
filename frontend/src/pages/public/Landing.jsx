import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import CoverageDial from '../../components/CoverageDial'
import Logo from '../../components/Logo'
import { PLANS } from '../../lib/premium'
import { inr } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'

const ACTIVE_PLANS = PLANS.filter((plan) => plan.active !== false)

const STORIES = [
  {
    id: 'hospital',
    eyebrow: 'HEALTH PROTECTION',
    title: 'Care when it matters most.',
    description:
      'Explore health coverage options and keep your policy information organized.',
    src: '/videos/hospital-care.mp4',
    icon: '✚',
    link: 'https://www.pexels.com/search/videos/doctor%20and%20patient/',
    linkLabel: 'Find hospital footage',
  },
  {
    id: 'accident',
    eyebrow: 'ROAD PROTECTION',
    title: 'Support through the unexpected.',
    description:
      'Discover available insurance options to help you prepare for unexpected events.',
    src: '/videos/road-accident.mp4',
    icon: '🚘',
    link: 'https://mixkit.co/free-stock-video/car-accident/',
    linkLabel: 'Find accident footage',
  },
  {
    id: 'family',
    eyebrow: 'FAMILY PROTECTION',
    title: 'Protect the life you are building.',
    description:
      'Explore coverage options with your family’s future and peace of mind in focus.',
    src: '/videos/family-protection.mp4',
    icon: '♡',
    link: 'https://mixkit.co/free-stock-video/insurance/',
    linkLabel: 'Find protection footage',
  },
]

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Explore protection',
    description:
      'Review available insurance plans and explore coverage options in one place.',
  },
  {
    icon: '📊',
    title: 'Estimate your premium',
    description:
      'Use the insurance calculator to explore estimated premiums based on your selections.',
  },
  {
    icon: '🔐',
    title: 'Manage your account',
    description:
      'Sign in to manage policies, purchases, claims, reviews, and notifications.',
  },
]

const STYLES = `
  .ix-landing {
    --ix-green: #047857;
    --ix-dark: #064e3b;
    --ix-text: #142f26;
    --ix-muted: #62766d;
    --ix-border: #dce9e2;
    min-height: 100vh;
    overflow: hidden;
    color: var(--ix-text);
    background: #f7fbf8;
    font-family: inherit;
  }

  .ix-landing *,
  .ix-landing *::before,
  .ix-landing *::after {
    box-sizing: border-box;
  }

  .ix-landing a {
    text-decoration: none;
  }

  .ix-landing a:focus-visible,
  .ix-landing button:focus-visible {
    outline: 3px solid #34d399;
    outline-offset: 4px;
  }

  .ix-nav {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    max-width: 1240px;
    margin: auto;
    padding: 19px 30px;
  }

  .ix-nav-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ix-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 11px 19px;
    border: 1px solid transparent;
    border-radius: 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease,
      background .2s ease, border-color .2s ease;
  }

  .ix-btn:hover {
    transform: translateY(-2px);
  }

  .ix-btn-primary {
    color: white;
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 7px 20px rgb(4 120 87 / 18%);
  }

  .ix-btn-primary:hover {
    background: linear-gradient(135deg, #047857, #065f46);
    box-shadow: 0 11px 26px rgb(4 120 87 / 25%);
  }

  .ix-btn-outline {
    color: #065f46;
    border-color: #cfe1d7;
    background: white;
  }

  .ix-btn-outline:hover {
    background: #ecfdf5;
    border-color: #9bd6b6;
  }

  .ix-btn-soft {
    color: #047857;
    border-color: #d6eadf;
    background: #effaf3;
  }

  .ix-hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.12fr) minmax(300px, .88fr);
    align-items: center;
    gap: clamp(32px, 5vw, 70px);
    max-width: 1240px;
    margin: auto;
    padding: 67px 30px 82px;
  }

  .ix-hero::before {
    position: absolute;
    top: -20px;
    right: -130px;
    width: 520px;
    height: 520px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(110 231 183 / 24%), transparent 70%);
    content: '';
    pointer-events: none;
  }

  .ix-hero-copy,
  .ix-hero-visual {
    position: relative;
    z-index: 1;
    min-width: 0;
    animation: ix-enter .7s ease both;
  }

  .ix-hero-visual {
    animation-delay: .12s;
  }

  .ix-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: 1px solid #ccebd9;
    border-radius: 999px;
    color: #047857;
    background: #ecfdf5;
    font-size: 11px;
    font-weight: 850;
    letter-spacing: .08em;
  }

  .ix-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 4px rgb(16 185 129 / 12%);
  }

  .ix-hero h1 {
    margin: 22px 0 18px;
    color: #122e24;
    font-size: clamp(40px, 5.3vw, 67px);
    font-weight: 900;
    line-height: 1.07;
    letter-spacing: -.055em;
  }

  .ix-hero h1 span {
    color: #047857;
  }

  .ix-hero-copy > p {
    max-width: 600px;
    margin: 0;
    color: #596f65;
    font-size: 16px;
    line-height: 1.85;
  }

  .ix-hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }

  .ix-trust-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: 22px;
    color: #60766b;
    font-size: 12px;
    font-weight: 700;
  }

  .ix-trust-row strong {
    color: #047857;
  }

  .ix-hero-visual {
    position: relative;
    min-height: 420px;
  }

  .ix-hero-video {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border: 5px solid white;
    border-radius: 30px;
    background: linear-gradient(145deg, #d1fae5, #14532d);
    box-shadow: 0 28px 75px rgb(16 42 35 / 18%);
  }

  .ix-hero-video video {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 410px;
    object-fit: cover;
  }

  .ix-hero-video::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgb(2 24 17 / 5%) 35%, rgb(2 24 17 / 75%) 100%);
    content: '';
    pointer-events: none;
  }

  .ix-hero-video-caption {
    position: absolute;
    z-index: 1;
    right: 23px;
    bottom: 23px;
    left: 23px;
    color: white;
  }

  .ix-hero-video-caption span {
    display: inline-flex;
    padding: 7px 10px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 999px;
    background: rgb(4 78 59 / 72%);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: .08em;
  }

  .ix-hero-video-caption h2 {
    margin: 12px 0 7px;
    font-size: clamp(22px, 3vw, 30px);
    font-weight: 850;
    letter-spacing: -.03em;
  }

  .ix-hero-video-caption p {
    max-width: 360px;
    margin: 0;
    color: #e1f7eb;
    font-size: 13px;
    line-height: 1.7;
  }

  .ix-floating-note {
    position: absolute;
    z-index: 2;
    top: 24px;
    left: -25px;
    display: flex;
    align-items: center;
    gap: 11px;
    max-width: 225px;
    padding: 13px 16px;
    border: 1px solid rgb(255 255 255 / 80%);
    border-radius: 15px;
    background: rgb(255 255 255 / 94%);
    box-shadow: 0 12px 35px rgb(16 42 35 / 14%);
    animation: ix-float 4s ease-in-out infinite;
  }

  .ix-floating-note-icon {
    display: grid;
    flex: 0 0 37px;
    place-items: center;
    width: 37px;
    height: 37px;
    border-radius: 12px;
    color: #047857;
    background: #d1fae5;
    font-size: 18px;
  }

  .ix-floating-note strong {
    display: block;
    color: #153b2d;
    font-size: 12px;
  }

  .ix-floating-note small {
    display: block;
    margin-top: 4px;
    color: #687e73;
    font-size: 10px;
  }

  .ix-section {
    padding: 72px 30px;
  }

  .ix-inner {
    max-width: 1180px;
    margin: auto;
  }

  .ix-heading {
    max-width: 680px;
    margin: 0 auto 36px;
    text-align: center;
  }

  .ix-heading .ix-eyebrow {
    margin-bottom: 15px;
  }

  .ix-heading h2 {
    margin: 0;
    color: #15372b;
    font-size: clamp(29px, 3.5vw, 42px);
    font-weight: 900;
    line-height: 1.17;
    letter-spacing: -.045em;
  }

  .ix-heading p {
    margin: 13px 0 0;
    color: #62776c;
    font-size: 14px;
    line-height: 1.8;
  }

  .ix-video-section {
    background: linear-gradient(180deg, #edf8f1, #f7fbf8);
  }

  .ix-story-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }

  .ix-story-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #dce9e2;
    border-radius: 20px;
    background: white;
    box-shadow: 0 7px 24px rgb(16 42 35 / 4%);
    animation: ix-enter .65s ease both;
    transition: transform .23s ease, box-shadow .23s ease, border-color .23s ease;
  }

  .ix-story-card:nth-child(2) {
    animation-delay: .09s;
  }

  .ix-story-card:nth-child(3) {
    animation-delay: .18s;
  }

  .ix-story-card:hover {
    transform: translateY(-6px);
    border-color: #9fd7b8;
    box-shadow: 0 20px 42px rgb(16 42 35 / 10%);
  }

  .ix-story-media {
    position: relative;
    height: 225px;
    overflow: hidden;
    background: linear-gradient(135deg, #d1fae5, #14532d);
  }

  .ix-story-media video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .65s ease;
  }

  .ix-story-card:hover .ix-story-media video {
    transform: scale(1.045);
  }

  .ix-story-media::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgb(2 24 17 / 4%), rgb(2 24 17 / 45%));
    content: '';
    pointer-events: none;
  }

  .ix-story-icon {
    position: absolute;
    z-index: 1;
    top: 15px;
    left: 15px;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid rgb(255 255 255 / 50%);
    border-radius: 14px;
    color: white;
    background: rgb(4 78 59 / 78%);
    font-size: 21px;
    backdrop-filter: blur(8px);
  }

  .ix-video-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    color: white;
    text-align: center;
    background:
      radial-gradient(circle at 75% 15%, rgb(167 243 208 / 28%), transparent 35%),
      linear-gradient(135deg, #065f46, #047857 55%, #064e3b);
  }

  .ix-video-fallback-symbol {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    border: 1px solid rgb(255 255 255 / 28%);
    border-radius: 18px;
    background: rgb(255 255 255 / 12%);
    font-size: 26px;
  }

  .ix-video-fallback strong {
    font-size: 14px;
  }

  .ix-video-fallback a {
    color: #d1fae5;
    font-size: 11px;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .ix-story-content {
    padding: 21px;
  }

  .ix-story-eyebrow {
    color: #047857;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .09em;
  }

  .ix-story-content h3 {
    margin: 10px 0 9px;
    color: #17382d;
    font-size: 19px;
    font-weight: 850;
    letter-spacing: -.025em;
  }

  .ix-story-content p {
    min-height: 66px;
    margin: 0;
    color: #64796f;
    font-size: 12px;
    line-height: 1.8;
  }

  .ix-story-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 17px;
    padding-top: 15px;
    border-top: 1px solid #e5eee8;
    color: #047857;
    font-size: 11px;
    font-weight: 800;
  }

  .ix-story-bottom span {
    color: #75877e;
    font-weight: 650;
  }

  .ix-feature-grid,
  .ix-plan-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .ix-feature-card,
  .ix-plan-card {
    min-width: 0;
    padding: 24px;
    border: 1px solid #deebe3;
    border-radius: 19px;
    background: white;
    box-shadow: 0 6px 24px rgb(16 42 35 / 3%);
    transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
    animation: ix-enter .65s ease both;
  }

  .ix-feature-card:hover,
  .ix-plan-card:hover {
    transform: translateY(-4px);
    border-color: #a8dcbf;
    box-shadow: 0 17px 36px rgb(16 42 35 / 8%);
  }

  .ix-feature-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    margin-bottom: 18px;
    border: 1px solid #d4eee0;
    border-radius: 15px;
    background: #ecfdf5;
    font-size: 23px;
  }

  .ix-feature-card h3,
  .ix-plan-card h3 {
    margin: 0 0 10px;
    color: #17392e;
    font-size: 17px;
    font-weight: 850;
  }

  .ix-feature-card p,
  .ix-plan-card p {
    margin: 0;
    color: #63796f;
    font-size: 12px;
    line-height: 1.8;
  }

  .ix-plan-section {
    background: #eef8f2;
  }

  .ix-plan-card {
    display: flex;
    flex-direction: column;
  }

  .ix-plan-tag {
    align-self: flex-start;
    margin-bottom: 15px;
    padding: 6px 9px;
    border-radius: 999px;
    color: #047857;
    background: #ecfdf5;
    font-size: 10px;
    font-weight: 850;
  }

  .ix-plan-card p {
    flex: 1;
    margin-bottom: 19px;
  }

  .ix-plan-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 15px;
    border-top: 1px solid #e5eee8;
  }

  .ix-plan-footer small {
    display: block;
    margin-bottom: 4px;
    color: #71847a;
    font-size: 10px;
  }

  .ix-plan-footer strong {
    color: #047857;
    font-size: 15px;
    font-weight: 900;
  }

  .ix-plan-footer .ix-btn {
    min-height: 38px;
    padding: 9px 12px;
    font-size: 11px;
  }

  .ix-cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: clamp(25px, 4vw, 42px);
    border: 1px solid #087c5b;
    border-radius: 24px;
    color: white;
    background: linear-gradient(125deg, #064e3b, #047857 68%, #059669);
    box-shadow: 0 18px 45px rgb(4 120 87 / 15%);
  }

  .ix-cta h2 {
    margin: 0;
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 900;
    letter-spacing: -.035em;
  }

  .ix-cta p {
    max-width: 580px;
    margin: 10px 0 0;
    color: #d4f5e5;
    font-size: 13px;
    line-height: 1.8;
  }

  .ix-cta .ix-btn {
    flex-shrink: 0;
    color: #065f46;
    background: white;
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
    max-width: 1240px;
    margin: auto;
    padding: 25px 30px;
    border-top: 1px solid #e0ebe4;
    color: #71847b;
    font-size: 11px;
  }

  .ix-footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 17px;
  }

  .ix-footer a {
    color: #42685a;
    font-weight: 750;
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
    padding: 13px 18px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 999px;
    color: white;
    background: linear-gradient(135deg, #059669, #065f46);
    box-shadow: 0 10px 28px rgb(4 120 87 / 30%);
    font: inherit;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease;
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
    padding: 20px;
    background: rgb(8 27 21 / 68%);
    backdrop-filter: blur(7px);
    animation: ix-fade .18s ease both;
  }

  .ix-modal {
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    overflow-y: auto;
    padding: clamp(20px, 4vw, 34px);
    border: 1px solid #d8e8df;
    border-radius: 24px;
    background: white;
    box-shadow: 0 30px 100px rgb(0 0 0 / 25%);
    animation: ix-modal-in .22s ease both;
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
    font-weight: 900;
    letter-spacing: -.04em;
  }

  .ix-modal-header p {
    margin: 8px 0 0;
    color: #60766d;
    font-size: 12px;
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
  }

  .ix-modal-close:hover {
    background: #e8f8ef;
  }

  @keyframes ix-enter {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ix-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes ix-modal-in {
    from { opacity: 0; transform: translateY(12px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes ix-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  @media (max-width: 900px) {
    .ix-hero {
      grid-template-columns: minmax(0, 1fr) minmax(270px, .9fr);
      gap: 28px;
      padding-top: 55px;
    }

    .ix-hero-visual {
      min-height: 370px;
    }

    .ix-hero-video video {
      min-height: 360px;
    }

    .ix-story-grid,
    .ix-feature-grid,
    .ix-plan-grid {
      gap: 13px;
    }

    .ix-story-content,
    .ix-feature-card,
    .ix-plan-card {
      padding: 18px;
    }

    .ix-story-media {
      height: 190px;
    }
  }

  @media (max-width: 700px) {
    .ix-nav {
      padding: 15px 18px;
    }

    .ix-nav-actions {
      gap: 7px;
    }

    .ix-nav-actions .ix-btn {
      min-height: 39px;
      padding: 9px 12px;
      font-size: 11px;
    }

    .ix-hero {
      grid-template-columns: minmax(0, 1fr);
      gap: 36px;
      padding: 40px 20px 55px;
    }

    .ix-hero h1 {
      font-size: clamp(39px, 10vw, 56px);
    }

    .ix-hero-copy > p {
      font-size: 14px;
    }

    .ix-hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .ix-hero-actions .ix-btn {
      width: 100%;
    }

    .ix-hero-visual {
      min-height: 400px;
      margin: 0 5px;
    }

    .ix-hero-video video {
      min-height: 390px;
    }

    .ix-floating-note {
      left: -8px;
    }

    .ix-section {
      padding: 52px 20px;
    }

    .ix-story-grid,
    .ix-feature-grid,
    .ix-plan-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }

    .ix-story-media {
      height: 240px;
    }

    .ix-story-content p {
      min-height: auto;
    }

    .ix-cta {
      align-items: flex-start;
      flex-direction: column;
    }

    .ix-footer {
      padding: 23px 20px;
    }

    .ix-calculator-trigger {
      right: 14px;
      bottom: 14px;
      min-height: 45px;
      padding: 11px 14px;
      font-size: 11px;
    }

    .ix-modal-backdrop {
      align-items: flex-start;
      padding: 12px;
    }

    .ix-modal {
      max-height: calc(100dvh - 24px);
      margin: auto 0;
      padding: 20px;
      border-radius: 19px;
    }
  }

  @media (max-width: 420px) {
    .ix-nav {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }

    .ix-nav-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .ix-hero-visual {
      min-height: 350px;
    }

    .ix-hero-video video {
      min-height: 340px;
    }

    .ix-hero-video-caption {
      right: 15px;
      bottom: 16px;
      left: 15px;
    }

    .ix-hero-video-caption h2 {
      font-size: 22px;
    }

    .ix-floating-note {
      top: 14px;
      padding: 10px;
    }

    .ix-story-media {
      height: 210px;
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
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
  }
`

function planName(plan) {
  return (
    plan?.name ||
    plan?.planName ||
    plan?.policyName ||
    plan?.policyType ||
    'Insurance Plan'
  )
}

function planDescription(plan) {
  return (
    plan?.description ||
    plan?.details ||
    plan?.coverageDescription ||
    'Explore this plan and review its coverage options.'
  )
}

function planPremium(plan) {
  const candidates = [
    plan?.annualPremium,
    plan?.premiumAmount,
    plan?.premium,
    plan?.basePremium,
    plan?.price,
  ]

  return candidates.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      Number.isFinite(Number(value)),
  )
}

function VideoStory({ story }) {
  const [videoFailed, setVideoFailed] = useState(false)

  return (
    <article className="ix-story-card">
      <div className="ix-story-media">
        {!videoFailed && (
          <video
            src={story.src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={story.title}
            onError={() => setVideoFailed(true)}
          />
        )}

        {videoFailed && (
          <div className="ix-video-fallback">
            <div className="ix-video-fallback-symbol" aria-hidden="true">
              {story.icon}
            </div>
            <strong>Video clip not added yet</strong>
            <a href={story.link} target="_blank" rel="noreferrer">
              {story.linkLabel} ↗
            </a>
          </div>
        )}

        <div className="ix-story-icon" aria-hidden="true">
          {story.icon}
        </div>
      </div>

      <div className="ix-story-content">
        <div className="ix-story-eyebrow">{story.eyebrow}</div>
        <h3>{story.title}</h3>
        <p>{story.description}</p>
        <div className="ix-story-bottom">
          <span>INSUREX PROTECTION</span>
          <span aria-hidden="true">●</span>
        </div>
      </div>
    </article>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

  const chosenPlan = useMemo(
    () =>
      ACTIVE_PLANS.find((plan) => {
        const id =
          plan?.id ??
          plan?.policyNumber ??
          plan?.planId ??
          plan?.name

        return String(id) === String(selectedPlan)
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

  const dashboardPath =
    user?.role === 'ADMIN' ? '/admin' : '/app'

  useEffect(() => {
    if (!calculatorOpen) return undefined

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCalculatorOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [calculatorOpen])

  return (
    <main className="ix-landing">
      <style>{STYLES}</style>

      <header className="ix-nav">
        <Link
          to={user ? dashboardPath : '/'}
          aria-label="InsureX home"
        >
          <Logo />
        </Link>

        <nav className="ix-nav-actions" aria-label="Main navigation">
          {user ? (
            <Link to={dashboardPath} className="ix-btn ix-btn-primary">
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
            <span className="ix-dot" />
            INSURANCE MADE SIMPLER
          </div>

          <h1>
            Protect what matters.
            <br />
            <span>Plan with confidence.</span>
          </h1>

          <p>
            Life can be unpredictable. InsureX helps you explore insurance
            options, estimate your coverage, and manage your insurance journey
            from one convenient platform.
          </p>

          <div className="ix-hero-actions">
            {user ? (
              <Link to={dashboardPath} className="ix-btn ix-btn-primary">
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

          <div className="ix-trust-row">
            <span><strong>✓</strong> Explore available plans</span>
            <span><strong>✓</strong> Estimate coverage</span>
            <span><strong>✓</strong> Manage in one place</span>
          </div>
        </div>

        <div className="ix-hero-visual">
          <div className="ix-hero-video">
            <video
              src="/videos/family-protection.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Family protection video"
            />

            <div className="ix-hero-video-caption">
              <span>YOUR FUTURE. YOUR PROTECTION.</span>
              <h2>Confidence for life's journey.</h2>
              <p>
                Explore insurance options and take the next step with
                information at your fingertips.
              </p>
            </div>
          </div>

          <div className="ix-floating-note">
            <div className="ix-floating-note-icon" aria-hidden="true">
              🛡️
            </div>
            <div>
              <strong>Protection starts here</strong>
              <small>Explore your options with InsureX</small>
            </div>
          </div>
        </div>
      </section>

      <section className="ix-section ix-video-section">
        <div className="ix-inner">
          <div className="ix-heading">
            <div className="ix-eyebrow">PROTECTION IN REAL LIFE</div>
            <h2>For life's unexpected moments</h2>
            <p>
              From healthcare to road safety and family protection, explore
              insurance options that may fit your needs.
            </p>
          </div>

          <div className="ix-story-grid">
            {STORIES.map((story) => (
              <VideoStory key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>

      <section className="ix-section">
        <div className="ix-inner">
          <div className="ix-heading">
            <div className="ix-eyebrow">BUILT AROUND YOUR NEEDS</div>
            <h2>A simpler insurance experience</h2>
            <p>
              Get started with the information and tools you need to explore
              your insurance options.
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

      {ACTIVE_PLANS.length > 0 && (
        <section className="ix-section ix-plan-section">
          <div className="ix-inner">
            <div className="ix-heading">
              <div className="ix-eyebrow">EXPLORE YOUR OPTIONS</div>
              <h2>Find a plan that fits your needs</h2>
              <p>
                Start by exploring available plans. Sign in to view your
                insurance options and continue through your account.
              </p>
            </div>

            <div className="ix-plan-grid">
              {ACTIVE_PLANS.slice(0, 3).map((plan, index) => {
                const premium = planPremium(plan)

                return (
                  <article
                    className="ix-plan-card"
                    key={String(
                      plan.id ??
                      plan.policyNumber ??
                      plan.planId ??
                      plan.name ??
                      index,
                    )}
                  >
                    <span className="ix-plan-tag">
                      {index === 0 ? 'Explore coverage' : 'Available plan'}
                    </span>

                    <h3>{planName(plan)}</h3>
                    <p>{planDescription(plan)}</p>

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
                        className="ix-btn ix-btn-soft"
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
        <div className="ix-inner">
          <div className="ix-cta">
            <div>
              <h2>Ready to take the next step?</h2>
              <p>
                Create an account to explore plans and manage your insurance
                activity, or sign in to continue where you left off.
              </p>
            </div>

            {user ? (
              <Link to={dashboardPath} className="ix-btn">
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
        <span>
          © {new Date().getFullYear()} InsureX Insurance Platform
        </span>

        <div className="ix-footer-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register">Get Started</Link>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
      </footer>

      <button
        type="button"
        className="ix-calculator-trigger"
        onClick={() => setCalculatorOpen(true)}
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
              setCalculatorOpen(false)
            }
          }}
        >
          <section
            className="ix-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ix-calculator-title"
          >
            <div className="ix-modal-header">
              <div>
                <h2 id="ix-calculator-title">Insurance Calculator</h2>
                <p>
                  Choose a plan and explore your coverage options. The
                  calculator provides an estimate, not a final quotation.
                </p>
              </div>

              <button
                type="button"
                className="ix-modal-close"
                onClick={() => setCalculatorOpen(false)}
                aria-label="Close insurance calculator"
              >
                ×
              </button>
            </div>

            <div>
              <CoverageDial
                value={1000000}
                onChange={() => {}}
                planKey={planIdentifier}
                onPlanChange={setSelectedPlan}
                showPlans
                lockedPlan={false}
                planLabel={chosenPlan ? planName(chosenPlan) : undefined}
                coverageMin={100000}
                coverageMax={10000000}
                coverageStep={100000}
                durationMax={5}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  className="ix-btn ix-btn-outline"
                  onClick={() => setCalculatorOpen(false)}
                >
                  Close
                </button>

                <Link
                  to={user ? '/app/plans' : '/register'}
                  className="ix-btn ix-btn-primary"
                  onClick={() => setCalculatorOpen(false)}
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

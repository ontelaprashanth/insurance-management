import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PLANS } from '../../lib/premium'
import { inr } from '../../lib/format'

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1600&q=85',
  hospital:
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1000&q=85',
  accident:
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1000&q=85',
  family:
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=85',
}

/* Original InsureX brand logo — no external image required. */
function InsureXLogo({ size = 42 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="InsureX logo"
      style={{
        display: 'block',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="11"
        fill="#1F5B5D"
      />
      <path
        d="M20 7.5L30 11.3V19.4C30 25.2 25.8 29.7 20 32.5C14.2 29.7 10 25.2 10 19.4V11.3L20 7.5Z"
        fill="#E9A23B"
      />
      <path
        d="M15.2 20.2L18.5 23.5L25.2 16.8"
        stroke="#0F3D3E"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const STORIES = [
  {
    eyebrow: 'HEALTH INSURANCE',
    title: 'Your health comes first.',
    description:
      'Explore health insurance options to help prepare for medical needs and unexpected hospital expenses.',
    image: IMAGES.hospital,
    alt: 'Healthcare professional in a medical setting',
    icon: '✚',
  },
  {
    eyebrow: 'VEHICLE INSURANCE',
    title: 'Confidence on every journey.',
    description:
      'Discover vehicle protection options designed to help you prepare for unexpected events on the road.',
    image: IMAGES.accident,
    alt: 'Vehicle on the road',
    icon: '↗',
  },
  {
    eyebrow: 'FAMILY PROTECTION',
    title: 'Plan for what matters most.',
    description:
      'Explore insurance choices with your family’s future, everyday needs, and peace of mind in mind.',
    image: IMAGES.family,
    alt: 'Family spending time together',
    icon: '♡',
  },
]

const FEATURES = [
  {
    icon: '◈',
    title: 'Simple policy management',
    description:
      'Explore your available options and keep track of your insurance policies in one place.',
  },
  {
    icon: '✓',
    title: 'A clearer experience',
    description:
      'Access your account, review policy information, and follow your insurance activity.',
  },
  {
    icon: '⌂',
    title: 'Support for every stage',
    description:
      'Manage your insurance journey from exploring plans to reviewing claims and payments.',
  },
]

function StoryCard({ story, index }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article
      className="ix-story-card"
      style={{ '--ix-delay': `${index * 100}ms` }}
    >
      <div className="ix-story-image-wrap">
        {!imageFailed ? (
          <img
            className="ix-story-image"
            src={story.image}
            alt={story.alt}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="ix-story-image-fallback" aria-hidden="true">
            {story.icon}
          </div>
        )}

        <span className="ix-story-icon" aria-hidden="true">
          {story.icon}
        </span>
      </div>

      <div className="ix-story-body">
        <span className="ix-eyebrow">{story.eyebrow}</span>
        <h3>{story.title}</h3>
        <p>{story.description}</p>

        <Link className="ix-text-link" to="/app/plans">
          Explore plans <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const dashboardPath = isAdmin ? '/admin' : '/app'

  return (
    <main className="ix-landing">
      <style>{`
        .ix-landing {
          --ix-green: #087f5b;
          --ix-green-dark: #075b43;
          --ix-green-deep: #063f30;
          --ix-green-light: #e8f7ef;
          --ix-text: #18352a;
          --ix-muted: #687d73;
          --ix-border: #e3eee7;
          --ix-white: #ffffff;

          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          color: var(--ix-text);
          background: #ffffff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .ix-landing *,
        .ix-landing *::before,
        .ix-landing *::after {
          box-sizing: border-box;
        }

        .ix-landing a {
          color: inherit;
          text-decoration: none;
        }

        .ix-container {
          width: min(1160px, calc(100% - 48px));
          margin-inline: auto;
        }

        /* NAVIGATION */

        .ix-nav {
          position: relative;
          z-index: 5;
          width: 100%;
          border-bottom: 1px solid #edf3ef;
          background: rgba(255, 255, 255, 0.96);
        }

        .ix-nav-inner {
          display: flex;
          min-height: 78px;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .ix-brand {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          gap: 10px;
          color: var(--ix-green-dark);
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -0.9px;
        }

        .ix-brand-logo-wrap {
          display: grid;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          place-items: center;
          overflow: hidden;
          border-radius: 11px;
          background: #ffffff;
        }

        .ix-brand-text {
          display: block;
          line-height: 1.15;
        }

        .ix-brand-text small {
          display: block;
          margin-top: 4px;
          color: #7b9085;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: 2px;
          line-height: 1.2;
        }

        .ix-nav-links {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 27px;
        }

        .ix-nav-link {
          color: #51665c !important;
          font-size: 13px;
          font-weight: 650;
          transition: color 180ms ease;
        }

        .ix-nav-link:hover {
          color: var(--ix-green) !important;
        }

        .ix-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ix-btn {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 19px;
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 750;
          text-align: center;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }

        .ix-btn:focus-visible,
        .ix-nav-link:focus-visible,
        .ix-text-link:focus-visible,
        .ix-footer-links a:focus-visible {
          outline: 3px solid rgba(8, 127, 91, 0.32);
          outline-offset: 4px;
        }

        .ix-btn:hover {
          transform: translateY(-2px);
        }

        .ix-btn:active {
          transform: translateY(0) scale(0.99);
        }

        .ix-btn-primary {
          color: #ffffff !important;
          background: var(--ix-green);
          box-shadow: 0 5px 14px rgba(8, 127, 91, 0.16);
        }

        .ix-btn-primary:hover {
          background: var(--ix-green-dark);
          box-shadow: 0 8px 19px rgba(8, 127, 91, 0.22);
        }

        .ix-btn-outline {
          border-color: #d7e6dd;
          color: var(--ix-green-dark) !important;
          background: #ffffff;
        }

        .ix-btn-outline:hover {
          border-color: #94c9ac;
          background: #f4fbf6;
        }

        .ix-btn-light {
          color: var(--ix-green-dark) !important;
          background: #ffffff;
        }

        .ix-btn-light:hover {
          background: #eaf7ef;
        }

        /* HERO */

        .ix-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
          align-items: center;
          gap: 56px;
          padding-block: 68px 76px;
        }

        .ix-hero-copy {
          min-width: 0;
          animation: ix-enter 650ms ease both;
        }

        .ix-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid #d8eee0;
          border-radius: 999px;
          color: var(--ix-green-dark);
          background: #f1faf4;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .ix-pill-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #13a56f;
          box-shadow: 0 0 0 4px #d9f4e4;
          animation: ix-dot-pulse 2.4s ease-in-out infinite;
        }

        .ix-hero h1 {
          max-width: 570px;
          margin: 23px 0 19px;
          color: #143b2b;
          font-size: clamp(39px, 4.6vw, 60px);
          font-weight: 850;
          letter-spacing: -2.8px;
          line-height: 1.08;
        }

        .ix-hero h1 span {
          color: var(--ix-green);
        }

        .ix-hero-description {
          max-width: 490px;
          margin: 0;
          color: #687c72;
          font-size: 15px;
          line-height: 1.9;
        }

        .ix-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 29px;
        }

        .ix-trust-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px;
          margin-top: 29px;
          color: #5d7368;
          font-size: 11px;
          font-weight: 650;
        }

        .ix-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .ix-trust-check {
          display: grid;
          width: 19px;
          height: 19px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 50%;
          color: var(--ix-green);
          background: #e7f7ed;
          font-size: 11px;
          font-weight: 900;
        }

        .ix-hero-visual {
          position: relative;
          min-width: 0;
          animation: ix-image-in 850ms ease both;
        }

        .ix-hero-image-wrap {
          position: relative;
          min-height: 410px;
          overflow: hidden;
          border-radius: 25px;
          background: #e4f2e8;
          box-shadow: 0 24px 65px rgba(20, 59, 43, 0.14);
        }

        .ix-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 700ms ease, opacity 300ms ease;
        }

        .ix-hero-image-wrap:hover .ix-hero-image {
          transform: scale(1.035);
        }

        .ix-hero-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(8, 35, 23, 0.02) 30%,
            rgba(8, 35, 23, 0.66) 100%
          );
          pointer-events: none;
        }

        .ix-hero-caption {
          position: absolute;
          right: 25px;
          bottom: 24px;
          left: 25px;
          color: #ffffff;
        }

        .ix-caption-label {
          display: inline-flex;
          padding: 7px 10px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          backdrop-filter: blur(8px);
        }

        .ix-hero-caption h2 {
          margin: 12px 0 7px;
          font-size: clamp(23px, 2.7vw, 32px);
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.2;
        }

        .ix-hero-caption p {
          max-width: 390px;
          margin: 0;
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          line-height: 1.7;
        }

        /* SECTIONS */

        .ix-section {
          padding-block: 78px;
          scroll-margin-top: 20px;
        }

        .ix-section-soft {
          background: #f7fbf8;
        }

        .ix-section-heading {
          max-width: 650px;
          margin: 0 auto 37px;
          text-align: center;
        }

        .ix-eyebrow {
          color: var(--ix-green);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.6px;
        }

        .ix-section-heading h2 {
          margin: 12px 0;
          color: #153b2c;
          font-size: clamp(28px, 3.3vw, 39px);
          font-weight: 850;
          letter-spacing: -1.5px;
          line-height: 1.2;
        }

        .ix-section-heading p {
          margin: 0;
          color: var(--ix-muted);
          font-size: 14px;
          line-height: 1.85;
        }

        /* PROTECTION CARDS */

        .ix-story-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
          gap: 23px;
        }

        .ix-story-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--ix-border);
          border-radius: 17px;
          background: #ffffff;
          box-shadow: 0 5px 20px rgba(21, 59, 44, 0.035);
          animation: ix-enter 600ms ease both;
          animation-delay: var(--ix-delay, 0ms);
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
        }

        .ix-story-card:hover {
          transform: translateY(-6px);
          border-color: #c7e5d1;
          box-shadow: 0 18px 36px rgba(21, 59, 44, 0.09);
        }

        .ix-story-image-wrap {
          position: relative;
          height: 205px;
          overflow: hidden;
          background: #e6f3e9;
        }

        .ix-story-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 500ms ease;
        }

        .ix-story-card:hover .ix-story-image {
          transform: scale(1.045);
        }

        .ix-story-image-fallback {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          color: var(--ix-green);
          background: linear-gradient(135deg, #e6f7ec, #d2ebdc);
          font-size: 46px;
        }

        .ix-story-icon {
          position: absolute;
          bottom: 14px;
          left: 16px;
          display: grid;
          width: 39px;
          height: 39px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.65);
          border-radius: 12px;
          color: var(--ix-green-dark);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          font-size: 20px;
        }

        .ix-story-body {
          padding: 23px 21px 22px;
        }

        .ix-story-body h3 {
          margin: 10px 0;
          color: #193c2e;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.35;
        }

        .ix-story-body p {
          min-height: 72px;
          margin: 0;
          color: #6b7e74;
          font-size: 12px;
          line-height: 1.85;
        }

        .ix-text-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          color: var(--ix-green) !important;
          font-size: 12px;
          font-weight: 800;
        }

        .ix-text-link span {
          transition: transform 180ms ease;
        }

        .ix-text-link:hover span {
          transform: translateX(4px);
        }

        /* FEATURES */

        .ix-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .ix-feature-card {
          padding: 27px 24px;
          border: 1px solid var(--ix-border);
          border-radius: 15px;
          background: #ffffff;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .ix-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(21, 59, 44, 0.07);
        }

        .ix-feature-icon {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border-radius: 13px;
          color: var(--ix-green);
          background: var(--ix-green-light);
          font-size: 23px;
          font-weight: 800;
        }

        .ix-feature-card h3 {
          margin: 20px 0 9px;
          color: #1b4030;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.45;
        }

        .ix-feature-card p {
          margin: 0;
          color: var(--ix-muted);
          font-size: 12px;
          line-height: 1.85;
        }

        /* PLANS */

        .ix-plans-section {
          padding-block: 76px;
          background: #f7fbf8;
          scroll-margin-top: 20px;
        }

        .ix-plan-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .ix-plan-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 24px;
          border: 1px solid var(--ix-border);
          border-radius: 16px;
          background: #ffffff;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .ix-plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 32px rgba(21, 59, 44, 0.075);
        }

        .ix-plan-card h3 {
          margin: 0 0 10px;
          color: #193d2d;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.4;
        }

        .ix-plan-price {
          margin: 0 0 12px;
          color: var(--ix-green-dark);
          font-size: 27px;
          font-weight: 850;
          letter-spacing: -0.8px;
          overflow-wrap: anywhere;
        }

        .ix-plan-price small {
          color: #72847a;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0;
        }

        .ix-plan-description {
          flex: 1;
          margin: 0 0 20px;
          color: var(--ix-muted);
          font-size: 12px;
          line-height: 1.8;
        }

        .ix-plan-card .ix-btn {
          width: 100%;
        }

        /* CTA */

        .ix-cta {
          position: relative;
          overflow: hidden;
          padding-block: 60px;
          color: #ffffff;
          background: linear-gradient(120deg, #07563e, #087f5b 62%, #119768);
        }

        .ix-cta::before,
        .ix-cta::after {
          position: absolute;
          width: 260px;
          height: 260px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 50%;
          content: "";
          pointer-events: none;
        }

        .ix-cta::before {
          top: -145px;
          right: 10%;
        }

        .ix-cta::after {
          right: -80px;
          bottom: -195px;
          width: 330px;
          height: 330px;
        }

        .ix-cta-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        .ix-cta h2 {
          max-width: 630px;
          margin: 0 0 11px;
          font-size: clamp(27px, 3.2vw, 38px);
          font-weight: 850;
          letter-spacing: -1.2px;
          line-height: 1.2;
        }

        .ix-cta p {
          max-width: 560px;
          margin: 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          line-height: 1.8;
        }

        .ix-cta-actions {
          display: flex;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ix-cta .ix-btn-outline {
          border-color: rgba(255, 255, 255, 0.38);
          color: #ffffff !important;
          background: transparent;
        }

        .ix-cta .ix-btn-outline:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* FOOTER */

        .ix-footer {
          padding-block: 31px;
          border-top: 1px solid #eaf1ec;
          background: #ffffff;
        }

        .ix-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .ix-footer-copy {
          margin: 0;
          color: #7b8d83;
          font-size: 11px;
          line-height: 1.8;
        }

        .ix-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
        }

        .ix-footer-links a {
          color: #5d7368;
          font-size: 11px;
          font-weight: 650;
          transition: color 180ms ease;
        }

        .ix-footer-links a:hover {
          color: var(--ix-green);
        }

        /* ANIMATIONS */

        @keyframes ix-enter {
          from {
            opacity: 0;
            transform: translateY(13px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-image-in {
          from {
            opacity: 0;
            transform: translateX(12px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes ix-dot-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px #d9f4e4;
          }

          50% {
            box-shadow: 0 0 0 7px rgba(217, 244, 228, 0.55);
          }
        }

        /* TABLET */

        @media (max-width: 1000px) {
          .ix-nav-links {
            gap: 16px;
          }

          .ix-hero {
            gap: 32px;
            padding-block: 55px 65px;
          }

          .ix-hero-image-wrap {
            min-height: 365px;
          }

          .ix-story-grid,
          .ix-feature-grid,
          .ix-plan-grid {
            gap: 16px;
          }

          .ix-story-body {
            padding: 20px 17px;
          }
        }

        @media (max-width: 800px) {
          .ix-nav-inner {
            min-height: 72px;
            flex-wrap: wrap;
            gap: 12px;
            padding-block: 13px;
          }

          .ix-nav-links {
            display: none;
          }

          .ix-hero {
            grid-template-columns: 1fr;
            gap: 32px;
            padding-block: 47px 57px;
          }

          .ix-hero-copy {
            max-width: 650px;
          }

          .ix-hero h1 {
            max-width: 600px;
            font-size: clamp(40px, 8vw, 57px);
          }

          .ix-hero-description {
            max-width: 560px;
          }

          .ix-hero-visual {
            width: 100%;
          }

          .ix-hero-image-wrap {
            min-height: 400px;
          }

          .ix-story-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ix-feature-grid {
            grid-template-columns: 1fr;
          }

          .ix-feature-card {
            display: grid;
            grid-template-columns: 46px minmax(0, 1fr);
            column-gap: 16px;
            align-items: start;
            padding: 21px;
          }

          .ix-feature-icon {
            grid-row: span 2;
          }

          .ix-feature-card h3 {
            margin: 0 0 6px;
          }

          .ix-feature-card p {
            grid-column: 2;
          }

          .ix-plan-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ix-cta-inner {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        /* MOBILE */

        @media (max-width: 520px) {
          .ix-container {
            width: calc(100% - 32px);
          }

          .ix-nav-inner {
            min-height: 67px;
          }

          .ix-brand {
            gap: 8px;
            font-size: 20px;
          }

          .ix-brand-logo-wrap {
            width: 35px;
            height: 35px;
          }

          .ix-brand-text small {
            font-size: 8px;
            letter-spacing: 1.7px;
          }

          .ix-nav-actions {
            gap: 7px;
          }

          .ix-nav-actions .ix-btn {
            min-height: 38px;
            padding-inline: 11px;
            font-size: 11px;
          }

          .ix-hero {
            gap: 28px;
            padding-block: 39px 47px;
          }

          .ix-hero h1 {
            margin-top: 19px;
            font-size: clamp(36px, 10vw, 46px);
            letter-spacing: -1.9px;
          }

          .ix-hero-description {
            font-size: 13px;
          }

          .ix-hero-actions {
            gap: 9px;
          }

          .ix-hero-actions .ix-btn {
            flex: 1 1 145px;
            padding-inline: 12px;
          }

          .ix-trust-row {
            gap: 11px 14px;
            font-size: 10px;
          }

          .ix-hero-image-wrap {
            min-height: 320px;
            border-radius: 19px;
          }

          .ix-hero-caption {
            right: 17px;
            bottom: 18px;
            left: 17px;
          }

          .ix-hero-caption h2 {
            font-size: 24px;
          }

          .ix-section,
          .ix-plans-section {
            padding-block: 53px;
          }

          .ix-section-heading {
            margin-bottom: 26px;
          }

          .ix-section-heading h2 {
            font-size: 29px;
            letter-spacing: -1px;
          }

          .ix-section-heading p {
            font-size: 12px;
          }

          .ix-story-grid,
          .ix-plan-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .ix-story-image-wrap {
            height: 210px;
          }

          .ix-story-body p {
            min-height: auto;
          }

          .ix-feature-card {
            padding: 18px;
          }

          .ix-plan-card {
            padding: 21px;
          }

          .ix-cta {
            padding-block: 44px;
          }

          .ix-cta h2 {
            font-size: 29px;
          }

          .ix-cta-actions {
            width: 100%;
          }

          .ix-cta-actions .ix-btn {
            flex: 1 1 130px;
          }

          .ix-footer-inner {
            align-items: flex-start;
            flex-direction: column;
            gap: 13px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-landing *,
          .ix-landing *::before,
          .ix-landing *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* NAVIGATION */}

      <header className="ix-nav">
        <div className="ix-container ix-nav-inner">
          <Link className="ix-brand" to="/" aria-label="InsureX home">
            <span className="ix-brand-logo-wrap">
              <InsureXLogo size={42} />
            </span>

            <span className="ix-brand-text">
              InsureX
              <small>INSURANCE PLATFORM</small>
            </span>
          </Link>

          <nav className="ix-nav-links" aria-label="Main navigation">
            <a className="ix-nav-link" href="#protection">
              Protection
            </a>

            <a className="ix-nav-link" href="#benefits">
              Benefits
            </a>

            <a className="ix-nav-link" href="#plans">
              Plans
            </a>
          </nav>

          <div className="ix-nav-actions">
            {user ? (
              <Link className="ix-btn ix-btn-primary" to={dashboardPath}>
                Dashboard <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <>
                <Link className="ix-btn ix-btn-outline" to="/login">
                  Sign in
                </Link>

                <Link className="ix-btn ix-btn-primary" to="/register">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="ix-container ix-hero">
        <div className="ix-hero-copy">
          <div className="ix-pill">
            <span className="ix-pill-dot" aria-hidden="true" />
            INSURANCE, MADE SIMPLER
          </div>

          <h1>
            Protect what matters.
            <br />
            <span>Live with confidence.</span>
          </h1>

          <p className="ix-hero-description">
            Life is full of important moments. InsureX helps you explore
            insurance options and manage your policies through one convenient
            platform.
          </p>

          <div className="ix-hero-actions">
            <Link className="ix-btn ix-btn-primary" to="/app/plans">
              Explore insurance <span aria-hidden="true">→</span>
            </Link>

            <Link className="ix-btn ix-btn-outline" to="/login">
              Access your account
            </Link>
          </div>

          <div className="ix-trust-row">
            <span className="ix-trust-item">
              <span className="ix-trust-check" aria-hidden="true">
                ✓
              </span>
              Easy policy access
            </span>

            <span className="ix-trust-item">
              <span className="ix-trust-check" aria-hidden="true">
                ✓
              </span>
              Convenient management
            </span>
          </div>
        </div>

        <div className="ix-hero-visual">
          <div className="ix-hero-image-wrap">
            <img
              className="ix-hero-image"
              src={IMAGES.hero}
              alt="Family spending meaningful time together outdoors"
              fetchPriority="high"
              onError={(event) => {
                event.currentTarget.style.opacity = '0'
              }}
            />

            <div className="ix-hero-image-overlay" />

            <div className="ix-hero-caption">
              <span className="ix-caption-label">
                PROTECTION FOR LIFE
              </span>

              <h2>For today. For tomorrow.</h2>

              <p>
                Explore options that support the people and things that matter
                most to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROTECTION CATEGORIES */}

      <section className="ix-section ix-section-soft" id="protection">
        <div className="ix-container">
          <div className="ix-section-heading">
            <span className="ix-eyebrow">EXPLORE YOUR OPTIONS</span>
            <h2>Protection for life's priorities</h2>

            <p>
              Discover insurance categories that can help you prepare for
              life's different needs.
            </p>
          </div>

          <div className="ix-story-grid">
            {STORIES.map((story, index) => (
              <StoryCard
                key={story.eyebrow}
                story={story}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}

      <section className="ix-section" id="benefits">
        <div className="ix-container">
          <div className="ix-section-heading">
            <span className="ix-eyebrow">THE INSUREX EXPERIENCE</span>
            <h2>Insurance management, made convenient</h2>

            <p>
              A straightforward platform to help you navigate your insurance
              journey with greater clarity.
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

      {/* AVAILABLE PLANS */}

      {Array.isArray(PLANS) && PLANS.length > 0 && (
        <section className="ix-plans-section" id="plans">
          <div className="ix-container">
            <div className="ix-section-heading">
              <span className="ix-eyebrow">FIND YOUR COVER</span>
              <h2>Explore available insurance plans</h2>

              <p>
                Review the options available on InsureX and choose a plan to
                learn more.
              </p>
            </div>

            <div className="ix-plan-grid">
              {PLANS.slice(0, 3).map((plan, index) => {
                const planName =
                  plan.name ||
                  plan.policyName ||
                  plan.planName ||
                  'Insurance plan'

                const planDescription =
                  plan.description ||
                  plan.details ||
                  'Explore the plan details and available coverage options.'

                const rawPrice =
                  plan.premium ??
                  plan.premiumAmount ??
                  plan.price ??
                  plan.amount

                const price =
                  rawPrice !== undefined &&
                  rawPrice !== null &&
                  rawPrice !== '' &&
                  Number.isFinite(Number(rawPrice))
                    ? inr(Number(rawPrice))
                    : null

                return (
                  <article
                    className="ix-plan-card"
                    key={plan.id || planName || index}
                  >
                    <h3>{planName}</h3>

                    {price ? (
                      <p className="ix-plan-price">
                        {price}
                        <small> onwards</small>
                      </p>
                    ) : (
                      <p className="ix-plan-price">
                        Flexible <small>options</small>
                      </p>
                    )}

                    <p className="ix-plan-description">
                      {planDescription}
                    </p>

                    <Link className="ix-btn ix-btn-outline" to="/app/plans">
                      View plan <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CALL TO ACTION */}

      <section className="ix-cta">
        <div className="ix-container ix-cta-inner">
          <div>
            <h2>Take the next step towards feeling prepared.</h2>

            <p>
              Explore insurance plans, access your account, and manage your
              insurance journey with InsureX.
            </p>
          </div>

          <div className="ix-cta-actions">
            <Link className="ix-btn ix-btn-light" to="/app/plans">
              Explore plans <span aria-hidden="true">→</span>
            </Link>

            {!user && (
              <Link className="ix-btn ix-btn-outline" to="/register">
                Create account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="ix-footer">
        <div className="ix-container ix-footer-inner">
          <p className="ix-footer-copy">
            © {new Date().getFullYear()} InsureX Insurance Platform.
            <br />
            Your insurance journey, in one place.
          </p>

          <nav className="ix-footer-links" aria-label="Footer navigation">
            <Link to="/">Home</Link>
            <Link to="/app/plans">Insurance plans</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}

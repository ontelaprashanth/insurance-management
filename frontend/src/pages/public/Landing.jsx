
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PLANS } from '../../lib/premium'
import { inr } from '../../lib/format'

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1600&q=85',
  hospital: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1000&q=85',
  accident: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1000&q=85',
  family: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=85',
  healthcare: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=900&q=85',
}

const STORIES = [
  {
    eyebrow: 'HEALTH INSURANCE',
    title: 'Your health comes first.',
    description:
      'Explore health insurance options to help prepare for medical needs and unexpected hospital expenses.',
    image: IMAGES.hospital,
    alt: 'Healthcare professional providing care in a medical setting',
    icon: '✚',
  },
  {
    eyebrow: 'VEHICLE INSURANCE',
    title: 'Protection for every journey.',
    description:
      'Discover vehicle insurance options and explore protection for the unexpected on the road.',
    image: IMAGES.accident,
    alt: 'Car on the road representing vehicle protection',
    icon: '↗',
  },
  {
    eyebrow: 'FAMILY PROTECTION',
    title: 'Protect the people you love.',
    description:
      'Explore insurance options with your family’s future, security, and peace of mind in focus.',
    image: IMAGES.family,
    alt: 'Family spending quality time together outdoors',
    icon: '♡',
  },
]

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Explore insurance plans',
    description:
      'Review available plans and explore coverage options in one convenient place.',
  },
  {
    icon: '📋',
    title: 'Manage your policies',
    description:
      'Keep track of your policies, purchases, claims, and insurance activity.',
  },
  {
    icon: '🔔',
    title: 'Stay informed',
    description:
      'Access account notifications and important updates from your dashboard.',
  },
]

const STYLES = `
  .ix-landing {
    --green: #047857;
    --green-dark: #064e3b;
    --green-light: #ecfdf5;
    --text: #17372b;
    --muted: #64776d;
    --border: #dce9e1;
    min-height: 100vh;
    overflow: hidden;
    color: var(--text);
    background: #f8fbf9;
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

  .ix-container {
    width: 100%;
    max-width: 1220px;
    margin: 0 auto;
    padding-right: 28px;
    padding-left: 28px;
  }

  .ix-nav {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 18px 30px;
  }

  .ix-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--green-dark);
  }

  .ix-brand-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid #ccebd9;
    border-radius: 14px;
    background: var(--green-light);
    font-size: 23px;
  }

  .ix-brand-name {
    color: var(--green-dark);
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -1px;
  }

  .ix-brand-name span {
    color: #10b981;
  }

  .ix-brand small {
    display: block;
    margin-top: 5px;
    color: #73877d;
    font-size: 8px;
    font-weight: 850;
    letter-spacing: 1.25px;
  }

  .ix-nav-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ix-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 44px;
    padding: 11px 18px;
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
    color: #fff;
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 7px 20px rgb(4 120 87 / 16%);
  }

  .ix-btn-primary:hover {
    background: linear-gradient(135deg, #047857, #065f46);
    box-shadow: 0 11px 24px rgb(4 120 87 / 24%);
  }

  .ix-btn-outline {
    color: var(--green-dark);
    border-color: #cfe1d7;
    background: #fff;
  }

  .ix-btn-outline:hover {
    border-color: #9bd6b6;
    background: #ecfdf5;
  }

  .ix-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.02fr) minmax(0, .98fr);
    align-items: center;
    gap: clamp(35px, 5vw, 70px);
    max-width: 1280px;
    margin: 0 auto;
    padding: 58px 30px 82px;
  }

  .ix-hero-copy {
    min-width: 0;
    animation: ix-enter .7s ease both;
  }

  .ix-kicker {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: 1px solid #ccebd9;
    border-radius: 999px;
    color: var(--green);
    background: var(--green-light);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .ix-kicker-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 4px rgb(16 185 129 / 12%);
  }

  .ix-hero h1 {
    margin: 23px 0 18px;
    color: #142f24;
    font-size: clamp(40px, 5.1vw, 65px);
    font-weight: 900;
    line-height: 1.07;
    letter-spacing: -.055em;
  }

  .ix-hero h1 span {
    color: var(--green);
  }

  .ix-hero-description {
    max-width: 550px;
    margin: 0;
    color: #5f7469;
    font-size: 15px;
    line-height: 1.9;
  }

  .ix-hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 27px;
  }

  .ix-trust {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 11px 18px;
    margin-top: 23px;
    color: #60766b;
    font-size: 11px;
    font-weight: 750;
  }

  .ix-trust span::first-letter {
    color: var(--green);
  }

  .ix-hero-visual {
    position: relative;
    min-width: 0;
    animation: ix-enter .8s ease .1s both;
  }

  .ix-hero-image-wrap {
    position: relative;
    min-height: 430px;
    overflow: hidden;
    border: 5px solid #fff;
    border-radius: 28px;
    background: #d1fae5;
    box-shadow: 0 25px 65px rgb(16 42 35 / 16%);
  }

  .ix-hero-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    animation: ix-image-in 1.1s ease both;
  }

  .ix-hero-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgb(5 46 32 / 2%) 30%,
      rgb(5 46 32 / 76%) 100%
    );
  }

  .ix-hero-caption {
    position: absolute;
    right: 23px;
    bottom: 24px;
    left: 23px;
    color: #fff;
  }

  .ix-hero-caption span {
    display: inline-flex;
    padding: 7px 10px;
    border: 1px solid rgb(255 255 255 / 28%);
    border-radius: 999px;
    background: rgb(4 78 59 / 70%);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .ix-hero-caption h2 {
    margin: 12px 0 8px;
    font-size: clamp(22px, 2.6vw, 31px);
    font-weight: 900;
    letter-spacing: -.035em;
  }

  .ix-hero-caption p {
    max-width: 380px;
    margin: 0;
    color: #e0f7e9;
    font-size: 12px;
    line-height: 1.8;
  }

  .ix-floating-note {
    position: absolute;
    z-index: 2;
    top: 24px;
    left: -22px;
    display: flex;
    align-items: center;
    gap: 11px;
    max-width: 230px;
    padding: 13px 15px;
    border: 1px solid #e4eee8;
    border-radius: 15px;
    background: rgb(255 255 255 / 97%);
    box-shadow: 0 12px 35px rgb(16 42 35 / 14%);
    animation: ix-float 4s ease-in-out infinite;
  }

  .ix-floating-icon {
    display: grid;
    flex: 0 0 38px;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--green);
    background: #d1fae5;
    font-size: 19px;
  }

  .ix-floating-note strong {
    display: block;
    color: #153b2d;
    font-size: 11px;
  }

  .ix-floating-note small {
    display: block;
    margin-top: 4px;
    color: #6b8075;
    font-size: 10px;
  }

  .ix-section {
    padding: 75px 0;
  }

  .ix-section-soft {
    background: #eef8f2;
  }

  .ix-section-heading {
    max-width: 690px;
    margin: 0 auto 38px;
    text-align: center;
  }

  .ix-section-heading .ix-kicker {
    margin-bottom: 15px;
  }

  .ix-section-heading h2 {
    margin: 0;
    color: #15372b;
    font-size: clamp(29px, 3.5vw, 42px);
    font-weight: 900;
    line-height: 1.18;
    letter-spacing: -.045em;
  }

  .ix-section-heading p {
    margin: 13px 0 0;
    color: #62776c;
    font-size: 13px;
    line-height: 1.9;
  }

  .ix-story-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: 20px;
  }

  .ix-story-card {
    display: flex;
    min-width: 0;
    overflow: hidden;
    flex-direction: column;
    border: 1px solid #dce9e1;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 7px 24px rgb(16 42 35 / 4%);
    animation: ix-enter .65s ease both;
    transition: transform .25s ease, box-shadow .25s ease,
      border-color .25s ease;
  }

  .ix-story-card:nth-child(2) {
    animation-delay: .08s;
  }

  .ix-story-card:nth-child(3) {
    animation-delay: .16s;
  }

  .ix-story-card:hover {
    transform: translateY(-6px);
    border-color: #9fd7b8;
    box-shadow: 0 20px 42px rgb(16 42 35 / 10%);
  }

  .ix-story-image-wrap {
    position: relative;
    height: 225px;
    overflow: hidden;
    background: #d1fae5;
  }

  .ix-story-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .6s ease;
  }

  .ix-story-card:hover .ix-story-image {
    transform: scale(1.055);
  }

  .ix-story-image-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 55%, rgb(4 46 32 / 38%));
    pointer-events: none;
  }

  .ix-story-icon {
    position: absolute;
    top: 15px;
    left: 15px;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid rgb(255 255 255 / 50%);
    border-radius: 14px;
    color: #fff;
    background: rgb(4 78 59 / 80%);
    font-size: 21px;
    backdrop-filter: blur(8px);
  }

  .ix-story-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 21px;
  }

  .ix-story-eyebrow {
    color: var(--green);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .ix-story-body h3 {
    margin: 10px 0 9px;
    color: #17382d;
    font-size: 19px;
    font-weight: 900;
    line-height: 1.35;
    letter-spacing: -.025em;
  }

  .ix-story-body p {
    flex: 1;
    margin: 0;
    color: #64796f;
    font-size: 12px;
    line-height: 1.85;
  }

  .ix-story-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #e5eee8;
    color: #547366;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: .06em;
  }

  .ix-story-bottom span:last-child {
    color: var(--green);
    font-size: 17px;
  }

  .ix-feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: 18px;
  }

  .ix-feature-card {
    min-width: 0;
    padding: 25px;
    border: 1px solid #deebe3;
    border-radius: 19px;
    background: #fff;
    box-shadow: 0 6px 24px rgb(16 42 35 / 3%);
    animation: ix-enter .65s ease both;
    transition: transform .22s ease, box-shadow .22s ease;
  }

  .ix-feature-card:hover {
    transform: translateY(-4px);
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
    font-size: 22px;
  }

  .ix-feature-card h3 {
    margin: 0 0 10px;
    color: #17392e;
    font-size: 16px;
    font-weight: 900;
  }

  .ix-feature-card p {
    margin: 0;
    color: #63796f;
    font-size: 12px;
    line-height: 1.85;
  }

  .ix-plan-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: 18px;
  }

  .ix-plan-card {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 23px;
    border: 1px solid #dce9e1;
    border-radius: 19px;
    background: #fff;
    transition: transform .22s ease, box-shadow .22s ease;
  }

  .ix-plan-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgb(16 42 35 / 8%);
  }

  .ix-plan-tag {
    align-self: flex-start;
    margin-bottom: 14px;
    padding: 6px 9px;
    border-radius: 999px;
    color: var(--green);
    background: #ecfdf5;
    font-size: 9px;
    font-weight: 900;
  }

  .ix-plan-card h3 {
    margin: 0 0 10px;
    color: #17392e;
    font-size: 17px;
    font-weight: 900;
  }

  .ix-plan-card p {
    flex: 1;
    margin: 0 0 20px;
    color: #63796f;
    font-size: 12px;
    line-height: 1.8;
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
    font-size: 9px;
  }

  .ix-plan-footer strong {
    color: var(--green);
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
    color: #fff;
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
    font-size: 12px;
    line-height: 1.9;
  }

  .ix-cta .ix-btn {
    flex-shrink: 0;
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
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px 30px;
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
    color: var(--green);
  }

  .ix-landing .ix-photo-credit {
    margin-top: 14px;
    color: #71847b;
    font-size: 10px;
    text-align: center;
  }

  .ix-landing .ix-photo-credit a {
    color: #42685a;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  @keyframes ix-enter {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ix-image-in {
    from { opacity: .5; transform: scale(1.035); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes ix-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  @media (max-width: 900px) {
    .ix-hero {
      grid-template-columns: minmax(0, 1fr) minmax(0, .9fr);
      gap: 28px;
      padding-top: 48px;
    }

    .ix-hero-image-wrap {
      min-height: 370px;
    }

    .ix-story-grid,
    .ix-feature-grid,
    .ix-plan-grid {
      gap: 13px;
    }

    .ix-story-body,
    .ix-feature-card,
    .ix-plan-card {
      padding: 18px;
    }

    .ix-story-image-wrap {
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

    .ix-container {
      padding-right: 20px;
      padding-left: 20px;
    }

    .ix-hero {
      grid-template-columns: minmax(0, 1fr);
      gap: 34px;
      padding: 38px 20px 54px;
    }

    .ix-hero h1 {
      font-size: clamp(39px, 10vw, 56px);
    }

    .ix-hero-description {
      font-size: 14px;
    }

    .ix-hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .ix-hero-actions .ix-btn {
      width: 100%;
    }

    .ix-hero-image-wrap {
      min-height: 390px;
    }

    .ix-floating-note {
      left: -7px;
    }

    .ix-section {
      padding: 53px 0;
    }

    .ix-story-grid,
    .ix-feature-grid,
    .ix-plan-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }

    .ix-story-image-wrap {
      height: 240px;
    }

    .ix-story-body,
    .ix-feature-card,
    .ix-plan-card {
      padding: 21px;
    }

    .ix-cta {
      align-items: flex-start;
      flex-direction: column;
    }

    .ix-footer {
      align-items: flex-start;
      flex-direction: column;
      padding: 23px 20px;
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

    .ix-hero-image-wrap {
      min-height: 330px;
    }

    .ix-hero-caption {
      right: 15px;
      bottom: 16px;
      left: 15px;
    }

    .ix-hero-caption h2 {
      font-size: 22px;
    }

    .ix-floating-note {
      top: 14px;
      padding: 10px;
    }

    .ix-story-image-wrap {
      height: 210px;
    }

    .ix-plan-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .ix-plan-footer .ix-btn {
      width: 100%;
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
  const values = [
    plan?.annualPremium,
    plan?.premiumAmount,
    plan?.premium,
    plan?.basePremium,
    plan?.price,
  ]

  const value = values.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      Number.isFinite(Number(item)),
  )

  return value === undefined ? null : Number(value)
}

function StoryCard({ story }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="ix-story-card">
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
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '100%',
              height: '100%',
              color: '#047857',
              background: '#d1fae5',
              fontSize: 42,
            }}
            aria-label={story.alt}
          >
            {story.icon}
          </div>
        )}

        <div className="ix-story-image-shade" />
        <div className="ix-story-icon" aria-hidden="true">
          {story.icon}
        </div>
      </div>

      <div className="ix-story-body">
        <div className="ix-story-eyebrow">{story.eyebrow}</div>
        <h3>{story.title}</h3>
        <p>{story.description}</p>

        <div className="ix-story-bottom">
          <span>INSUREX PROTECTION</span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </article>
  )
}

export default function Landing() {
  const { user } = useAuth()

  const dashboardPath =
    user?.role === 'ADMIN' ? '/admin' : '/app'

  const activePlans = PLANS.filter(
    (plan) => plan?.active !== false,
  ).slice(0, 3)

  return (
    <main className="ix-landing">
      <style>{STYLES}</style>

      <header className="ix-nav">
        <Link
          to={user ? dashboardPath : '/'}
          className="ix-brand"
          aria-label="InsureX home"
        >
          <span className="ix-brand-icon" aria-hidden="true">
            🛡️
          </span>

          <span>
            <span className="ix-brand-name">
              Insure<span>X</span>
            </span>
            <small>INSURANCE PLATFORM</small>
          </span>
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
          <div className="ix-kicker">
            <span className="ix-kicker-dot" />
            INSURANCE MADE SIMPLER
          </div>

          <h1>
            Protect what matters.
            <br />
            <span>Plan with confidence.</span>
          </h1>

          <p className="ix-hero-description">
            Life can be unpredictable. InsureX helps you explore
            insurance options and manage your insurance journey
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

          <div className="ix-trust">
            <span>✓ Explore available plans</span>
            <span>✓ Review coverage options</span>
            <span>✓ Manage in one place</span>
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
              <span>YOUR FUTURE. YOUR PROTECTION.</span>
              <h2>Confidence for life's journey.</h2>
              <p>
                Explore insurance options and take your next step
                with InsureX.
              </p>
            </div>
          </div>

          <div className="ix-floating-note">
            <div className="ix-floating-icon" aria-hidden="true">
              🛡️
            </div>
            <div>
              <strong>Protection starts here</strong>
              <small>Explore your options with InsureX</small>
            </div>
          </div>
        </div>
      </section>

      <section className="ix-section ix-section-soft">
        <div className="ix-container">
          <div className="ix-section-heading">
            <div className="ix-kicker">PROTECTION IN REAL LIFE</div>
            <h2>For life's unexpected moments</h2>
            <p>
              Explore coverage options for healthcare, vehicle protection,
              and the people who matter most.
            </p>
          </div>

          <div className="ix-story-grid">
            {STORIES.map((story) => (
              <StoryCard key={story.eyebrow} story={story} />
            ))}
          </div>

          <p className="ix-photo-credit">
            Photography served directly by{' '}
            <a
              href="https://unsplash.com/"
              target="_blank"
              rel="noreferrer"
            >
              Unsplash
            </a>
            .
          </p>
        </div>
      </section>

      <section className="ix-section">
        <div className="ix-container">
          <div className="ix-section-heading">
            <div className="ix-kicker">BUILT AROUND YOUR NEEDS</div>
            <h2>A simpler insurance experience</h2>
            <p>
              Get the tools you need to explore insurance and manage
              your account in one place.
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

      {activePlans.length > 0 && (
        <section className="ix-section ix-section-soft">
          <div className="ix-container">
            <div className="ix-section-heading">
              <div className="ix-kicker">EXPLORE YOUR OPTIONS</div>
              <h2>Find a plan for your needs</h2>
              <p>
                Explore the available insurance plans and continue
                through your InsureX account.
              </p>
            </div>

            <div className="ix-plan-grid">
              {activePlans.map((plan, index) => {
                const premium = getPlanPremium(plan)

                const key =
                  plan?.id ??
                  plan?.policyNumber ??
                  plan?.planId ??
                  plan?.name ??
                  index

                return (
                  <article className="ix-plan-card" key={key}>
                    <span className="ix-plan-tag">
                      {index === 0 ? 'Explore coverage' : 'Available plan'}
                    </span>

                    <h3>{getPlanName(plan)}</h3>
                    <p>{getPlanDescription(plan)}</p>

                    <div className="ix-plan-footer">
                      <div>
                        <small>Indicative premium</small>
                        <strong>
                          {premium !== null
                            ? inr(premium)
                            : 'View plan details'}
                        </strong>
                      </div>

                      <Link
                        to={user ? '/app/plans' : '/login'}
                        className="ix-btn ix-btn-primary"
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
        <div className="ix-container">
          <div className="ix-cta">
            <div>
              <h2>Ready to take the next step?</h2>
              <p>
                Create an account to explore plans and manage your
                insurance activity, or sign in to continue.
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
    </main>
  )
}

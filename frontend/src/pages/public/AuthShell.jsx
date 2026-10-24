
import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'

export default function AuthShell({ headline, text, children }) {
  return (
    <div className="ix-auth">
      <style>{`
        .ix-auth {
          --auth-green: #087f5b;
          --auth-dark: #07563e;
          --auth-text: #173b2c;
          --auth-muted: #708178;
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          min-height: 100vh;
          min-height: 100dvh;
          color: var(--auth-text);
          background: #ffffff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          isolation: isolate;
        }

        .ix-auth *,
        .ix-auth *::before,
        .ix-auth *::after {
          box-sizing: border-box;
        }

        .ix-auth a {
          text-decoration: none;
        }

        /* Animated green panel */
        .ix-auth-side {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          justify-content: space-between;
          gap: 36px;
          overflow: hidden;
          padding: clamp(28px, 5vw, 64px);
          color: #ffffff;
          background:
            radial-gradient(
              circle at 12% 80%,
              rgba(50, 211, 145, 0.22),
              transparent 34%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(141, 241, 189, 0.14),
              transparent 29%
            ),
            linear-gradient(145deg, #064d39 0%, #087f5b 58%, #10976b 100%);
          isolation: isolate;
          animation: ix-auth-panel-enter 850ms cubic-bezier(.2,.7,.2,1) both;
        }

        .ix-auth-side::before,
        .ix-auth-side::after {
          position: absolute;
          z-index: -1;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          content: "";
          pointer-events: none;
        }

        .ix-auth-side::before {
          top: 24%;
          right: -155px;
          width: 390px;
          height: 390px;
          animation: ix-auth-orbit 22s ease-in-out infinite alternate;
        }

        .ix-auth-side::after {
          right: -65px;
          bottom: -190px;
          width: 360px;
          height: 360px;
          border-color: rgba(166, 255, 209, 0.16);
          animation: ix-auth-orbit 18s ease-in-out infinite alternate-reverse;
        }

        .ix-auth-brand {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 11px;
          color: #ffffff !important;
          font-size: 24px;
          font-weight: 850;
          letter-spacing: -0.7px;
          transition:
            opacity 220ms ease,
            transform 220ms ease;
          animation: ix-auth-brand-enter 650ms ease both;
          animation-delay: 120ms;
        }

        .ix-auth-brand:hover {
          opacity: 0.92;
          transform: translateY(-2px);
        }

        .ix-auth-brand:active {
          transform: translateY(0) scale(.985);
        }

        .ix-auth-brand-mark {
          display: grid;
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
          transition:
            background 220ms ease,
            box-shadow 220ms ease,
            transform 220ms ease;
        }

        .ix-auth-brand:hover .ix-auth-brand-mark {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.15);
          transform: rotate(-4deg);
        }

        .ix-auth-brand-mark > * {
          max-width: 28px;
          max-height: 28px;
        }

        .ix-auth-brand-name {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ix-auth-brand-subtitle {
          color: rgba(255, 255, 255, 0.67);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
        }

        /* Staggered welcome message */
        .ix-auth-message {
          width: 100%;
          max-width: 490px;
          margin-block: auto;
          padding-block: 60px;
          animation: ix-auth-message-enter 800ms cubic-bezier(.2,.7,.2,1) both;
          animation-delay: 180ms;
        }

        .ix-auth-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          color: #e4fff0;
          background: rgba(255, 255, 255, 0.08);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          animation: ix-auth-item-enter 600ms ease both;
          animation-delay: 280ms;
        }

        .ix-auth-kicker-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: #8bf0b7;
          box-shadow: 0 0 0 4px rgba(139, 240, 183, 0.12);
          animation: ix-auth-dot-pulse 2.4s ease-in-out infinite;
        }

        .ix-auth-message h1 {
          max-width: 470px;
          margin: 24px 0 17px;
          color: #ffffff;
          font-size: clamp(34px, 4vw, 53px);
          font-weight: 850;
          letter-spacing: -2px;
          line-height: 1.12;
          animation: ix-auth-item-enter 650ms ease both;
          animation-delay: 370ms;
        }

        .ix-auth-message p {
          max-width: 420px;
          margin: 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.9;
          animation: ix-auth-item-enter 650ms ease both;
          animation-delay: 460ms;
        }

        .ix-auth-benefits {
          display: grid;
          gap: 15px;
          margin-top: 32px;
        }

        .ix-auth-benefit {
          display: flex;
          align-items: center;
          gap: 11px;
          color: rgba(255, 255, 255, 0.91);
          font-size: 12px;
          font-weight: 650;
          animation: ix-auth-item-enter 600ms ease both;
          transition:
            color 180ms ease,
            transform 180ms ease;
        }

        .ix-auth-benefit:nth-child(1) {
          animation-delay: 520ms;
        }

        .ix-auth-benefit:nth-child(2) {
          animation-delay: 610ms;
        }

        .ix-auth-benefit:nth-child(3) {
          animation-delay: 700ms;
        }

        .ix-auth-benefit:hover {
          color: #ffffff;
          transform: translateX(4px);
        }

        .ix-auth-benefit-icon {
          display: grid;
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          color: #a8f4c8;
          background: rgba(255, 255, 255, 0.09);
          font-size: 12px;
          font-weight: 900;
          transition:
            background 180ms ease,
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .ix-auth-benefit:hover .ix-auth-benefit-icon {
          background: rgba(255, 255, 255, 0.17);
          box-shadow: 0 0 16px rgba(139, 240, 183, 0.12);
          transform: scale(1.08);
        }

        .ix-auth-footer {
          color: rgba(255, 255, 255, 0.62);
          font-size: 11px;
          line-height: 1.8;
          animation: ix-auth-item-enter 650ms ease both;
          animation-delay: 750ms;
        }

        /* Animated form area */
        .ix-auth-main {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 5vw, 68px);
          background:
            radial-gradient(
              ellipse at top right,
              rgba(224, 246, 232, 0.45),
              transparent 40%
            ),
            #ffffff;
          animation: ix-auth-main-enter 800ms cubic-bezier(.2,.7,.2,1) both;
          animation-delay: 100ms;
        }

        .ix-auth-content {
          width: 100%;
          max-width: 460px;
          min-width: 0;
          animation: ix-auth-card-enter 750ms cubic-bezier(.2,.7,.2,1) both;
          animation-delay: 250ms;
        }

        .ix-auth-mobile-brand {
          display: none;
        }

        .ix-auth-card {
          width: 100%;
          min-width: 0;
          animation: ix-auth-form-enter 650ms ease both;
          animation-delay: 350ms;
        }

        .ix-auth-card input,
        .ix-auth-card select,
        .ix-auth-card textarea {
          max-width: 100%;
        }

        .ix-auth-card button {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .ix-auth-card button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .ix-auth-card button:active:not(:disabled) {
          transform: translateY(0) scale(.99);
        }

        .ix-auth-card button:focus-visible,
        .ix-auth-brand:focus-visible {
          outline: 3px solid #69c99a;
          outline-offset: 3px;
        }

        /* Entrance and ambient animation keyframes */
        @keyframes ix-auth-panel-enter {
          from {
            opacity: 0;
            transform: translateX(-18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes ix-auth-main-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ix-auth-card-enter {
          from {
            opacity: 0;
            transform: translateY(20px) scale(.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ix-auth-message-enter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-auth-item-enter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-auth-brand-enter {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-auth-orbit {
          from { transform: translate3d(0, 0, 0) rotate(0deg); }
          to { transform: translate3d(-18px, 14px, 0) rotate(9deg); }
        }

        @keyframes ix-auth-dot-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(139, 240, 183, 0.12);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(139, 240, 183, 0.04);
          }
        }

        @keyframes ix-auth-form-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .ix-auth {
            grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
          }

          .ix-auth-side {
            padding: 34px 28px;
          }

          .ix-auth-main {
            padding: 32px 26px;
          }

          .ix-auth-message h1 {
            font-size: clamp(32px, 4.3vw, 43px);
          }
        }

        @media (max-width: 680px) {
          .ix-auth {
            grid-template-columns: 1fr;
            min-height: 100vh;
            min-height: 100dvh;
            background: #f8fbf9;
          }

          .ix-auth-side {
            min-height: auto;
            gap: 24px;
            padding: 25px 22px 27px;
            animation-name: ix-auth-mobile-panel-enter;
          }

          .ix-auth-side::before {
            top: -180px;
            right: -90px;
            width: 260px;
            height: 260px;
          }

          .ix-auth-side::after {
            right: -130px;
            bottom: -230px;
            width: 300px;
            height: 300px;
          }

          .ix-auth-brand {
            font-size: 21px;
          }

          .ix-auth-brand-mark {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .ix-auth-message {
            padding-block: 13px 0;
          }

          .ix-auth-kicker {
            padding: 7px 10px;
            font-size: 9px;
          }

          .ix-auth-message h1 {
            margin: 15px 0 9px;
            font-size: clamp(26px, 6vw, 35px);
            letter-spacing: -1.1px;
          }

          .ix-auth-message p {
            font-size: 12px;
            line-height: 1.7;
          }

          .ix-auth-benefits,
          .ix-auth-footer {
            display: none;
          }

          .ix-auth-main {
            align-items: flex-start;
            padding: 28px 18px 36px;
            background: #f8fbf9;
          }

          .ix-auth-content {
            max-width: 460px;
            margin-inline: auto;
            padding: 23px 20px;
            border: 1px solid #e7eee9;
            border-radius: 17px;
            background: #ffffff;
            box-shadow: 0 8px 30px rgba(20, 59, 43, 0.045);
            animation-name: ix-auth-mobile-card-enter;
          }

          .ix-auth-mobile-brand {
            display: inline-flex;
            margin-bottom: 24px;
            color: var(--auth-dark) !important;
            animation-delay: 180ms;
          }

          .ix-auth-mobile-brand .ix-auth-brand-mark {
            border-color: #dcefe4;
            background: #eaf7ef;
            box-shadow: none;
          }

          .ix-auth-mobile-brand .ix-auth-brand-subtitle {
            color: #6b8476;
          }

          .ix-auth-mobile-brand:hover .ix-auth-brand-mark {
            background: #dff3e7;
            box-shadow: 0 5px 14px rgba(8, 127, 91, .1);
          }

          .ix-auth-mobile-brand:focus-visible {
            outline-color: #69c99a;
          }

          .ix-auth-card {
            animation-delay: 280ms;
          }
        }

        @keyframes ix-auth-mobile-panel-enter {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-auth-mobile-card-enter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 380px) {
          .ix-auth-side {
            padding-inline: 18px;
          }

          .ix-auth-message h1 {
            font-size: 26px;
          }

          .ix-auth-main {
            padding-inline: 12px;
          }

          .ix-auth-content {
            padding: 20px 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ix-auth *,
          .ix-auth *::before,
          .ix-auth *::after {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <aside className="ix-auth-side">
        <Link to="/" className="ix-auth-brand">
          <span className="ix-auth-brand-mark">
            <Logo />
          </span>

          <span className="ix-auth-brand-name">
            InsureX
            <span className="ix-auth-brand-subtitle">
              INSURANCE PLATFORM
            </span>
          </span>
        </Link>

        <div className="ix-auth-message">
          <span className="ix-auth-kicker">
            <span className="ix-auth-kicker-dot" />
            YOUR COVER. YOUR CONTROL.
          </span>

          <h1>{headline}</h1>
          <p>{text}</p>

          <div className="ix-auth-benefits">
            <div className="ix-auth-benefit">
              <span className="ix-auth-benefit-icon">✓</span>
              Manage policies in one place
            </div>

            <div className="ix-auth-benefit">
              <span className="ix-auth-benefit-icon">✓</span>
              Keep track of claims and payments
            </div>

            <div className="ix-auth-benefit">
              <span className="ix-auth-benefit-icon">✓</span>
              Access your insurance account conveniently
            </div>
          </div>
        </div>

        <span className="ix-auth-footer">
          Premiums, policies, claims and payouts in one place.
          <br />
          © {new Date().getFullYear()} InsureX Insurance Platform
        </span>
      </aside>

      <main className="ix-auth-main">
        <div className="ix-auth-content">
          <Link to="/" className="ix-auth-mobile-brand ix-auth-brand">
            <span className="ix-auth-brand-mark">
              <Logo />
            </span>

            <span className="ix-auth-brand-name">
              InsureX
              <span className="ix-auth-brand-subtitle">
                INSURANCE PLATFORM
              </span>
            </span>
          </Link>

          <div className="ix-auth-card">{children}</div>
        </div>
      </main>
    </div>
  )
}

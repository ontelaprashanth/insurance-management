
import { Logo } from './ui'

export default function LoadingScreen({
  message = 'Preparing your secure dashboard...',
  fullScreen = true,
}) {
  return (
    <div
      className={`insurex-loader${fullScreen ? ' insurex-loader-full' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="insurex-loader-content">
        <div className="insurex-loader-symbol" aria-hidden="true">
          <span className="insurex-loader-ring" />
          <span className="insurex-loader-ring inner" />

          <div className="insurex-loader-logo">
            <Logo size={48} />
          </div>
        </div>

        <h2 className="insurex-loader-title">InsureX</h2>

        <p className="insurex-loader-message">{message}</p>

        <div
          className="insurex-loader-progress"
          aria-hidden="true"
        >
          <span />
        </div>

        <span className="insurex-loader-caption">
          <span className="insurex-loader-status-dot" />
          Secure insurance management
        </span>
      </div>

      <style>{`
        .insurex-loader {
          --loader-green: #047857;
          --loader-dark: #064e3b;
          --loader-light: #d1fae5;

          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 260px;
          padding: 32px 20px;
          box-sizing: border-box;
          background: #f7fbf8;
          color: #102a20;
          font-family: inherit;
        }

        .insurex-loader-full {
          position: fixed;
          inset: 0;
          z-index: 9999;
          min-height: 100vh;
          min-height: 100dvh;
          overflow: auto;
          background:
            radial-gradient(
              ellipse at 50% 38%,
              rgba(167, 243, 208, 0.22),
              transparent 52%
            ),
            #f7fbf8;
        }

        .insurex-loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 380px;
          text-align: center;
          animation: insurex-loader-enter 500ms ease-out both;
        }

        .insurex-loader-symbol {
          position: relative;
          display: grid;
          place-items: center;
          width: 112px;
          height: 112px;
          margin-bottom: 25px;
        }

        .insurex-loader-ring {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(4, 120, 87, 0.13);
          border-top-color: #047857;
          border-right-color: #10b981;
          border-radius: 50%;
          animation: insurex-loader-spin 1.6s linear infinite;
        }

        .insurex-loader-ring.inner {
          inset: 10px;
          border: 2px solid rgba(16, 185, 129, 0.12);
          border-bottom-color: #34d399;
          border-left-color: #059669;
          animation: insurex-loader-spin-reverse 2.2s linear infinite;
        }

        .insurex-loader-logo {
          display: grid;
          place-items: center;
          width: 76px;
          height: 76px;
          border: 1px solid rgba(16, 185, 129, 0.17);
          border-radius: 24px;
          background: linear-gradient(145deg, #ffffff, #ecfdf5);
          box-shadow:
            0 8px 22px rgba(6, 78, 59, 0.08),
            inset 0 1px 0 #ffffff;
          animation: insurex-loader-float 2.8s ease-in-out infinite;
        }

        .insurex-loader-title {
          margin: 0;
          color: var(--loader-dark);
          font-size: clamp(27px, 5vw, 32px);
          font-weight: 800;
          letter-spacing: -1.1px;
          line-height: 1.2;
        }

        .insurex-loader-message {
          max-width: 320px;
          margin: 12px 0 23px;
          color: #64766c;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .insurex-loader-progress {
          position: relative;
          width: min(220px, 75%);
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: #dcefe5;
        }

        .insurex-loader-progress span {
          position: absolute;
          top: 0;
          bottom: 0;
          left: -42%;
          width: 42%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #059669,
            #34d399,
            #047857
          );
          animation: insurex-loader-progress 1.5s ease-in-out infinite;
        }

        .insurex-loader-caption {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 19px;
          color: #829187;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.15px;
          text-transform: uppercase;
        }

        .insurex-loader-status-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
          animation: insurex-loader-pulse 1.8s ease-in-out infinite;
        }

        @keyframes insurex-loader-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes insurex-loader-spin-reverse {
          to { transform: rotate(-360deg); }
        }

        @keyframes insurex-loader-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes insurex-loader-progress {
          0% { left: -42%; }
          100% { left: 110%; }
        }

        @keyframes insurex-loader-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        @keyframes insurex-loader-enter {
          from {
            opacity: 0;
            transform: translateY(9px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 480px) {
          .insurex-loader {
            padding: 24px 18px;
          }

          .insurex-loader-symbol {
            width: 100px;
            height: 100px;
            margin-bottom: 22px;
          }

          .insurex-loader-logo {
            width: 68px;
            height: 68px;
            border-radius: 21px;
          }

          .insurex-loader-message {
            font-size: 13px;
          }

          .insurex-loader-caption {
            font-size: 10px;
            letter-spacing: 0.8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .insurex-loader-content,
          .insurex-loader-ring,
          .insurex-loader-ring.inner,
          .insurex-loader-logo,
          .insurex-loader-progress span,
          .insurex-loader-status-dot {
            animation: none !important;
          }

          .insurex-loader-progress span {
            left: 0;
            width: 100%;
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}


import { Logo } from './ui'

export default function LoadingScreen({
  message = 'Preparing your secure dashboard...',
  fullScreen = true,
}) {
  return (
    <div
      className={`insurex-loader ${
        fullScreen ? 'insurex-loader-full' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="insurex-loader-content">
        <div className="insurex-loader-symbol">
          <span className="insurex-loader-ring" />
          <span className="insurex-loader-ring inner" />
          <Logo size={48} />
        </div>

        <h2 className="insurex-loader-title">
          InsureX
        </h2>

        <p className="insurex-loader-message">
          {message}
        </p>

        <div
          className="insurex-loader-progress"
          aria-hidden="true"
        >
          <span />
        </div>

        <span className="insurex-loader-caption">
          Secure insurance management
        </span>
      </div>
    </div>
  )
}

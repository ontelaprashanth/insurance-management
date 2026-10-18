import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'

export default function AuthShell({ headline, text, children }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="brand"><Logo /> InsureX</Link>
        <div>
          <h2>{headline}</h2>
          <p>{text}</p>
        </div>
        <span style={{ color: '#7ea6a2', fontSize: 13.5 }}>Premiums, policies, claims and payouts in one place.</span>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  )
}

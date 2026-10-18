import { useState } from 'react'
import { Link } from 'react-router-dom'
import CoverageDial from '../../components/CoverageDial'
import { Logo } from '../../components/ui'
import { PLANS } from '../../lib/premium'
import { inr } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const [plan, setPlan] = useState('health')
  const [val, setVal] = useState({ coverage: 2_500_000, years: 3 })

  return (
    <div className="land">
      <header className="land-nav">
        <Link to="/" className="brand"><Logo /> InsureX</Link>
        <div className="row">
          {user ? (
            <Link className="btn dark" to={user.role === 'ADMIN' ? '/admin' : '/app'}>Open portal</Link>
          ) : (
            <>
              <Link className="btn ghost" to="/login">Sign in</Link>
              <Link className="btn dark" to="/register">Create account</Link>
            </>
          )}
        </div>
      </header>

      <section className="land-hero">
        <div>
          <h1>Know your premium before you sign anything.</h1>
          <p className="lead">
            Pick a cover, drag the amount and term, and see exactly what you would pay.
            When a claim comes, you can follow it from filing to payout.
          </p>
          <div className="row wrap">
            <Link className="btn primary lg" to="/register">Get covered</Link>
            <Link className="btn lg" to="/login">I already have an account</Link>
          </div>
        </div>
        <CoverageDial value={val} onChange={setVal} planKey={plan} onPlanChange={setPlan} />
      </section>

      <section className="plans" aria-labelledby="plans-h">
        <h2 id="plans-h">Six covers, one price per ₹10 lakh</h2>
        <div className="plan-list">
          {PLANS.map((p) => (
            <div className="plan-line" key={p.key}>
              <b>{p.label}</b>
              <p className="muted">{p.blurb}</p>
              <span className="price">from {inr(p.yearly)} / year</span>
            </div>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 14, fontSize: 13.5 }}>
          Prices shown are per year for ₹10 lakh of cover. Terms of 2 years or more get 5% off.
        </p>
      </section>

      <footer className="land-foot">InsureX — insurance management portal</footer>
    </div>
  )
}

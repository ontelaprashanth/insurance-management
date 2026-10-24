import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, HeartPulse, ShieldCheck, Sparkles, CarFront, Umbrella, RefreshCw, CheckCircle2 } from 'lucide-react'
import { plans } from '../../api/endpoints'
import { PageHeader, StatusBadge } from '../../components/ui'
import { planFor } from '../../lib/premium'
import { inr } from '../../lib/format'

function isFalse(value) {
  return value === false || value === 0 ||
    ['false', '0', 'no', 'inactive', 'disabled'].includes(String(value ?? '').trim().toLowerCase())
}

function normalizePlans(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  if (Array.isArray(data?.plans)) return data.plans
  return []
}

function getPlanStatus(plan) {
  return isFalse(plan?.isActive) ? 'INACTIVE' : 'ACTIVE'
}

function formatAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? inr(amount) : null
}

function planIcon(value) {
  const type = String(value ?? '').toLowerCase()
  if (type.includes('health') || type.includes('medical')) return HeartPulse
  if (type.includes('motor') || type.includes('vehicle') || type.includes('car')) return CarFront
  if (type.includes('life') || type.includes('term')) return Umbrella
  return ShieldCheck
}

export default function Plans() {
  const q = useQuery({
    queryKey: ['insurance-plans'],
    queryFn: plans.available,
    staleTime: 60_000,
    retry: 1,
  })

  const rows = normalizePlans(q.data)
  const activeCount = rows.filter((item) => getPlanStatus(item) === 'ACTIVE').length

  return (
    <div className="ix-plans-page">
      <PageHeader
        title="Buy insurance"
        subtitle="Explore our insurance plans and choose cover that suits your needs."
      />

      <section className="ix-plans-hero" aria-label="Insurance plans introduction">
        <div>
          <span className="ix-plans-hero-label"><Sparkles size={15} aria-hidden="true" /> Protection made simple</span>
          <h2 className="ix-plans-hero-title">Choose the right cover for your future</h2>
          <p className="ix-plans-hero-copy">Compare available insurance plans, review the starting premium and continue to a secure purchase.</p>
        </div>
        <div className="ix-plans-hero-icon"><ShieldCheck size={34} aria-hidden="true" /></div>
      </section>

      {q.isPending ? (
        <div className="ix-plans-state" role="status"><RefreshCw size={26} aria-hidden="true" /><h4>Loading insurance plans…</h4><p>Checking the latest available plans.</p></div>
      ) : q.isError ? (
        <div className="ix-plans-state" role="alert">
          <h4>Unable to load insurance plans</h4>
          <p>Check your connection and try again. If the issue continues, verify that the backend is running and the permanent catalogue endpoint is accessible.</p>
          <button type="button" className="ix-plans-retry" onClick={() => q.refetch()}><RefreshCw size={16} /> Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="ix-plans-state">
          <h4>No insurance plans available</h4>
          <p>The catalogue returned no plans. Verify that the backend InsurancePlanSeeder has run and that GET /api/plans/available returns the six default plans.</p>
          <button type="button" className="ix-plans-retry" onClick={() => q.refetch()}><RefreshCw size={16} /> Refresh plans</button>
        </div>
      ) : (
        <>
          <div className="ix-plans-count">
            <span><strong>{rows.length}</strong> {rows.length === 1 ? 'plan' : 'plans'} available</span>
            <span className="ix-plans-count-note"><CheckCircle2 size={16} aria-hidden="true" /> {activeCount} ready to purchase</span>
          </div>
          <div className="ix-plans-grid" aria-label="Available insurance plans">
            {rows.map((item, index) => {
              const planType = item.coveredType || item.planName || item.planCode || 'Insurance'
              const details = planFor(planType)
              const status = getPlanStatus(item)
              const canBuy = Boolean(item.planId) && status === 'ACTIVE'
              const premium = formatAmount(item.basePremium) ?? (details ? formatAmount(details.yearly) : null)
              const coverage = formatAmount(item.baseCoverage)
              const PlanIcon = planIcon(planType)
              return (
                <article className="ix-plan-card" key={item.planId ?? item.planCode ?? index}>
                  <div className="ix-plan-head">
                    <div className="ix-plan-icon"><PlanIcon size={25} aria-hidden="true" /></div>
                    <StatusBadge value={status} />
                  </div>
                  <div>
                    <h3 className="ix-plan-name">{item.planName || planType}</h3>
                    {item.planCode && <div className="ix-plan-code">Plan code: {item.planCode}</div>}
                  </div>
                  <p className="ix-plan-desc">{item.description || details?.blurb || 'Insurance coverage designed around your needs.'}</p>
                  <div className="ix-plan-price">
                    <div className="ix-plan-price-label">Starting premium</div>
                    <strong>{premium !== null ? premium : 'Calculated at checkout'}</strong>
                    {premium !== null && <small>{coverage ? `Base premium · ${coverage} cover` : 'Base premium'}</small>}
                  </div>
                  {canBuy ? (
                    <Link className="ix-plan-cta" to={`/app/plans/${encodeURIComponent(item.planId)}/buy`} state={{ plan: item }}>
                      Choose this plan <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button type="button" className="ix-plan-cta ix-plan-cta-disabled" disabled title="This insurance plan is currently unavailable.">Currently unavailable</button>
                  )}
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

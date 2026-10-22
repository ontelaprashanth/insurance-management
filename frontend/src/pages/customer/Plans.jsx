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
      <style>{`
        .ix-plans-page { --ix-emerald:#08764b; --ix-deep:#103f30; --ix-muted:#4b6c5d; color:var(--ix-deep); }
        .ix-plans-page .ix-plans-hero { position:relative; isolation:isolate; overflow:hidden; display:flex; align-items:center; justify-content:space-between; gap:22px; padding:24px 28px; margin:0 0 20px; border:1px solid #bce5cd; border-radius:22px; background:linear-gradient(120deg,#e7f8ed 0%,#f7fdf9 65%,#e3f6eb 100%); animation:ixPlansRise .6s both; }
        .ix-plans-page .ix-plans-hero::before { content:''; position:absolute; width:250px; height:250px; right:-85px; top:-130px; border-radius:50%; background:radial-gradient(circle,rgba(21,159,95,.16),transparent 72%); z-index:-1; }
        .ix-plans-page .ix-plans-hero-title { font-weight:800; font-size:clamp(19px,2.3vw,26px); letter-spacing:-.035em; margin:6px 0; color:#10412d; }
        .ix-plans-page .ix-plans-hero-copy { color:#456957; margin:0; line-height:1.55; max-width:580px; font-size:14px; }
        .ix-plans-page .ix-plans-hero-label { display:inline-flex; align-items:center; gap:7px; font-size:12px; color:#087348; font-weight:750; text-transform:uppercase; letter-spacing:.07em; }
        .ix-plans-page .ix-plans-hero-icon { flex:0 0 70px; width:70px; height:70px; display:grid; place-items:center; border-radius:20px; color:#087a4b; background:#d0f1dd; box-shadow:0 10px 25px rgba(13,123,76,.11); animation:ixPlansFloat 3.6s ease-in-out infinite; }
        .ix-plans-page .ix-plans-count { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin:0 0 15px; color:#426452; font-size:13px; font-weight:650; }
        .ix-plans-page .ix-plans-count strong { color:#0c6842; }
        .ix-plans-page .ix-plans-count-note { display:inline-flex; align-items:center; gap:7px; }
        .ix-plans-page .ix-plans-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr)); gap:17px; }
        .ix-plans-page .ix-plan-card { position:relative; isolation:isolate; overflow:hidden; min-width:0; display:flex; flex-direction:column; gap:16px; padding:22px; border:1px solid #c7e5d3; border-radius:20px; background:linear-gradient(155deg,#fff 0%,#f3fbf6 100%); box-shadow:0 5px 18px rgba(16,96,59,.06); animation:ixPlansRise .6s cubic-bezier(.2,.8,.2,1) both; animation-delay:calc(min(var(--ix-plan-index,0),9) * 70ms); transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease; }
        .ix-plans-page .ix-plan-card::before { content:''; position:absolute; width:90px; height:150%; top:-25%; left:-45%; transform:skewX(-20deg); background:linear-gradient(90deg,transparent,rgba(59,185,116,.12),transparent); pointer-events:none; }
        .ix-plans-page .ix-plan-card:hover { transform:translateY(-7px); border-color:#44ac79; box-shadow:0 20px 36px rgba(15,109,68,.15); }
        .ix-plans-page .ix-plan-card:hover::before { animation:ixPlansShimmer .9s ease-out; }
        .ix-plans-page .ix-plan-card:focus-within { outline:3px solid rgba(24,140,85,.22); outline-offset:2px; }
        .ix-plans-page .ix-plan-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .ix-plans-page .ix-plan-icon { display:grid; place-items:center; width:49px; height:49px; border-radius:15px; color:#087749; background:#dcf5e6; flex-shrink:0; transition:transform .28s ease; }
        .ix-plans-page .ix-plan-card:hover .ix-plan-icon { transform:rotate(-7deg) scale(1.09); }
        .ix-plans-page .ix-plan-name { margin:0; font-size:20px; line-height:1.3; font-weight:800; letter-spacing:-.025em; color:#103f2d; overflow-wrap:anywhere; }
        .ix-plans-page .ix-plan-desc { margin:0; color:#4b6b59; line-height:1.65; font-size:13.5px; min-height:44px; }
        .ix-plans-page .ix-plan-code { color:#658372; font-size:11px; letter-spacing:.025em; overflow-wrap:anywhere; }
        .ix-plans-page .ix-plan-price { padding:17px; border:1px solid #d1ebda; border-radius:15px; background:#eaf8ef; }
        .ix-plans-page .ix-plan-price-label { color:#4a6c5b; font-size:12px; font-weight:650; margin-bottom:6px; }
        .ix-plans-page .ix-plan-price strong { display:block; color:#075e3a; font-size:clamp(19px,2vw,25px); line-height:1.3; letter-spacing:-.03em; overflow-wrap:anywhere; }
        .ix-plans-page .ix-plan-price small { display:block; color:#4c705d; font-size:12px; line-height:1.5; margin-top:5px; }
        .ix-plans-page .ix-plan-cta { display:inline-flex; align-items:center; justify-content:center; gap:9px; width:100%; min-height:44px; margin-top:auto; padding:11px 15px; border-radius:12px; background:linear-gradient(105deg,#087c4d,#139a62); color:#fff !important; text-decoration:none; font-size:14px; font-weight:750; box-shadow:0 6px 14px rgba(13,122,74,.16); transition:transform .2s ease,box-shadow .2s ease,filter .2s ease; }
        .ix-plans-page .ix-plan-cta:hover { transform:translateY(-2px); box-shadow:0 10px 20px rgba(13,122,74,.24); filter:brightness(1.05); }
        .ix-plans-page .ix-plan-cta svg { transition:transform .2s ease; }
        .ix-plans-page .ix-plan-cta:hover svg { transform:translateX(4px); }
        .ix-plans-page .ix-plan-cta-disabled { background:#e4ede8; color:#6c8175 !important; box-shadow:none; cursor:not-allowed; border:1px solid #d5e1da; }
        .ix-plans-page .ix-plan-cta-disabled:hover { transform:none; filter:none; box-shadow:none; }
        .ix-plans-page .ix-plans-state { text-align:center; border:1px solid #d3e9db; border-radius:20px; background:#f4fbf6; padding:36px 20px; color:#315b43; }
        .ix-plans-page .ix-plans-state h4 { color:#174b33; margin:0 0 9px; font-size:18px; }
        .ix-plans-page .ix-plans-state p { max-width:590px; margin:0 auto 17px; line-height:1.65; color:#52705d; }
        .ix-plans-page .ix-plans-retry { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:11px; background:#087c4d; color:#fff; padding:11px 17px; cursor:pointer; font-weight:700; }
        .ix-plans-page .ix-plans-retry:hover { background:#09683f; }
        @keyframes ixPlansRise { from { opacity:0; transform:translateY(18px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes ixPlansFloat { 0%,100% { transform:translateY(0) rotate(0); } 50% { transform:translateY(-6px) rotate(5deg); } }
        @keyframes ixPlansShimmer { from { left:-45%; } to { left:130%; } }
        @media(max-width:640px) { .ix-plans-page .ix-plans-hero { padding:19px; gap:12px; } .ix-plans-page .ix-plans-hero-icon { width:49px; height:49px; flex-basis:49px; border-radius:14px; } .ix-plans-page .ix-plans-hero-icon svg { width:24px; } .ix-plans-page .ix-plan-card { padding:17px; gap:13px; } .ix-plans-page .ix-plans-grid { gap:12px; } }
        @media(prefers-reduced-motion:reduce) { .ix-plans-page .ix-plan-card,.ix-plans-page .ix-plans-hero,.ix-plans-page .ix-plans-hero-icon,.ix-plans-page .ix-plan-card::before { animation:none !important; } .ix-plans-page .ix-plan-card,.ix-plans-page .ix-plan-icon,.ix-plans-page .ix-plan-cta,.ix-plans-page .ix-plan-cta svg { transition:none !important; } .ix-plans-page .ix-plan-card:hover,.ix-plans-page .ix-plan-card:hover .ix-plan-icon,.ix-plans-page .ix-plan-cta:hover,.ix-plans-page .ix-plan-cta:hover svg { transform:none !important; } }
      `}</style>

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
                <article className="ix-plan-card" key={item.planId ?? item.planCode ?? index} style={{ '--ix-plan-index': index }}>
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

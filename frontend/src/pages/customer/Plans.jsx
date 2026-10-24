
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  CarFront,
  Umbrella,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

import { plans } from '../../api/endpoints'
import { PageHeader, StatusBadge } from '../../components/ui'
import {
  ACTIVE_PLANS,
  planFor,
} from '../../lib/premium'
import { inr } from '../../lib/format'

function isFalse(value) {
  return (
    value === false ||
    value === 0 ||
    ['false', '0', 'no', 'inactive', 'disabled'].includes(
      String(value ?? '').trim().toLowerCase(),
    )
  )
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
  const activeValue =
    plan?.isActive ??
    plan?.active ??
    plan?.status

  if (activeValue === undefined || activeValue === null) {
    return 'ACTIVE'
  }

  return isFalse(activeValue) ||
    String(activeValue).toLowerCase() === 'inactive'
    ? 'INACTIVE'
    : 'ACTIVE'
}

function getPlanKey(plan) {
  return String(
    plan?.planCode ??
    plan?.code ??
    plan?.key ??
    plan?.planName ??
    plan?.name ??
    '',
  ).trim().toLowerCase()
}

function getPlanId(plan) {
  return plan?.planId ?? plan?.id ?? null
}

function getPlanType(plan) {
  return (
    plan?.coveredType ??
    plan?.type ??
    plan?.planName ??
    plan?.name ??
    plan?.planCode ??
    'Insurance'
  )
}

function formatAmount(value) {
  const amount = Number(value)

  return Number.isFinite(amount) && amount >= 0
    ? inr(amount)
    : null
}

function planIcon(value) {
  const type = String(value ?? '').toLowerCase()

  if (type.includes('health') || type.includes('medical')) {
    return HeartPulse
  }

  if (
    type.includes('motor') ||
    type.includes('vehicle') ||
    type.includes('car') ||
    type.includes('bike')
  ) {
    return CarFront
  }

  if (type.includes('life') || type.includes('term')) {
    return Umbrella
  }

  return ShieldCheck
}

function toLocalPlan(plan) {
  return {
    planId: plan.id,
    id: plan.id,
    planCode: plan.code,
    code: plan.code,
    planName: plan.name,
    name: plan.name,
    coveredType: plan.type,
    type: plan.type,
    basePremium: plan.yearly,
    baseCoverage: plan.coverage,
    description: plan.description,
    isActive: plan.active,
    active: plan.active,
    isLocalEstimate: true,
  }
}

function mergePlans(apiPlans) {
  const result = [...apiPlans]
  const knownKeys = new Set(apiPlans.map(getPlanKey))

  for (const localPlan of ACTIVE_PLANS) {
    const key = getPlanKey({
      planCode: localPlan.code,
      planName: localPlan.name,
    })

    if (!knownKeys.has(key)) {
      result.push(toLocalPlan(localPlan))
      knownKeys.add(key)
    }
  }

  return result
}

export default function Plans() {
  const q = useQuery({
    queryKey: ['insurance-plans'],
    queryFn: plans.available,
    staleTime: 60_000,
    retry: 1,
  })

  const apiRows = normalizePlans(q.data)

  // If the backend returns plans, merge missing catalogue entries for display.
  // If the request fails, show the local catalogue as estimates.
  const rows = q.isError
    ? ACTIVE_PLANS.map(toLocalPlan)
    : mergePlans(apiRows)

  const activeCount = rows.filter(
    (item) => getPlanStatus(item) === 'ACTIVE',
  ).length

  return (
    <div className="ix-plans-page">
      <PageHeader
        title="Buy insurance"
        subtitle="Explore our insurance plans and choose cover that suits your needs."
      />

      <section
        className="ix-plans-hero"
        aria-label="Insurance plans introduction"
      >
        <div>
          <span className="ix-plans-hero-label">
            <Sparkles size={15} aria-hidden="true" />
            Protection made simple
          </span>

          <h2 className="ix-plans-hero-title">
            Choose the right cover for your future
          </h2>

          <p className="ix-plans-hero-copy">
            Compare health, life, and motor insurance estimates.
            Confirm availability before purchasing.
          </p>
        </div>

        <div className="ix-plans-hero-icon">
          <ShieldCheck size={34} aria-hidden="true" />
        </div>
      </section>

      {q.isPending && (
        <div className="ix-plans-state" role="status">
          <RefreshCw size={26} aria-hidden="true" />
          <h4>Loading insurance plans…</h4>
          <p>Checking the latest available plans.</p>
        </div>
      )}

      {!q.isPending && rows.length === 0 && (
        <div className="ix-plans-state">
          <h4>No insurance plans available</h4>
          <p>
            No plans were returned by the backend or the local catalogue.
          </p>
          <button
            type="button"
            className="ix-plans-retry"
            onClick={() => q.refetch()}
          >
            <RefreshCw size={16} />
            Refresh plans
          </button>
        </div>
      )}

      {!q.isPending && rows.length > 0 && (
        <>
          {q.isError && (
            <div className="ix-plans-state" role="status">
              <h4>Showing local premium estimates</h4>
              <p>
                The backend catalogue could not be reached. Local entries
                are estimates only; purchase requires a valid backend plan ID.
              </p>
              <button
                type="button"
                className="ix-plans-retry"
                onClick={() => q.refetch()}
              >
                <RefreshCw size={16} />
                Retry backend
              </button>
            </div>
          )}

          <div className="ix-plans-count">
            <span>
              <strong>{rows.length}</strong>{' '}
              {rows.length === 1 ? 'plan' : 'plans'} displayed
            </span>

            <span className="ix-plans-count-note">
              <CheckCircle2 size={16} aria-hidden="true" />
              {activeCount} marked active
            </span>
          </div>

          <div
            className="ix-plans-grid"
            aria-label="Available insurance plans"
          >
            {rows.map((item, index) => {
              const planType = getPlanType(item)
              const details = planFor(
                item.planCode ??
                item.code ??
                item.planName ??
                planType,
              )

              const status = getPlanStatus(item)
              const id = getPlanId(item)

              // Never allow a local estimate to bypass backend purchase validation.
              const canBuy =
                Boolean(id) &&
                !item.isLocalEstimate &&
                status === 'ACTIVE'

              const premium =
                formatAmount(item.basePremium) ??
                (details ? formatAmount(details.yearly) : null)

              const coverage = formatAmount(
                item.baseCoverage ?? item.coverage,
              )

              const PlanIcon = planIcon(planType)

              return (
                <article
                  className="ix-plan-card"
                  key={id ?? item.planCode ?? item.code ?? index}
                >
                  <div className="ix-plan-head">
                    <div className="ix-plan-icon">
                      <PlanIcon size={25} aria-hidden="true" />
                    </div>
                    <StatusBadge value={status} />
                  </div>

                  <div>
                    <h3 className="ix-plan-name">
                      {item.planName ?? item.name ?? planType}
                    </h3>

                    {(item.planCode ?? item.code) && (
                      <div className="ix-plan-code">
                        Plan code: {item.planCode ?? item.code}
                      </div>
                    )}
                  </div>

                  <p className="ix-plan-desc">
                    {item.description ??
                      details?.description ??
                      'Insurance coverage designed around your needs.'}
                  </p>

                  <div className="ix-plan-price">
                    <div className="ix-plan-price-label">
                      Starting annual premium
                    </div>

                    <strong>
                      {premium !== null
                        ? premium
                        : 'Calculated at checkout'}
                    </strong>

                    {premium !== null && (
                      <small>
                        {coverage
                          ? `Listed premium · ${coverage} cover`
                          : 'Indicative premium'}
                      </small>
                    )}
                  </div>

                  {canBuy ? (
                    <Link
                      className="ix-plan-cta"
                      to={`/app/plans/${encodeURIComponent(id)}/buy`}
                      state={{ plan: item }}
                    >
                      Choose this plan
                      <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="ix-plan-cta ix-plan-cta-disabled"
                      disabled
                      title={
                        item.isLocalEstimate
                          ? 'This is an estimate. A corresponding backend plan must exist before purchasing.'
                          : 'This insurance plan is currently unavailable.'
                      }
                    >
                      {item.isLocalEstimate
                        ? 'Estimate only'
                        : 'Currently unavailable'}
                    </button>
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

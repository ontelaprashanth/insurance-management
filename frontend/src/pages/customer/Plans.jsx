
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { plans } from "../../api/endpoints";
import { PageHeader, StatusBadge } from "../../components/ui";
import { planFor } from "../../lib/premium";
import { inr } from "../../lib/format";

function isFalse(value) {
  return (
    value === false ||
    value === 0 ||
    ["false", "0", "no", "inactive", "disabled"].includes(
      String(value ?? "").trim().toLowerCase()
    )
  );
}

function normalizePlans(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.plans)) return data.plans;

  return [];
}

function getPlanStatus(plan) {
  if (isFalse(plan?.isActive)) return "INACTIVE";
  return "ACTIVE";
}

function formatAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? inr(amount) : null;
}

export default function Plans() {
  const q = useQuery({
    queryKey: ["insurance-plans"],
    queryFn: plans.available,
    staleTime: 60_000,
    retry: 1,
  });

  const rows = normalizePlans(q.data);

  return (
    <>
      <PageHeader
        title="Buy insurance"
        subtitle="Explore our insurance plans and choose cover that suits your needs."
      />

      {q.isPending ? (
        <div className="empty" role="status">
          <p>Loading available insurance plans...</p>
        </div>
      ) : q.isError ? (
        <div className="empty" role="alert">
          <h4>Unable to load insurance plans</h4>
          <p className="muted">
            Check your connection and try again. If the issue continues,
            verify that the backend is running and the permanent catalogue
            endpoint is accessible.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => q.refetch()}
          >
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <h4>No insurance plans available</h4>
          <p className="muted">
            The catalogue returned no plans. Verify that the backend
            InsurancePlanSeeder has run and that GET /api/plans/available
            returns the six default plans.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => q.refetch()}
          >
            Refresh plans
          </button>
        </div>
      ) : (
        <>
          <p className="muted">
            {rows.length} {rows.length === 1 ? "plan" : "plans"} available
          </p>

          <div className="plan-grid">
            {rows.map((item) => {
              const planType =
                item.coveredType ||
                item.planName ||
                item.planCode ||
                "Insurance";

              const details = planFor(planType);
              const status = getPlanStatus(item);
              const canBuy =
                Boolean(item.planId) && status === "ACTIVE";

              const premium =
                formatAmount(item.basePremium) ??
                (details ? formatAmount(details.yearly) : null);

              const coverage = formatAmount(item.baseCoverage);

              return (
                <article
                  className="panel plan-card"
                  key={item.planId ?? item.planCode}
                >
                  <div className="row spread">
                    <h3>{item.planName || planType}</h3>
                    <StatusBadge value={status} />
                  </div>

                  <p className="muted">
                    {item.description ||
                      details?.blurb ||
                      "Insurance coverage designed around your needs."}
                  </p>

                  {item.planCode && (
                    <p className="faint">
                      Plan code: {item.planCode}
                    </p>
                  )}

                  <div>
                    <div className="faint" style={{ fontSize: 13 }}>
                      Starting premium
                    </div>

                    <b
                      style={{
                        fontSize: 24,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {premium !== null
                        ? premium
                        : "Premium calculated at checkout"}
                    </b>

                    {premium !== null && (
                      <div className="muted">
                        {coverage
                          ? `Base premium · ${coverage} cover`
                          : "Base premium"}
                      </div>
                    )}
                  </div>

                  {canBuy ? (
                    <Link
                      className="btn primary"
                      to={`/app/plans/${encodeURIComponent(
                        item.planId
                      )}/buy`}
                      state={{ plan: item }}
                    >
                      Choose this plan
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      disabled
                      title="This insurance plan is currently unavailable."
                    >
                      Currently unavailable
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

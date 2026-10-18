
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { policies } from "../../api/endpoints";
import { DataState, PageHeader, StatusBadge } from "../../components/ui";
import { planFor } from "../../lib/premium";
import { inr, today } from "../../lib/format";

function isFalse(value) {
  return (
    value === false ||
    value === 0 ||
    ["false", "0", "no", "inactive", "disabled"].includes(
      String(value ?? "").trim().toLowerCase()
    )
  );
}

function getPolicyStatus(policy) {
  const explicitStatus = String(policy?.status ?? "")
    .trim()
    .toUpperCase();

  if (explicitStatus) {
    return explicitStatus;
  }

  if (policy?.expiryDate) {
    const expiry = new Date(policy.expiryDate);
    const current = new Date(`${today()}T00:00:00`);

    if (!Number.isNaN(expiry.getTime()) && expiry < current) {
      return "EXPIRED";
    }
  }

  // Handle boolean, numeric and string database values.
  if (isFalse(policy?.isActive)) {
    return "INACTIVE";
  }

  // /policy/available is expected to return purchasable policies.
  // Don't hide records just because isActive is absent in the response.
  return "ACTIVE";
}

function isPurchasable(policy) {
  const status = getPolicyStatus(policy);

  return (
    status === "ACTIVE" &&
    Boolean(policy?.policyNumber) &&
    !isFalse(policy?.isActive)
  );
}

function normalizePolicies(data) {
  // Support either a direct array or common paginated/API response shapes.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.policies)) return data.policies;

  return [];
}

export default function Plans() {
  const q = useQuery({
    queryKey: ["available-policies"],
    queryFn: policies.available,
    staleTime: 30_000,
    retry: 1,
  });

  const rows = normalizePolicies(q.data);

  return (
    <>
      <PageHeader
        title="Buy insurance"
        subtitle="Explore available insurance plans and choose the cover that suits your needs."
      />

      {q.isPending ? (
        <div className="empty" role="status">
          <p>Loading available insurance plans...</p>
        </div>
      ) : q.isError ? (
        <div className="empty" role="alert">
          <h4>Unable to load insurance plans</h4>
          <p className="muted">
            Check your connection and try again. If the problem continues,
            verify the deployed API URL and backend availability.
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
          <h4>No insurance plans found</h4>
          <p className="muted">
            The server returned no policy records. Confirm that your cloud
            database contains policies and that GET /policy/available
            returns them.
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
            {rows.length} {rows.length === 1 ? "plan" : "plans"} found
          </p>

          <div className="plan-grid">
            {rows.map((policy, index) => {
              const plan = planFor(policy.coveredTypes);
              const status = getPolicyStatus(policy);
              const canBuy = isPurchasable(policy);

              const key =
                policy.policyNumber ??
                policy.policyId ??
                policy.id ??
                `${policy.coveredTypes ?? "policy"}-${index}`;

              return (
                <article className="panel plan-card" key={key}>
                  <div className="row spread">
                    <h3>
                      {policy.coveredTypes ||
                        policy.policyName ||
                        "Insurance plan"}
                    </h3>
                    <StatusBadge value={status} />
                  </div>

                  <p className="muted">
                    {plan?.blurb || "Insurance coverage for your needs."}
                  </p>

                  {policy.policyNumber && (
                    <p className="faint">
                      Policy number: {policy.policyNumber}
                    </p>
                  )}

                  {policy.expiryDate && (
                    <p className="faint">
                      Expiry date: {policy.expiryDate}
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
                      {plan ? inr(plan.yearly) : "View premium at checkout"}
                    </b>

                    {plan && (
                      <span className="muted">
                        {" "}/ year for ₹10 L cover
                      </span>
                    )}
                  </div>

                  {canBuy ? (
                    <Link
                      className="btn primary"
                      to={`/app/plans/${encodeURIComponent(
                        policy.policyNumber
                      )}/buy`}
                      state={{ policy }}
                    >
                      Choose this plan
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      disabled
                      title="This policy is not currently available for purchase."
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

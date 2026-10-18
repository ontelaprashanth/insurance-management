
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { policies } from "../../api/endpoints";
import { DataState, PageHeader, StatusBadge } from "../../components/ui";
import { planFor } from "../../lib/premium";
import { inr, today } from "../../lib/format";

function getPolicyStatus(policy) {
  if (policy.status) {
    return String(policy.status).toUpperCase();
  }

  if (policy.expiryDate && policy.expiryDate <= today()) {
    return "EXPIRED";
  }

  return policy.isActive ? "ACTIVE" : "INACTIVE";
}

// Treat "Health" and "Health Insurance" as the same cover type.
function normalizeCoverType(value) {
  return String(value || "")
    .trim()
    .replace(/\s+insurance\s*$/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Show only one available plan for each cover type.
function getUniquePlans(rows) {
  const seen = new Set();

  return rows.filter((policy) => {
    if (getPolicyStatus(policy) !== "ACTIVE") {
      return false;
    }

    const key = normalizeCoverType(policy.coveredTypes);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default function Plans() {
  const q = useQuery({
    queryKey: ["available-policies"],
    queryFn: policies.available,
  });

  return (
    <>
      <PageHeader
        title="Buy insurance"
        subtitle="Choose a plan, then set your cover amount and term. You see the exact premium before you pay."
      />

      <DataState
        query={q}
        empty={{
          title: "No plans open right now",
          text: "New plans appear here as soon as the administrator publishes them.",
        }}
      >
        {(rows) => {
          const availablePlans = getUniquePlans(rows || []);

          return availablePlans.length === 0 ? (
            <div className="empty">
              <h4>No plans open right now</h4>
              <p className="muted">
                New plans appear here as soon as the administrator publishes them.
              </p>
            </div>
          ) : (
            <div className="plan-grid">
              {availablePlans.map((p) => {
                const plan = planFor(p.coveredTypes);

                return (
                  <article
                    className="panel plan-card"
                    key={p.policyNumber}
                  >
                    <div className="row spread">
                      <h3>{p.coveredTypes}</h3>
                      <StatusBadge value={getPolicyStatus(p)} />
                    </div>

                    <p className="muted">
                      {plan?.blurb || "Insurance plan"}
                    </p>

                    <div>
                      <div
                        className="faint"
                        style={{ fontSize: 13 }}
                      >
                        Starting at
                      </div>

                      <b
                        style={{
                          fontSize: 24,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {plan ? inr(plan.yearly) : "—"}
                      </b>

                      <span className="muted">
                        {" "}/ year for ₹10 L cover
                      </span>
                    </div>

                    <Link
                      className="btn primary"
                      to={`/app/plans/${p.policyNumber}/buy`}
                      state={{ policy: p }}
                    >
                      Choose this plan
                    </Link>
                  </article>
                );
              })}
            </div>
          );
        }}
      </DataState>
    </>
  );
}

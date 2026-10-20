import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";

import Layout from "../components/Layout";
import { api, money, date } from "../lib/api";
import "./Refunds.css";

function formatStatus(value) {
  return String(value || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.reason ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function Refunds() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPurchases = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await api("/policy/my-purchases");

      setPurchases(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  function openRefund(purchase) {
    setSelected(purchase);
    setReason("");
    setError("");
    setNotice("");
  }

  function closeRefund() {
    if (submitting) return;

    setSelected(null);
    setReason("");
  }

  async function submitRefund(event) {
    event.preventDefault();

    if (!selected?.purchaseId || submitting) return;

    const refundReason = reason.trim();

    if (!refundReason) {
      setError("Please enter a reason for your refund.");
      return;
    }

    if (refundReason.length > 500) {
      setError("The refund reason cannot exceed 500 characters.");
      return;
    }

    const confirmed = window.confirm(
      `Request a full refund of ${formatMoney(
        selected.totalPremium
      )} for purchase #${selected.purchaseId}?\n\n` +
      "This submits a refund request to Razorpay. " +
      "Only continue if you intend to request this refund."
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await api(
        `/policy/purchases/${selected.purchaseId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refundReason,
          }),
        }
      );

      setSelected(null);
      setReason("");
      setNotice(
        "Your refund request was submitted. Refresh the purchase list to view the latest status."
      );

      await loadPurchases(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function formatMoney(value) {
    if (typeof money === "function") {
      return money(value ?? 0);
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "—";

    if (typeof date === "function") {
      return date(value);
    }

    return new Date(value).toLocaleDateString("en-IN");
  }

  function canRequestRefund(purchase) {
    return (
      String(purchase.paymentStatus || "").toUpperCase() === "PAID" &&
      purchase.refundEligible === true &&
      (
        !purchase.refundStatus ||
        String(purchase.refundStatus).toUpperCase() === "NOT_REFUNDED"
      )
    );
  }

  const paidCount = purchases.filter(
    (purchase) =>
      String(purchase.paymentStatus || "").toUpperCase() === "PAID"
  ).length;

  const refundableCount = purchases.filter(canRequestRefund).length;

  return (
    <Layout>
      <main className="refund-page">
        <section className="refund-hero">
          <div className="refund-hero-icon">
            <ShieldCheck size={27} />
          </div>

          <div className="refund-hero-copy">
            <span className="refund-eyebrow">INSUREX CUSTOMER SERVICE</span>
            <h1>Refunds & Payments</h1>
            <p>
              Review your policy purchases and request a refund when your
              purchase is eligible.
            </p>
          </div>

          <button
            type="button"
            className="refund-refresh"
            onClick={() => loadPurchases(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "refund-spin" : ""}
            />
            Refresh
          </button>
        </section>

        <section className="refund-stats">
          <article className="refund-stat">
            <span className="refund-stat-icon">
              <Wallet size={19} />
            </span>
            <div>
              <span>Purchases</span>
              <strong>{purchases.length}</strong>
            </div>
          </article>

          <article className="refund-stat">
            <span className="refund-stat-icon">
              <CreditCard size={19} />
            </span>
            <div>
              <span>Paid purchases</span>
              <strong>{paidCount}</strong>
            </div>
          </article>

          <article className="refund-stat">
            <span className="refund-stat-icon refund-stat-gold">
              <Clock3 size={19} />
            </span>
            <div>
              <span>Refund eligible</span>
              <strong>{refundableCount}</strong>
            </div>
          </article>
        </section>

        {error && !selected && (
          <div className="refund-alert refund-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div className="refund-alert refund-alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="refund-list-section">
          <div className="refund-section-heading">
            <div>
              <h2>Your purchases</h2>
              <p>Refund eligibility and status are provided by the backend.</p>
            </div>
            <span className="refund-count">{purchases.length} records</span>
          </div>

          {loading ? (
            <div className="refund-state">
              <RefreshCw size={23} className="refund-spin" />
              <strong>Loading purchases</strong>
              <span>Retrieving your purchase information securely.</span>
            </div>
          ) : error && purchases.length === 0 ? (
            <div className="refund-state">
              <AlertCircle size={26} />
              <strong>Unable to load purchases</strong>
              <span>{error}</span>
              <button
                type="button"
                className="refund-primary-btn"
                onClick={() => loadPurchases()}
              >
                Try again
              </button>
            </div>
          ) : purchases.length === 0 ? (
            <div className="refund-state">
              <Wallet size={30} />
              <strong>No purchases found</strong>
              <span>Completed policy purchases will appear here.</span>
            </div>
          ) : (
            <div className="refund-table-wrap">
              <table className="refund-table">
                <thead>
                  <tr>
                    <th>Purchase</th>
                    <th>Premium</th>
                    <th>Payment</th>
                    <th>Refund status</th>
                    <th>Purchased</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {purchases.map((purchase) => {
                    const status = String(
                      purchase.refundStatus || "NOT_REFUNDED"
                    ).toUpperCase();

                    const eligible = canRequestRefund(purchase);

                    return (
                      <tr key={purchase.purchaseId}>
                        <td>
                          <div className="refund-purchase-id">
                            <span className="refund-purchase-icon">
                              <ShieldCheck size={17} />
                            </span>
                            <div>
                              <strong>
                                #{purchase.purchaseId}
                              </strong>
                              <small>
                                Policy #{purchase.policyNumber ?? "—"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong className="refund-amount">
                            {formatMoney(purchase.totalPremium)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`refund-pill ${
                              String(purchase.paymentStatus).toUpperCase() === "PAID"
                                ? "refund-pill-success"
                                : "refund-pill-neutral"
                            }`}
                          >
                            {formatStatus(purchase.paymentStatus)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`refund-pill ${
                              status === "REFUNDED"
                                ? "refund-pill-success"
                                : status === "NOT_REFUNDED"
                                  ? "refund-pill-neutral"
                                  : "refund-pill-warning"
                            }`}
                          >
                            {formatStatus(status)}
                          </span>
                          {purchase.refundAmount != null &&
                            Number(purchase.refundAmount) > 0 && (
                              <small className="refund-subtext">
                                {formatMoney(purchase.refundAmount)}
                              </small>
                            )}
                        </td>

                        <td>{formatDate(purchase.purchaseDate)}</td>

                        <td>
                          {eligible ? (
                            <button
                              type="button"
                              className="refund-request-btn"
                              onClick={() => openRefund(purchase)}
                            >
                              Request refund
                            </button>
                          ) : (
                            <span className="refund-action-unavailable">
                              {status === "REFUNDED"
                                ? "Refunded"
                                : status.includes("PENDING") ||
                                    status.includes("RECONCILIATION")
                                  ? "Under review"
                                  : String(
                                      purchase.paymentStatus || ""
                                    ).toUpperCase() !== "PAID"
                                    ? "Not paid"
                                    : purchase.refundEligible === false
                                      ? "Not eligible"
                                      : "Unavailable"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="refund-footnote">
          <ShieldCheck size={17} />
          <p>
            Refund requests are checked by InsureX. Eligibility is determined
            by the backend, and the final processing time depends on Razorpay
            and your payment provider.
          </p>
        </div>

        {selected && (
          <div
            className="refund-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeRefund();
            }}
          >
            <section
              className="refund-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="refund-modal-title"
            >
              <div className="refund-modal-header">
                <span className="refund-modal-icon">
                  <Wallet size={22} />
                </span>

                <button
                  type="button"
                  className="refund-modal-close"
                  aria-label="Close dialog"
                  disabled={submitting}
                  onClick={closeRefund}
                >
                  <X size={19} />
                </button>
              </div>

              <span className="refund-eyebrow">PURCHASE #{selected.purchaseId}</span>
              <h2 id="refund-modal-title">Request a full refund</h2>
              <p className="refund-modal-description">
                Please explain why you want to cancel this purchase.
              </p>

              <div className="refund-summary">
                <span>Full refund amount</span>
                <strong>{formatMoney(selected.totalPremium)}</strong>
                <small>
                  Policy #{selected.policyNumber ?? "—"}
                </small>
              </div>

              {error && (
                <div className="refund-alert refund-alert-error" role="alert">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submitRefund}>
                <label htmlFor="refundReason">
                  Reason for refund <span>*</span>
                </label>

                <textarea
                  id="refundReason"
                  name="refundReason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Tell us why you want a refund..."
                  maxLength={500}
                  rows={4}
                  required
                  disabled={submitting}
                />

                <div className="refund-character-count">
                  {reason.length}/500 characters
                </div>

                <div className="refund-modal-warning">
                  <AlertCircle size={17} />
                  <span>
                    Submitting this request contacts the refund service. Only
                    proceed if you intend to request the full refund.
                  </span>
                </div>

                <div className="refund-modal-actions">
                  <button
                    type="button"
                    className="refund-cancel-btn"
                    onClick={closeRefund}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="refund-primary-btn"
                    disabled={submitting || !reason.trim()}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="refund-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Submit request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </Layout>
  );
}

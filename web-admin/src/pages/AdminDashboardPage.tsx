import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AdminOverviewResponse, fetchAdminOverview } from "../lib/api";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No rate published yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRefreshTime(value: Date | null) {
  if (!value) {
    return "Waiting for data";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatScopeType(scopeType: string | undefined) {
  if (!scopeType) {
    return "Assigned scope";
  }
  return scopeType.replace(/_/g, " ");
}

function getRoleTone(scope: AdminOverviewResponse["scope"] | null) {
  const role = scope?.role.toLowerCase() ?? "";

  if (role.includes("super")) {
    return {
      eyebrow: "Platform Overview",
      heading: "National dashboard",
      copy: "Track live approvals, publishing volume, company participation, and rate freshness across the full association network.",
      emphasis: "Global operating picture",
    };
  }

  if (role.includes("state")) {
    return {
      eyebrow: "State Overview",
      heading: `${scope?.label ?? "State"} dashboard`,
      copy: "Monitor approvals, member activity, and publishing movement across every association that rolls up into this state scope.",
      emphasis: "State-wide coordination",
    };
  }

  if (role.includes("association")) {
    return {
      eyebrow: "Association Overview",
      heading: `${scope?.label ?? "Association"} dashboard`,
      copy: "Stay on top of approvals, directory activity, news publishing, and the latest rate freshness for this association.",
      emphasis: "Association operating picture",
    };
  }

  if (role.includes("district")) {
    return {
      eyebrow: "District Overview",
      heading: `${scope?.label ?? "District"} dashboard`,
      copy: "Keep a close view on local approvals, active members, and publishing activity inside this district operating scope.",
      emphasis: "District operating picture",
    };
  }

  if (role.includes("unit")) {
    return {
      eyebrow: "Unit Overview",
      heading: `${scope?.label ?? "Unit"} dashboard`,
      copy: "Review the live operating pulse for this unit, including approvals, company activity, and published communication.",
      emphasis: "Unit operating picture",
    };
  }

  return {
    eyebrow: "Operations Overview",
    heading: scope ? `${scope.label} dashboard` : "Admin dashboard",
    copy: "Review live activity, approvals, and operational health for the currently assigned admin scope.",
    emphasis: "Scoped operations",
  };
}

function getPendingWorkEmptyCopy(scope: AdminOverviewResponse["scope"] | null) {
  const role = scope?.role.toLowerCase() ?? "";
  if (role.includes("association")) {
    return "Your association queues are clear right now.";
  }
  if (role.includes("district") || role.includes("unit")) {
    return "There are no open local approval queues right now.";
  }
  if (role.includes("state")) {
    return "There are no unresolved state-scoped queues right now.";
  }
  return "There are no open approval queues in the current scope right now.";
}

function getQuickActionEmptyCopy(scope: AdminOverviewResponse["scope"] | null) {
  const role = scope?.role.toLowerCase() ?? "";
  if (role.includes("association")) {
    return "More association-specific shortcuts will appear here as additional modules go live.";
  }
  if (role.includes("district") || role.includes("unit")) {
    return "This local role currently surfaces live status more than direct shortcuts.";
  }
  return "This role does not currently have direct shortcuts beyond the active modules already in use.";
}

function getFreshnessTone(label: string | undefined) {
  const normalized = label?.toLowerCase() ?? "";
  if (normalized.includes("hour") || normalized.includes("today")) {
    return "live";
  }
  if (normalized.includes("yesterday")) {
    return "watch";
  }
  return "idle";
}

type OverviewState = {
  data: AdminOverviewResponse | null;
  error: string | null;
  loading: boolean;
  loadedAt: Date | null;
};

const INITIAL_STATE: OverviewState = {
  data: null,
  error: null,
  loading: true,
  loadedAt: null,
};

export function AdminDashboardPage() {
  const [state, setState] = useState<OverviewState>(INITIAL_STATE);
  const pendingWork = state.data?.pending_work ?? [];
  const quickActions = state.data?.quick_actions ?? [];
  const recentActivity = state.data?.recent_activity ?? [];
  const tone = getRoleTone(state.data?.scope ?? null);

  const loadOverview = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchAdminOverview();
      setState({
        data,
        error: null,
        loading: false,
        loadedAt: new Date(),
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load the overview.",
      }));
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const kpiCards = useMemo(() => {
    const kpis = state.data?.kpis;
    return [
      {
        key: "pending_approvals",
        label: "Pending approvals",
        value: kpis ? String(kpis.pending_approvals) : "0",
        detail: "Access, content, and advertisement queues",
        tone: "accent",
      },
      {
        key: "active_companies",
        label: "Active companies",
        value: kpis ? String(kpis.active_companies) : "0",
        detail: "Approved companies currently in scope",
        tone: "neutral",
      },
      {
        key: "active_products",
        label: "Active products",
        value: kpis ? String(kpis.active_products) : "0",
        detail: "Live product listings under active companies",
        tone: "neutral",
      },
      {
        key: "published_news",
        label: "Published news",
        value: kpis ? String(kpis.published_news) : "0",
        detail: "Live notices already published in this scope",
        tone: "neutral",
      },
      {
        key: "upcoming_meetings",
        label: "Upcoming meetings",
        value: kpis ? String(kpis.upcoming_meetings) : "0",
        detail: "Published meetings still ahead on the calendar",
        tone: "neutral",
      },
      {
        key: "rate_freshness",
        label: "Rate freshness",
        value: kpis?.rate_freshness_label ?? "Waiting for data",
        detail: kpis ? formatTimestamp(kpis.rate_last_updated_at) : "No rate published yet",
        tone: "dark",
      },
    ];
  }, [state.data]);

  const freshnessTone = getFreshnessTone(state.data?.kpis.rate_freshness_label);
  const leadPendingItem = pendingWork[0] ?? null;

  return (
    <section className="admin-overview">
      <div className="admin-overview__hero">
        <div className="admin-overview__hero-backdrop" aria-hidden="true" />
        <div className="admin-overview__hero-content">
          <p className="admin-overview__eyebrow">{tone.eyebrow}</p>
          <h2 className="admin-overview__heading">{tone.heading}</h2>
          <p className="admin-overview__copy">{tone.copy}</p>
          <div className="admin-overview__hero-chips">
            <span className="admin-overview__hero-chip">{tone.emphasis}</span>
            <span className="admin-overview__hero-chip">{state.data ? formatScopeType(state.data.scope.scope_type) : "Assigned scope"}</span>
          </div>
        </div>

        <div className="admin-overview__hero-meta">
          <div className="admin-overview__hero-stat">
            <span>Scope</span>
            <strong>{state.data ? state.data.scope.label : "Loading scope"}</strong>
            <p>{state.data ? state.data.scope.role : "Checking current assignment"}</p>
          </div>
          <div className="admin-overview__hero-stat">
            <span>Last refreshed</span>
            <strong>{formatRefreshTime(state.loadedAt)}</strong>
            <p>Live admin overview sync</p>
          </div>
          <div className="admin-overview__hero-stat">
            <span>Attention now</span>
            <strong>{state.data ? String(state.data.kpis.pending_approvals) : "0"}</strong>
            <p>Items currently waiting on action</p>
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="admin-feedback admin-feedback--error">
          <div>
            <strong>Overview unavailable</strong>
            <p>{state.error}</p>
          </div>
          <button className="admin-feedback__action" type="button" onClick={() => void loadOverview()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-overview__kpis">
        {kpiCards.map((card) => (
          <article key={card.key} className={`admin-overview__kpi-card admin-overview__kpi-card--${card.tone}`}>
            <span className="admin-overview__kpi-label">{card.label}</span>
            {state.loading ? <div className="admin-overview__skeleton admin-overview__skeleton--value" /> : <strong>{card.value}</strong>}
            {state.loading ? <div className="admin-overview__skeleton admin-overview__skeleton--line" /> : <p>{card.detail}</p>}
          </article>
        ))}
      </div>

      <div className="admin-overview__section-grid">
        <section className="admin-overview__panel admin-overview__panel--feature">
          <div className="admin-overview__panel-header">
            <div>
              <p className="admin-overview__panel-eyebrow">Rate Freshness</p>
              <h3 className="admin-overview__panel-title">Publishing cadence at a glance</h3>
            </div>
          </div>

          {state.loading ? (
            <div className="admin-overview__feature-shell">
              <div className="admin-overview__skeleton admin-overview__skeleton--feature" />
              <div className="admin-overview__feature-grid">
                <div className="admin-overview__skeleton admin-overview__skeleton--feature-row" />
                <div className="admin-overview__skeleton admin-overview__skeleton--feature-row" />
              </div>
            </div>
          ) : (
            <div className="admin-overview__feature-shell">
              <div className={`admin-overview__feature-callout admin-overview__feature-callout--${freshnessTone}`}>
                <div>
                  <span className="admin-overview__feature-label">Current status</span>
                  <strong>{state.data?.kpis.rate_freshness_label ?? "Waiting for data"}</strong>
                  <p>{formatTimestamp(state.data?.kpis.rate_last_updated_at ?? null)}</p>
                </div>
                <span className={`admin-overview__status-badge admin-overview__status-badge--${freshnessTone}`}>
                  {freshnessTone === "live" ? "Live" : freshnessTone === "watch" ? "Watch" : "Pending"}
                </span>
              </div>

              <div className="admin-overview__feature-grid">
                <article className="admin-overview__feature-row">
                  <span>Coverage</span>
                  <strong>{state.data?.scope.label ?? "Assigned scope"}</strong>
                  <p>{tone.emphasis}</p>
                </article>
                <article className="admin-overview__feature-row">
                  <span>Directory footprint</span>
                  <strong>
                    {state.data ? `${state.data.kpis.active_companies} companies` : "0 companies"}
                  </strong>
                  <p>{state.data ? `${state.data.kpis.active_products} active products in view` : "Waiting for directory totals"}</p>
                </article>
              </div>
            </div>
          )}
        </section>

        <section className="admin-overview__panel admin-overview__panel--attention">
          <div className="admin-overview__panel-header">
            <div>
              <p className="admin-overview__panel-eyebrow">Attention Required</p>
              <h3 className="admin-overview__panel-title">Queues that need action</h3>
            </div>
          </div>

          {state.loading ? (
            <div className="admin-overview__stack">
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
            </div>
          ) : pendingWork.length ? (
            <div className="admin-overview__stack">
              {leadPendingItem ? (
                <article className="admin-overview__attention-lead">
                  <span className="admin-overview__attention-tag">Highest queue</span>
                  <strong>{leadPendingItem.label}</strong>
                  <p>{leadPendingItem.count} item{leadPendingItem.count === 1 ? "" : "s"} currently waiting in this scope.</p>
                </article>
              ) : null}

              {pendingWork.map((item) =>
                item.route ? (
                  <Link key={item.key} to={item.route} className="admin-overview__list-card admin-overview__list-card--interactive">
                    <div>
                      <strong>{item.label}</strong>
                      <p>Open the live workflow for this queue</p>
                    </div>
                    <span>{item.count}</span>
                  </Link>
                ) : (
                  <article key={item.key} className="admin-overview__list-card">
                    <div>
                      <strong>{item.label}</strong>
                      <p>Queue is live even if the direct route is not exposed yet</p>
                    </div>
                    <span>{item.count}</span>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="admin-overview__empty">
              <strong>No pending work</strong>
              <p>{getPendingWorkEmptyCopy(state.data?.scope ?? null)}</p>
            </div>
          )}
        </section>
      </div>

      <div className="admin-overview__section-grid admin-overview__section-grid--lower">
        <section className="admin-overview__panel">
          <div className="admin-overview__panel-header">
            <div>
              <p className="admin-overview__panel-eyebrow">Quick Actions</p>
              <h3 className="admin-overview__panel-title">Live destinations for this role</h3>
            </div>
          </div>

          {state.loading ? (
            <div className="admin-overview__stack">
              <div className="admin-overview__skeleton admin-overview__skeleton--action" />
              <div className="admin-overview__skeleton admin-overview__skeleton--action" />
            </div>
          ) : quickActions.length ? (
            <div className="admin-overview__quick-actions">
              {quickActions.map((action) => (
                <Link key={action.route} to={action.route} className="admin-overview__action-card">
                  <div>
                    <strong>{action.label}</strong>
                    <p>{action.description}</p>
                  </div>
                  <span className="admin-overview__action-arrow">Open</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-overview__empty">
              <strong>No quick actions yet</strong>
              <p>{getQuickActionEmptyCopy(state.data?.scope ?? null)}</p>
            </div>
          )}
        </section>

        <section className="admin-overview__panel">
          <div className="admin-overview__panel-header">
            <div>
              <p className="admin-overview__panel-eyebrow">Recent Activity</p>
              <h3 className="admin-overview__panel-title">Latest operational events</h3>
            </div>
          </div>

          {state.loading ? (
            <div className="admin-overview__stack">
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
            </div>
          ) : recentActivity.length ? (
            <div className="admin-overview__activity-list">
              {recentActivity.map((item) => (
                <article key={item.id} className="admin-overview__activity-item">
                  <div>
                    <strong>{item.action}</strong>
                    <p>{item.summary}</p>
                  </div>
                  <div className="admin-overview__activity-meta">
                    <span>{item.actor_name}</span>
                    <time dateTime={item.created_at}>{formatTimestamp(item.created_at)}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-overview__empty">
              <strong>No recent activity</strong>
              <p>Audit events will appear here once admin operations are recorded for this scope.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

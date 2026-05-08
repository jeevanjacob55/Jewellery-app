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
      },
      {
        key: "active_companies",
        label: "Active companies",
        value: kpis ? String(kpis.active_companies) : "0",
        detail: "Approved companies currently in scope",
      },
      {
        key: "active_products",
        label: "Active products",
        value: kpis ? String(kpis.active_products) : "0",
        detail: "Live product listings under active companies",
      },
      {
        key: "published_news",
        label: "Published news",
        value: kpis ? String(kpis.published_news) : "0",
        detail: "Live notices already published in this scope",
      },
      {
        key: "upcoming_meetings",
        label: "Upcoming meetings",
        value: kpis ? String(kpis.upcoming_meetings) : "0",
        detail: "Published meetings still ahead on the calendar",
      },
      {
        key: "rate_freshness",
        label: "Rate freshness",
        value: kpis?.rate_freshness_label ?? "Waiting for data",
        detail: kpis ? formatTimestamp(kpis.rate_last_updated_at) : "No rate published yet",
      },
    ];
  }, [state.data]);

  return (
    <section className="admin-overview">
      <div className="admin-overview__hero">
        <div>
          <p className="admin-overview__eyebrow">Operations Overview</p>
          <h2 className="admin-overview__heading">
            {state.data ? `${state.data.scope.label} admin dashboard` : "Admin dashboard"}
          </h2>
          <p className="admin-overview__copy">
            This view is scoped to the current admin assignment and only surfaces live metrics and actions that already work in
            Phase 1.
          </p>
        </div>

        <div className="admin-overview__hero-meta">
          <div className="admin-overview__hero-stat">
            <span>Scope</span>
            <strong>{state.data ? state.data.scope.role : "Loading scope"}</strong>
          </div>
          <div className="admin-overview__hero-stat">
            <span>Last refreshed</span>
            <strong>{formatRefreshTime(state.loadedAt)}</strong>
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
          <article key={card.key} className="admin-overview__kpi-card">
            <span className="admin-overview__kpi-label">{card.label}</span>
            {state.loading ? <div className="admin-overview__skeleton admin-overview__skeleton--value" /> : <strong>{card.value}</strong>}
            {state.loading ? <div className="admin-overview__skeleton admin-overview__skeleton--line" /> : <p>{card.detail}</p>}
          </article>
        ))}
      </div>

      <div className="admin-overview__section-grid">
        <section className="admin-overview__panel">
          <div className="admin-overview__panel-header">
            <div>
              <p className="admin-overview__panel-eyebrow">Pending Work</p>
              <h3 className="admin-overview__panel-title">Queues that still need attention</h3>
            </div>
          </div>

          {state.loading ? (
            <div className="admin-overview__stack">
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
              <div className="admin-overview__skeleton admin-overview__skeleton--row" />
            </div>
          ) : state.data?.pending_work.length ? (
            <div className="admin-overview__stack">
              {state.data.pending_work.map((item) =>
                item.route ? (
                  <Link key={item.key} to={item.route} className="admin-overview__list-card admin-overview__list-card--interactive">
                    <div>
                      <strong>{item.label}</strong>
                      <p>Working route available</p>
                    </div>
                    <span>{item.count}</span>
                  </Link>
                ) : (
                  <article key={item.key} className="admin-overview__list-card">
                    <div>
                      <strong>{item.label}</strong>
                      <p>Action route will appear when the module is ready</p>
                    </div>
                    <span>{item.count}</span>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="admin-overview__empty">
              <strong>No pending work</strong>
              <p>There are no open approval queues in the current scope right now.</p>
            </div>
          )}
        </section>

        <section className="admin-overview__panel">
          <div className="admin-overview__panel-header">
            <div>
              <p className="admin-overview__panel-eyebrow">Quick Actions</p>
              <h3 className="admin-overview__panel-title">Live destinations</h3>
            </div>
          </div>

          {state.loading ? (
            <div className="admin-overview__stack">
              <div className="admin-overview__skeleton admin-overview__skeleton--action" />
            </div>
          ) : state.data?.quick_actions.length ? (
            <div className="admin-overview__quick-actions">
              {state.data.quick_actions.map((action) => (
                <Link key={action.route} to={action.route} className="admin-overview__action-card">
                  <strong>{action.label}</strong>
                  <p>{action.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-overview__empty">
              <strong>No quick actions yet</strong>
              <p>This role does not currently have any direct actions beyond the modules already in use.</p>
            </div>
          )}
        </section>
      </div>

      <section className="admin-overview__panel">
        <div className="admin-overview__panel-header">
          <div>
            <p className="admin-overview__panel-eyebrow">Recent Activity</p>
            <h3 className="admin-overview__panel-title">Latest recorded operational events</h3>
          </div>
        </div>

        {state.loading ? (
          <div className="admin-overview__stack">
            <div className="admin-overview__skeleton admin-overview__skeleton--row" />
            <div className="admin-overview__skeleton admin-overview__skeleton--row" />
            <div className="admin-overview__skeleton admin-overview__skeleton--row" />
          </div>
        ) : state.data?.recent_activity.length ? (
          <div className="admin-overview__activity-list">
            {state.data.recent_activity.map((item) => (
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
    </section>
  );
}

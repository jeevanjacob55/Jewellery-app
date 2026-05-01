import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { getAdminMarketPreview, getAdminMarketReportSummary, getAdminMarketUnderServed } from "../../api/admin";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { AdminMarketPreviewResponse, AdminMarketReportSummaryResponse, AdminMarketUnderServedReportResponse } from "../../types/api";

export function PendingApprovalsScreen() {
  const { me } = useSession();

  if (!me?.user.is_admin) {
    return <ScreenState title="Access denied" detail="Pending approvals are only available to admin users." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>Pending Approvals</Text>
        <Text style={styles.body}>
          {me.counts.pending_approvals_count} approval item{me.counts.pending_approvals_count === 1 ? "" : "s"} currently need review across access requests, news, and ads.
        </Text>
      </SurfaceCard>
    </ScrollView>
  );
}

export function ManageUsersScreen() {
  return <AdminShellScreen title="Manage Users" detail="User-management tools will appear here as a dedicated mobile admin workflow." />;
}

export function ManageNewsScreen() {
  return <AdminShellScreen title="Manage News" detail="News-management and approval tools will appear here as a dedicated mobile admin workflow." />;
}

export function MarketInsightsScreen() {
  const { me } = useSession();
  const [preview, setPreview] = useState<AdminMarketPreviewResponse | null>(null);
  const [summary, setSummary] = useState<AdminMarketReportSummaryResponse | null>(null);
  const [underServed, setUnderServed] = useState<AdminMarketUnderServedReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(showSpinner: boolean) {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const [nextPreview, nextSummary, nextUnderServed] = await Promise.all([
        getAdminMarketPreview(7),
        getAdminMarketReportSummary(7),
        getAdminMarketUnderServed(7),
      ]);
      setPreview(nextPreview);
      setSummary(nextSummary);
      setUnderServed(nextUnderServed);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load market insights.");
    } finally {
      if (showSpinner) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (!me?.user.is_admin) {
      return;
    }
    void loadData(true);
  }, [me?.user.is_admin]);

  if (!me?.user.is_admin) {
    return <ScreenState title="Access denied" detail="Market insights are only available to admin users." />;
  }

  if (loading) {
    return <ScreenState title="Loading market insights" detail="Fetching live lineup and exposure metrics." loading />;
  }

  if (error && !preview && !summary && !underServed) {
    return <ScreenState title="Unable to load market insights" detail={error} />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(false)} />}
    >
      {error ? (
        <SurfaceCard>
          <Text style={styles.noteTitle}>Refresh issue</Text>
          <Text style={styles.body}>{error}</Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.title}>Market Insights</Text>
        <Text style={styles.body}>
          Live lineup preview, next hero slots, and the last 7 days of company exposure trends for operators.
        </Text>
        {preview ? (
          <View style={styles.metricsRow}>
            <View style={styles.metricChip}>
              <Text style={styles.metricValue}>{preview.candidate_count}</Text>
              <Text style={styles.metricLabel}>Candidates</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricValue}>{preview.applied_override_count}</Text>
              <Text style={styles.metricLabel}>Overrides</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricValue}>{summary?.fairness_enabled ? "On" : "Off"}</Text>
              <Text style={styles.metricLabel}>Fairness</Text>
            </View>
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Current Lineup</Text>
        {preview?.rows.length ? (
          preview.rows.map((row) => (
            <View key={`${row.row_type}-${row.id}`} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listTitle}>{row.title}</Text>
                <Text style={styles.listDetail}>
                  {row.items.length} item{row.items.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Text style={styles.listMeta}>{row.zone_key ?? row.row_type}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No live lineup rows are available right now.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Hero Schedule</Text>
        {preview?.hero_schedule.length ? (
          preview.hero_schedule.slice(0, 8).map((entry) => (
            <View key={entry.slot_key} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listTitle}>{entry.company?.name ?? "No company selected"}</Text>
                <Text style={styles.listDetail}>
                  {formatDateTime(entry.serves_at)} · {entry.wildcard_slot ? "Wildcard" : "Standard"}
                </Text>
              </View>
              <Text style={styles.listMeta}>{entry.selection_reason ?? "none"}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hero schedule is available.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Exposure By Zone</Text>
        {summary?.zones.length ? (
          summary.zones.map((zone) => (
            <View key={zone.zone_key} style={styles.summaryBlock}>
              <Text style={styles.listTitle}>{zone.title}</Text>
              <Text style={styles.listDetail}>{zone.total_serves} serves in the last {summary.days} days</Text>
              <Text style={styles.metaLine}>
                Pin {zone.selection_reasons.pin ?? 0} · Boost {zone.selection_reasons.boost ?? 0} · Fairness {zone.selection_reasons.fairness ?? 0} · Weight {zone.selection_reasons.weight ?? 0}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No zone exposure data is available yet.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Exposure By Tier</Text>
        {summary?.tiers.length ? (
          summary.tiers.map((tier) => (
            <View key={tier.tier_slug ?? `tier-${tier.tier_id ?? 0}`} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listTitle}>{tier.tier_name ?? "Unknown tier"}</Text>
                <Text style={styles.listDetail}>{tier.tier_slug ?? "n/a"}</Text>
              </View>
              <Text style={styles.listMeta}>{tier.total_serves}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No tier exposure data is available yet.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Under-Served Companies</Text>
        {underServed?.results.length ? (
          underServed.results.slice(0, 10).map((item) => (
            <View key={`${item.zone_key}-${item.company_id}`} style={styles.summaryBlock}>
              <Text style={styles.listTitle}>{item.company_name}</Text>
              <Text style={styles.listDetail}>
                {item.tier_name} · {item.zone_title}
              </Text>
              <Text style={styles.metaLine}>
                Actual {item.actual_serves} · Target {item.target_serves} · Deficit {item.deficit}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {summary?.fairness_enabled ? "No companies are currently under-served in fairness-enabled zones." : "Fairness is currently disabled."}
          </Text>
        )}
      </SurfaceCard>
    </ScrollView>
  );
}

function AdminShellScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{detail}</Text>
        <View style={styles.noteBlock}>
          <Text style={styles.noteTitle}>Phase 1</Text>
          <Text style={styles.noteBody}>This route is wired into the new profile drawer so admin users have a complete navigation path on mobile.</Text>
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  noteBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteTitle: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  noteBody: {
    color: colors.mutedText,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: "#FFF8EA",
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowText: {
    flex: 1,
  },
  listTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  listDetail: {
    color: colors.mutedText,
    marginTop: 2,
  },
  listMeta: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryBlock: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaLine: {
    color: colors.mutedText,
    marginTop: 4,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.mutedText,
    lineHeight: 21,
  },
});

import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { DashboardData } from "../../types/api";
import { formatCurrency } from "../../utils/format";

export function AssociationRatesScreen() {
  const { status, user } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadRates(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextDashboard = await getJson<DashboardData>("/dashboard/", status === "authenticated");
      setDashboard(nextDashboard);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, [status]);

  if (loading && !dashboard) {
    return <ScreenState title="Loading associations" detail="Preparing association names and their live rate cards." loading />;
  }

  if (!dashboard) {
    return <ScreenState title="Associations unavailable" detail="We could not load the association list right now." />;
  }

  const activeAssociationName = user?.member_profile?.association?.name ?? dashboard.association.name;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRates(true)} />}
    >
      <Text style={styles.eyebrow}>Association Network</Text>
      <Text style={styles.title}>Other Associations</Text>
      <Text style={styles.context}>Logged in for {activeAssociationName}. Compare with the other association boards below.</Text>

      <View style={styles.currentCard}>
        <Text style={styles.currentLabel}>Your Association</Text>
        <Text style={styles.currentName}>{dashboard.association.name}</Text>
        <Text style={styles.currentUpdated}>Updated {dashboard.updated_at_label}</Text>
        <View style={styles.currentRatesRow}>
          <RatePill label="22K" value={dashboard.headline_rates.gold_22k.value} />
          <RatePill label="24K" value={dashboard.headline_rates.gold_24k.value} />
          <RatePill label="Silver" value={dashboard.headline_rates.silver.value} />
        </View>
      </View>

      {dashboard.other_associations.map((association) => (
        <View key={association.id} style={styles.associationCard}>
          <Text style={styles.associationName}>{association.name}</Text>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Gold 22K</Text>
            <Text style={styles.rateValue}>{formatCurrency(association.gold_22k, 0)}</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Gold 24K</Text>
            <Text style={styles.rateValue}>{formatCurrency(association.gold_24k, 0)}</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Silver</Text>
            <Text style={styles.rateValue}>{formatCurrency(association.silver, 0)}</Text>
          </View>
        </View>
      ))}

      {dashboard.comparisons.length ? (
        <View style={styles.marketCard}>
          <Text style={styles.marketTitle}>External Market Comparison</Text>
          {dashboard.comparisons.map((comparison) => (
            <View key={comparison.label} style={styles.rateRow}>
              <Text style={styles.rateLabel}>{comparison.label}</Text>
              <Text style={styles.rateValue}>{formatCurrency(comparison.gold_22k, 0)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!dashboard.other_associations.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No other associations yet</Text>
          <Text style={styles.emptyDetail}>Once more associations have rates, they will appear here automatically.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function RatePill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.ratePill}>
      <Text style={styles.ratePillLabel}>{label}</Text>
      <Text style={styles.ratePillValue}>{formatCurrency(value, 0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  eyebrow: { color: colors.mutedText, ...typography.eyebrow, marginTop: spacing.sm },
  title: { color: colors.text, ...typography.sectionTitle },
  context: { color: colors.mutedText, ...typography.body, marginTop: -spacing.sm },
  currentCard: {
    backgroundColor: "#0A0E1A",
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  currentLabel: {
    color: "#F1C40F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  currentName: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  currentUpdated: {
    color: "rgba(255,255,255,0.72)",
    marginTop: spacing.xs,
    ...typography.body,
  },
  currentRatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ratePill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ratePillLabel: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  ratePillValue: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  associationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  associationName: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  rateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, gap: spacing.md },
  rateLabel: { color: colors.mutedText, fontWeight: "600", flex: 1 },
  rateValue: { color: colors.text, fontWeight: "800", textAlign: "right" },
  marketCard: {
    backgroundColor: "#F6F3F2",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  marketTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginBottom: spacing.sm },
  emptyDetail: { color: colors.mutedText, ...typography.body },
});

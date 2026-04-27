import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { DashboardData } from "../../types/api";
import { formatCurrency } from "../../utils/format";
import { useEffect, useState } from "react";

export function AssociationRatesScreen() {
  const { status, user } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRates() {
      try {
        const nextDashboard = await getJson<DashboardData>("/dashboard/", status === "authenticated");
        if (active) {
          setDashboard(nextDashboard);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRates();

    return () => {
      active = false;
    };
  }, [status]);

  if (loading) {
    return <ScreenState title="Loading associations" detail="Preparing association names and their live rate cards." loading />;
  }

  if (!dashboard) {
    return <ScreenState title="Associations unavailable" detail="We could not load the association list right now." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Association Network</Text>
      <Text style={styles.title}>Other Associations</Text>
      <Text style={styles.context}>
        Logged in for {user?.member_profile?.association?.name ?? dashboard.association.name}. Compare with the other association boards below.
      </Text>

      <View style={styles.currentCard}>
        <Text style={styles.currentLabel}>Your Association</Text>
        <Text style={styles.currentName}>{dashboard.association.name}</Text>
        <Text style={styles.currentRates}>
          22K {formatCurrency(dashboard.headline_rates.gold_22k.value, 0)}  •  24K {formatCurrency(dashboard.headline_rates.gold_24k.value, 0)}
        </Text>
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

      {!dashboard.other_associations.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No other associations yet</Text>
          <Text style={styles.emptyDetail}>Once more associations have rates, they will appear here automatically.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.mutedText, ...typography.eyebrow, marginTop: spacing.sm },
  title: { color: colors.text, ...typography.sectionTitle },
  context: { color: colors.mutedText, ...typography.body, marginTop: -spacing.sm },
  currentCard: {
    backgroundColor: "#0A0E1A",
    borderRadius: radii.lg,
    padding: spacing.lg,
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
  currentRates: {
    color: "rgba(255,255,255,0.74)",
    marginTop: spacing.sm,
    ...typography.body,
  },
  associationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  associationName: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  rateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  rateLabel: { color: colors.mutedText, fontWeight: "600" },
  rateValue: { color: colors.text, fontWeight: "800" },
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

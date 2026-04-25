import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { DashboardData } from "../../types/api";
import { formatCompactNumber, formatCurrency } from "../../utils/format";

export function HomeDashboardScreen() {
  const navigation = useNavigation<any>();
  const { guestSession, status, user } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextDashboard = await getJson<DashboardData>("/dashboard/");
      setDashboard(nextDashboard);
      setError(null);
    } catch {
      setError("Unable to load the dashboard right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !dashboard) {
    return <ScreenState title="Loading command center" detail="Pulling the latest association rates and market signals." loading />;
  }

  if (!dashboard) {
    return <ScreenState title="Dashboard unavailable" detail={error ?? "Try again in a moment."} />;
  }

  const identityLine =
    status === "authenticated"
      ? `${user?.member_profile?.membership_tier ?? "Member"} access for ${user?.first_name || user?.username || "member"}`
      : `Guest browsing for ${guestSession?.guest_profile.guest_name ?? "visitor"}`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
    >
      <Text style={styles.brand}>Jewellery Association</Text>
      <SectionHeading>Daily Command Center</SectionHeading>
      <Text style={styles.context}>{identityLine}</Text>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Association Rates</Text>
        {[
          { label: "22K Gold", value: dashboard.headline_rates.gold_22k.value, trend: dashboard.headline_rates.gold_22k.trend },
          { label: "24K Gold", value: dashboard.headline_rates.gold_24k.value, trend: dashboard.headline_rates.gold_24k.trend },
          { label: "Silver", value: dashboard.headline_rates.silver.value, trend: dashboard.headline_rates.silver.trend },
        ].map((rate) => (
          <View key={rate.label} style={styles.rateRow}>
            <Text style={styles.rateLabel}>{rate.label}</Text>
            <View>
              <Text style={styles.rateValue}>{formatCurrency(rate.value)}</Text>
              <Text style={[styles.rateTrend, rate.trend === "down" ? styles.negative : styles.positive]}>
                {rate.trend === "down" ? "Falling" : "Rising"}
              </Text>
            </View>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Comparison Watch</Text>
        {dashboard.comparisons.map((comparison) => (
          <View key={comparison.label} style={styles.comparisonRow}>
            <Text style={styles.rateLabel}>{comparison.label}</Text>
            <Text style={styles.comparisonValue}>{formatCurrency(comparison.gold_22k)}</Text>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Global Trends</Text>
        <Text style={styles.meta}>USD / INR {formatCompactNumber(dashboard.global_trends.usd_inr)}</Text>
        <Text style={styles.meta}>Gold / Oz {formatCompactNumber(dashboard.global_trends.gold_oz)}</Text>
        <Text style={styles.meta}>Silver / Oz {formatCompactNumber(dashboard.global_trends.silver_oz)}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {dashboard.quick_actions.map((action) => (
            <Pressable
              key={action}
              style={styles.actionTile}
              onPress={() => {
                if (action === "Market Tiers") {
                  navigation.navigate("Market");
                } else if (action === "Services") {
                  navigation.navigate("Services");
                } else if (action === "News & Alerts") {
                  navigation.navigate("News");
                } else if (action === "Reverse Search") {
                  navigation.getParent()?.navigate("ReverseSearch");
                }
              }}
            >
              <Text style={styles.actionText}>{action}</Text>
            </Pressable>
          ))}
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: {
    color: colors.text,
    marginTop: spacing.md,
    ...typography.eyebrow,
  },
  context: {
    color: colors.mutedText,
    marginTop: -spacing.sm,
    ...typography.body,
  },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.md },
  rateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  rateLabel: { color: colors.mutedText, fontWeight: "600", maxWidth: "58%" },
  rateValue: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "right" },
  comparisonValue: { color: colors.text, fontWeight: "700" },
  rateTrend: { fontWeight: "700", textAlign: "right" },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  meta: { color: colors.text, fontSize: 16, marginBottom: spacing.sm },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionTile: { width: "48%", backgroundColor: colors.surfaceAlt, padding: spacing.md },
  actionText: { fontWeight: "700", color: colors.text },
});

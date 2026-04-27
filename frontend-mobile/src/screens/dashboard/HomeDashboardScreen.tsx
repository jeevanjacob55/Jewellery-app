import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
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
      const nextDashboard = await getJson<DashboardData>("/dashboard/", status === "authenticated");
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
  const associationName = user?.member_profile?.association?.name ?? dashboard.association.name;
  const latestNews = [
    { title: "General Body Meeting at 5 PM", summary: "All members are requested to attend the meeting at the association hall today.", time: "10m ago" },
    { title: "New GST Update for Jewellery", summary: "Revised tax implications on gold import and sales finalized by ministry.", time: "2h ago" },
    { title: "Emergency Rate Alert", summary: "Market volatility detected. Check revised evening gold rates.", time: "5h ago" },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>{associationName.toUpperCase()}</Text>
          <Text style={styles.context}>{identityLine}</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroAssociation}>{associationName}</Text>
            <Text style={styles.heroSubtitle}>Live Bullion Rates</Text>
          </View>
          <View style={styles.heroTimestamp}>
            <Text style={styles.heroTimestampText}>Updated: {dashboard.updated_at_label}</Text>
          </View>
        </View>

        {[
          { label: "Gold 22K (1G)", value: dashboard.headline_rates.gold_22k.value, trend: dashboard.headline_rates.gold_22k.trend },
          { label: "Gold 24K (1G)", value: dashboard.headline_rates.gold_24k.value, trend: dashboard.headline_rates.gold_24k.trend },
          { label: "Silver (1G)", value: dashboard.headline_rates.silver.value, trend: dashboard.headline_rates.silver.trend },
        ].map((rate, index) => (
          <View key={rate.label} style={[styles.heroRateRow, index === 2 && styles.heroRateRowBorder]}>
            <View>
              <Text style={styles.heroRateLabel}>{rate.label}</Text>
              <Text style={styles.heroRateValue}>{formatCurrency(rate.value, 0)}</Text>
            </View>
            <Text style={[styles.heroTrend, rate.trend === "down" ? styles.heroTrendDown : styles.heroTrendUp]}>
              {rate.trend === "down" ? "↓" : rate.trend === "up" ? "↑" : "•"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.subNavGrid}>
        <Pressable style={styles.subNavButton} onPress={() => navigation.navigate("AssociationRates")}>
          <Text style={styles.subNavIcon}>◫</Text>
          <Text style={styles.subNavText}>Other Associations</Text>
        </Pressable>
        <Pressable style={styles.subNavButton}>
          <Text style={styles.subNavIcon}>⌖</Text>
          <Text style={styles.subNavText}>Other States</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Global Trends</Text>
        <View style={styles.globalItem}>
          <View>
            <Text style={styles.globalLabel}>USD → INR</Text>
            <Text style={styles.globalValue}>₹{formatCompactNumber(dashboard.global_trends.usd_inr)}</Text>
          </View>
          <Text style={styles.globalTrendUp}>↗</Text>
        </View>
        <View style={styles.globalItem}>
          <View>
            <Text style={styles.globalLabel}>Gold / Oz (USD)</Text>
            <Text style={styles.globalValue}>${formatCompactNumber(dashboard.global_trends.gold_oz)}</Text>
          </View>
          <Text style={styles.globalTrendDown}>↘</Text>
        </View>
      </View>

      <View style={styles.bannerCard}>
        <Text style={styles.bannerTag}>Featured Offer</Text>
        <Text style={styles.bannerTitle}>New Membership Perks</Text>
        <Text style={styles.bannerText}>Exclusive access to trade analysis tools starting this month.</Text>
      </View>

      <View>
        <Text style={styles.quickActionLabel}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {dashboard.quick_actions.map((action) => (
            <Pressable
              key={action}
              style={styles.actionTile}
              onPress={() => {
                if (action === "Market Tiers") {
                  navigation.navigate("Market");
                } else if (action === "Other Associations") {
                  navigation.navigate("AssociationRates");
                } else if (action === "Services") {
                  navigation.navigate("Services");
                } else if (action === "News & Alerts") {
                  navigation.navigate("News");
                } else if (action === "Reverse Search") {
                  navigation.getParent()?.navigate("ReverseSearch");
                }
              }}
            >
              <Text style={styles.actionIcon}>{ACTION_SYMBOLS[action] ?? "•"}</Text>
              <Text style={styles.actionText}>{action}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.newsSection}>
        <View style={styles.newsSectionHeader}>
          <Text style={styles.quickActionLabel}>Latest News</Text>
          <Pressable onPress={() => navigation.navigate("News")}>
            <Text style={styles.viewAllLink}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.newsListCard}>
          {latestNews.map((item, index) => (
            <Pressable key={item.title} style={[styles.newsItem, index !== latestNews.length - 1 && styles.newsItemDivider]} onPress={() => navigation.navigate("News")}>
              <View style={styles.newsIconWrap}>
                <Text style={styles.newsIcon}>{index === 0 ? "◷" : index === 1 ? "⚖" : "!"}</Text>
              </View>
              <View style={styles.newsCopy}>
                <View style={styles.newsTitleRow}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <Text style={styles.newsTime}>{item.time}</Text>
                </View>
                <Text style={styles.newsSummary}>{item.summary}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const ACTION_SYMBOLS: Record<string, string> = {
  "Market Tiers": "↗",
  "Other Associations": "◫",
  "Reverse Search": "⌕",
  Services: "▣",
  "News & Alerts": "✦",
  "Advertiser Portal": "◉",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: {
    color: colors.text,
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  context: {
    color: colors.mutedText,
    ...typography.body,
  },
  topBar: { marginBottom: spacing.xs },
  heroCard: {
    backgroundColor: "#0A0E1A",
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  heroAssociation: {
    color: "#F1C40F",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.62)",
    marginTop: spacing.xs,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  heroTimestamp: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroTimestampText: { color: colors.surface, fontSize: 10, fontWeight: "700" },
  heroRateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  heroRateRowBorder: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingTop: spacing.md },
  heroRateLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  heroRateValue: { color: colors.surface, fontSize: 30, fontWeight: "800", marginTop: spacing.xs },
  heroTrend: { fontSize: 24, fontWeight: "800" },
  heroTrendUp: { color: "#4ADE80" },
  heroTrendDown: { color: "#F87171" },
  subNavGrid: { flexDirection: "row", gap: spacing.md },
  subNavButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    flexDirection: "row",
  },
  subNavIcon: { color: "#B9770E", fontSize: 18, fontWeight: "800" },
  subNavText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  sectionCard: {
    backgroundColor: "#F6F3F2",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  sectionEyebrow: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  globalItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  globalLabel: { color: colors.mutedText, fontSize: 12, marginBottom: spacing.xs },
  globalValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  globalTrendUp: { color: colors.positive, fontSize: 24, fontWeight: "800" },
  globalTrendDown: { color: colors.negative, fontSize: 24, fontWeight: "800" },
  bannerCard: {
    backgroundColor: "#1C1917",
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 144,
    justifyContent: "flex-end",
  },
  bannerTag: {
    alignSelf: "flex-start",
    backgroundColor: "#D97706",
    color: colors.surface,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  bannerTitle: { color: colors.surface, fontSize: 22, fontWeight: "800" },
  bannerText: { color: "rgba(255,255,255,0.74)", marginTop: spacing.xs, ...typography.body },
  quickActionLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionTile: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F6F3F2",
    gap: spacing.sm,
  },
  actionIcon: { color: "#D97706", fontSize: 28, fontWeight: "800" },
  actionText: { fontWeight: "800", color: colors.text, textAlign: "center" },
  newsSection: { paddingBottom: spacing.lg },
  newsSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewAllLink: { color: "#D97706", fontWeight: "800", fontSize: 12 },
  newsListCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  newsItem: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" },
  newsItemDivider: { borderBottomWidth: 1, borderBottomColor: "#ECE7E7" },
  newsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  newsIcon: { color: "#D97706", fontSize: 18, fontWeight: "800" },
  newsCopy: { flex: 1 },
  newsTitleRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  newsTitle: { color: colors.text, fontWeight: "800", flex: 1 },
  newsTime: { color: "#A8A29E", fontSize: 10, marginTop: 2 },
  newsSummary: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
});

import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { DashboardData, NewsData } from "../../types/api";
import { formatCompactNumber, formatCurrency } from "../../utils/format";

type DashboardUpdate = {
  id: string;
  title: string;
  summary: string;
  meta: string;
  icon: string;
};

const ACTION_SYMBOLS: Record<string, string> = {
  "Market Tiers": "↗",
  "Other Associations": "◫",
  "Reverse Search": "⌕",
  Services: "▣",
  "News & Alerts": "✦",
  "Advertiser Portal": "◉",
};

export function HomeDashboardScreen() {
  const navigation = useNavigation<any>();
  const { guestSession, status, user } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
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
      const [nextDashboard, nextNews] = await Promise.all([
        getJson<DashboardData>("/dashboard/", status === "authenticated"),
        getJson<NewsData>("/news/"),
      ]);
      setDashboard(nextDashboard);
      setNewsData(nextNews);
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
  }, [status]);

  const updates = useMemo<DashboardUpdate[]>(() => {
    if (!newsData) {
      return [];
    }

    const items: DashboardUpdate[] = [];
    if (newsData.urgent_alert.title && newsData.urgent_alert.title !== "No active alerts") {
      items.push({
        id: "alert",
        title: newsData.urgent_alert.title,
        summary: newsData.urgent_alert.summary || "Association update available.",
        meta: "Urgent alert",
        icon: "!",
      });
    }

    newsData.meetings.slice(0, 2).forEach((meeting, index) => {
      items.push({
        id: `meeting-${index}`,
        title: meeting.title,
        summary: meeting.venue,
        meta: "Meeting",
        icon: "◷",
      });
    });

    return items;
  }, [newsData]);

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
  const shortcutHighlights = [
    {
      key: "associations",
      title: "Other Associations",
      icon: "◫",
      detail: `${dashboard.other_associations.length} live boards`,
      onPress: () => navigation.navigate("AssociationRates"),
    },
    {
      key: "markets",
      title: "Market Comparison",
      icon: "⌖",
      detail: `${dashboard.comparisons.length} external markets`,
      onPress: () => navigation.navigate("Market"),
    },
  ];
  const globalTrendCards = [
    { label: "USD → INR", value: `Rs. ${formatCompactNumber(dashboard.global_trends.usd_inr)}` },
    { label: "Gold / Oz (USD)", value: `$${formatCompactNumber(dashboard.global_trends.gold_oz)}` },
    { label: "Silver / Oz (USD)", value: `$${formatCompactNumber(dashboard.global_trends.silver_oz)}` },
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
            <Text style={styles.heroTimestampLabel}>Updated</Text>
            <Text style={styles.heroTimestampText}>{dashboard.updated_at_label}</Text>
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
            <Text style={[styles.heroTrend, trendStyle(rate.trend)]}>{trendSymbol(rate.trend)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.subNavGrid}>
        {shortcutHighlights.map((shortcut) => (
          <Pressable key={shortcut.key} style={styles.subNavButton} onPress={shortcut.onPress}>
            <Text style={styles.subNavIcon}>{shortcut.icon}</Text>
            <View style={styles.subNavCopy}>
              <Text style={styles.subNavText}>{shortcut.title}</Text>
              <Text style={styles.subNavDetail}>{shortcut.detail}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Global Trends</Text>
        {globalTrendCards.map((trend) => (
          <View key={trend.label} style={styles.globalItem}>
            <View>
              <Text style={styles.globalLabel}>{trend.label}</Text>
              <Text style={styles.globalValue}>{trend.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {newsData ? (
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTag}>{newsData.urgent_alert.title === "No active alerts" ? "Notice" : "Urgent Alert"}</Text>
          <Text style={styles.bannerTitle}>{newsData.urgent_alert.title}</Text>
          <Text style={styles.bannerText}>
            {newsData.urgent_alert.summary || "Your association news feed is live and ready for new updates."}
          </Text>
        </View>
      ) : null}

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
          <Text style={styles.quickActionLabel}>Latest Updates</Text>
          <Pressable onPress={() => navigation.navigate("News")}>
            <Text style={styles.viewAllLink}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.newsListCard}>
          {updates.length ? (
            updates.map((item, index) => (
              <Pressable key={item.id} style={[styles.newsItem, index !== updates.length - 1 && styles.newsItemDivider]} onPress={() => navigation.navigate("News")}>
                <View style={styles.newsIconWrap}>
                  <Text style={styles.newsIcon}>{item.icon}</Text>
                </View>
                <View style={styles.newsCopy}>
                  <View style={styles.newsTitleRow}>
                    <Text style={styles.newsTitle}>{item.title}</Text>
                    <Text style={styles.newsTime}>{item.meta}</Text>
                  </View>
                  <Text style={styles.newsSummary}>{item.summary}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyNewsState}>
              <Text style={styles.emptyNewsTitle}>No fresh updates right now</Text>
              <Text style={styles.emptyNewsText}>Association notices and meetings will appear here as soon as they are published.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function trendSymbol(trend: string) {
  if (trend === "up") {
    return "↑";
  }
  if (trend === "down") {
    return "↓";
  }
  return "•";
}

function trendStyle(trend: string) {
  if (trend === "up") {
    return styles.heroTrendUp;
  }
  if (trend === "down") {
    return styles.heroTrendDown;
  }
  return styles.heroTrendFlat;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
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
    alignItems: "center",
  },
  heroTimestampLabel: { color: "rgba(255,255,255,0.68)", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  heroTimestampText: { color: colors.surface, fontSize: 11, fontWeight: "700", marginTop: 2 },
  heroRateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  heroRateRowBorder: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingTop: spacing.md },
  heroRateLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  heroRateValue: { color: colors.surface, fontSize: 30, fontWeight: "800", marginTop: spacing.xs },
  heroTrend: { fontSize: 24, fontWeight: "800" },
  heroTrendUp: { color: "#4ADE80" },
  heroTrendDown: { color: "#F87171" },
  heroTrendFlat: { color: "#E5E7EB" },
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
  subNavCopy: { flex: 1 },
  subNavText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  subNavDetail: { color: colors.mutedText, fontSize: 11, marginTop: 2 },
  sectionCard: {
    backgroundColor: "#F6F3F2",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionEyebrow: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  globalItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  globalLabel: { color: colors.mutedText, fontSize: 12, marginBottom: spacing.xs },
  globalValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
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
  newsTime: { color: "#A8A29E", fontSize: 10, marginTop: 2, textTransform: "uppercase" },
  newsSummary: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  emptyNewsState: { padding: spacing.lg },
  emptyNewsTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  emptyNewsText: { color: colors.mutedText, marginTop: spacing.sm, ...typography.body },
});

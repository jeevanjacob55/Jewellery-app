import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getAdvertisements, recordAdClick, recordAdImpression } from "../../api/ads";
import { getJson } from "../../api/client";
import { AdvertisementCarousel } from "../../components/AdvertisementCarousel";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { DashboardWelcomeFilmstrip } from "./DashboardWelcomeFilmstrip";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { AdvertisementItem, DashboardData, NewsData } from "../../types/api";
import { executeAdvertisementAction } from "../../utils/advertisements";
import { formatCompactNumber, formatCurrency, formatDateTimeLabel } from "../../utils/format";

type DashboardUpdate = {
  id: string;
  title: string;
  summary: string;
  meta: string;
  icon: string;
  onPress: () => void;
};

const dismissedAssociationFilmstrips = new Set<number>();

export function HomeDashboardScreen() {
  const navigation = useNavigation<any>();
  const { guestSession, me, status } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [advertisements, setAdvertisements] = useState<AdvertisementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewedAdvertisementIdsRef = useRef<Set<number>>(new Set());

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [nextDashboard, nextNews, nextAdvertisements] = await Promise.all([
        getJson<DashboardData>("/dashboard/", status === "authenticated"),
        getJson<NewsData>("/news/", status === "authenticated"),
        getAdvertisements("dashboard_hero").catch(() => ({ results: [] })),
      ]);
      setDashboard(nextDashboard);
      setNewsData(nextNews);
      setAdvertisements(nextAdvertisements.results);
      viewedAdvertisementIdsRef.current = new Set();
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

  const associationName = me?.hierarchy.association ?? dashboard?.association.name ?? "Jewellery Association";
  const unreadNotificationsCount = me?.counts.unread_notifications_count ?? 0;
  const identityLine =
    status === "authenticated"
      ? `${me?.user.role_display_name ?? "Member"} access for ${me?.user.name ?? "member"}`
      : `Guest browsing for ${guestSession?.guest_profile.guest_name ?? "visitor"}`;

  const updates = useMemo<DashboardUpdate[]>(() => {
    if (!newsData) {
      return [];
    }

    const items: DashboardUpdate[] = [];
    if (newsData.meetings[0]) {
      items.push({
        id: "meeting-primary",
        title: newsData.meetings[0].title,
        summary: `${newsData.meetings[0].venue_name || "Venue to be announced"} | ${formatDateTimeLabel(newsData.meetings[0].start_datetime)}`,
        meta: "Meeting",
        icon: "\u25F7",
        onPress: () => navigation.navigate("MeetingDetail", { meetingId: newsData.meetings[0].id }),
      });
    }

    items.push({
      id: "alert-primary",
      title: newsData.urgent_alert.title,
      summary: newsData.urgent_alert.summary || "Association-wide notice available in the alerts feed.",
      meta: "Alert",
      icon: "!",
      onPress: () => navigation.navigate("News"),
    });

    if (newsData.meetings[1]) {
      items.push({
        id: "meeting-secondary",
        title: newsData.meetings[1].title,
        summary: `${newsData.meetings[1].venue_name || "Venue to be announced"} | ${formatDateTimeLabel(newsData.meetings[1].start_datetime)}`,
        meta: "Workshop",
        icon: "\u2696",
        onPress: () => navigation.navigate("MeetingDetail", { meetingId: newsData.meetings[1].id }),
      });
    }

    return items;
  }, [navigation, newsData]);

  if (loading && !dashboard) {
    return <ScreenState title="Loading command center" detail="Pulling the latest association rates and market signals." loading />;
  }

  if (!dashboard) {
    return <ScreenState title="Dashboard unavailable" detail={error ?? "Try again in a moment."} />;
  }

  const rateRows = [
    { label: "GOLD 22K (1G)", value: dashboard.headline_rates.gold_22k.value, trend: dashboard.headline_rates.gold_22k.trend },
    { label: "GOLD 24K (1G)", value: dashboard.headline_rates.gold_24k.value, trend: dashboard.headline_rates.gold_24k.trend },
    { label: "SILVER (1G)", value: dashboard.headline_rates.silver.value, trend: dashboard.headline_rates.silver.trend },
  ];
  const globalTrendCards = [
    { label: "USD -> INR", value: `Rs. ${formatCompactNumber(dashboard.global_trends.usd_inr)}`, trend: "up" },
    { label: "Gold/Oz (USD)", value: `$${formatCompactNumber(dashboard.global_trends.gold_oz)}`, trend: "down" },
    { label: "Silver/Oz (USD)", value: `$${formatCompactNumber(dashboard.global_trends.silver_oz)}`, trend: "up" },
  ];
  const welcomeFilmstrip = dashboard.dashboard_welcome_filmstrip;
  const welcomeFilmstripDismissed =
    welcomeFilmstrip?.reshow_policy === "next_app_launch" && welcomeFilmstrip
      ? dismissedAssociationFilmstrips.has(welcomeFilmstrip.association_id)
      : false;
  const shouldShowWelcomeFilmstrip =
    status === "authenticated" &&
    Boolean(welcomeFilmstrip?.enabled) &&
    Boolean(welcomeFilmstrip?.items.length) &&
    (welcomeFilmstrip?.reshow_policy === "every_dashboard_visit" || !welcomeFilmstripDismissed);
  const shortcuts = [
    {
      key: "other-associations",
      title: "Other\nAssociations",
      onPress: () => navigation.navigate("AssociationRates"),
    },
    {
      key: "other-states",
      title: "Other States",
      onPress: () => navigation.navigate("StateRates"),
    },
  ];

  async function handleAdvertisementVisible(advertisement: AdvertisementItem) {
    if (viewedAdvertisementIdsRef.current.has(advertisement.id)) {
      return;
    }

    viewedAdvertisementIdsRef.current.add(advertisement.id);
    try {
      await recordAdImpression(advertisement.id, { placement: "dashboard_hero" });
    } catch {
      // Impression tracking is best-effort and should never disrupt the dashboard.
    }
  }

  async function handleAdvertisementPress(advertisement: AdvertisementItem) {
    try {
      await recordAdClick(advertisement.id, { placement: "dashboard_hero" });
    } catch {
      // Click tracking is best-effort and should never block navigation.
    }
    await executeAdvertisementAction(advertisement, navigation);
  }

  return (
    <AppScreen
      scrollable
      safeAreaEdges={["top"]}
      backgroundColor="#F5F5F5"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
    >
      <AppHeader
        title={associationName.toUpperCase()}
        subtitle={identityLine}
        centered
        style={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        right={
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("Notifications")}>
            <View style={styles.notificationIcon}>
              <View style={styles.notificationBell} />
              <View style={styles.notificationClapper} />
              {unreadNotificationsCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        }
      />

      {shouldShowWelcomeFilmstrip && welcomeFilmstrip ? (
        <DashboardWelcomeFilmstrip
          payload={welcomeFilmstrip}
          onDismiss={() => {
            if (welcomeFilmstrip.reshow_policy === "next_app_launch") {
              dismissedAssociationFilmstrips.add(welcomeFilmstrip.association_id);
            }
          }}
        />
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroWatermark}>
          <Text style={styles.heroWatermarkText}>JA</Text>
        </View>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroAssociation}>{associationName.toUpperCase()}</Text>
            <Text style={styles.heroSubtitle}>LIVE BULLION RATES</Text>
          </View>
          <View style={styles.heroTimestamp}>
            <Text style={styles.heroTimestampLabel}>Updated:</Text>
            <Text style={styles.heroTimestampText}>{dashboard.updated_at_label}</Text>
          </View>
        </View>

        {rateRows.map((rate, index) => (
          <View key={rate.label} style={[styles.heroRateRow, index < rateRows.length - 1 && styles.heroRateSpacing]}>
            <View>
              <Text style={styles.heroRateLabel}>{rate.label}</Text>
              <Text style={styles.heroRateValue}>{formatCurrency(rate.value, 0)}</Text>
            </View>
            <View style={[styles.trendBadge, rate.trend === "down" ? styles.trendBadgeDown : styles.trendBadgeUp]}>
              <Text style={[styles.trendBadgeText, rate.trend === "down" ? styles.trendTextDown : styles.trendTextUp]}>
                {rate.trend === "down" ? "\u2198" : rate.trend === "up" ? "\u2197" : "\u2022"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.shortcutsRow}>
        {shortcuts.map((shortcut) => (
          <Pressable key={shortcut.key} style={styles.shortcutCard} onPress={shortcut.onPress}>
            {shortcut.key === "other-associations" ? (
              <View style={styles.associationsIcon}>
                <View style={styles.associationsIconTop} />
                <View style={styles.associationsIconColumns}>
                  <View style={styles.associationsIconColumn} />
                  <View style={styles.associationsIconColumn} />
                  <View style={styles.associationsIconColumn} />
                </View>
              </View>
            ) : (
              <View style={styles.stateMapIcon}>
                <View style={[styles.stateMapPanel, styles.stateMapPanelLeft]} />
                <View style={[styles.stateMapPanel, styles.stateMapPanelMiddle]} />
                <View style={[styles.stateMapPanel, styles.stateMapPanelRight]} />
              </View>
            )}
            <Text style={styles.shortcutText}>{shortcut.title}</Text>
          </Pressable>
        ))}
      </View>

      <AdvertisementCarousel advertisements={advertisements} onPress={handleAdvertisementPress} onVisible={handleAdvertisementVisible} />

      <View style={styles.globalCard}>
        <Text style={styles.sectionEyebrow}>GLOBAL TRENDS</Text>
        {globalTrendCards.map((trend, index) => (
          <View key={trend.label} style={[styles.globalItem, index < globalTrendCards.length - 1 && styles.globalItemSpacing]}>
            <View>
              <Text style={styles.globalLabel}>{trend.label}</Text>
              <Text style={styles.globalValue}>{trend.value}</Text>
            </View>
            <Text style={[styles.globalTrendIcon, trend.trend === "down" ? styles.trendTextDown : styles.trendTextUp]}>
              {trend.trend === "down" ? "\u2198" : "\u2197"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.newsSection}>
        <View style={styles.newsSectionHeader}>
          <Text style={styles.sectionEyebrow}>LATEST NEWS</Text>
          <Pressable onPress={() => navigation.navigate("News")}>
            <Text style={styles.viewAllLink}>{"View All ->"}</Text>
          </Pressable>
        </View>
        <View style={styles.newsListCard}>
          {updates.length ? (
            updates.map((item, index) => (
              <Pressable key={item.id} style={[styles.newsItem, index < updates.length - 1 && styles.newsItemDivider]} onPress={item.onPress}>
                <View style={styles.newsIconWrap}>
                  <Text style={styles.newsIcon}>{item.icon}</Text>
                </View>
                <View style={styles.newsCopy}>
                  <View style={styles.newsTitleRow}>
                    <Text style={styles.newsTitle}>{item.title}</Text>
                    <Text style={styles.newsMeta}>{item.meta}</Text>
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: spacing.xs,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIcon: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBell: {
    width: 13,
    height: 11,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: "#1F2937",
  },
  notificationClapper: {
    width: 10,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#1F2937",
    marginTop: 1,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    color: "#6B7280",
    fontSize: 11,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#13213B",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  heroWatermark: {
    position: "absolute",
    right: 16,
    bottom: 12,
    width: 92,
    height: 70,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroWatermarkText: {
    color: "rgba(255,255,255,0.08)",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroAssociation: {
    color: "#D97706",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.8,
    lineHeight: 18,
    maxWidth: 180,
  },
  heroSubtitle: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 1,
  },
  heroTimestamp: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  heroTimestampLabel: {
    fontSize: 10,
    color: "#D1D5DB",
  },
  heroTimestampText: {
    fontSize: 11,
    color: colors.surface,
    fontWeight: "700",
    marginTop: 2,
  },
  heroRateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroRateSpacing: {
    marginBottom: 14,
  },
  heroRateLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  heroRateValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.surface,
  },
  trendBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadgeUp: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  trendBadgeDown: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  trendBadgeText: {
    fontSize: 16,
    fontWeight: "800",
  },
  trendTextUp: {
    color: "#16A34A",
  },
  trendTextDown: {
    color: "#DC2626",
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  shortcutIcon: {
    color: "#D97706",
    fontSize: 24,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
  },
  associationsIcon: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  associationsIconTop: {
    width: 18,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: "#D97706",
    marginBottom: 2,
  },
  associationsIconColumns: {
    flexDirection: "row",
    gap: 3,
  },
  associationsIconColumn: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#D97706",
  },
  stateMapIcon: {
    width: 26,
    height: 26,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 2,
  },
  stateMapPanel: {
    borderRadius: 2,
    borderWidth: 1.6,
    borderColor: "#D97706",
  },
  stateMapPanelLeft: {
    flex: 1,
    transform: [{ skewY: "12deg" }],
  },
  stateMapPanelMiddle: {
    flex: 1,
  },
  stateMapPanelRight: {
    flex: 1,
    transform: [{ skewY: "-12deg" }],
  },
  shortcutText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    flex: 1,
  },
  globalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  sectionEyebrow: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 14,
  },
  globalItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  globalItemSpacing: {
    marginBottom: 8,
  },
  globalLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 3,
  },
  globalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  globalTrendIcon: {
    fontSize: 18,
    fontWeight: "800",
  },
  newsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  newsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllLink: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: "700",
  },
  newsListCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  newsItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  newsItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  newsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  newsIcon: {
    color: "#D97706",
    fontSize: 18,
    fontWeight: "800",
  },
  newsCopy: {
    flex: 1,
  },
  newsTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  newsTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
    lineHeight: 18,
    flex: 1,
  },
  newsMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  newsSummary: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 17,
  },
  emptyNewsState: {
    paddingVertical: spacing.lg,
  },
  emptyNewsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyNewsText: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    ...typography.body,
  },
});

import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { AppScreen } from "../../components/AppScreen";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";

type NotificationCategory = "all" | "rates" | "news" | "meetings" | "ads" | "approvals";
type NotificationGroup = "Today" | "This Week" | "Older";

type NotificationItem = {
  id: string;
  category: Exclude<NotificationCategory, "all">;
  group: NotificationGroup;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  ctaLabel?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  onCtaPress?: () => void;
};

const FILTERS: Array<{ key: NotificationCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "rates", label: "Rates" },
  { key: "news", label: "News" },
  { key: "meetings", label: "Meetings" },
  { key: "ads", label: "Ads" },
  { key: "approvals", label: "Approvals" },
];

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { me } = useSession();
  const [activeFilter, setActiveFilter] = useState<NotificationCategory>("all");
  const [readIds, setReadIds] = useState<Record<string, true>>({});

  const items = useMemo<NotificationItem[]>(() => {
    const baseItems: NotificationItem[] = [
      {
        id: "gold-rate",
        category: "rates",
        group: "Today",
        title: "Gold Rate Update",
        body: "24K Gold has increased by 0.5% in your selected association market.",
        time: "5m ago",
        unread: true,
        icon: "trending-up",
        onPress: () => navigation.navigate("AssociationRates"),
      },
      {
        id: "ethical-news",
        category: "news",
        group: "Today",
        title: "New Ethical Sourcing Standards",
        body: "The Association has published updated guidelines for members and companies.",
        time: "2h ago",
        unread: false,
        icon: "newspaper",
        onPress: () => navigation.navigate("News"),
      },
      {
        id: "quarterly-meeting",
        category: "meetings",
        group: "This Week",
        title: "Quarterly Board Meeting",
        body: "Scheduled for July 15th at 10:00 AM. Venue details are available in meetings.",
        time: "1d ago",
        unread: true,
        icon: "event",
        onPress: () => navigation.navigate("News"),
      },
      {
        id: "expo-ad",
        category: "ads",
        group: "This Week",
        title: "Summer Expo Registration",
        body: "Early bird registrations are now open for the upcoming trade showcase.",
        time: "2d ago",
        unread: false,
        icon: "local-offer",
        onPress: () => navigation.navigate("Services"),
      },
      {
        id: "system-maintenance",
        category: "news",
        group: "Older",
        title: "System Maintenance",
        body: "Scheduled downtime completed successfully and services are back online.",
        time: "2w ago",
        unread: false,
        icon: "info",
        onPress: () => Alert.alert("System Update", "Maintenance details are not available on mobile yet."),
      },
    ];

    if (me?.user.is_admin) {
      baseItems.splice(4, 0, {
        id: "pending-approvals",
        category: "approvals",
        group: "This Week",
        title: "Pending Member Approval",
        body: `${me.counts.pending_approvals_count || 3} approval item${(me.counts.pending_approvals_count || 3) === 1 ? "" : "s"} are waiting for review.`,
        time: "3d ago",
        unread: true,
        icon: "verified-user",
        ctaLabel: "Review",
        onPress: () => navigation.navigate("PendingApprovals"),
        onCtaPress: () => navigation.navigate("PendingApprovals"),
      });
    }

    return baseItems;
  }, [me?.counts.pending_approvals_count, me?.user.is_admin, navigation]);

  const visibleItems = items.filter((item) => activeFilter === "all" || item.category === activeFilter);
  const grouped = {
    Today: visibleItems.filter((item) => item.group === "Today"),
    "This Week": visibleItems.filter((item) => item.group === "This Week"),
    Older: visibleItems.filter((item) => item.group === "Older"),
  } satisfies Record<NotificationGroup, NotificationItem[]>;

  function isUnread(item: NotificationItem) {
    return item.unread && !readIds[item.id];
  }

  function markRead(id: string) {
    setReadIds((current) => ({ ...current, [id]: true }));
  }

  function markAllAsRead() {
    const next: Record<string, true> = {};
    items.forEach((item) => {
      next[item.id] = true;
    });
    setReadIds(next);
  }

  function handleOpen(item: NotificationItem) {
    markRead(item.id);
    item.onPress();
  }

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mobileHeader}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color="#000000" />
          </Pressable>
          <Text style={styles.mobileHeaderTitle}>JEWELLERY ASSOCIATION</Text>
          <Pressable style={styles.headerIconButton} onPress={() => Alert.alert("More actions", "Additional notification actions will be added later.")}>
            <MaterialIcons name="more-vert" size={22} color="#000000" />
          </Pressable>
        </View>

        <View style={styles.headingRow}>
          <Text style={styles.screenTitle}>Notifications</Text>
          <Pressable onPress={markAllAsRead}>
            <Text style={styles.markReadLink}>Mark all as read</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.filter((filter) => filter.key !== "approvals" || me?.user.is_admin).map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Pressable key={filter.key} style={[styles.filterChip, active ? styles.filterChipActive : null]} onPress={() => setActiveFilter(filter.key)}>
                <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {(Object.keys(grouped) as NotificationGroup[]).map((group) =>
          grouped[group].length ? (
            <View key={group} style={styles.groupSection}>
              <Text style={styles.groupLabel}>{group.toUpperCase()}</Text>
              <View style={styles.groupList}>
                {grouped[group].map((item, index) => {
                  const unread = isUnread(item);
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.notificationCard, index > 0 ? styles.notificationCardBorder : null]}
                      onPress={() => handleOpen(item)}
                    >
                      {unread ? <View style={styles.unreadRail} /> : null}
                      <View style={styles.notificationIconWrap}>
                        <MaterialIcons name={item.icon} size={20} color={unread ? "#000000" : "#7E7576"} />
                      </View>
                      <View style={styles.notificationCopy}>
                        <View style={styles.notificationHeader}>
                          <Text style={[styles.notificationTitle, unread ? styles.notificationTitleUnread : null]}>{item.title}</Text>
                          <View style={styles.notificationMeta}>
                            {unread ? <View style={styles.unreadDot} /> : null}
                            <Text style={styles.notificationTime}>{item.time}</Text>
                          </View>
                        </View>
                        <Text style={styles.notificationBody}>{item.body}</Text>
                        {item.ctaLabel && item.onCtaPress ? (
                          <Pressable
                            style={styles.reviewButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              markRead(item.id);
                              item.onCtaPress?.();
                            }}
                          >
                            <Text style={styles.reviewButtonText}>{item.ctaLabel}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null,
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  mobileHeader: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#CFC4C5",
    backgroundColor: "#FBF9F9",
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileHeaderTitle: {
    flex: 1,
    textAlign: "center",
    color: "#000000",
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  headingRow: {
    marginTop: 32,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  screenTitle: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "500",
  },
  markReadLink: {
    color: "#775A19",
    fontSize: 13,
    fontWeight: "500",
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xl,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F5F3F3",
    borderWidth: 1,
    borderColor: "#CFC4C5",
  },
  filterChipActive: {
    backgroundColor: "#FED488",
    borderColor: "#775A19",
  },
  filterChipText: {
    color: "#4C4546",
    fontSize: 13,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#785A1A",
  },
  groupSection: {
    marginBottom: spacing.xl,
  },
  groupLabel: {
    color: "#7E7576",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.md,
    paddingLeft: 4,
  },
  groupList: {
    gap: spacing.sm,
  },
  notificationCard: {
    position: "relative",
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing.lg,
  },
  notificationCardBorder: {
    borderTopWidth: 1,
    borderTopColor: "#E3E2E2",
  },
  unreadRail: {
    position: "absolute",
    left: 0,
    top: spacing.md,
    bottom: spacing.md,
    width: 4,
    backgroundColor: "#775A19",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  notificationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFEDED",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notificationCopy: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    color: "#1B1C1C",
    fontSize: 16,
    fontWeight: "400",
  },
  notificationTitleUnread: {
    fontWeight: "600",
  },
  notificationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#775A19",
  },
  notificationTime: {
    color: "#7E7576",
    fontSize: 13,
    fontWeight: "500",
  },
  notificationBody: {
    color: "#4C4546",
    fontSize: 16,
    lineHeight: 24,
  },
  reviewButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: "#000000",
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
});

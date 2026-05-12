import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";

import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import { AppScreen } from "../../components/AppScreen";
import { useSession } from "../../session/SessionProvider";
import { spacing } from "../../theme/tokens";
import { NotificationFeedItem, NotificationFeedType } from "../../types/api";

type NotificationGroup = "Today" | "This Week" | "Older";

const FILTERS: Array<{ key: NotificationFeedType; label: string }> = [
  { key: "all", label: "All" },
  { key: "product", label: "Products" },
  { key: "news", label: "News" },
  { key: "meeting", label: "Meetings" },
  { key: "rate", label: "Rates" },
];

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { refreshCurrentUser, status } = useSession();
  const [activeFilter, setActiveFilter] = useState<NotificationFeedType>("all");
  const [items, setItems] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function loadNotifications(filterType = activeFilter, isRefresh = false) {
    if (status !== "authenticated") {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = await getNotifications(filterType);
      setItems(payload.results);
      setError(null);
      await refreshCurrentUser();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load notifications right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    void loadNotifications(activeFilter);
  }, [activeFilter, isFocused, status]);

  function groupForItem(item: NotificationFeedItem): NotificationGroup {
    const createdAt = new Date(item.created_at).getTime();
    const ageMs = Date.now() - createdAt;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    if (ageMs < oneDayMs) {
      return "Today";
    }
    if (ageMs < sevenDaysMs) {
      return "This Week";
    }
    return "Older";
  }

  function formatRelativeTime(value: string) {
    const createdAt = new Date(value).getTime();
    const diffMs = Math.max(Date.now() - createdAt, 0);
    const minutes = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (minutes < 1) {
      return "Just now";
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    if (days < 7) {
      return `${days}d ago`;
    }
    return `${Math.floor(days / 7)}w ago`;
  }

  function iconForType(type: NotificationFeedItem["type"]): keyof typeof MaterialIcons.glyphMap {
    switch (type) {
      case "product":
        return "inventory-2";
      case "news":
        return "newspaper";
      case "meeting":
        return "event";
      case "rate":
        return "trending-up";
      default:
        return "notifications";
    }
  }

  async function handleOpen(item: NotificationFeedItem) {
    if (!item.is_read) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)));
      try {
        await markNotificationRead(item.id);
      } catch {
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, is_read: false } : entry)));
      } finally {
        await refreshCurrentUser();
      }
    }

    switch (item.target_route) {
      case "ProductDetail":
        navigation.navigate("ProductDetail", {
          productId: item.target_payload.productId,
          companyId: item.target_payload.companyId,
        });
        break;
      case "NewsDetail":
        navigation.navigate("NewsDetail", { newsId: item.target_payload.newsId });
        break;
      case "MeetingDetail":
        navigation.navigate("MeetingDetail", { meetingId: item.target_payload.meetingId });
        break;
      case "RateDetails":
        navigation.navigate("RateDetails", {
          associationId: item.target_payload.associationId,
          associationName: item.target_payload.associationName,
        });
        break;
      default:
        break;
    }
  }

  async function handleMarkAllAsRead() {
    const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
    if (!unreadIds.length) {
      setMenuOpen(false);
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    setMenuOpen(false);
    try {
      await markAllNotificationsRead();
    } catch {
      setItems((current) =>
        current.map((item) => (unreadIds.includes(item.id) ? { ...item, is_read: false } : item)),
      );
    } finally {
      await refreshCurrentUser();
    }
  }

  const grouped: Record<NotificationGroup, NotificationFeedItem[]> = {
    Today: [],
    "This Week": [],
    Older: [],
  };
  items.forEach((item) => {
    grouped[groupForItem(item)].push(item);
  });

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadNotifications(activeFilter, true)} />}
      >
        <View style={styles.mobileHeader}>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color="#000000" />
          </Pressable>
          <Text style={styles.mobileHeaderTitle}>Notifications</Text>
          <View style={styles.headerMenuWrap}>
            <Pressable style={styles.headerIconButton} onPress={() => setMenuOpen((current) => !current)}>
              <MaterialIcons name="more-vert" size={22} color="#000000" />
            </Pressable>
            {menuOpen ? (
              <View style={styles.overflowMenu}>
                <Pressable style={styles.overflowMenuItem} onPress={() => void handleMarkAllAsRead()}>
                  <Text style={styles.overflowMenuText}>Mark all as read</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Pressable key={filter.key} style={[styles.filterChip, active ? styles.filterChipActive : null]} onPress={() => setActiveFilter(filter.key)}>
                <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Loading notifications</Text>
            <Text style={styles.stateDetail}>Pulling your latest alerts from the server.</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Notifications unavailable</Text>
            <Text style={styles.stateDetail}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadNotifications(activeFilter)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : !items.length ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No notifications yet</Text>
            <Text style={styles.stateDetail}>New product launches, rate updates, meetings, and news will appear here when they are published for you.</Text>
          </View>
        ) : (
          (Object.keys(grouped) as NotificationGroup[]).map((group) =>
            grouped[group].length ? (
              <View key={group} style={styles.groupSection}>
                <Text style={styles.groupLabel}>{group.toUpperCase()}</Text>
                <View style={styles.groupList}>
                  {grouped[group].map((item) => {
                    const unread = !item.is_read;
                    return (
                      <Pressable key={item.id} style={styles.notificationCard} onPress={() => void handleOpen(item)}>
                        {unread ? <View style={styles.unreadRail} /> : null}
                        <View style={styles.notificationIconWrap}>
                          <MaterialIcons name={iconForType(item.type)} size={20} color={unread ? "#000000" : "#7E7576"} />
                        </View>
                        <View style={styles.notificationCopy}>
                          <View style={styles.notificationHeader}>
                            <Text style={[styles.notificationTitle, unread ? styles.notificationTitleUnread : null]}>{item.title}</Text>
                            <View style={styles.notificationMeta}>
                              {unread ? <View style={styles.unreadDot} /> : null}
                              <Text style={styles.notificationTime}>{formatRelativeTime(item.created_at)}</Text>
                            </View>
                          </View>
                          <Text style={styles.notificationBody}>{item.body}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null,
          )
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
  headerMenuWrap: {
    width: 32,
    height: 32,
    alignItems: "flex-end",
    justifyContent: "center",
    position: "relative",
  },
  mobileHeaderTitle: {
    flex: 1,
    textAlign: "center",
    color: "#000000",
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  overflowMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 156,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CFC4C5",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 20,
  },
  overflowMenuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  overflowMenuText: {
    color: "#1B1C1C",
    fontSize: 13,
    fontWeight: "500",
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginTop: 32,
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
  stateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E3E2E2",
  },
  stateTitle: {
    color: "#1B1C1C",
    fontSize: 18,
    fontWeight: "700",
  },
  stateDetail: {
    marginTop: spacing.sm,
    color: "#4C4546",
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: "#000000",
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
    borderWidth: 1,
    borderColor: "#E3E2E2",
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
});

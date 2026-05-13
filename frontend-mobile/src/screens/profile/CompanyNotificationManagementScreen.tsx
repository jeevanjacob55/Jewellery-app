import { useEffect, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { getCompanyNotificationSubscriptions, toggleCompanyNotificationSubscription } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, radii, spacing } from "../../theme/tokens";
import { CompanyNotificationSubscription, NotificationPreferences } from "../../types/api";

function getLocationLabel(city: string, state: string) {
  const parts = [city, state].filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unavailable";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CompanyNotificationManagementScreen() {
  const navigation = useNavigation<any>();
  const [subscriptions, setSubscriptions] = useState<CompanyNotificationSubscription[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCompanyId, setPendingCompanyId] = useState<number | null>(null);

  async function loadScreen(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [nextSubscriptions, nextPreferences] = await Promise.all([
        getCompanyNotificationSubscriptions(),
        getJson<NotificationPreferences>("/me/preferences/", true),
      ]);
      setSubscriptions(nextSubscriptions);
      setPreferences(nextPreferences);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load company notification settings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadScreen();
  }, []);

  async function handleUnsubscribe(companyId: number) {
    const targetCompany = subscriptions.find((item) => item.company_id === companyId);
    if (!targetCompany) {
      return;
    }

    const previousSubscriptions = subscriptions;
    setPendingCompanyId(companyId);
    setSubscriptions((current) => current.filter((item) => item.company_id !== companyId));

    try {
      const response = await toggleCompanyNotificationSubscription(companyId);
      if (response.is_notification_enabled) {
        setSubscriptions(previousSubscriptions);
        Alert.alert("Update failed", "This company subscription could not be removed right now.");
      }
    } catch (nextError) {
      setSubscriptions(previousSubscriptions);
      Alert.alert("Update failed", nextError instanceof Error ? nextError.message : "This company subscription could not be removed right now.");
    } finally {
      setPendingCompanyId(null);
    }
  }

  if (loading) {
    return <ScreenState title="Loading company alerts" detail="Pulling the companies you follow for product updates." loading />;
  }

  if (error && !subscriptions.length && !preferences) {
    return <ScreenState title="Company alerts unavailable" detail={error} />;
  }

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadScreen(true)} tintColor={colors.text} />}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Company Alerts</Text>
          <View style={styles.headerButton} />
        </View>

        <SurfaceCard>
          <Text style={styles.title}>Subscribed companies</Text>
          <Text style={styles.subtitle}>Choose which companies can send you new product launch notifications.</Text>

          {preferences && !preferences.product_alerts ? (
            <View style={styles.banner}>
              <MaterialIcons name="notifications-paused" size={18} color="#8A6400" />
              <Text style={styles.bannerText}>
                Product alerts are currently paused. Your subscriptions are saved and will resume when product alerts are turned back on.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          {!subscriptions.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No company subscriptions yet</Text>
              <Text style={styles.emptyDetail}>Open a company profile and tap the bell to start receiving new product launch notifications.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {subscriptions.map((item, index) => {
                const isPending = pendingCompanyId === item.company_id;
                return (
                  <View key={item.company_id} style={[styles.listRow, index > 0 ? styles.listRowBorder : null]}>
                    <View style={styles.logoWrap}>
                      {item.logo_image_url ? (
                        <Image source={{ uri: item.logo_image_url }} style={styles.logoImage} />
                      ) : (
                        <Text style={styles.logoFallback}>{getInitials(item.name)}</Text>
                      )}
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.companyName}>{item.name}</Text>
                      <Text style={styles.companyMeta}>{getLocationLabel(item.city, item.state)}</Text>
                    </View>
                    <Pressable
                      style={[styles.unsubscribeButton, isPending ? styles.unsubscribeButtonDisabled : null]}
                      onPress={() => void handleUnsubscribe(item.company_id)}
                      disabled={isPending}
                    >
                      <Text style={styles.unsubscribeText}>{isPending ? "Removing..." : "Unsubscribe"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </SurfaceCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.mutedText,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  banner: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: "#FFF6E3",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E2C27F",
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    flex: 1,
    color: "#6A4A00",
    lineHeight: 20,
    fontWeight: "600",
  },
  inlineError: {
    color: colors.negative,
    marginBottom: spacing.md,
  },
  emptyState: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDetail: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  listRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    color: colors.text,
    fontWeight: "800",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  companyName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  companyMeta: {
    color: colors.mutedText,
    marginTop: 2,
  },
  unsubscribeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unsubscribeButtonDisabled: {
    opacity: 0.6,
  },
  unsubscribeText: {
    color: colors.text,
    fontWeight: "700",
  },
});

import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getAssociationRates } from "../../api/rates";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { DashboardData } from "../../types/api";
import { AssociationCompactCard, LoadingSkeleton, PriceScreenHeader, PriceSearchBar } from "./PriceCards";

export function AssociationRatesScreen() {
  const navigation = useNavigation<any>();
  const { status } = useSession();
  const { width } = useWindowDimensions();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRates(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextDashboard = await getAssociationRates(status === "authenticated");
      setDashboard(nextDashboard);
      setError(null);
    } catch {
      setError("We could not load the association list right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadRates();
  }, [status]);

  const filteredAssociations = useMemo(() => {
    const associations = dashboard?.other_associations ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return associations;
    }
    return associations.filter((association) => association.name.toLowerCase().includes(normalizedQuery));
  }, [dashboard?.other_associations, query]);

  const associationColumns = width >= 1080 ? 3 : width >= 760 ? 2 : 1;
  const associationCardWidth = useMemo(() => {
    const horizontalPadding = spacing.lg * 2;
    const availableWidth = Math.max(width - horizontalPadding, 0);
    return associationColumns === 1
      ? availableWidth
      : (availableWidth - spacing.md * (associationColumns - 1)) / associationColumns;
  }, [associationColumns, width]);

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background}>
      <PriceScreenHeader
        title="Other Associations"
        onBack={() => navigation.goBack()}
        onNotifications={() => navigation.navigate("Notifications")}
      />

      {loading && !dashboard ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <LoadingSkeleton variant="association-list" />
        </ScrollView>
      ) : !dashboard ? (
        <ScreenState title="Associations unavailable" detail={error ?? "Try again in a moment."} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRates(true)} />}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionIntro}>
            <Text style={styles.contextText}>Compare rates from nearby associations</Text>
          </View>

          <PriceSearchBar value={query} onChangeText={setQuery} placeholder="Search association name..." />

          {filteredAssociations.length ? (
            <View style={styles.cardGrid}>
              {filteredAssociations.map((association) => (
                <View key={association.id} style={[styles.cardSlot, { width: associationCardWidth }]}>
                  <AssociationCompactCard
                    association={association}
                    onPress={() =>
                      navigation.navigate("RateDetails", {
                        associationId: association.id,
                        associationName: association.name,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No associations matched your search</Text>
              <Text style={styles.emptyDetail}>Try a different association name to continue comparing the nearby boards.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionIntro: {
    marginBottom: spacing.md,
  },
  contextText: {
    color: "#5F6161",
    fontSize: 16,
    lineHeight: 25,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cardSlot: {
    maxWidth: "100%",
  },
  emptyState: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDetail: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
});

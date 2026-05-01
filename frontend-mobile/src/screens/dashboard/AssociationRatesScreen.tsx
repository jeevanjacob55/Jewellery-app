import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getAssociationRates } from "../../api/rates";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { DashboardData } from "../../types/api";
import { AssociationCompactCard, LoadingSkeleton, PriceScreenHeader, PriceSearchBar, PromoBanner } from "./PriceCards";

export function AssociationRatesScreen() {
  const navigation = useNavigation<any>();
  const { status } = useSession();
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

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background}>
      <PriceScreenHeader
        title="Other Associations"
        onBack={() => navigation.goBack()}
        onNotifications={() => navigation.navigate("NotificationSettings")}
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
            <View style={styles.cardList}>
              {filteredAssociations.map((association) => (
                <AssociationCompactCard
                  key={association.id}
                  association={association}
                  onPress={() =>
                    navigation.navigate("RateDetails", {
                      associationId: association.id,
                      associationName: association.name,
                    })
                  }
                />
              ))}
              <PromoBanner />
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
  cardList: {
    gap: spacing.md,
    marginTop: spacing.lg,
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

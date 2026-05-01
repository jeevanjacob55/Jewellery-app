import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getStateRates } from "../../api/rates";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { StateRatesData, StateRatesSummary } from "../../types/api";
import { AssociationStateCard, LoadingSkeleton, PriceScreenHeader, PriceSearchBar, StateTabs } from "./PriceCards";

export function StateRatesScreen() {
  const navigation = useNavigation<any>();
  const { guestSession, me } = useSession();
  const [stateRates, setStateRates] = useState<StateRatesData | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStateBoards(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextStateRates = await getStateRates();
      setStateRates(nextStateRates);
      setError(null);
      setSelectedStateId((current) => {
        if (current && nextStateRates.states.some((state) => state.id === current)) {
          return current;
        }

        const preferredStateName = me?.hierarchy.state ?? guestSession?.guest_profile?.state?.name ?? null;
        return nextStateRates.states.find((state) => state.name === preferredStateName)?.id ?? nextStateRates.states[0]?.id ?? null;
      });
    } catch {
      setError("We could not load the state boards right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadStateBoards();
  }, []);

  const filteredStates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!stateRates) {
      return [];
    }
    if (!normalizedQuery) {
      return stateRates.states;
    }

    return stateRates.states
      .map((state) => {
        const stateMatches = state.name.toLowerCase().includes(normalizedQuery);
        const filteredAssociations = state.associations.filter(
          (association) =>
            association.name.toLowerCase().includes(normalizedQuery) || association.state_name.toLowerCase().includes(normalizedQuery)
        );
        if (stateMatches) {
          return state;
        }
        return {
          ...state,
          associations: filteredAssociations,
        };
      })
      .filter((state) => state.associations.length || state.name.toLowerCase().includes(normalizedQuery));
  }, [query, stateRates]);

  useEffect(() => {
    if (!filteredStates.length) {
      return;
    }
    if (selectedStateId && filteredStates.some((state) => state.id === selectedStateId)) {
      return;
    }
    setSelectedStateId(filteredStates[0].id);
  }, [filteredStates, selectedStateId]);

  const selectedState = useMemo<StateRatesSummary | null>(() => {
    if (!filteredStates.length) {
      return null;
    }
    return filteredStates.find((state) => state.id === selectedStateId) ?? filteredStates[0] ?? null;
  }, [filteredStates, selectedStateId]);

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background}>
      <PriceScreenHeader
        title="Other States"
        onBack={() => navigation.goBack()}
        onNotifications={() => navigation.navigate("NotificationSettings")}
      />

      {loading && !stateRates ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <LoadingSkeleton variant="state-list" />
        </ScrollView>
      ) : !stateRates ? (
        <ScreenState title="State boards unavailable" detail={error ?? "Try again in a moment."} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadStateBoards(true)} />}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionIntro}>
            <Text style={styles.contextText}>Compare rates by state</Text>
          </View>

          <PriceSearchBar value={query} onChangeText={setQuery} placeholder="Search state or association..." />

          {filteredStates.length ? (
            <>
              <View style={styles.tabsWrap}>
                <StateTabs states={filteredStates.map((state) => ({ id: state.id, name: state.name }))} selectedStateId={selectedState?.id ?? null} onSelect={setSelectedStateId} />
              </View>

              {selectedState ? (
                <>
                  <View style={styles.stateHeaderRow}>
                    <Text style={styles.stateSectionTitle}>{selectedState.name} Associations</Text>
                    <Text style={styles.stateSectionBadge}>Latest Rates</Text>
                  </View>

                  <View style={styles.cardList}>
                    {selectedState.associations.length ? (
                      selectedState.associations.map((association) => (
                        <AssociationStateCard
                          key={association.id}
                          association={association}
                          onPress={() =>
                            navigation.navigate("RateDetails", {
                              associationId: association.id,
                              associationName: association.name,
                            })
                          }
                        />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No association rates for this selection</Text>
                        <Text style={styles.emptyDetail}>Try another state tab or adjust the search term to find more boards.</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No state boards matched your search</Text>
              <Text style={styles.emptyDetail}>Try a different state or association name to continue browsing live rates.</Text>
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
  tabsWrap: {
    marginTop: spacing.lg,
  },
  stateHeaderRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  stateSectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: "600",
  },
  stateSectionBadge: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardList: {
    gap: spacing.md,
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

import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { StateRatesData, StateRatesSummary } from "../../types/api";
import { formatCurrency } from "../../utils/format";

export function StateRatesScreen() {
  const { guestSession, user } = useSession();
  const [stateRates, setStateRates] = useState<StateRatesData | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStateRates(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextStateRates = await getJson<StateRatesData>("/dashboard/state-rates/");
      setStateRates(nextStateRates);
      setSelectedStateId((current) => {
        if (current && nextStateRates.states.some((state) => state.id === current)) {
          return current;
        }

        const preferredStateId = user?.member_profile?.state?.id ?? guestSession?.guest_profile?.state?.id ?? nextStateRates.states[0]?.id ?? null;
        return preferredStateId;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStateRates();
  }, []);

  const selectedState = useMemo<StateRatesSummary | null>(() => {
    if (!stateRates) {
      return null;
    }
    return stateRates.states.find((state) => state.id === selectedStateId) ?? stateRates.states[0] ?? null;
  }, [selectedStateId, stateRates]);

  if (loading && !stateRates) {
    return <ScreenState title="Loading state boards" detail="Preparing state-wise association rates from the backend." loading />;
  }

  if (!stateRates) {
    return <ScreenState title="State boards unavailable" detail="We could not load state-wise association rates right now." />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStateRates(true)} />}
    >
      <Text style={styles.eyebrow}>Registered States</Text>
      <Text style={styles.title}>Other States</Text>
      <Text style={styles.context}>Choose a state to compare the latest association prices registered in your backend.</Text>

      <View style={styles.stateChipWrap}>
        {stateRates.states.map((state) => (
          <Pressable
            key={state.id}
            style={[styles.stateChip, selectedState?.id === state.id && styles.stateChipActive]}
            onPress={() => setSelectedStateId(state.id)}
          >
            <Text style={[styles.stateChipText, selectedState?.id === state.id && styles.stateChipTextActive]}>{state.name}</Text>
          </Pressable>
        ))}
      </View>

      {selectedState ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateCardLabel}>Selected State</Text>
          <Text style={styles.stateCardTitle}>{selectedState.name}</Text>
          <Text style={styles.stateCardSubtitle}>{selectedState.associations.length} associations with current rates</Text>
        </View>
      ) : null}

      {selectedState?.associations.length ? (
        selectedState.associations.map((association) => (
          <View key={association.id} style={styles.associationCard}>
            <Text style={styles.associationName}>{association.name}</Text>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Gold 22K</Text>
              <Text style={styles.rateValue}>{formatCurrency(association.gold_22k, 0)}</Text>
            </View>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Gold 24K</Text>
              <Text style={styles.rateValue}>{formatCurrency(association.gold_24k, 0)}</Text>
            </View>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Silver</Text>
              <Text style={styles.rateValue}>{formatCurrency(association.silver, 0)}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No association rates for this state</Text>
          <Text style={styles.emptyDetail}>Once association boards are seeded or updated for this state, they will appear here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  eyebrow: { color: colors.mutedText, ...typography.eyebrow, marginTop: spacing.sm },
  title: { color: colors.text, ...typography.sectionTitle },
  context: { color: colors.mutedText, ...typography.body, marginTop: -spacing.sm },
  stateChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateChipActive: {
    backgroundColor: "#1C1917",
    borderColor: "#1C1917",
  },
  stateChipText: {
    color: colors.text,
    fontWeight: "700",
  },
  stateChipTextActive: {
    color: colors.surface,
  },
  stateCard: {
    backgroundColor: "#0A0E1A",
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  stateCardLabel: {
    color: "#F1C40F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  stateCardTitle: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  stateCardSubtitle: {
    color: "rgba(255,255,255,0.74)",
    marginTop: spacing.sm,
    ...typography.body,
  },
  associationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  associationName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rateLabel: {
    color: colors.mutedText,
    fontWeight: "600",
  },
  rateValue: {
    color: colors.text,
    fontWeight: "800",
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  emptyDetail: {
    color: colors.mutedText,
    ...typography.body,
  },
});

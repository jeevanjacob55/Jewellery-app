import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getJson } from "../../api/client";
import { FilterChip } from "../../components/FilterChip";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Association, DistrictOperationalUnit, RegionState, Unit } from "../../types/api";

type AuthMode = "member" | "guest";

export function LoginScreen() {
  const { continueAsGuest, sessionInfo, signInMember } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode>("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [states, setStates] = useState<RegionState[]>([]);
  const [selectedState, setSelectedState] = useState<RegionState | null>(null);
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [selectedDistrictUnit, setSelectedDistrictUnit] = useState<DistrictOperationalUnit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRegions() {
      try {
        const nextStates = await getJson<RegionState[]>("/regions/");
        if (!active) {
          return;
        }
        setStates(nextStates);
        setSelectedState(nextStates[0] ?? null);
        setSelectedAssociation(null);
        setSelectedDistrictUnit(null);
        setSelectedUnit(null);
      } catch {
        if (active) {
          setError("Unable to load the region hierarchy right now.");
        }
      } finally {
        if (active) {
          setLoadingRegions(false);
        }
      }
    }

    loadRegions();

    return () => {
      active = false;
    };
  }, []);

  function handleStateSelect(state: RegionState) {
    setSelectedState(state);
    setSelectedAssociation(null);
    setSelectedDistrictUnit(null);
    setSelectedUnit(null);
  }

  function handleAssociationSelect(association: Association) {
    setSelectedAssociation(association);
    setSelectedDistrictUnit(null);
    setSelectedUnit(null);
  }

  function handleDistrictUnitSelect(districtUnit: DistrictOperationalUnit) {
    setSelectedDistrictUnit(districtUnit);
    setSelectedUnit(null);
  }

  async function handleMemberLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Enter both username and password to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signInMember({ username: username.trim(), password });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuestAccess() {
    if (!guestName.trim() || !selectedState) {
      setError("Enter a guest name and choose a state to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await continueAsGuest({
        guest_name: guestName.trim(),
        state_id: selectedState.id,
        association_id: selectedAssociation?.id,
        district_operational_unit_id: selectedDistrictUnit?.id,
        unit_id: selectedUnit?.id,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Guest access failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Jewellery Association</Text>
      <Text style={styles.title}>Member sign-in, guest access, and regional onboarding in one place.</Text>

      <SurfaceCard>
        <View style={styles.toggleRow}>
          <FilterChip label="Member Login" selected={authMode === "member"} onPress={() => setAuthMode("member")} />
          <FilterChip label="Guest Browse" selected={authMode === "guest"} onPress={() => setAuthMode("guest")} />
        </View>

        {authMode === "member" ? (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="member username"
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="password"
              secureTextEntry
              style={styles.input}
            />
            <Text style={styles.hint}>JWT login is live. Google sign-in remains a later integration step.</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Guest Name</Text>
            <TextInput value={guestName} onChangeText={setGuestName} placeholder="trade visitor name" style={styles.input} />
            <Text style={styles.hint}>Guest browsing currently unlocks directory and market tier views.</Text>
          </>
        )}

        {authMode === "guest" ? (
          <>
            <Text style={styles.label}>State</Text>
            {loadingRegions ? (
              <ActivityIndicator color={colors.text} style={styles.loader} />
            ) : (
              <View style={styles.chipWrap}>
                {states.map((state) => (
                  <FilterChip
                    key={state.id}
                    label={state.name}
                    selected={selectedState?.id === state.id}
                    onPress={() => handleStateSelect(state)}
                  />
                ))}
              </View>
            )}

            {selectedState?.associations.length ? (
              <>
                <Text style={styles.label}>Association</Text>
                <View style={styles.chipWrap}>
                  {selectedState.associations.map((association) => (
                    <FilterChip
                      key={association.id}
                      label={association.name}
                      selected={selectedAssociation?.id === association.id}
                      onPress={() => handleAssociationSelect(association)}
                    />
                  ))}
                </View>
                <Text style={styles.hint}>Associations and lower levels are optional for guest browsing, but you can narrow the context if needed.</Text>
              </>
            ) : null}

            {selectedAssociation?.district_units.length ? (
              <>
                <Text style={styles.label}>District Unit</Text>
                <View style={styles.chipWrap}>
                  {selectedAssociation.district_units.map((districtUnit) => (
                    <FilterChip
                      key={districtUnit.id}
                      label={districtUnit.name}
                      selected={selectedDistrictUnit?.id === districtUnit.id}
                      onPress={() => handleDistrictUnitSelect(districtUnit)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {selectedDistrictUnit?.units.length ? (
              <>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.chipWrap}>
                  {selectedDistrictUnit.units.map((unit) => (
                    <FilterChip
                      key={unit.id}
                      label={unit.name}
                      selected={selectedUnit?.id === unit.id}
                      onPress={() => setSelectedUnit(unit)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, submitting && styles.disabledButton]}
          onPress={authMode === "member" ? handleMemberLogin : handleGuestAccess}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Please wait..." : authMode === "member" ? "Continue" : "Enter as Guest"}</Text>
        </Pressable>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.metaTitle}>Session readiness</Text>
        <Text style={styles.metaLine}>API: {sessionInfo ? "reachable" : "pending"}</Text>
        <Text style={styles.metaLine}>Auth: {sessionInfo?.auth_provider ?? "jwt"}</Text>
        <Text style={styles.metaLine}>
          Notifications: {sessionInfo?.firebase_messaging_enabled ? "planned in backend session info" : "not configured"}
        </Text>
        <Text style={styles.metaLine}>Base URL: {sessionInfo ? "configured via API client" : "set EXPO_PUBLIC_API_BASE_URL if needed"}</Text>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: {
    marginTop: spacing.xl,
    color: colors.text,
    ...typography.eyebrow,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    ...typography.label,
  },
  input: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  hint: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    ...typography.body,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  loader: {
    marginVertical: spacing.md,
  },
  error: {
    color: colors.negative,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
  metaTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  metaLine: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
});

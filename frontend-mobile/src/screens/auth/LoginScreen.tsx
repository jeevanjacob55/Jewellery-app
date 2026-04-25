import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getJson } from "../../api/client";
import { FilterChip } from "../../components/FilterChip";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { RegionDistrict, RegionState } from "../../types/api";

type AuthMode = "member" | "guest";

export function LoginScreen() {
  const { continueAsGuest, sessionInfo, signInMember } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode>("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [states, setStates] = useState<RegionState[]>([]);
  const [selectedState, setSelectedState] = useState<RegionState | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<RegionDistrict | null>(null);
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
        setSelectedDistrict(nextStates[0]?.districts[0] ?? null);
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
    setSelectedDistrict(state.districts[0] ?? null);
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
        state: selectedState.name,
        district: selectedDistrict?.name ?? "",
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

        {selectedState?.districts.length ? (
          <>
            <Text style={styles.label}>District</Text>
            <View style={styles.chipWrap}>
              {selectedState.districts.map((district) => (
                <FilterChip
                  key={district.id}
                  label={district.name}
                  selected={selectedDistrict?.id === district.id}
                  onPress={() => setSelectedDistrict(district)}
                />
              ))}
            </View>
          </>
        ) : null}

        {selectedDistrict?.chapters.length ? (
          <>
            <Text style={styles.label}>Local Chapter</Text>
            <Text style={styles.hint}>{selectedDistrict.chapters.map((chapter) => chapter.name).join(", ")}</Text>
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

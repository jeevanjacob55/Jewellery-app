import { useEffect } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRoute } from "@react-navigation/native";

import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing } from "../../theme/tokens";

export function CompanyPlanScreen() {
  const route = useRoute<any>();
  const { me } = useSession();
  const company = me?.company ?? null;
  const upgradeUrl = company?.upgrade_url ?? null;

  useEffect(() => {
    if (route.params?.openUpgradeOnMount && upgradeUrl) {
      void Linking.openURL(upgradeUrl);
    }
  }, [route.params, upgradeUrl]);

  if (!company) {
    return <ScreenState title="Plan unavailable" detail="No linked company plan is available for this account." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.eyebrow}>Company Plan</Text>
        <Text style={styles.title}>{company.name}</Text>
        <Text style={styles.planName}>{company.plan}</Text>
        <Text style={styles.body}>
          Your current company plan is shown here. Upgrade actions open the external website in this phase.
        </Text>

        <Pressable
          style={[styles.primaryButton, !upgradeUrl && styles.disabledButton]}
          onPress={() => {
            if (upgradeUrl) {
              void Linking.openURL(upgradeUrl);
            }
          }}
          disabled={!upgradeUrl}
        >
          <Text style={styles.primaryButtonText}>{upgradeUrl ? "Upgrade Plan" : "Upgrade Link Unavailable"}</Text>
        </Pressable>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  eyebrow: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  planName: {
    color: "#775A19",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  body: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.surface,
    textAlign: "center",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
});

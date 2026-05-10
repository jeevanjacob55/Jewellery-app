import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

import { getCompanyManagementDetail } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { CompanyManagementDetail } from "../../types/api";

function getStatusLabel(isApproved: boolean, isActive: boolean) {
  if (!isApproved) {
    return "Pending approval";
  }
  if (!isActive) {
    return "Inactive";
  }
  return "Active";
}

function getStatusTone(isApproved: boolean, isActive: boolean) {
  if (!isApproved) {
    return "#9A6700";
  }
  if (!isActive) {
    return colors.mutedText;
  }
  return colors.positive;
}

export function CompanyPlanScreen() {
  const route = useRoute<any>();
  const { me, status } = useSession();
  const companyId = me?.company?.id ?? null;
  const upgradeUrl = me?.company?.upgrade_url ?? null;
  const isCompanyAdmin = Boolean(me?.user.has_company && me.company && me.user.can_manage_products && !me.user.is_admin);

  const [detail, setDetail] = useState<CompanyManagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.openUpgradeOnMount && upgradeUrl) {
      void Linking.openURL(upgradeUrl);
    }
  }, [route.params, upgradeUrl]);

  useEffect(() => {
    if (!isCompanyAdmin || !companyId) {
      setLoading(false);
      return;
    }

    void loadPlan();
  }, [companyId, isCompanyAdmin]);

  async function loadPlan() {
    if (!companyId) {
      setError("No linked company plan is available for this account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextDetail = await getCompanyManagementDetail(companyId);
      setDetail(nextDetail);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the company plan right now.");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authenticated") {
    return <ScreenState title="Plan unavailable" detail="Company plan details are available only to signed-in company admins." />;
  }

  if (!companyId) {
    return <ScreenState title="Plan unavailable" detail="No linked company plan is available for this account." />;
  }

  if (!isCompanyAdmin) {
    return <ScreenState title="Plan unavailable" detail="This screen is available only to company admins linked to a company account." />;
  }

  if (loading && !detail) {
    return <ScreenState title="Loading company plan" detail="Fetching your current plan, limits, and marketplace status." loading />;
  }

  if (!detail) {
    return (
      <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background} scrollable contentContainerStyle={styles.content}>
        <SurfaceCard>
          <Text style={styles.eyebrow}>Company Plan</Text>
          <Text style={styles.title}>Plan unavailable</Text>
          <Text style={styles.body}>{error ?? "Unable to load your current company plan right now."}</Text>
          <Pressable style={styles.primaryButton} onPress={() => void loadPlan()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </SurfaceCard>
      </AppScreen>
    );
  }

  const { company } = detail;
  const statusLabel = getStatusLabel(company.is_approved, company.is_active);
  const statusTone = getStatusTone(company.is_approved, company.is_active);

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background} scrollable contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.eyebrow}>Company Plan</Text>
        <Text style={styles.title}>{company.name}</Text>
        <Text style={styles.subtitle}>Your current company plan and marketplace limits are shown here.</Text>

        <View style={styles.planBanner}>
          <View style={styles.planCopy}>
            <Text style={styles.planLabel}>Current Plan</Text>
            <Text style={styles.planValue}>{company.tier.name}</Text>
          </View>
          <MaterialIcons name="diamond" size={34} color="#775A19" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionEyebrow}>Plan Limits</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{company.tier.max_products}</Text>
            <Text style={styles.metricLabel}>Maximum active products</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{company.tier.min_photos_per_product}</Text>
            <Text style={styles.metricLabel}>Minimum photos per active product</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{company.tier.max_photos_per_product}</Text>
            <Text style={styles.metricLabel}>Maximum photos per active product</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionEyebrow}>Marketplace Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
          <Text style={[styles.statusValue, { color: statusTone }]}>{statusLabel}</Text>
        </View>

        <View style={styles.statList}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Active product count</Text>
            <Text style={styles.statValue}>{company.active_product_count}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total product count</Text>
            <Text style={styles.statValue}>{company.total_product_count}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Marketplace visibility</Text>
            <Text style={styles.statValue}>{company.is_market_visible ? "Visible" : "Hidden"}</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionEyebrow}>Plan Note</Text>
        <Text style={styles.body}>
          This screen is read-only in this phase. Advanced tier changes and upgrade workflows continue to be handled outside this screen.
        </Text>

        <Pressable
          style={[styles.secondaryButton, !upgradeUrl && styles.disabledButton]}
          onPress={() => {
            if (upgradeUrl) {
              void Linking.openURL(upgradeUrl);
            }
          }}
          disabled={!upgradeUrl}
        >
          <Text style={styles.secondaryButtonText}>{upgradeUrl ? "Open Upgrade Flow" : "Upgrade Link Unavailable"}</Text>
        </Pressable>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: "#8A6400",
    ...typography.eyebrow,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  body: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  planBanner: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#DCCB9C",
    backgroundColor: "#FFF8E7",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planCopy: {
    flex: 1,
  },
  planLabel: {
    color: "#775A19",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  planValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  sectionEyebrow: {
    color: "#775A19",
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  metricGrid: {
    gap: spacing.sm,
  },
  metricTile: {
    borderRadius: radii.md,
    backgroundColor: "#F7F2F2",
    padding: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statList: {
    borderRadius: radii.md,
    backgroundColor: "#F7F2F2",
    paddingHorizontal: spacing.md,
  },
  statRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statLabel: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  primaryButton: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.text,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
});

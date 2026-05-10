import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import {
  cancelCompanyTierRequest,
  createCompanyTierRequest,
  getCompanyTierManagementOverview,
} from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { FilterChip } from "../../components/FilterChip";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { CompanyTierDefinition, CompanyTierManagementOverview } from "../../types/api";
import { formatDateTimeLabel, titleCase } from "../../utils/format";

function formatTierPrice(tier: CompanyTierDefinition) {
  if (tier.is_free) {
    return "Free";
  }
  return `Rs. ${tier.price}`;
}

function getUpgradeHighlights(currentTier: CompanyTierDefinition, nextTier: CompanyTierDefinition) {
  const highlights: string[] = [];

  if (nextTier.max_products > currentTier.max_products) {
    highlights.push(`${nextTier.max_products} active products`);
  }
  if (nextTier.max_photos_per_product > currentTier.max_photos_per_product) {
    highlights.push(`up to ${nextTier.max_photos_per_product} photos per product`);
  }
  if (nextTier.min_photos_per_product !== currentTier.min_photos_per_product) {
    highlights.push(`minimum ${nextTier.min_photos_per_product} photos per live product`);
  }
  if (nextTier.visibility_type !== currentTier.visibility_type) {
    highlights.push(`${titleCase(nextTier.visibility_type)} visibility`);
  }
  if (nextTier.hero_eligible && !currentTier.hero_eligible) {
    highlights.push("hero placement eligibility");
  }

  return highlights;
}

function getRequestTypeLabel(value: string) {
  return value === "upgrade" ? "Upgrade request" : titleCase(value);
}

export function UpgradePlanScreen() {
  const { me, status } = useSession();
  const isCompanyAdmin = Boolean(me?.user.has_company && me.company && me.user.can_manage_products && !me.user.is_admin);

  const [overview, setOverview] = useState<CompanyTierManagementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [companyNote, setCompanyNote] = useState("");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isCompanyAdmin) {
      setLoading(false);
      return;
    }

    void loadOverview();
  }, [isCompanyAdmin]);

  const selectedTier = useMemo(
    () => overview?.available_upgrades.find((tier) => tier.id === selectedTierId) ?? null,
    [overview?.available_upgrades, selectedTierId],
  );

  const pendingRequest = overview?.pending_request ?? null;
  const hasPendingRequest = Boolean(pendingRequest);
  const availableUpgrades = overview?.available_upgrades ?? [];

  async function loadOverview() {
    setLoading(true);
    try {
      const nextOverview = await getCompanyTierManagementOverview();
      setOverview(nextOverview);
      setError(null);
      setSubmitMessage(null);
      if (nextOverview.pending_request) {
        setSelectedTierId(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load upgrade options right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitUpgrade() {
    if (!selectedTier) {
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const response = await createCompanyTierRequest({
        requested_tier_id: selectedTier.id,
        company_note: companyNote.trim(),
      });
      setCompanyNote("");
      setSelectedTierId(null);
      setSubmitMessage(response.message);
      await loadOverview();
    } catch (submitError) {
      setSubmitMessage(submitError instanceof Error ? submitError.message : "Unable to submit the upgrade request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelPendingRequest() {
    if (!pendingRequest) {
      return;
    }

    Alert.alert("Cancel request", "This will cancel the pending upgrade request for manual review.", [
      { text: "Keep Request", style: "cancel" },
      {
        text: "Cancel Request",
        style: "destructive",
        onPress: () => {
          void cancelPendingRequest(pendingRequest.id);
        },
      },
    ]);
  }

  async function cancelPendingRequest(requestId: number) {
    setCancelling(true);
    setSubmitMessage(null);
    try {
      const response = await cancelCompanyTierRequest(requestId);
      setSubmitMessage(response.message);
      await loadOverview();
    } catch (cancelError) {
      setSubmitMessage(cancelError instanceof Error ? cancelError.message : "Unable to cancel the pending request right now.");
    } finally {
      setCancelling(false);
    }
  }

  if (status !== "authenticated") {
    return <ScreenState title="Upgrade unavailable" detail="Upgrade Plan is available only to signed-in company admins." />;
  }

  if (!me?.company) {
    return <ScreenState title="Upgrade unavailable" detail="No linked company is available for this account." />;
  }

  if (!isCompanyAdmin) {
    return <ScreenState title="Upgrade unavailable" detail="This screen is available only to company admins linked to a company account." />;
  }

  if (loading && !overview) {
    return <ScreenState title="Loading upgrade plans" detail="Fetching your current tier and available upgrade options." loading />;
  }

  if (!overview) {
    return (
      <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background} scrollable contentContainerStyle={styles.content}>
        <SurfaceCard>
          <Text style={styles.eyebrow}>Upgrade Plan</Text>
          <Text style={styles.title}>Upgrade options unavailable</Text>
          <Text style={styles.body}>{error ?? "Unable to load company upgrade options right now."}</Text>
          <Pressable style={styles.primaryButton} onPress={() => void loadOverview()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </SurfaceCard>
      </AppScreen>
    );
  }

  const { company, current_tier: currentTier } = overview;

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background} scrollable contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.eyebrow}>Upgrade Plan</Text>
        <Text style={styles.title}>{company.name}</Text>
        <Text style={styles.subtitle}>Submit an in-app company tier upgrade request for manual review.</Text>

        <View style={styles.currentTierCard}>
          <View style={styles.currentTierCopy}>
            <Text style={styles.currentTierLabel}>Current Plan</Text>
            <Text style={styles.currentTierValue}>{currentTier.name}</Text>
            <Text style={styles.currentTierMeta}>
              {currentTier.max_products} active products · {currentTier.min_photos_per_product}-{currentTier.max_photos_per_product} photos per product
            </Text>
          </View>
          <MaterialIcons name="north-east" size={34} color="#775A19" />
        </View>
      </SurfaceCard>

      {pendingRequest ? (
        <SurfaceCard>
          <Text style={styles.sectionEyebrow}>Pending Request</Text>
          <Text style={styles.pendingTitle}>{getRequestTypeLabel(pendingRequest.request_type)}</Text>
          <Text style={styles.pendingMeta}>
            {pendingRequest.current_tier_name} to {pendingRequest.requested_tier_name}
          </Text>
          <Text style={styles.pendingMeta}>Status: {titleCase(pendingRequest.status)}</Text>
          <Text style={styles.pendingMeta}>Submitted {formatDateTimeLabel(pendingRequest.created_at)}</Text>
          {pendingRequest.company_note ? <Text style={styles.pendingNote}>{pendingRequest.company_note}</Text> : null}

          <Pressable
            style={[styles.secondaryButton, cancelling ? styles.disabledButton : null]}
            onPress={handleCancelPendingRequest}
            disabled={cancelling}
          >
            <Text style={styles.secondaryButtonText}>{cancelling ? "Cancelling..." : "Cancel Pending Request"}</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}

      {submitMessage ? (
        <SurfaceCard>
          <Text style={styles.feedbackText}>{submitMessage}</Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.sectionEyebrow}>Available Upgrades</Text>

        {availableUpgrades.length ? (
          <View style={styles.upgradeList}>
            {availableUpgrades.map((tier) => {
              const selected = selectedTierId === tier.id;
              const highlights = getUpgradeHighlights(currentTier, tier);
              return (
                <Pressable
                  key={tier.id}
                  style={[styles.upgradeCard, selected ? styles.upgradeCardSelected : null, hasPendingRequest ? styles.disabledButton : null]}
                  onPress={() => {
                    if (!hasPendingRequest && !submitting) {
                      setSelectedTierId(tier.id);
                    }
                  }}
                  disabled={hasPendingRequest || submitting}
                >
                  <View style={styles.upgradeHeader}>
                    <View style={styles.upgradeHeaderCopy}>
                      <Text style={styles.upgradeName}>{tier.name}</Text>
                      <Text style={styles.upgradePrice}>{formatTierPrice(tier)}</Text>
                    </View>
                    <View style={[styles.selectionDot, selected ? styles.selectionDotActive : null]} />
                  </View>

                  <Text style={styles.upgradeMeta}>
                    {tier.max_products} active products · {tier.min_photos_per_product}-{tier.max_photos_per_product} photos per product
                  </Text>
                  <Text style={styles.upgradeMeta}>{titleCase(tier.visibility_type)} visibility</Text>
                  {highlights.length ? <Text style={styles.upgradeHighlight}>Includes: {highlights.join(" · ")}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You are already on the highest available plan</Text>
            <Text style={styles.body}>There are no higher-tier upgrade options available for this company right now.</Text>
          </View>
        )}
      </SurfaceCard>

      {availableUpgrades.length ? (
        <SurfaceCard>
          <Text style={styles.sectionEyebrow}>Upgrade Request</Text>
          <Text style={styles.body}>
            Select one upgrade tier and optionally add a short note for the review team. Only one pending tier request can exist at a time.
          </Text>

          <View style={styles.selectionWrap}>
            <Text style={styles.selectionLabel}>Selected plan</Text>
            <FilterChip label={selectedTier?.name ?? "Choose an upgrade tier"} selected={Boolean(selectedTier)} />
          </View>

          <TextInput
            value={companyNote}
            onChangeText={setCompanyNote}
            placeholder="Optional note for the review team"
            placeholderTextColor="#7E7576"
            multiline
            style={styles.noteInput}
            editable={!hasPendingRequest && !submitting}
          />

          <Pressable
            style={[
              styles.primaryButton,
              (!selectedTier || hasPendingRequest || submitting) ? styles.disabledButton : null,
            ]}
            onPress={() => void handleSubmitUpgrade()}
            disabled={!selectedTier || hasPendingRequest || submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit Upgrade Request"}</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}
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
  currentTierCard: {
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
  currentTierCopy: {
    flex: 1,
  },
  currentTierLabel: {
    color: "#775A19",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  currentTierValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  currentTierMeta: {
    color: colors.mutedText,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  sectionEyebrow: {
    color: "#775A19",
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  pendingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  pendingMeta: {
    color: colors.mutedText,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  pendingNote: {
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 21,
  },
  feedbackText: {
    color: "#775A19",
    lineHeight: 21,
    fontWeight: "600",
  },
  upgradeList: {
    gap: spacing.sm,
  },
  upgradeCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F7F2F2",
    padding: spacing.md,
    gap: spacing.sm,
  },
  upgradeCardSelected: {
    borderColor: colors.text,
    backgroundColor: "#F3ECE3",
  },
  upgradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  upgradeHeaderCopy: {
    flex: 1,
  },
  upgradeName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  upgradePrice: {
    color: "#775A19",
    marginTop: spacing.xs,
    fontWeight: "700",
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B9B1B2",
    backgroundColor: colors.surface,
  },
  selectionDotActive: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  upgradeMeta: {
    color: colors.mutedText,
    lineHeight: 20,
  },
  upgradeHighlight: {
    color: colors.text,
    lineHeight: 20,
    fontWeight: "600",
  },
  emptyState: {
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  selectionWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  selectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  noteInput: {
    minHeight: 120,
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top",
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

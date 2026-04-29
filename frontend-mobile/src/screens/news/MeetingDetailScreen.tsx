import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import { getJson, postJson } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing } from "../../theme/tokens";
import { MeetingDetail, MeetingRsvpState } from "../../types/api";
import { titleCase } from "../../utils/format";

type MeetingDetailRoute = RouteProp<{ MeetingDetail: { meetingId: number } }, "MeetingDetail">;

const RSVP_OPTIONS: Array<{ value: MeetingRsvpState; label: string }> = [
  { value: "attending", label: "Attending" },
  { value: "maybe", label: "Maybe" },
  { value: "not_attending", label: "Not Attending" },
];

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function DetailSkeleton() {
  return (
    <View style={styles.body}>
      <SurfaceCard>
        <View style={styles.heroCard}>
          <SkeletonBlock height={12} width="28%" />
          <SkeletonBlock height={30} width="80%" />
          <SkeletonBlock height={18} width="58%" />
          <SkeletonBlock height={18} width="92%" />
          <View style={styles.skeletonActionRow}>
            <SkeletonBlock height={42} width="48%" rounded={999} />
            <SkeletonBlock height={42} width="48%" rounded={999} />
          </View>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <SkeletonBlock height={18} width="30%" />
        <View style={styles.textStack}>
          <SkeletonBlock height={18} width="100%" />
          <SkeletonBlock height={18} width="92%" />
          <SkeletonBlock height={18} width="84%" />
        </View>
      </SurfaceCard>
    </View>
  );
}

export function MeetingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<MeetingDetailRoute>();
  const { status } = useSession();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMeeting() {
      try {
        setError(null);
        const nextMeeting = await getJson<MeetingDetail>(`/meetings/${route.params.meetingId}/`, status === "authenticated");
        if (active) {
          setMeeting(nextMeeting);
        }
      } catch (nextError) {
        if (active) {
          setMeeting(null);
          setError(nextError instanceof Error ? nextError.message : "This meeting could not be loaded.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadMeeting();

    return () => {
      active = false;
    };
  }, [route.params.meetingId, status]);

  async function handleRespond(response: MeetingRsvpState) {
    if (status !== "authenticated" || !meeting) {
      return;
    }
    setSubmitting(true);
    try {
      const updated = await postJson<MeetingDetail>(`/meetings/${meeting.id}/respond/`, { response }, true);
      setMeeting(updated);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The RSVP could not be updated.");
    } finally {
      setSubmitting(false);
    }
  }

  function openLink(url: string) {
    if (!url) {
      return;
    }
    void Linking.openURL(url).catch(() => {
      setError("This link could not be opened on the device.");
    });
  }

  return (
    <AppScreen scrollable safeAreaEdges={["top"]} backgroundColor="#FFFFFF" contentContainerStyle={styles.content}>
      <AppHeader
        centered
        title="JEWELLERY ASSOCIATION"
        titleStyle={styles.headerTitle}
        style={styles.header}
        left={
          <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Text style={styles.headerButtonText}>{"<"}</Text>
          </Pressable>
        }
      />

      {loading ? (
        <DetailSkeleton />
      ) : !meeting ? (
        <View style={styles.body}>
          <SurfaceCard>
            <Text style={styles.errorTitle}>Meeting unavailable</Text>
            <Text style={styles.errorDetail}>{error ?? "This meeting could not be loaded."}</Text>
            <Pressable style={styles.retryButton} onPress={() => navigation.replace("MeetingDetail", { meetingId: route.params.meetingId })}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        </View>
      ) : (
        <View style={styles.body}>
          <SurfaceCard>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>{titleCase(meeting.meeting_mode)}</Text>
              <Text style={styles.heroTitle}>{meeting.title}</Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaValue}>{formatDateLabel(meeting.start_datetime)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Time</Text>
                  <Text style={styles.metaValue}>
                    {`${formatTimeLabel(meeting.start_datetime)} - ${formatTimeLabel(meeting.end_datetime)}`}
                  </Text>
                </View>
                <View style={[styles.metaItem, styles.metaItemWide]}>
                  <Text style={styles.metaLabel}>Venue</Text>
                  <Text style={styles.metaValue}>{meeting.venue_name || "Venue to be announced"}</Text>
                  {meeting.venue_address ? <Text style={styles.metaSubValue}>{meeting.venue_address}</Text> : null}
                </View>
              </View>

              <View style={styles.actionRow}>
                {meeting.google_maps_link ? (
                  <Pressable style={styles.primaryActionButton} onPress={() => openLink(meeting.google_maps_link)}>
                    <Text style={styles.primaryActionText}>View on Map</Text>
                  </Pressable>
                ) : null}
                {meeting.online_meeting_link ? (
                  <Pressable style={styles.secondaryActionButton} onPress={() => openLink(meeting.online_meeting_link)}>
                    <Text style={styles.secondaryActionText}>Join Meeting</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Meeting Brief</Text>
            <Text style={styles.description}>{meeting.description}</Text>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>RSVP</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryCount}>{meeting.response_summary.attending}</Text>
                <Text style={styles.summaryLabel}>Attending</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryCount}>{meeting.response_summary.maybe}</Text>
                <Text style={styles.summaryLabel}>Maybe</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryCount}>{meeting.response_summary.not_attending}</Text>
                <Text style={styles.summaryLabel}>Not Attending</Text>
              </View>
            </View>

            {status === "authenticated" ? (
              <View style={styles.rsvpRow}>
                {RSVP_OPTIONS.map((option) => {
                  const selected = meeting.current_user_response === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.rsvpChip, selected && styles.rsvpChipActive]}
                      disabled={submitting}
                      onPress={() => handleRespond(option.value)}
                    >
                      <Text style={[styles.rsvpChipText, selected && styles.rsvpChipTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.guestNote}>Sign in to RSVP for this meeting.</Text>
            )}
          </SurfaceCard>

          {error ? (
            <View style={styles.inlineBanner}>
              <Text style={styles.inlineError}>{error}</Text>
            </View>
          ) : null}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE7DA",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5DDD2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  headerButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: -1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: "#171717",
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroEyebrow: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 36,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metaItem: {
    width: "47%",
    gap: 4,
  },
  metaItemWide: {
    width: "100%",
  },
  metaLabel: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },
  metaSubValue: {
    color: "#D4D4D8",
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  primaryActionButton: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: colors.accentGold,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryActionText: {
    color: "#1F1300",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  secondaryActionButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 28,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryChip: {
    flex: 1,
    minWidth: 88,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: "#F8F4ED",
    alignItems: "center",
    gap: 4,
  },
  summaryCount: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    textAlign: "center",
  },
  rsvpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rsvpChip: {
    borderWidth: 1,
    borderColor: "#E3D7C1",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "#FFF9F0",
  },
  rsvpChipActive: {
    borderColor: colors.accentGold,
    backgroundColor: "#FCE8C2",
  },
  rsvpChipText: {
    color: colors.mutedText,
    fontWeight: "700",
    fontSize: 12,
  },
  rsvpChipTextActive: {
    color: "#8A5A00",
  },
  guestNote: {
    color: colors.mutedText,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  inlineBanner: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  inlineError: {
    color: colors.negative,
    fontSize: 13,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  errorDetail: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    borderRadius: 999,
    backgroundColor: "#1F1A17",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFF8EE",
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontSize: 12,
  },
  textStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  skeletonActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  skeletonBlock: {
    backgroundColor: "#EFE8DD",
  },
});

import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import { getJson, postJson } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { MeetingDetail, MeetingRsvpState } from "../../types/api";
import { formatDateTimeLabel, titleCase } from "../../utils/format";

type MeetingDetailRoute = RouteProp<{ MeetingDetail: { meetingId: number } }, "MeetingDetail">;

const RSVP_OPTIONS: Array<{ value: MeetingRsvpState; label: string }> = [
  { value: "attending", label: "Attending" },
  { value: "maybe", label: "Maybe" },
  { value: "not_attending", label: "Not Attending" },
];

export function MeetingDetailScreen() {
  const route = useRoute<MeetingDetailRoute>();
  const { status } = useSession();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMeeting() {
      try {
        const nextMeeting = await getJson<MeetingDetail>(`/meetings/${route.params.meetingId}/`, status === "authenticated");
        if (active) {
          setMeeting(nextMeeting);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    loadMeeting();

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
    } finally {
      setSubmitting(false);
    }
  }

  function openLink(url: string) {
    if (!url) {
      return;
    }
    Linking.openURL(url);
  }

  if (loading) {
    return <ScreenState title="Loading meeting" detail="Preparing meeting details and RSVP options." loading />;
  }

  if (!meeting) {
    return <ScreenState title="Meeting unavailable" detail="This meeting could not be loaded." />;
  }

  return (
    <AppScreen scrollable safeAreaEdges={["top"]} contentContainerStyle={styles.content}>
      <AppHeader title="Meeting" subtitle={titleCase(meeting.meeting_mode)} />
      <View style={styles.body}>
        <SurfaceCard>
          <Text style={styles.title}>{meeting.title}</Text>
          <Text style={styles.meta}>{formatDateTimeLabel(meeting.start_datetime)} to {formatDateTimeLabel(meeting.end_datetime)}</Text>
          <Text style={styles.description}>{meeting.description}</Text>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Venue</Text>
          <Text style={styles.venueName}>{meeting.venue_name || "Venue to be announced"}</Text>
          {meeting.venue_address ? <Text style={styles.venueAddress}>{meeting.venue_address}</Text> : null}
          <View style={styles.actionRow}>
            {meeting.google_maps_link ? (
              <Pressable onPress={() => openLink(meeting.google_maps_link)}>
                <Text style={styles.link}>View on Map</Text>
              </Pressable>
            ) : null}
            {meeting.online_meeting_link ? (
              <Pressable onPress={() => openLink(meeting.online_meeting_link)}>
                <Text style={styles.link}>Join Online Meeting</Text>
              </Pressable>
            ) : null}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>RSVP</Text>
          <Text style={styles.rsvpSummary}>
            Attending {meeting.response_summary.attending} | Maybe {meeting.response_summary.maybe} | Not attending {meeting.response_summary.not_attending}
          </Text>
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
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", lineHeight: 30 },
  meta: { color: colors.accentGold, fontWeight: "700", marginTop: spacing.sm },
  description: { color: colors.mutedText, lineHeight: 22, marginTop: spacing.md },
  sectionTitle: { color: colors.text, fontWeight: "800", fontSize: 17, marginBottom: spacing.sm },
  venueName: { color: colors.text, fontWeight: "700" },
  venueAddress: { color: colors.mutedText, marginTop: 4, lineHeight: 20 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  link: { color: colors.accentGold, fontWeight: "700" },
  rsvpSummary: { color: colors.mutedText, lineHeight: 20 },
  rsvpRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
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
  rsvpChipText: { color: colors.mutedText, fontWeight: "700", fontSize: 12 },
  rsvpChipTextActive: { color: "#8A5A00" },
  guestNote: { color: colors.mutedText, marginTop: spacing.sm },
});

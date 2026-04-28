import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson, postJson } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { MeetingDetail, MeetingRsvpState, NewsData } from "../../types/api";
import { formatCurrency, formatDateTimeLabel, titleCase } from "../../utils/format";

const RSVP_OPTIONS: Array<{ value: MeetingRsvpState; label: string }> = [
  { value: "attending", label: "Attending" },
  { value: "maybe", label: "Maybe" },
  { value: "not_attending", label: "Not Attending" },
];

export function NewsAlertsScreen() {
  const navigation = useNavigation<any>();
  const { status } = useSession();
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMeetingId, setSubmittingMeetingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      try {
        const nextData = await getJson<NewsData>("/news/", status === "authenticated");
        if (active) {
          setNewsData(nextData);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    loadNews();

    return () => {
      active = false;
    };
  }, [status]);

  async function handleRespond(meetingId: number, response: MeetingRsvpState) {
    if (status !== "authenticated") {
      return;
    }

    setSubmittingMeetingId(meetingId);
    try {
      const updatedMeeting = await postJson<MeetingDetail>(`/meetings/${meetingId}/respond/`, { response }, true);
      setNewsData((current) =>
        current
          ? {
              ...current,
              meetings: current.meetings.map((meeting) =>
                meeting.id === meetingId ? { ...meeting, current_user_response: updatedMeeting.current_user_response } : meeting,
              ),
            }
          : current,
      );
    } finally {
      setSubmittingMeetingId(null);
    }
  }

  function openLink(url: string) {
    if (!url) {
      return;
    }
    Linking.openURL(url);
  }

  if (loading) {
    return <ScreenState title="Loading news and alerts" detail="Preparing alerts, meetings, and the market ticker." loading />;
  }

  if (!newsData) {
    return <ScreenState title="News unavailable" detail="The news feed could not be loaded." />;
  }

  return (
    <AppScreen scrollable safeAreaEdges={["top"]} contentContainerStyle={styles.content}>
      <AppHeader title="News & Alerts" subtitle="Association notices, meetings, and the daily bullion ticker." />
      <View style={styles.body}>
        <SurfaceCard>
          <Text style={styles.hero}>{newsData.urgent_alert.title}</Text>
          <Text style={styles.summary}>{newsData.urgent_alert.summary}</Text>
        </SurfaceCard>

        {newsData.items?.length ? (
          <SurfaceCard>
            <Text style={styles.title}>Latest Updates</Text>
            <View style={styles.newsList}>
              {newsData.items.map((item, index) => (
                <View key={item.id} style={[styles.newsItem, index < newsData.items!.length - 1 && styles.newsItemDivider]}>
                  <Text style={styles.newsItemTitle}>{item.title}</Text>
                  <Text style={styles.newsItemBody}>{item.description}</Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        {newsData.meetings.length ? (
          <SurfaceCard>
            <Text style={styles.title}>Upcoming Meetings</Text>
            <View style={styles.meetingList}>
              {newsData.meetings.map((meeting, index) => (
                <View key={meeting.id} style={[styles.meetingCard, index < newsData.meetings.length - 1 && styles.meetingDivider]}>
                  <Pressable onPress={() => navigation.navigate("MeetingDetail", { meetingId: meeting.id })}>
                    <Text style={styles.meetingTitle}>{meeting.title}</Text>
                    <Text style={styles.meetingMeta}>
                      {formatDateTimeLabel(meeting.start_datetime)} | {titleCase(meeting.meeting_mode)}
                    </Text>
                    <Text style={styles.meetingVenue}>{meeting.venue_name || "Venue to be announced"}</Text>
                    {meeting.venue_address ? <Text style={styles.meetingAddress}>{meeting.venue_address}</Text> : null}
                  </Pressable>

                  <View style={styles.actionRow}>
                    <Pressable onPress={() => navigation.navigate("MeetingDetail", { meetingId: meeting.id })}>
                      <Text style={styles.link}>View details</Text>
                    </Pressable>
                    {meeting.google_maps_link ? (
                      <Pressable onPress={() => openLink(meeting.google_maps_link)}>
                        <Text style={styles.link}>View on map</Text>
                      </Pressable>
                    ) : null}
                    {meeting.online_meeting_link ? (
                      <Pressable onPress={() => openLink(meeting.online_meeting_link)}>
                        <Text style={styles.link}>Join online</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {status === "authenticated" ? (
                    <View style={styles.rsvpRow}>
                      {RSVP_OPTIONS.map((option) => {
                        const selected = meeting.current_user_response === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            style={[styles.rsvpChip, selected && styles.rsvpChipActive]}
                            disabled={submittingMeetingId === meeting.id}
                            onPress={() => handleRespond(meeting.id, option.value)}
                          >
                            <Text style={[styles.rsvpChipText, selected && styles.rsvpChipTextActive]}>{option.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <Text style={styles.title}>Ticker</Text>
          <Text style={styles.meta}>Gold: {formatCurrency(newsData.ticker.gold)}</Text>
          <Text style={styles.meta}>Silver: {formatCurrency(newsData.ticker.silver)}</Text>
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  hero: { color: colors.text, fontWeight: "800", fontSize: 20, lineHeight: 28 },
  summary: { color: colors.mutedText, marginTop: spacing.sm, lineHeight: 22 },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  meta: { color: colors.mutedText, marginBottom: spacing.xs },
  link: { color: colors.accentGold, fontWeight: "700", marginTop: spacing.sm },
  newsList: { gap: spacing.sm },
  newsItem: { paddingVertical: spacing.xs },
  newsItemDivider: { borderBottomWidth: 1, borderBottomColor: "#F1E8D9", paddingBottom: spacing.sm },
  newsItemTitle: { color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: 4 },
  newsItemBody: { color: colors.mutedText, lineHeight: 21 },
  meetingList: { gap: spacing.md },
  meetingCard: { paddingVertical: spacing.xs },
  meetingDivider: { borderBottomWidth: 1, borderBottomColor: "#F1E8D9", paddingBottom: spacing.md },
  meetingTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  meetingMeta: { color: colors.accentGold, fontWeight: "700", marginTop: 4 },
  meetingVenue: { color: colors.text, marginTop: spacing.sm, fontWeight: "700" },
  meetingAddress: { color: colors.mutedText, marginTop: 4, lineHeight: 20 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
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
});

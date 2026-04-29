import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { postJson } from "../../api/client";
import { getNewsFeed } from "../../api/news";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { MeetingDetail, MeetingRsvpState, NewsData, NewsFeedItem } from "../../types/api";
import { formatCurrency, formatDateTimeLabel, titleCase } from "../../utils/format";

type NewsTab = "all" | "news" | "meetings";

const TAB_OPTIONS: Array<{ id: NewsTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "news", label: "News" },
  { id: "meetings", label: "Meetings" },
];

const RSVP_OPTIONS: Array<{ value: MeetingRsvpState; label: string }> = [
  { value: "attending", label: "Attending" },
  { value: "maybe", label: "Maybe" },
  { value: "not_attending", label: "Not Attending" },
];

function formatPublishedLabel(value: string | null) {
  if (!value) {
    return "Published recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function NewsAlertsScreen() {
  const navigation = useNavigation<any>();
  const { status } = useSession();
  const [selectedTab, setSelectedTab] = useState<NewsTab>("all");
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingMeetingId, setSubmittingMeetingId] = useState<number | null>(null);

  async function loadNews(isRefreshing = false) {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const nextData = await getNewsFeed(status === "authenticated");
      setNewsData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The news feed could not be loaded.");
      if (!isRefreshing) {
        setNewsData(null);
      }
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadNews();
  }, [status]);

  const featuredNews = newsData?.featured_news ?? null;
  const newsItems = useMemo(() => {
    const items = newsData?.items ?? [];
    if (!featuredNews) {
      return items;
    }
    return items.filter((item) => item.id !== featuredNews.id);
  }, [featuredNews, newsData?.items]);

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

  function openNewsItem(item: NewsFeedItem) {
    navigation.navigate("NewsDetail", { newsId: item.id });
  }

  if (loading) {
    return <ScreenState title="Loading news and meetings" detail="Preparing the latest published stories and upcoming events." loading />;
  }

  if (!newsData) {
    return <ScreenState title="News unavailable" detail={error ?? "The news feed could not be loaded."} />;
  }

  const showNewsSections = selectedTab !== "meetings";
  const showMeetingSections = selectedTab !== "news";
  const hasNewsContent = Boolean(featuredNews || newsItems.length || newsData.urgent_alert.title !== "No active alerts");
  const hasMeetingContent = newsData.meetings.length > 0;

  return (
    <AppScreen
      scrollable
      safeAreaEdges={["top"]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNews(true)} tintColor={colors.text} />}
    >
      <AppHeader title="News" subtitle="Published notices, member updates, and upcoming association meetings." />
      <View style={styles.body}>
        <View style={styles.tabs}>
          {TAB_OPTIONS.map((tab) => {
            const active = selectedTab === tab.id;
            return (
              <Pressable key={tab.id} style={[styles.tabButton, active && styles.tabButtonActive]} onPress={() => setSelectedTab(tab.id)}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {showNewsSections ? (
          featuredNews ? (
            <Pressable onPress={() => openNewsItem(featuredNews)}>
              <SurfaceCard>
                <View style={styles.featuredCard}>
                  {featuredNews.image_url ? <Image source={{ uri: featuredNews.image_url }} style={styles.featuredImage} /> : null}
                  <View style={styles.featuredCopy}>
                    <Text style={styles.featuredEyebrow}>{titleCase(featuredNews.publisher_type)}</Text>
                    <Text style={styles.featuredTitle}>{featuredNews.title}</Text>
                    <Text style={styles.featuredBody} numberOfLines={3}>
                      {featuredNews.description}
                    </Text>
                    <Text style={styles.featuredMeta}>{formatPublishedLabel(featuredNews.published_at)}</Text>
                  </View>
                </View>
              </SurfaceCard>
            </Pressable>
          ) : (
            <SurfaceCard>
              <Text style={styles.alertEyebrow}>Urgent Alert</Text>
              <Text style={styles.alertTitle}>{newsData.urgent_alert.title}</Text>
              {newsData.urgent_alert.summary ? <Text style={styles.alertSummary}>{newsData.urgent_alert.summary}</Text> : null}
            </SurfaceCard>
          )
        ) : null}

        {showNewsSections ? (
          newsItems.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Latest Updates</Text>
              <View style={styles.newsList}>
                {newsItems.map((item) => (
                  <Pressable key={item.id} onPress={() => openNewsItem(item)}>
                    <SurfaceCard>
                      <View style={styles.newsCard}>
                        {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.newsCardImage} /> : null}
                        <View style={styles.newsCardCopy}>
                          <Text style={styles.newsCardMeta}>{`${titleCase(item.publisher_type)} - ${formatPublishedLabel(item.published_at)}`}</Text>
                          <Text style={styles.newsCardTitle}>{item.title}</Text>
                          <Text style={styles.newsCardBody} numberOfLines={item.image_url ? 3 : 4}>
                            {item.description}
                          </Text>
                        </View>
                      </View>
                    </SurfaceCard>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : hasNewsContent ? null : (
            <SurfaceCard>
              <Text style={styles.emptyTitle}>No published news yet</Text>
              <Text style={styles.emptyDetail}>New association updates will appear here as soon as they are published for your scope.</Text>
            </SurfaceCard>
          )
        ) : null}

        {showMeetingSections ? (
          newsData.meetings.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{selectedTab === "meetings" ? "Upcoming Meetings" : "Meeting Preview"}</Text>
              <View style={styles.meetingList}>
                {newsData.meetings.map((meeting) => (
                  <SurfaceCard key={meeting.id}>
                    <View style={styles.meetingHeaderRow}>
                      <View style={styles.meetingMarker} />
                      <View style={styles.meetingHeaderCopy}>
                        <Text style={styles.meetingMeta}>{titleCase(meeting.meeting_mode)}</Text>
                        <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      </View>
                    </View>

                    <Text style={styles.meetingTime}>{formatDateTimeLabel(meeting.start_datetime)}</Text>
                    <Text style={styles.meetingVenue}>{meeting.venue_name || "Venue to be announced"}</Text>
                    {meeting.venue_address ? <Text style={styles.meetingAddress}>{meeting.venue_address}</Text> : null}

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
                          <Text style={styles.link}>Join meeting</Text>
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
                  </SurfaceCard>
                ))}
              </View>
            </View>
          ) : selectedTab === "meetings" ? (
            <SurfaceCard>
              <Text style={styles.emptyTitle}>No upcoming meetings</Text>
              <Text style={styles.emptyDetail}>When a meeting is published for your audience, it will appear here with details and access links.</Text>
            </SurfaceCard>
          ) : null
        ) : null}

        {selectedTab === "all" ? (
          <SurfaceCard>
            <Text style={styles.sectionTitle}>Bullion Ticker</Text>
            <Text style={styles.tickerValue}>Gold: {formatCurrency(newsData.ticker.gold)}</Text>
            <Text style={styles.tickerValue}>Silver: {formatCurrency(newsData.ticker.silver)}</Text>
          </SurfaceCard>
        ) : null}

        {!hasNewsContent && !hasMeetingContent && selectedTab === "all" ? (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>Nothing is visible right now</Text>
            <Text style={styles.emptyDetail}>Published news and meetings for your scope will show up here automatically.</Text>
          </SurfaceCard>
        ) : null}

        {error ? <Text style={styles.inlineError}>Some content could not be refreshed. Pull down to try again.</Text> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9DDC9",
    backgroundColor: "#FFF9F0",
    paddingVertical: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#1F1A17",
    borderColor: "#1F1A17",
  },
  tabLabel: {
    color: colors.mutedText,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#FFF8EE",
  },
  featuredCard: {
    gap: spacing.md,
  },
  featuredImage: {
    width: "100%",
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: "#EDE6D8",
  },
  featuredCopy: {
    gap: spacing.sm,
  },
  featuredEyebrow: {
    ...typography.eyebrow,
    color: "#8A6400",
  },
  featuredTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
  },
  featuredBody: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 24,
  },
  featuredMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  alertEyebrow: {
    ...typography.eyebrow,
    color: "#8A6400",
    marginBottom: spacing.sm,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
  },
  alertSummary: {
    color: colors.mutedText,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  newsList: {
    gap: spacing.md,
  },
  newsCard: {
    flexDirection: "row",
    gap: spacing.md,
  },
  newsCardImage: {
    width: 112,
    height: 112,
    borderRadius: radii.md,
    backgroundColor: "#EDE6D8",
  },
  newsCardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  newsCardMeta: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "700",
  },
  newsCardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  newsCardBody: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  meetingList: {
    gap: spacing.md,
  },
  meetingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  meetingMarker: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
  },
  meetingHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  meetingMeta: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  meetingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  meetingTime: {
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  meetingVenue: {
    color: colors.text,
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  meetingAddress: {
    color: colors.mutedText,
    marginTop: 4,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  link: {
    color: colors.accentGold,
    fontWeight: "700",
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
  tickerValue: {
    color: colors.mutedText,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyDetail: {
    color: colors.mutedText,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  inlineError: {
    color: colors.negative,
    fontSize: 13,
  },
});

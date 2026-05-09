import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { getAdvertisements, recordAdClick, recordAdImpression } from "../../api/ads";
import { postJson } from "../../api/client";
import { getNewsFeed, toggleNewsBookmark } from "../../api/news";
import { AppScreen } from "../../components/AppScreen";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { executeAdvertisementAction } from "../../utils/advertisements";
import { formatCurrency, formatDateTimeLabel, titleCase } from "../../utils/format";
import { AdvertisementItem, MeetingDetail, MeetingRsvpState, NewsData, NewsFeedItem } from "../../types/api";

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

  const publishedDate = new Date(value);
  const diffMs = Date.now() - publishedDate.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) {
    return "Less than 1 hour ago";
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(publishedDate);
}

function hasMeaningfulTicker(newsData: NewsData | null) {
  if (!newsData) {
    return false;
  }
  return newsData.ticker.gold > 0 || newsData.ticker.silver > 0;
}

function applyBookmarkState(newsData: NewsData | null, newsId: number, isBookmarked: boolean): NewsData | null {
  if (!newsData) {
    return newsData;
  }
  return {
    ...newsData,
    featured_news:
      newsData.featured_news?.id === newsId ? { ...newsData.featured_news, is_bookmarked: isBookmarked } : newsData.featured_news,
    items: (newsData.items ?? []).map((item) => (item.id === newsId ? { ...item, is_bookmarked: isBookmarked } : item)),
  };
}

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function NewsFeedSkeleton({ selectedTab }: { selectedTab: NewsTab }) {
  return (
    <View style={styles.body}>
      <View style={styles.tabs}>
        {TAB_OPTIONS.map((tab) => (
          <View key={tab.id} style={styles.tabSkeletonWrap}>
            <Text style={[styles.tabLabel, selectedTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
            <View style={[styles.tabUnderline, selectedTab === tab.id && styles.tabUnderlineActive]} />
          </View>
        ))}
      </View>

      <SurfaceCard>
        <SkeletonBlock height={224} rounded={radii.lg} />
        <View style={styles.skeletonStack}>
          <SkeletonBlock height={12} width="38%" />
          <SkeletonBlock height={30} width="88%" />
          <SkeletonBlock height={18} width="96%" />
          <SkeletonBlock height={18} width="80%" />
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SkeletonBlock height={18} width="34%" />
        <SurfaceCard>
          <View style={styles.compactNewsRow}>
            <SkeletonBlock height={88} width={88} rounded={radii.md} />
            <View style={styles.compactNewsCopy}>
              <SkeletonBlock height={10} width="42%" />
              <SkeletonBlock height={18} width="92%" />
              <SkeletonBlock height={16} width="100%" />
              <SkeletonBlock height={16} width="74%" />
            </View>
          </View>
        </SurfaceCard>
        <SurfaceCard>
          <View style={styles.compactNewsRow}>
            <SkeletonBlock height={88} width={88} rounded={radii.md} />
            <View style={styles.compactNewsCopy}>
              <SkeletonBlock height={10} width="36%" />
              <SkeletonBlock height={18} width="86%" />
              <SkeletonBlock height={16} width="100%" />
              <SkeletonBlock height={16} width="68%" />
            </View>
          </View>
        </SurfaceCard>
      </View>

      <SurfaceCard>
        <View style={styles.skeletonStack}>
          <SkeletonBlock height={12} width="30%" />
          <SkeletonBlock height={26} width="72%" />
          <SkeletonBlock height={16} width="66%" />
          <SkeletonBlock height={16} width="94%" />
          <View style={styles.skeletonButtonRow}>
            <SkeletonBlock height={40} width="48%" rounded={999} />
            <SkeletonBlock height={40} width="48%" rounded={999} />
          </View>
        </View>
      </SurfaceCard>
    </View>
  );
}

function InlineRetryCard({ title, detail, onRetry }: { title: string; detail: string; onRetry: () => void }) {
  return (
    <SurfaceCard>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </SurfaceCard>
  );
}

export function NewsAlertsScreen() {
  const navigation = useNavigation<any>();
  const { status } = useSession();
  const viewedAdvertisementIdsRef = useRef<Set<number>>(new Set());
  const [selectedTab, setSelectedTab] = useState<NewsTab>("all");
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [advertisements, setAdvertisements] = useState<AdvertisementItem[]>([]);
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
      const [nextData, nextAds] = await Promise.all([
        getNewsFeed(status === "authenticated"),
        getAdvertisements("news_inline").catch(() => ({ results: [] })),
      ]);
      setNewsData(nextData);
      setAdvertisements(nextAds.results);
      viewedAdvertisementIdsRef.current = new Set();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The news feed could not be loaded.");
      if (!isRefreshing) {
        setNewsData(null);
        setAdvertisements([]);
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
    void loadNews();
  }, [status]);

  useEffect(() => {
    let isFirstFocus = true;
    const unsubscribe = navigation.addListener("focus", () => {
      if (isFirstFocus) {
        isFirstFocus = false;
        return;
      }
      void loadNews();
    });
    return unsubscribe;
  }, [navigation, status]);

  useEffect(() => {
    const spotlightAdvertisement = advertisements[0];
    if (!spotlightAdvertisement || viewedAdvertisementIdsRef.current.has(spotlightAdvertisement.id)) {
      return;
    }

    viewedAdvertisementIdsRef.current.add(spotlightAdvertisement.id);
    void recordAdImpression(spotlightAdvertisement.id, { placement: "news_inline" }).catch(() => {
      // Impression tracking is best-effort and should never affect the feed.
    });
  }, [advertisements]);

  const featuredNews = newsData?.featured_news ?? null;
  const newsItems = useMemo(() => {
    const items = newsData?.items ?? [];
    if (!featuredNews) {
      return items;
    }
    return items.filter((item) => item.id !== featuredNews.id);
  }, [featuredNews, newsData?.items]);

  const compactNewsItems = selectedTab === "all" ? newsItems.slice(0, 3) : newsItems;
  const meetingPreview = selectedTab === "all" ? newsData?.meetings[0] ?? null : null;
  const meetingList = selectedTab === "meetings" ? newsData?.meetings ?? [] : [];
  const spotlightAd = selectedTab === "all" ? advertisements[0] ?? null : null;

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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The RSVP could not be updated.");
    } finally {
      setSubmittingMeetingId(null);
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

  function openNewsItem(item: NewsFeedItem) {
    navigation.navigate("NewsDetail", { newsId: item.id });
  }

  async function handleToggleBookmark(item: NewsFeedItem) {
    if (status !== "authenticated") {
      Alert.alert("Sign in required", "Sign in as a member to save products and news.");
      return;
    }

    const previousValue = item.is_bookmarked;
    setError(null);
    setNewsData((current) => applyBookmarkState(current, item.id, !previousValue));

    try {
      const response = await toggleNewsBookmark(item.id);
      setNewsData((current) => applyBookmarkState(current, item.id, response.is_bookmarked));
    } catch (nextError) {
      setNewsData((current) => applyBookmarkState(current, item.id, previousValue));
      setError(nextError instanceof Error ? nextError.message : "The bookmark could not be updated.");
    }
  }

  async function handleAdvertisementPress(advertisement: AdvertisementItem) {
    try {
      await recordAdClick(advertisement.id, { placement: "news_inline" });
    } catch {
      // Click tracking is best-effort and should never block the ad action.
    }
    await executeAdvertisementAction(advertisement, navigation);
  }

  const showNewsSections = selectedTab !== "meetings";
  const showMeetingSections = selectedTab !== "news";
  const showTicker = selectedTab === "all" && hasMeaningfulTicker(newsData);
  const hasNewsContent = Boolean(featuredNews || compactNewsItems.length || newsData?.urgent_alert.title !== "No active alerts");
  const hasMeetingContent = Boolean(meetingPreview || meetingList.length);
  const showAllEmptyState = !loading && !hasNewsContent && !hasMeetingContent && selectedTab === "all";

  return (
    <AppScreen
      scrollable
      safeAreaEdges={["top"]}
      backgroundColor="#FFFFFF"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNews(true)} tintColor={colors.text} />}
    >
      {loading && !newsData ? (
        <NewsFeedSkeleton selectedTab={selectedTab} />
      ) : (
        <View style={styles.body}>
          <View style={styles.tabs}>
            {TAB_OPTIONS.map((tab) => {
              const active = selectedTab === tab.id;
              return (
                <Pressable key={tab.id} style={styles.tabButton} onPress={() => setSelectedTab(tab.id)}>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                  <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
                </Pressable>
              );
            })}
          </View>

          {!newsData ? (
            <InlineRetryCard
              title="News unavailable"
              detail={error ?? "The feed could not be loaded right now. Pull to refresh or try again."}
              onRetry={() => loadNews()}
            />
          ) : (
            <>
              {showNewsSections ? (
                featuredNews ? (
                  <Pressable onPress={() => openNewsItem(featuredNews)}>
                    <SurfaceCard>
                      <View style={styles.featuredCard}>
                        <View style={styles.featuredMediaWrap}>
                          {featuredNews.image_url ? (
                            <Image source={{ uri: featuredNews.image_url }} style={styles.featuredImage} />
                          ) : (
                            <View style={styles.featuredImageFallback} />
                          )}
                          <View style={styles.featuredBadgeRow}>
                            <Text style={styles.urgentBadge}>Featured</Text>
                            <Text style={styles.publisherBadge}>{titleCase(featuredNews.publisher_type)}</Text>
                          </View>
                          <Pressable style={styles.bookmarkButtonFeatured} onPress={(event) => {
                            event.stopPropagation();
                            void handleToggleBookmark(featuredNews);
                          }}>
                            <MaterialIcons
                              name={featuredNews.is_bookmarked ? "bookmark" : "bookmark-border"}
                              size={20}
                              color={featuredNews.is_bookmarked ? colors.accentGold : "#1A1A1A"}
                            />
                          </Pressable>
                        </View>
                        <View style={styles.featuredCopy}>
                          <Text style={styles.featuredMeta}>{formatPublishedLabel(featuredNews.published_at)}</Text>
                          <Text style={styles.featuredTitle}>{featuredNews.title}</Text>
                          <Text style={styles.featuredBody} numberOfLines={3}>
                            {featuredNews.description}
                          </Text>
                          <Text style={styles.featuredLink}>Read full brief</Text>
                        </View>
                      </View>
                    </SurfaceCard>
                  </Pressable>
                ) : newsData.urgent_alert.title !== "No active alerts" ? (
                  <SurfaceCard>
                    <Text style={styles.alertEyebrow}>Urgent Alert</Text>
                    <Text style={styles.alertTitle}>{newsData.urgent_alert.title}</Text>
                    {newsData.urgent_alert.summary ? <Text style={styles.alertSummary}>{newsData.urgent_alert.summary}</Text> : null}
                  </SurfaceCard>
                ) : null
              ) : null}

              {showNewsSections ? (
                compactNewsItems.length ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{selectedTab === "news" ? "Published News" : "Latest Updates"}</Text>
                    <View style={styles.newsList}>
                        {compactNewsItems.map((item) => (
                          <Pressable key={item.id} onPress={() => openNewsItem(item)}>
                            <SurfaceCard>
                              <View style={styles.compactNewsRow}>
                                {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.compactNewsImage} /> : null}
                                <View style={styles.compactNewsCopy}>
                                  <View style={styles.compactNewsHeader}>
                                    <Text style={styles.compactNewsMeta}>{`${titleCase(item.publisher_type)}  |  ${formatPublishedLabel(item.published_at)}`}</Text>
                                    <Pressable style={styles.bookmarkButtonInline} onPress={(event) => {
                                      event.stopPropagation();
                                      void handleToggleBookmark(item);
                                    }}>
                                      <MaterialIcons
                                        name={item.is_bookmarked ? "bookmark" : "bookmark-border"}
                                        size={20}
                                        color={item.is_bookmarked ? colors.accentGold : "#8A6400"}
                                      />
                                    </Pressable>
                                  </View>
                                  <Text style={styles.compactNewsTitle}>{item.title}</Text>
                                  <Text style={styles.compactNewsBody} numberOfLines={item.image_url ? 3 : 4}>
                                    {item.description}
                                </Text>
                              </View>
                            </View>
                          </SurfaceCard>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : selectedTab === "news" ? (
                  <SurfaceCard>
                    <Text style={styles.emptyTitle}>No published news yet</Text>
                    <Text style={styles.emptyDetail}>Published news for your scope will appear here as soon as it is available.</Text>
                  </SurfaceCard>
                ) : null
              ) : null}

              {showMeetingSections && meetingPreview ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Meeting Preview</Text>
                  <SurfaceCard>
                    <View style={styles.meetingHighlightCard}>
                      <View style={styles.meetingHighlightTopRow}>
                        <View>
                          <Text style={styles.meetingEyebrow}>Upcoming Event</Text>
                          <Text style={styles.meetingHighlightTitle}>{meetingPreview.title}</Text>
                        </View>
                        <View style={styles.meetingAccentDot} />
                      </View>

                      <View style={styles.meetingInfoGrid}>
                        <View style={styles.meetingInfoItem}>
                          <Text style={styles.meetingInfoLabel}>When</Text>
                          <Text style={styles.meetingInfoValue}>{formatDateTimeLabel(meetingPreview.start_datetime)}</Text>
                        </View>
                        <View style={styles.meetingInfoItem}>
                          <Text style={styles.meetingInfoLabel}>Mode</Text>
                          <Text style={styles.meetingInfoValue}>{titleCase(meetingPreview.meeting_mode)}</Text>
                        </View>
                        <View style={[styles.meetingInfoItem, styles.meetingInfoItemWide]}>
                          <Text style={styles.meetingInfoLabel}>Venue</Text>
                          <Text style={styles.meetingInfoValue}>{meetingPreview.venue_name || "Venue to be announced"}</Text>
                          {meetingPreview.venue_address ? <Text style={styles.meetingInfoSubValue}>{meetingPreview.venue_address}</Text> : null}
                        </View>
                      </View>

                      <View style={styles.meetingActionRow}>
                        <Pressable style={styles.primaryActionButton} onPress={() => navigation.navigate("MeetingDetail", { meetingId: meetingPreview.id })}>
                          <Text style={styles.primaryActionText}>View Details</Text>
                        </Pressable>
                        {meetingPreview.google_maps_link ? (
                          <Pressable style={styles.secondaryActionButton} onPress={() => openLink(meetingPreview.google_maps_link)}>
                            <Text style={styles.secondaryActionText}>View on Map</Text>
                          </Pressable>
                        ) : null}
                        {meetingPreview.online_meeting_link ? (
                          <Pressable style={styles.secondaryActionButton} onPress={() => openLink(meetingPreview.online_meeting_link)}>
                            <Text style={styles.secondaryActionText}>Join Meeting</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </SurfaceCard>
                </View>
              ) : null}

              {selectedTab === "meetings" ? (
                meetingList.length ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
                    <View style={styles.newsList}>
                      {meetingList.map((meeting) => (
                        <SurfaceCard key={meeting.id}>
                          <View style={styles.meetingRowHeader}>
                            <View style={styles.meetingMarker} />
                            <View style={styles.meetingRowCopy}>
                              <Text style={styles.meetingRowMode}>{titleCase(meeting.meeting_mode)}</Text>
                              <Text style={styles.meetingRowTitle}>{meeting.title}</Text>
                            </View>
                          </View>
                          <Text style={styles.meetingRowDate}>{formatDateTimeLabel(meeting.start_datetime)}</Text>
                          <Text style={styles.meetingRowVenue}>{meeting.venue_name || "Venue to be announced"}</Text>
                          {meeting.venue_address ? <Text style={styles.meetingRowAddress}>{meeting.venue_address}</Text> : null}
                          <View style={styles.linkRow}>
                            <Pressable onPress={() => navigation.navigate("MeetingDetail", { meetingId: meeting.id })}>
                              <Text style={styles.textLink}>View details</Text>
                            </Pressable>
                            {meeting.google_maps_link ? (
                              <Pressable onPress={() => openLink(meeting.google_maps_link)}>
                                <Text style={styles.textLink}>View on map</Text>
                              </Pressable>
                            ) : null}
                            {meeting.online_meeting_link ? (
                              <Pressable onPress={() => openLink(meeting.online_meeting_link)}>
                                <Text style={styles.textLink}>Join meeting</Text>
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
                ) : (
                  <SurfaceCard>
                    <Text style={styles.emptyTitle}>No upcoming meetings</Text>
                    <Text style={styles.emptyDetail}>Meetings published for your audience will appear here with links and RSVP actions.</Text>
                  </SurfaceCard>
                )
              ) : null}

              {showTicker ? (
                <SurfaceCard>
                  <View style={styles.tickerCard}>
                    <Text style={styles.tickerEyebrow}>Market Snapshot</Text>
                    <Text style={styles.tickerHeadline}>Bullion Ticker</Text>
                    <View style={styles.tickerRow}>
                      <View style={styles.tickerValueWrap}>
                        <Text style={styles.tickerLabel}>Gold</Text>
                        <Text style={styles.tickerValue}>{formatCurrency(newsData.ticker.gold)}</Text>
                      </View>
                      <View style={styles.tickerDivider} />
                      <View style={styles.tickerValueWrap}>
                        <Text style={styles.tickerLabel}>Silver</Text>
                        <Text style={styles.tickerValue}>{formatCurrency(newsData.ticker.silver)}</Text>
                      </View>
                    </View>
                  </View>
                </SurfaceCard>
              ) : null}

              {spotlightAd ? (
                <Pressable onPress={() => handleAdvertisementPress(spotlightAd)}>
                  <SurfaceCard>
                    <View style={styles.spotlightCard}>
                      {spotlightAd.image_url ? (
                        <ImageBackground source={{ uri: spotlightAd.image_url }} style={styles.spotlightImage} imageStyle={styles.spotlightImageRadius}>
                          <View style={styles.spotlightOverlay}>
                            <Text style={styles.spotlightTag}>{spotlightAd.label}</Text>
                            <Text style={styles.spotlightTitle}>{spotlightAd.title}</Text>
                            <Text style={styles.spotlightDescription} numberOfLines={3}>
                              {spotlightAd.description}
                            </Text>
                          </View>
                        </ImageBackground>
                      ) : (
                        <View style={[styles.spotlightOverlay, { backgroundColor: spotlightAd.background_color || "#7C2D12" }]}>
                          <Text style={styles.spotlightTag}>{spotlightAd.label}</Text>
                          <Text style={styles.spotlightTitle}>{spotlightAd.title}</Text>
                          <Text style={styles.spotlightDescription} numberOfLines={3}>
                            {spotlightAd.description}
                          </Text>
                        </View>
                      )}
                    </View>
                  </SurfaceCard>
                </Pressable>
              ) : null}

              {showAllEmptyState ? (
                <SurfaceCard>
                  <Text style={styles.emptyTitle}>Nothing is visible right now</Text>
                  <Text style={styles.emptyDetail}>Published news and meetings for your scope will show up here automatically.</Text>
                </SurfaceCard>
              ) : null}

              {error && newsData ? (
                <View style={styles.inlineBanner}>
                  <Text style={styles.inlineError}>Some content could not be refreshed.</Text>
                  <Pressable onPress={() => loadNews()}>
                    <Text style={styles.inlineRetry}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabButton: {
    alignItems: "center",
    gap: spacing.sm,
  },
  tabLabel: {
    color: "#8E877E",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tabLabelActive: {
    color: "#1A1A1A",
  },
  tabUnderline: {
    width: "100%",
    height: 2,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: colors.accentGold,
  },
  tabSkeletonWrap: {
    gap: spacing.sm,
  },
  featuredCard: {
    gap: spacing.md,
  },
  featuredMediaWrap: {
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: 224,
    borderRadius: radii.lg,
    backgroundColor: "#EDE6D8",
  },
  featuredImageFallback: {
    height: 224,
    borderRadius: radii.lg,
    backgroundColor: "#E8DED1",
  },
  featuredBadgeRow: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bookmarkButtonFeatured: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  urgentBadge: {
    backgroundColor: "#B91C1C",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  publisherBadge: {
    backgroundColor: "rgba(255,255,255,0.94)",
    color: "#1A1A1A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  featuredCopy: {
    gap: spacing.sm,
  },
  featuredMeta: {
    color: "#8C857A",
    fontSize: 12,
    fontWeight: "600",
  },
  featuredTitle: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 34,
  },
  featuredBody: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 24,
  },
  featuredLink: {
    color: "#2C2117",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: spacing.xs,
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
  compactNewsRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  compactNewsImage: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: "#EDE6D8",
  },
  compactNewsCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  compactNewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  compactNewsMeta: {
    color: "#8A6400",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    flex: 1,
  },
  bookmarkButtonInline: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  compactNewsTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  compactNewsBody: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  meetingHighlightCard: {
    backgroundColor: "#171717",
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  meetingHighlightTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  meetingEyebrow: {
    color: colors.accentGold,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  meetingHighlightTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: spacing.xs,
  },
  meetingAccentDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
    marginTop: spacing.xs,
  },
  meetingInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  meetingInfoItem: {
    width: "47%",
    gap: 4,
  },
  meetingInfoItemWide: {
    width: "100%",
  },
  meetingInfoLabel: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  meetingInfoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  meetingInfoSubValue: {
    color: "#D4D4D8",
    fontSize: 13,
    lineHeight: 20,
  },
  meetingActionRow: {
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
  meetingRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  meetingMarker: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
  },
  meetingRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  meetingRowMode: {
    color: "#8A6400",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  meetingRowTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  meetingRowDate: {
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  meetingRowVenue: {
    color: colors.text,
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  meetingRowAddress: {
    color: colors.mutedText,
    marginTop: 4,
    lineHeight: 21,
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  textLink: {
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
  tickerCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  tickerEyebrow: {
    color: "#7E746A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tickerHeadline: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  tickerValueWrap: {
    flex: 1,
    gap: 4,
  },
  tickerLabel: {
    color: "#7E746A",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tickerValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  tickerDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#DDD4C8",
    marginHorizontal: spacing.md,
  },
  spotlightCard: {
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  spotlightImage: {
    minHeight: 180,
    justifyContent: "flex-end",
  },
  spotlightImageRadius: {
    borderRadius: radii.lg,
  },
  spotlightOverlay: {
    minHeight: 180,
    justifyContent: "flex-end",
    padding: spacing.lg,
    backgroundColor: "rgba(17,24,39,0.42)",
  },
  spotlightTag: {
    alignSelf: "flex-start",
    backgroundColor: "#D97706",
    color: colors.surface,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  spotlightTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: spacing.sm,
  },
  spotlightDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
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
  inlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
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
    flex: 1,
  },
  inlineRetry: {
    color: colors.negative,
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 12,
  },
  skeletonBlock: {
    backgroundColor: "#EFE8DD",
  },
  skeletonStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  skeletonButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

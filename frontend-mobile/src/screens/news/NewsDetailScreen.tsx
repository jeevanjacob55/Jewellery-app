import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import { getNewsDetail } from "../../api/news";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { NewsDetail, NewsFeedItem } from "../../types/api";
import { titleCase } from "../../utils/format";

type NewsDetailRoute = RouteProp<{ NewsDetail: { newsId: number } }, "NewsDetail">;

function formatPublishedLabel(value: string | null) {
  if (!value) {
    return "Published recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function splitDescriptionIntoParagraphs(description: string) {
  const paragraphs = description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length ? paragraphs : [description.trim()];
}

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function DetailSkeleton() {
  return (
    <View style={styles.body}>
      <SkeletonBlock height={280} rounded={0} />
      <View style={styles.articleWrap}>
        <View style={styles.articleCard}>
          <View style={styles.metaStrip}>
            <SkeletonBlock height={12} width="28%" />
            <SkeletonBlock height={12} width="24%" />
          </View>
          <View style={styles.textStack}>
            <SkeletonBlock height={34} width="90%" />
            <SkeletonBlock height={34} width="78%" />
            <SkeletonBlock height={20} width="100%" />
            <SkeletonBlock height={20} width="96%" />
            <SkeletonBlock height={20} width="82%" />
          </View>
        </View>
      </View>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

export function NewsDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<NewsDetailRoute>();
  const { status } = useSession();
  const [newsItem, setNewsItem] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNewsItem() {
      try {
        setError(null);
        const nextItem = await getNewsDetail(route.params.newsId, status === "authenticated");
        if (active) {
          setNewsItem(nextItem);
        }
      } catch (nextError) {
        if (active) {
          setNewsItem(null);
          setError(nextError instanceof Error ? nextError.message : "This article could not be loaded.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadNewsItem();

    return () => {
      active = false;
    };
  }, [route.params.newsId, status]);

  const paragraphs = useMemo(() => (newsItem ? splitDescriptionIntoParagraphs(newsItem.description) : []), [newsItem]);
  const leadParagraph = paragraphs[0] ?? "";
  const bodyParagraphs = paragraphs.slice(1);
  const relatedItems = newsItem?.related_items ?? [];

  async function handleShare() {
    if (!newsItem) {
      return;
    }
    await Share.share({
      title: newsItem.title,
      message: `${newsItem.title}\n\n${newsItem.description}`,
    });
  }

  function openRelatedItem(item: NewsFeedItem) {
    navigation.push("NewsDetail", { newsId: item.id });
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
        right={<ActionButton label="Share" onPress={handleShare} />}
      />

      {loading ? (
        <DetailSkeleton />
      ) : !newsItem ? (
        <View style={styles.body}>
          <SurfaceCard>
            <Text style={styles.errorTitle}>News unavailable</Text>
            <Text style={styles.errorDetail}>{error ?? "This news item is not available right now."}</Text>
            <Pressable style={styles.retryButton} onPress={() => navigation.replace("NewsDetail", { newsId: route.params.newsId })}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        </View>
      ) : (
        <View style={styles.body}>
          {newsItem.image_url ? (
            <>
              <View style={styles.heroWrap}>
                <Image source={{ uri: newsItem.image_url }} style={styles.heroImage} />
                <View style={styles.heroOverlay} />
                <View style={styles.heroCopy}>
                  <Text style={styles.heroBadge}>{titleCase(newsItem.publisher_type)}</Text>
                  <Text style={styles.heroTitle}>{newsItem.title}</Text>
                </View>
              </View>

              <View style={styles.articleWrap}>
                <View style={styles.articleCard}>
                  <View style={styles.metaStrip}>
                    <View style={styles.metaBlock}>
                      <Text style={styles.metaLabel}>Published</Text>
                      <Text style={styles.metaValue}>{formatPublishedLabel(newsItem.published_at)}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaBlock}>
                      <Text style={styles.metaLabel}>Source</Text>
                      <Text style={styles.metaValue}>{titleCase(newsItem.publisher_type)}</Text>
                    </View>
                  </View>

                  <View style={styles.articleContent}>
                    {leadParagraph ? <Text style={styles.leadParagraph}>{leadParagraph}</Text> : null}
                    {bodyParagraphs.map((paragraph, index) => (
                      <Text key={`${newsItem.id}-${index}`} style={styles.bodyParagraph}>
                        {paragraph}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.plainArticleWrap}>
              <View style={styles.plainMetaRow}>
                <Text style={styles.plainBadge}>{titleCase(newsItem.publisher_type)}</Text>
                <Text style={styles.plainTimestamp}>{formatPublishedLabel(newsItem.published_at)}</Text>
              </View>
              <Text style={styles.plainTitle}>{newsItem.title}</Text>
              <View style={styles.plainDivider} />
              <View style={styles.articleContent}>
                {leadParagraph ? <Text style={styles.leadParagraph}>{leadParagraph}</Text> : null}
                {bodyParagraphs.map((paragraph, index) => (
                  <Text key={`${newsItem.id}-${index}`} style={styles.bodyParagraph}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {relatedItems.length ? (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedHeading}>Related Market News</Text>
              <View style={styles.relatedList}>
                {relatedItems.map((item) => (
                  <Pressable key={item.id} onPress={() => openRelatedItem(item)}>
                    <SurfaceCard>
                      <View style={styles.relatedCard}>
                        {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.relatedImage} /> : null}
                        <View style={styles.relatedCopy}>
                          <Text style={styles.relatedMeta}>{titleCase(item.publisher_type)}</Text>
                          <Text style={styles.relatedTitle}>{item.title}</Text>
                        </View>
                      </View>
                    </SurfaceCard>
                  </Pressable>
                ))}
              </View>
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
  actionButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5DDD2",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  body: {
    gap: spacing.lg,
  },
  heroWrap: {
    position: "relative",
    height: 300,
    overflow: "hidden",
    backgroundColor: "#E9E1D6",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  heroCopy: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentGold,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
  articleWrap: {
    marginTop: -36,
    paddingHorizontal: spacing.md,
  },
  articleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radii.xl,
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE6DB",
  },
  metaBlock: {
    flexShrink: 1,
    gap: 4,
  },
  metaLabel: {
    color: "#A29A90",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  metaDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E4DBCE",
  },
  plainArticleWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  plainMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  plainBadge: {
    backgroundColor: "#FBF2D7",
    color: "#8A6400",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  plainTimestamp: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "600",
  },
  plainTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 34,
    lineHeight: 42,
    marginTop: spacing.md,
  },
  plainDivider: {
    width: 72,
    height: 2,
    backgroundColor: colors.accentGold,
    marginTop: spacing.lg,
  },
  articleContent: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  leadParagraph: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 31,
    fontWeight: "600",
  },
  bodyParagraph: {
    color: "#4F4A45",
    fontSize: 16,
    lineHeight: 29,
  },
  relatedSection: {
    paddingHorizontal: spacing.lg,
  },
  relatedHeading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  relatedList: {
    gap: spacing.md,
  },
  relatedCard: {
    gap: spacing.md,
  },
  relatedImage: {
    width: "100%",
    height: 176,
    borderRadius: radii.lg,
    backgroundColor: "#EDE6D8",
  },
  relatedCopy: {
    gap: spacing.xs,
  },
  relatedMeta: {
    color: "#8A6400",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  relatedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 27,
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
    marginTop: spacing.lg,
  },
  skeletonBlock: {
    backgroundColor: "#EFE8DD",
  },
});

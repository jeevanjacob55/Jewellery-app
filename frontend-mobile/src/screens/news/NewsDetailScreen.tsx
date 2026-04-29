import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import { getNewsDetail } from "../../api/news";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { NewsDetail } from "../../types/api";
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

export function NewsDetailScreen() {
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
    loadNewsItem();

    return () => {
      active = false;
    };
  }, [route.params.newsId, status]);

  if (loading) {
    return <ScreenState title="Loading news story" detail="Preparing the full article." loading />;
  }

  if (!newsItem) {
    return <ScreenState title="News unavailable" detail={error ?? "This news item is not available right now."} />;
  }

  return (
    <AppScreen scrollable safeAreaEdges={["top"]} contentContainerStyle={styles.content}>
      <AppHeader title="News" subtitle="Association updates and published notices." />
      <View style={styles.body}>
        {newsItem.image_url ? <Image source={{ uri: newsItem.image_url }} style={styles.heroImage} /> : null}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{titleCase(newsItem.publisher_type)}</Text>
          </View>
          <Text style={styles.timestamp}>{formatPublishedLabel(newsItem.published_at)}</Text>
        </View>

        <Text style={styles.title}>{newsItem.title}</Text>
        <Text style={styles.description}>{newsItem.description}</Text>
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
  },
  heroImage: {
    width: "100%",
    height: 240,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    backgroundColor: "#EDE6D8",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "#FBF2D7",
  },
  badgeText: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  timestamp: {
    color: colors.mutedText,
    fontSize: 13,
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 30,
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 28,
  },
});

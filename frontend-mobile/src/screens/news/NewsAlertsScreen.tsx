import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { getJson } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, spacing } from "../../theme/tokens";
import { NewsData } from "../../types/api";
import { formatCurrency } from "../../utils/format";

export function NewsAlertsScreen() {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      try {
        const nextData = await getJson<NewsData>("/news/");
        if (active) {
          setNewsData(nextData);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      active = false;
    };
  }, []);

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

        {newsData.meetings.map((meeting) => (
          <SurfaceCard key={meeting.title}>
            <Text style={styles.title}>{meeting.title}</Text>
            <Text style={styles.meta}>{meeting.venue}</Text>
            <Pressable onPress={() => Linking.openURL(meeting.calendar_url)}>
              <Text style={styles.link}>Open calendar link</Text>
            </Pressable>
          </SurfaceCard>
        ))}

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
});

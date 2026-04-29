import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMarketFeed } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { MarketCompanyCard, MarketFeedData, MarketRow } from "../../types/api";

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function MarketSkeleton() {
  return (
    <View style={styles.content}>
      <View style={styles.headerCopy}>
        <SkeletonBlock height={14} width="24%" rounded={999} />
        <SkeletonBlock height={34} width="54%" />
        <SkeletonBlock height={18} width="88%" />
      </View>

      {[0, 1, 2].map((row) => (
        <View key={`row-${row}`} style={styles.section}>
          <SkeletonBlock height={22} width="36%" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroller}>
            {[0, 1].map((item) => (
              <View key={`item-${row}-${item}`} style={styles.heroSkeletonCard}>
                <SkeletonBlock height={168} rounded={radii.lg} />
                <View style={styles.heroSkeletonText}>
                  <SkeletonBlock height={18} width="72%" />
                  <SkeletonBlock height={14} width="40%" />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

export function MarketTiersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [marketFeed, setMarketFeed] = useState<MarketFeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        const nextFeed = await getMarketFeed();
        if (!active) {
          return;
        }
        setMarketFeed(nextFeed);
        setError(null);
      } catch {
        if (active) {
          setError("Unable to load the market right now.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      active = false;
    };
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const nextFeed = await getMarketFeed();
      setMarketFeed(nextFeed);
      setError(null);
    } catch {
      setError("Unable to refresh the market right now.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function openCompanyCatalog(company: MarketCompanyCard, row: MarketRow) {
    navigation.navigate("ProductSearch", {
      companyId: company.company_id,
      companyName: company.name,
      sourceRowId: row.id,
    });
  }

  if (isLoading && !marketFeed) {
    return (
      <AppScreen safeAreaEdges={["top"]} backgroundColor={colors.background} scrollable>
        <MarketSkeleton />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      safeAreaEdges={["top"]}
      backgroundColor={colors.background}
      scrollable
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
      contentContainerStyle={[styles.content, { paddingBottom: 120 + Math.max(insets.bottom, spacing.md) }]}
    >
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>Trade Showcase</Text>
        <Text style={styles.title}>Market</Text>
        <Text style={styles.subtitle}>Browse companies by tier, then step straight into each company's live product catalog.</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Market unavailable</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void handleRefresh()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {(marketFeed?.rows ?? []).map((row) => (
        <MarketRowSection key={row.id} row={row} onPressCompany={(company) => openCompanyCatalog(company, row)} />
      ))}

      {!error && !(marketFeed?.rows?.length ?? 0) ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing is live in the market yet.</Text>
          <Text style={styles.emptyDetail}>Once approved companies are assigned to active rows, they'll appear here automatically.</Text>
        </View>
      ) : null}
    </AppScreen>
  );
}

function MarketRowSection({ row, onPressCompany }: { row: MarketRow; onPressCompany: (company: MarketCompanyCard) => void }) {
  if (!row.items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{row.title}</Text>
      {row.layout === "grid_company" ? (
        <View style={styles.gridWrap}>
          {row.items.map((company) => (
            <GridCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company)} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroller}>
          {row.items.map((company) =>
            row.layout === "hero_company" ? (
              <HeroCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company)} />
            ) : (
              <RailCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company)} />
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
}

function HeroCompanyCard({ company, onPress }: { company: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.heroCard} onPress={onPress}>
      <ImageBackground source={company.hero_image_url ? { uri: company.hero_image_url } : undefined} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroTopTag}>
          <Text style={styles.heroTopTagText}>Premium</Text>
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.logoBadge}>
            {company.logo_image_url ? <Image source={{ uri: company.logo_image_url }} style={styles.logoBadgeImage} /> : <Text style={styles.logoBadgeFallback}>{getInitials(company.name)}</Text>}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroName}>{company.name}</Text>
            <Text style={styles.heroMeta}>{[company.city, company.state].filter(Boolean).join(", ")}</Text>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function RailCompanyCard({ company, onPress }: { company: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.railCard} onPress={onPress}>
      <View style={styles.railMedia}>
        {company.hero_image_url ? <Image source={{ uri: company.hero_image_url }} style={styles.railMediaImage} /> : <View style={styles.railMediaFallback}><Text style={styles.railMediaFallbackText}>{getInitials(company.name)}</Text></View>}
      </View>
      <View style={styles.railCopy}>
        <Text style={styles.railName} numberOfLines={2}>
          {company.name}
        </Text>
        <Text style={styles.railMeta}>{[company.city, company.state].filter(Boolean).join(", ")}</Text>
        <Text style={styles.railHint}>View products</Text>
      </View>
    </Pressable>
  );
}

function GridCompanyCard({ company, onPress }: { company: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.gridCard} onPress={onPress}>
      <View style={styles.gridLogoWrap}>
        {company.logo_image_url ? <Image source={{ uri: company.logo_image_url }} style={styles.gridLogo} /> : <Text style={styles.gridLogoFallback}>{getInitials(company.name)}</Text>}
      </View>
      <Text style={styles.gridName} numberOfLines={2}>
        {company.name}
      </Text>
      <Text style={styles.gridMeta}>{[company.city, company.state].filter(Boolean).join(", ")}</Text>
      <View style={styles.gridFooter}>
        <Text style={styles.gridFooterText}>{company.is_verified ? "Verified" : "Products"}</Text>
      </View>
    </Pressable>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  headerCopy: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.mutedText,
    ...typography.eyebrow,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  subtitle: {
    color: colors.mutedText,
    ...typography.body,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.sectionTitle,
    fontSize: 20,
  },
  rowScroller: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  heroCard: {
    width: 300,
  },
  heroImage: {
    height: 230,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  heroImageStyle: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    backgroundColor: "rgba(26, 26, 26, 0.18)",
  },
  heroTopTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroTopTagText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    zIndex: 1,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  logoBadgeImage: {
    width: "100%",
    height: "100%",
  },
  logoBadgeFallback: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "800",
  },
  heroMeta: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
  },
  railCard: {
    width: 196,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  railMedia: {
    height: 132,
    backgroundColor: colors.surfaceAlt,
  },
  railMediaImage: {
    width: "100%",
    height: "100%",
  },
  railMediaFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  railMediaFallbackText: {
    color: colors.mutedText,
    fontSize: 24,
    fontWeight: "800",
  },
  railCopy: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  railName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  railMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  railHint: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  gridLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  gridLogo: {
    width: "100%",
    height: "100%",
  },
  gridLogoFallback: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  gridName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 40,
  },
  gridMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  gridFooter: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  gridFooterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  errorDetail: {
    color: colors.mutedText,
    ...typography.body,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  retryButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  emptyDetail: {
    color: colors.mutedText,
    ...typography.body,
  },
  skeletonBlock: {
    backgroundColor: "#ECE7E7",
  },
  heroSkeletonCard: {
    width: 280,
    gap: spacing.sm,
  },
  heroSkeletonText: {
    gap: spacing.xs,
  },
});

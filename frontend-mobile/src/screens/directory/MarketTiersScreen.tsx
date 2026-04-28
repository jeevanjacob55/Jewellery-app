import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { colors, radii, spacing } from "../../theme/tokens";
import { MarketCategory, MarketCompanyCard, MarketFeedData, MarketFeaturedCompany, MarketProductCard } from "../../types/api";

const BACKGROUND = "#F7F7F7";

export function MarketTiersScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [marketFeed, setMarketFeed] = useState<MarketFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadMarket(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextMarketFeed = await getJson<MarketFeedData>("/directory/market/");
      setMarketFeed(nextMarketFeed);
      setError(null);
    } catch {
      setError("Unable to load the market feed right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMarket();
  }, []);

  const featuredCardWidth = Math.min(width * 0.85, 360);
  const baseProGroupWidth = Math.min(width * 0.78, 320);
  const proGroupWidth = Math.max(baseProGroupWidth * 0.7, width < 390 ? 162 : 180);
  const productCardWidth = Math.max((width - 64) / 2, 150);
  const proCardGap = width < 390 ? 10 : 12;

  const groupedProCompanies = useMemo(() => groupIntoPairs(marketFeed?.pro_companies ?? []), [marketFeed?.pro_companies]);

  function handleSearchSubmit() {
    const query = searchTerm.trim();
    navigation.navigate("ProductSearch", query ? { query } : undefined);
  }

  if (loading && !marketFeed) {
    return <ScreenState title="Loading market" detail="Preparing featured partners, categories, and latest products." loading />;
  }

  if (!marketFeed) {
    return <ScreenState title="Market unavailable" detail={error ?? "Try again in a moment."} />;
  }

  return (
    <AppScreen safeAreaEdges={["top"]} backgroundColor={BACKGROUND}>
      <View style={styles.screen}>
        <View style={styles.searchHeader}>
          <View style={styles.searchShell}>
            <View style={styles.searchIcon}>
              <SearchGlyph />
            </View>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search products or companies..."
              placeholderTextColor="#A1A1AA"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
            />
          </View>
        </View>

        <FlatList
          data={marketFeed.latest_products}
          keyExtractor={(item) => item.product_id.toString()}
          numColumns={2}
          renderItem={({ item }) => (
            <ProductCard item={item} width={productCardWidth} onPress={() => navigation.navigate("ProductSearch", { companyId: item.company_id, productId: item.product_id })} />
          )}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMarket(true)} />}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <SectionLabel label="Featured Partners" />
              <FlatList
                data={marketFeed.featured_companies}
                keyExtractor={(item) => item.company_id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                snapToInterval={featuredCardWidth + 16}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <FeaturedPartnerCard
                    item={item}
                    width={featuredCardWidth}
                    onPress={() => navigation.navigate("CompanyProfile", { companyId: item.company_id, companyName: item.name })}
                    onExplore={() => navigation.navigate("ProductSearch", { companyId: item.company_id })}
                  />
                )}
              />

              <SectionLabel label="Established Members" />
              <FlatList
                data={groupedProCompanies}
                keyExtractor={(_, index) => `pro-group-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.proList, { gap: proCardGap }]}
                snapToInterval={proGroupWidth + proCardGap}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <View style={[styles.proGroup, { width: proGroupWidth, gap: proCardGap }]}>
                    {item.map((company) => (
                      <ProCompanyCard
                        key={company.company_id}
                        item={company}
                        onPress={() => navigation.navigate("CompanyProfile", { companyId: company.company_id, companyName: company.name })}
                      />
                    ))}
                  </View>
                )}
              />

              <SectionLabel label="Directory" />
              <FlatList
                data={marketFeed.normal_companies}
                keyExtractor={(item) => item.company_id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.directoryList}
                renderItem={({ item }) => (
                  <NormalCompanyCard
                    item={item}
                    onPress={() => navigation.navigate("CompanyProfile", { companyId: item.company_id, companyName: item.name })}
                  />
                )}
              />

              <SectionLabel label="Categories" />
              <FlatList
                data={marketFeed.categories}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
                renderItem={({ item }) => (
                  <CategoryChip item={item} onPress={() => navigation.navigate("ProductSearch", { categoryName: item.name })} />
                )}
              />

              <SectionLabel label="Latest Products" />
            </View>
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No market products yet</Text>
              <Text style={styles.emptyBody}>Products will appear here once companies publish items to the directory.</Text>
            </View>
          }
        />
      </View>
    </AppScreen>
  );
}

function FeaturedPartnerCard({
  item,
  width,
  onPress,
  onExplore,
}: {
  item: MarketFeaturedCompany;
  width: number;
  onPress: () => void;
  onExplore: () => void;
}) {
  return (
    <Pressable style={[styles.featuredCard, { width }]} onPress={onPress}>
      <ImageBackground source={item.hero_image_url ? { uri: item.hero_image_url } : undefined} style={styles.featuredImage} imageStyle={styles.featuredImageRadius}>
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredBrandRow}>
            <View style={styles.featuredLogoWrap}>
              {item.logo_image_url ? <Image source={{ uri: item.logo_image_url }} style={styles.featuredLogo} /> : <Text style={styles.logoFallback}>{getInitials(item.name)}</Text>}
            </View>
            <Text style={styles.featuredTitle}>{item.name}</Text>
          </View>
          <Pressable style={styles.featuredButton} onPress={onExplore}>
            <Text style={styles.featuredButtonText}>Explore</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function ProCompanyCard({ item, onPress }: { item: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.proCard} onPress={onPress}>
      <Image source={item.hero_image_url ? { uri: item.hero_image_url } : undefined} style={styles.proCardImage} />
      <View style={styles.proCardFooter}>
        <Text style={styles.proCardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        {item.is_verified ? <VerifiedBadge /> : null}
      </View>
    </Pressable>
  );
}

function NormalCompanyCard({ item, onPress }: { item: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.normalCard} onPress={onPress}>
      <View style={styles.normalLogoWrap}>
        {item.logo_image_url ? <Image source={{ uri: item.logo_image_url }} style={styles.normalLogo} /> : <Text style={styles.normalFallback}>{getInitials(item.name)}</Text>}
      </View>
      <Text style={styles.normalName} numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
}

function CategoryChip({ item, onPress }: { item: MarketCategory; onPress: () => void }) {
  return (
    <Pressable style={styles.categoryItem} onPress={onPress}>
      <View style={styles.categoryIconWrap}>{renderCategoryIcon(item.icon_key)}</View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </Pressable>
  );
}

function ProductCard({ item, width, onPress }: { item: MarketProductCard; width: number; onPress: () => void }) {
  return (
    <Pressable style={[styles.productCard, { width }]} onPress={onPress}>
      <Image source={item.image_url ? { uri: item.image_url } : undefined} style={styles.productImage} />
      <View style={styles.productBody}>
        <Text style={styles.productMeta}>{`${item.purity} | ${item.weight_grams}g`}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productCompany} numberOfLines={1}>
          {item.company_name}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
}

function renderCategoryIcon(iconKey: string) {
  switch (iconKey) {
    case "rings":
      return <CategoryGlyph variant="rings" />;
    case "chains":
      return <CategoryGlyph variant="chains" />;
    case "bangles":
      return <CategoryGlyph variant="bangles" />;
    case "necklaces":
      return <CategoryGlyph variant="necklaces" />;
    case "coins":
      return <CategoryGlyph variant="coins" />;
    default:
      return <CategoryGlyph variant="diamonds" />;
  }
}

function SearchGlyph() {
  return (
    <View style={styles.searchGlyph}>
      <View style={styles.searchGlyphCircle} />
      <View style={styles.searchGlyphHandle} />
    </View>
  );
}

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Text style={styles.verifiedBadgeText}>V</Text>
    </View>
  );
}

function CategoryGlyph({ variant }: { variant: "rings" | "chains" | "bangles" | "necklaces" | "coins" | "diamonds" }) {
  switch (variant) {
    case "rings":
      return <View style={styles.categoryRing} />;
    case "chains":
      return (
        <View style={styles.categoryChainWrap}>
          <View style={styles.categoryChainLeft} />
          <View style={styles.categoryChainRight} />
        </View>
      );
    case "bangles":
      return (
        <View style={styles.categoryBanglesWrap}>
          <View style={styles.categoryBangleBack} />
          <View style={styles.categoryBangleFront} />
        </View>
      );
    case "necklaces":
      return (
        <View style={styles.categoryNecklaceWrap}>
          <View style={styles.categoryNecklaceTopLeft} />
          <View style={styles.categoryNecklaceTopRight} />
          <View style={styles.categoryNecklaceArc} />
        </View>
      );
    case "coins":
      return (
        <View style={styles.categoryCoinsWrap}>
          <View style={styles.categoryCoinBack} />
          <View style={styles.categoryCoinFront} />
        </View>
      );
    default:
      return <View style={styles.categoryDiamond} />;
  }
}

function groupIntoPairs(items: MarketCompanyCard[]) {
  const groups: MarketCompanyCard[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    groups.push(items.slice(index, index + 2));
  }
  return groups;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  searchHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchShell: {
    position: "relative",
    height: 48,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#DCDDDD",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    height: "100%",
    paddingLeft: 48,
    paddingRight: 18,
    color: colors.text,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 132,
  },
  headerContent: {
    paddingTop: 32,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    color: "#5D5F5F",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  featuredList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: 8,
  },
  featuredCard: {
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
  },
  featuredImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  featuredImageRadius: {
    borderRadius: 12,
  },
  featuredOverlay: {
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  featuredBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  featuredLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  featuredLogo: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  featuredTitle: {
    flex: 1,
    color: colors.surface,
    fontSize: 18,
    fontWeight: "700",
  },
  featuredButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentGold,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  featuredButtonText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  proList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
  proGroup: {
    gap: spacing.sm,
  },
  proCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1EDEC",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  proCardImage: {
    width: "100%",
    height: 80,
    backgroundColor: "#E5E7EB",
  },
  proCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  proCardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: "500",
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "800",
  },
  directoryList: {
    paddingHorizontal: spacing.lg,
    gap: 12,
    paddingBottom: 8,
  },
  normalCard: {
    width: 118,
    height: 122,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  normalLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  normalLogo: {
    width: "100%",
    height: "100%",
  },
  normalFallback: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  normalName: {
    color: "#18181B",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
    textTransform: "uppercase",
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: 24,
    paddingBottom: 8,
  },
  categoryItem: {
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E5E2E1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryName: {
    color: "#444748",
    fontSize: 11,
    fontWeight: "700",
  },
  searchGlyph: {
    width: 14,
    height: 14,
    position: "relative",
  },
  searchGlyphCircle: {
    width: 9,
    height: 9,
    borderRadius: 999,
    borderWidth: 1.6,
    borderColor: "#A1A1AA",
  },
  searchGlyphHandle: {
    position: "absolute",
    right: 0,
    bottom: 1,
    width: 6,
    height: 1.6,
    borderRadius: 999,
    backgroundColor: "#A1A1AA",
    transform: [{ rotate: "45deg" }],
  },
  categoryRing: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accentGold,
  },
  categoryChainWrap: {
    width: 28,
    height: 18,
    position: "relative",
  },
  categoryChainLeft: {
    position: "absolute",
    left: 2,
    top: 2,
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accentGold,
  },
  categoryChainRight: {
    position: "absolute",
    right: 2,
    top: 5,
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accentGold,
  },
  categoryBanglesWrap: {
    width: 24,
    height: 18,
    position: "relative",
  },
  categoryBangleBack: {
    position: "absolute",
    left: 2,
    top: 1,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#E4B85C",
  },
  categoryBangleFront: {
    position: "absolute",
    right: 1,
    top: 3,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accentGold,
  },
  categoryNecklaceWrap: {
    width: 24,
    height: 22,
    position: "relative",
    alignItems: "center",
  },
  categoryNecklaceTopLeft: {
    position: "absolute",
    top: 2,
    left: 6,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
  },
  categoryNecklaceTopRight: {
    position: "absolute",
    top: 2,
    right: 6,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
  },
  categoryNecklaceArc: {
    position: "absolute",
    top: 4,
    width: 16,
    height: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: colors.accentGold,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  categoryCoinsWrap: {
    width: 22,
    height: 18,
    position: "relative",
  },
  categoryCoinBack: {
    position: "absolute",
    left: 1,
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#E4B85C",
    backgroundColor: "#FFF9E8",
  },
  categoryCoinFront: {
    position: "absolute",
    right: 1,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accentGold,
    backgroundColor: "#FFF4D6",
  },
  categoryDiamond: {
    width: 13,
    height: 13,
    borderWidth: 2,
    borderColor: colors.accentGold,
    backgroundColor: "#FFF6DF",
    transform: [{ rotate: "45deg" }],
  },
  productRow: {
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F6F3F2",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  productImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#E5E7EB",
  },
  productBody: {
    padding: 12,
  },
  productMeta: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  productTitle: {
    color: "#18181B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 4,
  },
  productCompany: {
    color: "#71717A",
    fontSize: 12,
  },
  emptyState: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.mutedText,
    marginTop: spacing.sm,
  },
});

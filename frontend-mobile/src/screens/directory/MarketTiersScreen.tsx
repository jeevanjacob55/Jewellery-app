import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMarketFeed } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { MarketCategoryCard, MarketCompanyCard, MarketFeedData, MarketProductCard, MarketRow } from "../../types/api";

const SECTION_GOLD = "#775A19";
const SECTION_MUTED = "#7E7576";
const SECTION_BORDER = "#CFC4C5";
const SECTION_CIRCLE = "#EFEDED";
const FEATURED_AUTO_SCROLL_MS = 4500;

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function MarketSkeleton() {
  return (
    <View style={styles.content}>
      <View style={styles.section}>
        <SkeletonBlock height={28} width="46%" />
        <SkeletonBlock height={320} rounded={radii.md} />
      </View>

      <View style={styles.section}>
        <SkeletonBlock height={12} width="34%" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
          {[0, 1, 2, 3].map((item) => (
            <View key={`category-skeleton-${item}`} style={styles.categorySkeletonItem}>
              <SkeletonBlock height={50} width={50} rounded={25} />
              <SkeletonBlock height={12} width={46} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SkeletonBlock height={28} width="54%" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroller}>
          {[0, 1].map((item) => (
            <View key={`rail-skeleton-${item}`} style={styles.railSkeletonCard}>
              <SkeletonBlock height={108} rounded={0} />
              <View style={styles.railSkeletonCopy}>
                <SkeletonBlock height={16} width="76%" />
                <SkeletonBlock height={12} width="42%" />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <SkeletonBlock height={28} width="44%" />
          <SkeletonBlock height={14} width={56} />
        </View>
        <View style={styles.productGridWrap}>
          {[0, 1, 2, 3].map((item) => (
            <View key={`product-skeleton-${item}`} style={styles.productSkeletonCard}>
              <SkeletonBlock height={160} rounded={radii.md} />
              <View style={styles.productSkeletonCopy}>
                <SkeletonBlock height={12} width="48%" />
                <SkeletonBlock height={16} width="82%" />
                <SkeletonBlock height={12} width="70%" />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SkeletonBlock height={28} width="48%" />
        <View style={styles.gridWrap}>
          {[0, 1, 2, 3].map((item) => (
            <View key={`grid-skeleton-${item}`} style={styles.directorySkeletonCard}>
              <SkeletonBlock height={64} width={64} rounded={32} />
              <SkeletonBlock height={16} width="88%" />
              <SkeletonBlock height={12} width="62%" />
              <SkeletonBlock height={22} width="44%" rounded={999} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

type CompanyPressHandler = (company: MarketCompanyCard, row: MarketRow) => void;

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

  function openCategoryResults(category: MarketCategoryCard) {
    navigation.navigate("ProductSearch", {
      categoryName: category.slug,
    });
  }

  function openProductDetail(product: MarketProductCard) {
    navigation.navigate("ProductDetail", {
      productId: product.id,
      companyId: product.company_id,
    });
  }

  const rows = marketFeed?.rows ?? [];
  const { featuredRow, categoryRow, establishedRow, arrivalsRow, directoryRow, remainingRows } = useMemo(() => {
    const nextFeaturedRow = rows.find((row) => row.row_type === "company_tier" && row.layout === "hero_company") ?? null;
    const nextCategoryRow = rows.find((row) => row.row_type === "category_collection") ?? null;
    const nextEstablishedRow = rows.find((row) => row.row_type === "company_tier" && row.layout === "rail_company") ?? null;
    const nextArrivalsRow = rows.find((row) => row.row_type === "product_collection") ?? null;
    const nextDirectoryRow = rows.find((row) => row.row_type === "company_tier" && row.layout === "grid_company") ?? null;

    const usedIds = new Set(
      [nextFeaturedRow, nextCategoryRow, nextEstablishedRow, nextArrivalsRow, nextDirectoryRow]
        .filter((row): row is MarketRow => Boolean(row))
        .map((row) => row.id),
    );

    return {
      featuredRow: nextFeaturedRow,
      categoryRow: nextCategoryRow,
      establishedRow: nextEstablishedRow,
      arrivalsRow: nextArrivalsRow,
      directoryRow: nextDirectoryRow,
      remainingRows: rows.filter((row) => !usedIds.has(row.id)),
    };
  }, [rows]);

  if (isLoading && !marketFeed) {
    return (
      <AppScreen safeAreaEdges={["top"]} backgroundColor={colors.background} scrollable>
        <MarketSkeleton />
      </AppScreen>
    );
  }

  const hasVisibleContent = Boolean(featuredRow || categoryRow || establishedRow || arrivalsRow || directoryRow || remainingRows.length);

  return (
    <AppScreen
      safeAreaEdges={["top"]}
      backgroundColor={colors.background}
      scrollable
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
      contentContainerStyle={[styles.content, { paddingBottom: 120 + Math.max(insets.bottom, spacing.md) }]}
    >
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Market unavailable</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void handleRefresh()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {featuredRow ? <FeaturedPartnersSection row={featuredRow} onPressCompany={openCompanyCatalog} /> : null}
      {establishedRow ? <EstablishedMembersSection row={establishedRow} onPressCompany={openCompanyCatalog} /> : null}
      {categoryRow?.row_type === "category_collection" ? <ProductCategoriesSection row={categoryRow} onPressCategory={openCategoryResults} /> : null}
      {arrivalsRow?.row_type === "product_collection" ? <NewArrivalsSection row={arrivalsRow} onPressProduct={openProductDetail} onPressViewAll={() => navigation.navigate("ProductSearch")} /> : null}
      {directoryRow ? <GeneralDirectorySection row={directoryRow} onPressCompany={openCompanyCatalog} /> : null}

      {remainingRows.map((row) => (
        <FallbackSection
          key={`${row.row_type}-${row.id}`}
          row={row}
          onPressCompany={openCompanyCatalog}
          onPressCategory={openCategoryResults}
          onPressProduct={openProductDetail}
        />
      ))}

      {!error && !hasVisibleContent ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing is live in the market yet.</Text>
          <Text style={styles.emptyDetail}>Once market content is live, featured members, categories, and product listings will appear here automatically.</Text>
        </View>
      ) : null}
    </AppScreen>
  );
}

function SectionHeader({
  title,
  eyebrow = false,
  actionLabel,
  onPressAction,
}: {
  title: string;
  eyebrow?: boolean;
  actionLabel?: string;
  onPressAction?: () => void;
}) {
  if (eyebrow) {
    return <Text style={styles.eyebrowSectionTitle}>{title}</Text>;
  }

  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onPressAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FeaturedPartnersSection({ row, onPressCompany }: { row: MarketRow; onPressCompany: CompanyPressHandler }) {
  const listRef = useRef<FlatList<MarketCompanyCard> | null>(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const cardWidth = Math.max(width - spacing.lg * 2, 280);

  useEffect(() => {
    setActiveIndex(0);
  }, [row.items.length]);

  useEffect(() => {
    if (row.row_type !== "company_tier" || row.items.length < 2 || isUserInteracting) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % row.items.length;
        listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, FEATURED_AUTO_SCROLL_MS);

    return () => clearInterval(timer);
  }, [isUserInteracting, row.items.length, row.row_type]);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (row.row_type !== "company_tier" || !row.items.length) {
      return;
    }

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(Math.max(0, Math.min(nextIndex, row.items.length - 1)));
    setIsUserInteracting(false);
  }

  if (row.row_type !== "company_tier" || !row.items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Featured Partners" />
      <View style={styles.featuredShell}>
        <FlatList
          ref={listRef}
          data={row.items}
          keyExtractor={(company) => `${row.id}-${company.company_id}`}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={cardWidth}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroller}
          onScrollBeginDrag={() => setIsUserInteracting(true)}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
          renderItem={({ item }) => <HeroCompanyCard company={item} width={cardWidth} onPress={() => onPressCompany(item, row)} />}
        />
        {row.items.length > 1 ? (
          <View style={styles.featuredDots}>
            {row.items.map((company, index) => (
              <View key={`featured-dot-${company.company_id}`} style={[styles.featuredDot, index === activeIndex ? styles.featuredDotActive : null]} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ProductCategoriesSection({
  row,
  onPressCategory,
}: {
  row: Extract<MarketRow, { row_type: "category_collection" }>;
  onPressCategory: (category: MarketCategoryCard) => void;
}) {
  if (!row.items.length) {
    return null;
  }

  return (
    <View style={[styles.section, styles.categorySection]}>
      <SectionHeader title="Product Categories" eyebrow />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
        {row.items.map((category) => (
          <CategoryCard key={`${row.id}-${category.id}`} category={category} onPress={() => onPressCategory(category)} />
        ))}
      </ScrollView>
    </View>
  );
}

function EstablishedMembersSection({ row, onPressCompany }: { row: MarketRow; onPressCompany: CompanyPressHandler }) {
  if (row.row_type !== "company_tier" || !row.items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Established Members" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroller}>
        {row.items.map((company) => (
          <RailCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company, row)} />
        ))}
      </ScrollView>
    </View>
  );
}

function NewArrivalsSection({
  row,
  onPressProduct,
  onPressViewAll,
}: {
  row: Extract<MarketRow, { row_type: "product_collection" }>;
  onPressProduct: (product: MarketProductCard) => void;
  onPressViewAll: () => void;
}) {
  if (!row.items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="New Arrivals" actionLabel="View All" onPressAction={onPressViewAll} />
      <View style={styles.productGridWrap}>
        {row.items.map((product) => (
          <ProductCard key={`${row.id}-${product.id}`} product={product} onPress={() => onPressProduct(product)} />
        ))}
      </View>
    </View>
  );
}

function GeneralDirectorySection({ row, onPressCompany }: { row: MarketRow; onPressCompany: CompanyPressHandler }) {
  const navigation = useNavigation<any>();

  if (row.row_type !== "company_tier" || !row.items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="General Directory" actionLabel="View All" onPressAction={() => navigation.navigate("CompanyDirectory")} />
      <View style={styles.gridWrap}>
        {row.items.map((company) => (
          <GridCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company, row)} />
        ))}
      </View>
    </View>
  );
}

function FallbackSection({
  row,
  onPressCompany,
  onPressCategory,
  onPressProduct,
}: {
  row: MarketRow;
  onPressCompany: CompanyPressHandler;
  onPressCategory: (category: MarketCategoryCard) => void;
  onPressProduct: (product: MarketProductCard) => void;
}) {
  if (!row.items.length) {
    return null;
  }

  if (row.row_type === "category_collection") {
    return (
      <View style={[styles.section, styles.categorySection]}>
        <SectionHeader title={row.title} eyebrow />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
          {row.items.map((category) => (
            <CategoryCard key={`${row.id}-${category.id}`} category={category} onPress={() => onPressCategory(category)} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (row.row_type === "product_collection") {
    return (
      <View style={styles.section}>
        <SectionHeader title={row.title} />
        <View style={styles.productGridWrap}>
          {row.items.map((product) => (
            <ProductCard key={`${row.id}-${product.id}`} product={product} onPress={() => onPressProduct(product)} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={row.title} />
      {row.layout === "grid_company" ? (
        <View style={styles.gridWrap}>
          {row.items.map((company) => (
            <GridCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company, row)} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroller}>
          {row.items.map((company) =>
            row.layout === "hero_company" ? (
              <HeroCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company, row)} />
            ) : (
              <RailCompanyCard key={`${row.id}-${company.company_id}`} company={company} onPress={() => onPressCompany(company, row)} />
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
}

function CategoryCard({ category, onPress }: { category: MarketCategoryCard; onPress: () => void }) {
  return (
    <Pressable style={styles.categoryCard} onPress={onPress}>
      <View style={styles.categoryIconBadge}>
        <Text style={styles.categoryIconText}>{getBadgeLabel(category.icon_key || category.name)}</Text>
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}

function ProductCard({ product, onPress }: { product: MarketProductCard; onPress: () => void }) {
  return (
    <Pressable style={styles.productCard} onPress={onPress}>
      <View style={styles.productMedia}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.productMediaImage} />
        ) : (
          <View style={styles.productMediaFallback}>
            <Text style={styles.productMediaFallbackText}>{getInitials(product.title)}</Text>
          </View>
        )}
      </View>
      <View style={styles.productCopy}>
        <Text style={styles.productAccent} numberOfLines={1}>
          {product.purity}
        </Text>
        <Text style={styles.productName} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={styles.productMeta} numberOfLines={1}>
          {[product.company_name, product.weight_grams ? `${product.weight_grams}g` : null].filter(Boolean).join(" • ")}
        </Text>
      </View>
    </Pressable>
  );
}

function HeroCompanyCard({ company, width, onPress }: { company: MarketCompanyCard; width?: number; onPress: () => void }) {
  const locationLabel = getLocationLabel(company.city, company.state);

  return (
    <Pressable style={[styles.heroCard, width ? { width } : null]} onPress={onPress}>
      <ImageBackground source={company.hero_image_url ? { uri: company.hero_image_url } : undefined} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Premium Member</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroName}>{company.name}</Text>
            <Text style={styles.heroMeta}>{locationLabel}</Text>
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
        {company.hero_image_url ? (
          <Image source={{ uri: company.hero_image_url }} style={styles.railMediaImage} />
        ) : (
          <View style={styles.railMediaFallback}>
            <Text style={styles.railMediaFallbackText}>{getInitials(company.name)}</Text>
          </View>
        )}
      </View>
      <View style={styles.railCopy}>
        <Text style={styles.railName} numberOfLines={1}>
          {company.name}
        </Text>
        <Text style={styles.railMeta} numberOfLines={1}>
          {getLocationLabel(company.city, company.state)}
        </Text>
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
      <Text style={styles.gridName} numberOfLines={1}>
        {company.name}
      </Text>
      <Text style={styles.gridMeta} numberOfLines={1}>
        {getLocationLabel(company.city, company.state)}
      </Text>
      <View style={[styles.verifiedBadge, !company.is_verified ? styles.memberBadge : null]}>
        <Text style={[styles.verifiedBadgeText, !company.is_verified ? styles.memberBadgeText : null]}>{company.is_verified ? "Verified" : "Member"}</Text>
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

function getBadgeLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getLocationLabel(city?: string | null, state?: string | null) {
  const parts = [city, state].filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unavailable";
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: {
    color: "#000000",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    flex: 1,
  },
  eyebrowSectionTitle: {
    paddingHorizontal: spacing.lg,
    color: SECTION_MUTED,
    ...typography.eyebrow,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 1,
  },
  sectionAction: {
    color: SECTION_GOLD,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  featuredShell: {
    gap: spacing.sm,
  },
  featuredScroller: {
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.lg * 2,
  },
  featuredDots: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.lg,
  },
  featuredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(119,90,25,0.22)",
  },
  featuredDotActive: {
    width: 18,
    backgroundColor: SECTION_GOLD,
  },
  rowScroller: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.lg * 2,
  },
  categorySection: {
    gap: 6,
  },
  categoryScroller: {
    gap: 12,
    paddingHorizontal: 20,
    paddingRight: spacing.lg,
  },
  categoryCard: {
    width: 55,
    alignItems: "center",
    gap: 5,
  },
  categoryIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SECTION_CIRCLE,
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: {
    color: SECTION_GOLD,
    fontSize: 14,
    fontWeight: "700",
  },
  categoryName: {
    color: "#000000",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textAlign: "center",
    minHeight: 30,
  },
  heroCard: {
    width: 320,
    marginRight: spacing.md,
  },
  heroImage: {
    minHeight: 248,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroImageStyle: {
    borderRadius: radii.md,
    backgroundColor: SECTION_CIRCLE,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroContent: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: SECTION_GOLD,
    borderRadius: radii.sm,
  },
  heroBadgeText: {
    color: colors.surface,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 1,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  heroCopy: {
    gap: 2,
  },
  heroName: {
    color: colors.surface,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  heroMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  railCard: {
    width: 188,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  railMedia: {
    height: 108,
    backgroundColor: SECTION_CIRCLE,
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
    color: SECTION_MUTED,
    fontSize: 22,
    fontWeight: "600",
  },
  railCopy: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  railName: {
    color: "#000000",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  railMeta: {
    color: SECTION_MUTED,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  productGridWrap: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: spacing.md,
  },
  productCard: {
    width: "46%",
    gap: spacing.sm,
  },
  productMedia: {
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: "#F5F3F3",
    borderWidth: 1,
    borderColor: "rgba(207,196,197,0.3)",
  },
  productMediaImage: {
    width: "100%",
    height: "100%",
  },
  productMediaFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  productMediaFallbackText: {
    color: SECTION_MUTED,
    fontSize: 24,
    fontWeight: "700",
  },
  productCopy: {
    gap: 2,
  },
  productAccent: {
    color: SECTION_GOLD,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 1,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  productName: {
    color: "#000000",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  productMeta: {
    color: SECTION_MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  gridWrap: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: spacing.md,
  },
  gridCard: {
    width: "46%",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(207,196,197,0.2)",
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gridLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SECTION_CIRCLE,
    marginBottom: spacing.xs,
  },
  gridLogo: {
    width: "100%",
    height: "100%",
  },
  gridLogoFallback: {
    color: SECTION_MUTED,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "500",
  },
  gridName: {
    color: "#000000",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    width: "100%",
    textAlign: "center",
  },
  gridMeta: {
    color: SECTION_MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  verifiedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(254,212,136,0.2)",
  },
  verifiedBadgeText: {
    color: SECTION_GOLD,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  memberBadge: {
    backgroundColor: "#F2F2F2",
  },
  memberBadgeText: {
    color: SECTION_MUTED,
  },
  errorCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
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
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
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
  categorySkeletonItem: {
    width: 55,
    alignItems: "center",
    gap: 5,
  },
  railSkeletonCard: {
    width: 188,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  railSkeletonCopy: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: spacing.xs,
  },
  productSkeletonCard: {
    width: "46%",
    gap: spacing.sm,
  },
  productSkeletonCopy: {
    gap: spacing.xs,
  },
  directorySkeletonCard: {
    width: "46%",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});

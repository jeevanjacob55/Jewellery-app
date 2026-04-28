import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMarketFeed, getMarketFilterConfig, searchMarketProducts } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { colors, radii, spacing } from "../../theme/tokens";
import {
  MarketCategory,
  MarketCompanyCard,
  MarketFeedData,
  MarketFeaturedCompany,
  MarketProductCard,
  ProductFilterAttributeDefinition,
  ProductFilterCategory,
  ProductFilterConfigResponse,
  ProductSearchResult,
} from "../../types/api";

type MarketMode = "home" | "results" | "empty";
type SortOption = "popularity" | "newest" | "price_low_to_high" | "price_high_to_low";

type ActiveSearchState = {
  searchQuery: string;
  category: string | null;
  subcategory: string | null;
  purity: string | null;
  attributes: Record<string, string>;
  sort: SortOption;
};

type SelectedFilterChip = {
  key: string;
  label: string;
  kind: "search" | "category" | "subcategory" | "purity" | "attribute";
  attributeKey?: string;
};

type FilterDraftState = {
  category: string | null;
  subcategory: string | null;
  purity: string | null;
  attributes: Record<string, string>;
};

const BACKGROUND = "#FCF8F8";
const SURFACE_ALT = "#F5F5F5";
const CARD_BORDER = "#F1EDEC";
const SECTION_MUTED = "#5D5F5F";
const ICON_MUTED = "#A1A1AA";
const SORT_OPTIONS: Array<{ key: SortOption; label: string }> = [
  { key: "popularity", label: "POPULARITY" },
  { key: "newest", label: "NEWEST" },
  { key: "price_low_to_high", label: "PRICE: LOW TO HIGH" },
  { key: "price_high_to_low", label: "PRICE: HIGH TO LOW" },
];
const RECOMMENDED_SEARCHES = ["Gold Chain", "Investment Grade Bullion", "Temple Necklace"];

export function MarketTiersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [mode, setMode] = useState<MarketMode>("home");
  const [marketFeed, setMarketFeed] = useState<MarketFeedData | null>(null);
  const [filterConfig, setFilterConfig] = useState<ProductFilterConfigResponse | null>(null);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedPurity, setSelectedPurity] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortOption>("popularity");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const featuredCardWidth = Math.min(width * 0.85, 360);
  const productCardWidth = Math.max((width - spacing.lg * 2 - spacing.md) / 2, 150);

  const establishedPages = useMemo(() => groupIntoChunks(marketFeed?.pro_companies ?? [], 6), [marketFeed?.pro_companies]);
  const selectedFilterChips = useMemo<SelectedFilterChip[]>(() => {
    const chips: SelectedFilterChip[] = [];

    if (searchQuery.trim()) {
      chips.push({ key: "search", label: searchQuery.trim(), kind: "search" });
    }

    if (selectedCategory && filterConfig) {
      const category = filterConfig.categories.find((item) => item.slug === selectedCategory);
      if (category) {
        chips.push({ key: "category", label: category.name, kind: "category" });
        if (selectedSubcategory) {
          const subcategory = category.subcategories.find((item) => item.slug === selectedSubcategory);
          if (subcategory) {
            chips.push({ key: "subcategory", label: subcategory.name, kind: "subcategory" });
          }
        }
        for (const attribute of category.attributes) {
          const value = selectedAttributes[attribute.key];
          if (value) {
            chips.push({
              key: `attribute-${attribute.key}`,
              label: value,
              kind: "attribute",
              attributeKey: attribute.key,
            });
          }
        }
      }
    }

    if (selectedPurity) {
      chips.push({ key: "purity", label: selectedPurity, kind: "purity" });
    }

    return chips;
  }, [filterConfig, searchQuery, selectedAttributes, selectedCategory, selectedPurity, selectedSubcategory]);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [nextMarketFeed, nextFilterConfig] = await Promise.all([getMarketFeed(), getMarketFilterConfig()]);
        if (!active) {
          return;
        }
        setMarketFeed(nextMarketFeed);
        setFilterConfig(nextFilterConfig);
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

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  function buildSearchState(overrides: Partial<ActiveSearchState> = {}): ActiveSearchState {
    const baseState: ActiveSearchState = {
      searchQuery,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      purity: selectedPurity,
      attributes: selectedAttributes,
      sort,
    };

    return {
      ...baseState,
      ...overrides,
      attributes: overrides.attributes ?? selectedAttributes,
    };
  }

  function hasActiveCriteria(state: ActiveSearchState) {
    return Boolean(
      state.searchQuery.trim() ||
        state.category ||
        state.subcategory ||
        state.purity ||
        Object.values(state.attributes).some((value) => value.trim()),
    );
  }

  async function executeSearch(nextState: ActiveSearchState) {
    setSearchQuery(nextState.searchQuery);
    setSelectedCategory(nextState.category);
    setSelectedSubcategory(nextState.subcategory);
    setSelectedPurity(nextState.purity);
    setSelectedAttributes(nextState.attributes);
    setSort(nextState.sort);

    if (!hasActiveCriteria(nextState)) {
      setMode("home");
      setProducts([]);
      setResultCount(0);
      setError(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchMarketProducts({
        search: nextState.searchQuery || undefined,
        category: nextState.category ?? undefined,
        subcategory: nextState.subcategory ?? undefined,
        purity: nextState.purity ?? undefined,
        sort: nextState.sort,
        attributes: nextState.attributes,
      });
      setProducts(response.results);
      setResultCount(response.count);
      setMode(response.count > 0 ? "results" : "empty");
      setSort(response.sort as SortOption);
      setError(null);
    } catch {
      setError("Unable to load matching products right now.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      if (mode === "home") {
        const [nextMarketFeed, nextFilterConfig] = await Promise.all([getMarketFeed(), getMarketFilterConfig()]);
        setMarketFeed(nextMarketFeed);
        setFilterConfig(nextFilterConfig);
        setError(null);
      } else {
        await executeSearch(buildSearchState());
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleSearchSubmit(nextQuery?: string) {
    const query = (nextQuery ?? searchInput).trim();
    setSearchInput(query);
    void executeSearch(buildSearchState({ searchQuery: query }));
  }

  function handleCategoryPress(category: MarketCategory) {
    void executeSearch(
      buildSearchState({
        searchQuery: searchInput.trim(),
        category: category.slug,
        subcategory: null,
        attributes: {},
      }),
    );
  }

  function handleClearAll() {
    setSearchInput("");
    void executeSearch({
      searchQuery: "",
      category: null,
      subcategory: null,
      purity: null,
      attributes: {},
      sort: "popularity",
    });
  }

  function handleRemoveChip(chip: SelectedFilterChip) {
    if (chip.kind === "search") {
      setSearchInput("");
      void executeSearch(buildSearchState({ searchQuery: "" }));
      return;
    }

    if (chip.kind === "category") {
      void executeSearch(buildSearchState({ category: null, subcategory: null, attributes: {} }));
      return;
    }

    if (chip.kind === "subcategory") {
      void executeSearch(buildSearchState({ subcategory: null }));
      return;
    }

    if (chip.kind === "purity") {
      void executeSearch(buildSearchState({ purity: null }));
      return;
    }

    if (chip.kind === "attribute" && chip.attributeKey) {
      const nextAttributes = { ...selectedAttributes };
      delete nextAttributes[chip.attributeKey];
      void executeSearch(buildSearchState({ attributes: nextAttributes }));
    }
  }

  function handleRecommendedSearch(term: string) {
    setSearchInput(term);
    void executeSearch({
      searchQuery: term,
      category: null,
      subcategory: null,
      purity: null,
      attributes: {},
      sort: "popularity",
    });
  }

  function handleSortPress() {
    const currentIndex = SORT_OPTIONS.findIndex((option) => option.key === sort);
    const nextSort = SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length].key;
    void executeSearch(buildSearchState({ sort: nextSort }));
  }

  function handleFeaturedExplore(companyName: string) {
    setSearchInput(companyName);
    void executeSearch({
      searchQuery: companyName,
      category: null,
      subcategory: null,
      purity: null,
      attributes: {},
      sort: "popularity",
    });
  }

  function handleFilterApply(draft: FilterDraftState) {
    void executeSearch(
      buildSearchState({
        searchQuery: searchInput.trim(),
        category: draft.category,
        subcategory: draft.subcategory,
        purity: draft.purity,
        attributes: draft.attributes,
      }),
    );
    setIsFilterOpen(false);
  }

  if (isLoading && (!marketFeed || !filterConfig)) {
    return <ScreenState title="Loading market" detail="Preparing showcase companies, categories, and product filters." loading />;
  }

  if (!marketFeed || !filterConfig) {
    return <ScreenState title="Market unavailable" detail={error ?? "Try again in a moment."} />;
  }

  return (
    <AppScreen safeAreaEdges={["top"]} backgroundColor={BACKGROUND}>
      <View style={styles.screen}>
        <View style={styles.searchHeader}>
          <View style={styles.searchRow}>
            <View style={styles.searchShell}>
              <MaterialIcons name="search" size={20} color={ICON_MUTED} style={styles.searchIcon} />
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search products or companies..."
                placeholderTextColor={ICON_MUTED}
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchSubmit()}
              />
            </View>
            <Pressable style={styles.filterButton} onPress={() => setIsFilterOpen(true)}>
              <MaterialIcons name="tune" size={20} color={colors.surface} />
            </Pressable>
          </View>

          {mode !== "home" && selectedFilterChips.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {selectedFilterChips.map((chip) => (
                <SelectedChipPill key={chip.key} chip={chip} onRemove={() => handleRemoveChip(chip)} />
              ))}
              <Pressable style={styles.clearInlineChip} onPress={handleClearAll}>
                <Text style={styles.clearInlineChipText}>Clear All</Text>
              </Pressable>
            </ScrollView>
          ) : null}

          {mode !== "home" && error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 96 }]}
        >
          {mode === "home" ? (
            <HomeSections
              marketFeed={marketFeed}
              featuredCardWidth={featuredCardWidth}
              establishedPages={establishedPages}
              productCardWidth={productCardWidth}
              onFeaturedPress={(company) => navigation.navigate("CompanyProfile", { companyId: company.company_id, companyName: company.name })}
              onFeaturedExplore={(company) => handleFeaturedExplore(company.name)}
              onCompanyPress={(company) => navigation.navigate("CompanyProfile", { companyId: company.company_id, companyName: company.name })}
              onCategoryPress={handleCategoryPress}
              onLatestProductPress={(product) => {
                setSearchInput(product.name);
                void executeSearch({
                  searchQuery: product.name,
                  category: product.category_slug,
                  subcategory: null,
                  purity: null,
                  attributes: {},
                  sort: "popularity",
                });
              }}
            />
          ) : null}

          {mode !== "home" ? (
            <View style={styles.resultsContent}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{`${resultCount} ${resultCount === 1 ? "Result" : "Results"}`}</Text>
                <Pressable style={styles.sortButton} onPress={handleSortPress}>
                  <Text style={styles.sortLabel}>{`SORT BY: ${SORT_OPTIONS.find((option) => option.key === sort)?.label ?? "POPULARITY"}`}</Text>
                  <MaterialIcons name="expand-more" size={14} color={SECTION_MUTED} />
                </Pressable>
              </View>

              {isSearching ? (
                <View style={styles.resultsLoader}>
                  <ActivityIndicator color={colors.text} />
                </View>
              ) : null}

              {mode === "results" ? (
                <View style={styles.resultsGrid}>
                  {products.map((product) => (
                    <MarketResultProductCard
                      key={product.id}
                      item={product}
                      width={productCardWidth}
                      onPress={() => navigation.navigate("ProductSearch", { companyId: product.company_id, productId: product.id })}
                    />
                  ))}
                </View>
              ) : (
                <MarketEmptyState
                  query={searchQuery}
                  onClearFilters={handleClearAll}
                  onRecommendedSearch={handleRecommendedSearch}
                />
              )}
            </View>
          ) : null}
        </ScrollView>

        <MarketFilterBottomSheet
          visible={isFilterOpen}
          categories={filterConfig.categories}
          purityOptions={filterConfig.purity_options}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          selectedPurity={selectedPurity}
          selectedAttributes={selectedAttributes}
          applyLabelCount={mode === "home" ? undefined : resultCount}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleFilterApply}
        />
      </View>
    </AppScreen>
  );
}

function HomeSections({
  marketFeed,
  featuredCardWidth,
  establishedPages,
  productCardWidth,
  onFeaturedPress,
  onFeaturedExplore,
  onCompanyPress,
  onCategoryPress,
  onLatestProductPress,
}: {
  marketFeed: MarketFeedData;
  featuredCardWidth: number;
  establishedPages: MarketCompanyCard[][];
  productCardWidth: number;
  onFeaturedPress: (company: MarketFeaturedCompany) => void;
  onFeaturedExplore: (company: MarketFeaturedCompany) => void;
  onCompanyPress: (company: MarketCompanyCard) => void;
  onCategoryPress: (category: MarketCategory) => void;
  onLatestProductPress: (product: MarketProductCard) => void;
}) {
  return (
    <>
      <HomeSectionLabel label="Featured Partners" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
        {marketFeed.featured_companies.map((company) => (
          <FeaturedPartnerCard
            key={company.company_id}
            item={company}
            width={featuredCardWidth}
            onPress={() => onFeaturedPress(company)}
            onExplore={() => onFeaturedExplore(company)}
          />
        ))}
      </ScrollView>

      <HomeSectionLabel label="Established Members" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.establishedScroller}>
        {establishedPages.map((page, pageIndex) => (
          <EstablishedPage key={`established-${pageIndex}`} companies={page} onPress={onCompanyPress} />
        ))}
      </ScrollView>

      <HomeSectionLabel label="Directory" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.directoryScroller}>
        {marketFeed.normal_companies.map((company) => (
          <DirectoryCompanyCard key={company.company_id} item={company} onPress={() => onCompanyPress(company)} />
        ))}
      </ScrollView>

      <HomeSectionLabel label="Categories" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
        {marketFeed.categories.map((category) => (
          <CategoryIconCard key={category.id} item={category} onPress={() => onCategoryPress(category)} />
        ))}
      </ScrollView>

      <HomeSectionLabel label="Latest Products" />
      <View style={styles.homeProductGrid}>
        {marketFeed.latest_products.map((product) => (
          <PreviewProductCard
            key={product.product_id}
            item={product}
            width={productCardWidth}
            onPress={() => onLatestProductPress(product)}
          />
        ))}
      </View>
    </>
  );
}

function HomeSectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
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
  const content = (
    <View style={styles.featuredOverlay}>
      <View style={styles.featuredBrandRow}>
        <View style={styles.featuredLogoWrap}>
          {item.logo_image_url ? <Image source={{ uri: item.logo_image_url }} style={styles.featuredLogo} /> : <Text style={styles.logoFallback}>{getInitials(item.name)}</Text>}
        </View>
        <Text style={styles.featuredTitle}>{item.name}</Text>
      </View>
      <Pressable
        style={styles.featuredButton}
        onPress={(event) => {
          event.stopPropagation();
          onExplore();
        }}
      >
        <Text style={styles.featuredButtonText}>Explore</Text>
      </Pressable>
    </View>
  );

  return (
    <Pressable style={[styles.featuredCard, { width }]} onPress={onPress}>
      {item.hero_image_url ? (
        <ImageBackground source={{ uri: item.hero_image_url }} style={styles.featuredImage} imageStyle={styles.featuredImageRadius}>
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.featuredImage, styles.featuredFallback]}>{content}</View>
      )}
    </Pressable>
  );
}

function EstablishedPage({
  companies,
  onPress,
}: {
  companies: MarketCompanyCard[];
  onPress: (company: MarketCompanyCard) => void;
}) {
  const rows = groupIntoChunks(companies, 3);

  return (
    <View style={styles.establishedPage}>
      {rows.map((row, index) => (
        <View key={`row-${index}`} style={styles.establishedRow}>
          {row.map((company) => (
            <EstablishedCompanyCard key={company.company_id} item={company} onPress={() => onPress(company)} />
          ))}
        </View>
      ))}
    </View>
  );
}

function EstablishedCompanyCard({ item, onPress }: { item: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.establishedCard} onPress={onPress}>
      {item.hero_image_url ? <Image source={{ uri: item.hero_image_url }} style={styles.establishedCardImage} /> : <View style={styles.establishedCardImage} />}
      <View style={styles.establishedCardFooter}>
        <Text style={styles.establishedCardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        {item.is_verified ? <MaterialIcons name="verified" size={14} color={colors.accentGold} /> : null}
      </View>
    </Pressable>
  );
}

function DirectoryCompanyCard({ item, onPress }: { item: MarketCompanyCard; onPress: () => void }) {
  return (
    <Pressable style={styles.directoryCard} onPress={onPress}>
      <View style={styles.directoryLogoWrap}>
        {item.logo_image_url ? <Image source={{ uri: item.logo_image_url }} style={styles.directoryLogo} /> : <Text style={styles.directoryFallback}>{getInitials(item.name)}</Text>}
      </View>
      <Text style={styles.directoryName} numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
}

function CategoryIconCard({ item, onPress }: { item: MarketCategory; onPress: () => void }) {
  return (
    <Pressable style={styles.categoryCard} onPress={onPress}>
      <View style={styles.categoryIconWrap}>{renderCategoryIcon(item.icon_key)}</View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </Pressable>
  );
}

function PreviewProductCard({ item, width, onPress }: { item: MarketProductCard; width: number; onPress: () => void }) {
  return (
    <Pressable style={[styles.previewCard, { width }]} onPress={onPress}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.previewImage} /> : <View style={styles.previewImage} />}
      <View style={styles.previewBody}>
        <Text style={styles.previewMeta}>{`${item.purity} | ${item.weight_grams}g`}</Text>
        <Text style={styles.previewTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.previewCompany} numberOfLines={1}>
          {item.company_name}
        </Text>
      </View>
    </Pressable>
  );
}

function MarketResultProductCard({
  item,
  width,
  onPress,
}: {
  item: ProductSearchResult;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.resultCard, { width }]} onPress={onPress}>
      <View style={styles.resultImageWrap}>
        {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.resultImage} /> : <View style={styles.resultImage} />}
        <View style={styles.purityBadge}>
          <Text style={styles.purityBadgeText}>{item.purity}</Text>
        </View>
      </View>

      <View style={styles.resultBody}>
        <Text style={styles.resultCompany} numberOfLines={1}>
          {item.company_name.toUpperCase()}
        </Text>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.resultMetaRow}>
          <Text style={styles.resultMetaText}>{buildProductMeta(item)}</Text>
          <MaterialIcons name="bookmark-border" size={18} color="#C7C7C7" />
        </View>

        {item.price ? (
          <View style={styles.resultPriceRow}>
            <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
            <Pressable style={styles.plusButton}>
              <MaterialIcons name="add" size={16} color={colors.text} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function MarketEmptyState({
  query,
  onClearFilters,
  onRecommendedSearch,
}: {
  query: string;
  onClearFilters: () => void;
  onRecommendedSearch: (term: string) => void;
}) {
  const detail = query.trim()
    ? `Your current search for "${query}" returned no results in the market directory. Try clearing filters or searching for something else.`
    : "Your current filters returned no results in the market directory. Try clearing filters or searching for something else.";

  return (
    <View style={styles.emptyShell}>
      <View style={styles.emptyIllustrationWrap}>
        <View style={styles.emptyGlow} />
        <View style={styles.emptyBackCard}>
          <View style={styles.emptyBackLineWide} />
          <View style={styles.emptyBackBox} />
          <View style={styles.emptyBackLineNarrow} />
        </View>
        <View style={styles.emptyFrontCard}>
          <MaterialIcons name="inventory" size={56} color="#D9D3D1" />
          <MaterialIcons name="search-off" size={30} color={colors.accentGold} style={styles.emptyFrontIcon} />
        </View>
      </View>

      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptyBody}>{detail}</Text>

      <Pressable style={styles.emptyPrimaryButton} onPress={onClearFilters}>
        <Text style={styles.emptyPrimaryButtonText}>Clear Filters</Text>
      </Pressable>

      <View style={styles.recommendedBlock}>
        <Text style={styles.recommendedLabel}>Recommended Searches</Text>
        <View style={styles.recommendedChipWrap}>
          {RECOMMENDED_SEARCHES.map((term) => (
            <Pressable key={term} style={styles.recommendedChip} onPress={() => onRecommendedSearch(term)}>
              <Text style={styles.recommendedChipText}>{term}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function MarketFilterBottomSheet({
  visible,
  categories,
  purityOptions,
  selectedCategory,
  selectedSubcategory,
  selectedPurity,
  selectedAttributes,
  applyLabelCount,
  onClose,
  onApply,
}: {
  visible: boolean;
  categories: ProductFilterCategory[];
  purityOptions: string[];
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  selectedPurity: string | null;
  selectedAttributes: Record<string, string>;
  applyLabelCount?: number;
  onClose: () => void;
  onApply: (draft: FilterDraftState) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draftCategory, setDraftCategory] = useState<string | null>(selectedCategory);
  const [draftSubcategory, setDraftSubcategory] = useState<string | null>(selectedSubcategory);
  const [draftPurity, setDraftPurity] = useState<string | null>(selectedPurity);
  const [draftAttributes, setDraftAttributes] = useState<Record<string, string>>(selectedAttributes);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setDraftCategory(selectedCategory);
    setDraftSubcategory(selectedSubcategory);
    setDraftPurity(selectedPurity);
    setDraftAttributes(selectedAttributes);
  }, [selectedAttributes, selectedCategory, selectedPurity, selectedSubcategory, visible]);

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === draftCategory) ?? null,
    [categories, draftCategory],
  );
  const applyLabel = typeof applyLabelCount === "number" && applyLabelCount > 0 ? `Apply Filters (${applyLabelCount} Results)` : "Apply Filters";

  function handleCategorySelect(categorySlug: string) {
    setDraftCategory((current) => {
      const nextValue = current === categorySlug ? null : categorySlug;
      setDraftSubcategory(null);
      setDraftAttributes({});
      return nextValue;
    });
  }

  function handleSubcategorySelect(subcategorySlug: string) {
    setDraftSubcategory((current) => (current === subcategorySlug ? null : subcategorySlug));
  }

  function handleAttributeSelect(attributeKey: string, value: string) {
    setDraftAttributes((current) => ({
      ...current,
      [attributeKey]: current[attributeKey] === value ? "" : value,
    }));
  }

  function handleClearAll() {
    setDraftCategory(null);
    setDraftSubcategory(null);
    setDraftPurity(null);
    setDraftAttributes({});
  }

  return (
    <Modal animationType="slide" transparent statusBarTranslucent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Refine Search</Text>
            <Pressable style={styles.modalCloseButton} onPress={onClose}>
              <MaterialIcons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: 132 + Math.max(insets.bottom, 12) }]} showsVerticalScrollIndicator={false}>
            <FilterSectionLabel label="Category" />
            <View style={styles.filterChipWrap}>
              {categories.map((category) => (
                <SelectableChip
                  key={category.id}
                  label={category.name}
                  selected={draftCategory === category.slug}
                  onPress={() => handleCategorySelect(category.slug)}
                />
              ))}
            </View>

            {activeCategory?.subcategories.length ? (
              <>
                <FilterSectionLabel label="Subcategory" />
                <View style={styles.filterChipWrap}>
                  {activeCategory.subcategories.map((subcategory) => (
                    <SelectableChip
                      key={subcategory.id}
                      label={subcategory.name}
                      selected={draftSubcategory === subcategory.slug}
                      onPress={() => handleSubcategorySelect(subcategory.slug)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <FilterSectionLabel label="Metal Purity" />
            <View style={styles.purityGrid}>
              {purityOptions.map((purity) => (
                <Pressable
                  key={purity}
                  style={[styles.purityCard, draftPurity === purity && styles.purityCardSelected]}
                  onPress={() => setDraftPurity((current) => (current === purity ? null : purity))}
                >
                  {draftPurity === purity ? <Text style={styles.purityFocusTag}>GOLD FOCUS</Text> : null}
                  <Text style={[styles.purityCardTitle, draftPurity === purity && styles.purityCardTitleSelected]}>{purity}</Text>
                  <Text style={[styles.purityCardSubtitle, draftPurity === purity && styles.purityCardSubtitleSelected]}>{getPuritySubtitle(purity)}</Text>
                </Pressable>
              ))}
            </View>

            {activeCategory?.attributes.map((attribute) => (
              <View key={attribute.id} style={styles.attributeSection}>
                {attribute.type === "range" ? (
                  <RangeAttributeControl
                    attribute={attribute}
                    value={draftAttributes[attribute.key] ?? ""}
                    onSelect={(value) => handleAttributeSelect(attribute.key, value)}
                  />
                ) : (
                  <>
                    <FilterSectionLabel label={attribute.label} />
                    <View style={styles.filterChipWrap}>
                      {normalizeAttributeOptions(attribute).map((option) => (
                        <SelectableChip
                          key={`${attribute.key}-${option.value}`}
                          label={option.label}
                          selected={draftAttributes[attribute.key] === option.value}
                          onPress={() => handleAttributeSelect(attribute.key, option.value)}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <Pressable style={styles.modalSecondaryButton} onPress={handleClearAll}>
              <Text style={styles.modalSecondaryButtonText}>Clear All</Text>
            </Pressable>
            <Pressable
              style={styles.modalPrimaryButton}
              onPress={() =>
                onApply({
                  category: draftCategory,
                  subcategory: draftSubcategory,
                  purity: draftPurity,
                  attributes: trimEmptyAttributes(draftAttributes),
                })
              }
            >
              <Text style={styles.modalPrimaryButtonText}>{applyLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RangeAttributeControl({
  attribute,
  value,
  onSelect,
}: {
  attribute: ProductFilterAttributeDefinition;
  value: string;
  onSelect: (value: string) => void;
}) {
  const options = normalizeAttributeOptions(attribute);
  const selectedValue = value || options[0]?.value || "";

  return (
    <>
      <View style={styles.rangeHeader}>
        <Text style={styles.filterSectionLabel}>{attribute.label.toUpperCase()}</Text>
        <Text style={styles.rangeValue}>{selectedValue.toUpperCase()}</Text>
      </View>

      <View style={styles.rangeTrackWrap}>
        <View style={styles.rangeTrack} />
        <View style={styles.rangeOptionsRow}>
          {options.map((option, index) => {
            const selected = selectedValue === option.value;

            return (
              <Pressable key={option.value} style={styles.rangeStopItem} onPress={() => onSelect(option.value)}>
                <View style={[styles.rangeTick, selected && styles.rangeTickSelected, index === 0 && styles.rangeTickFirst, index === options.length - 1 && styles.rangeTickLast]} />
                <Text style={[styles.rangeStopLabel, selected && styles.rangeStopLabelSelected]}>{option.label.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

function FilterSectionLabel({ label }: { label: string }) {
  return <Text style={styles.filterSectionLabel}>{label.toUpperCase()}</Text>;
}

function SelectableChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.optionChip, selected && styles.optionChipSelected]} onPress={onPress}>
      <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SelectedChipPill({ chip, onRemove }: { chip: SelectedFilterChip; onRemove: () => void }) {
  return (
    <View style={[styles.selectedChip, chip.kind === "category" && styles.selectedChipGold]}>
      <Text style={styles.selectedChipText}>{chip.label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <MaterialIcons name="close" size={14} color={colors.surface} />
      </Pressable>
    </View>
  );
}

function renderCategoryIcon(iconKey: string) {
  switch (iconKey) {
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

function normalizeAttributeOptions(attribute: ProductFilterAttributeDefinition) {
  return attribute.options
    .map((option) => {
      if (typeof option === "string") {
        return { label: option, value: option };
      }
      const value = String(option.value ?? option.label ?? "");
      const label = String(option.label ?? option.value ?? "");
      return { label, value };
    })
    .filter((option) => option.value);
}

function trimEmptyAttributes(attributes: Record<string, string>) {
  return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value.trim()));
}

function groupIntoChunks<T>(items: T[], chunkSize: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    groups.push(items.slice(index, index + chunkSize));
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

function buildProductMeta(item: ProductSearchResult) {
  const parts = [`${item.weight_grams}g`];
  if (item.attribute_value) {
    parts.push(item.attribute_value);
  }
  return parts.join(" | ");
}

function getPuritySubtitle(purity: string) {
  switch (purity) {
    case "18K":
      return "75.0% GOLD";
    case "22K":
      return "91.6% GOLD";
    case "24K":
      return "99.9% GOLD";
    case "999.9":
      return "PURE GOLD";
    default:
      return "METAL GRADE";
  }
}

function formatPrice(value: string) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return value;
  }
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  searchHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  searchShell: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#DCDDDD",
    justifyContent: "center",
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  searchInput: {
    height: "100%",
    paddingLeft: 44,
    paddingRight: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  selectedChipGold: {
    backgroundColor: colors.accentGold,
  },
  selectedChipText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  clearInlineChip: {
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    backgroundColor: colors.surface,
  },
  clearInlineChipText: {
    color: SECTION_MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  inlineError: {
    color: "#B91C1C",
    marginTop: spacing.sm,
    fontSize: 13,
  },
  scrollContent: {
    paddingTop: 32,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    color: SECTION_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  featuredList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
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
  featuredFallback: {
    backgroundColor: "#2F2B28",
  },
  featuredOverlay: {
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.36)",
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
  establishedScroller: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  establishedPage: {
    gap: spacing.md,
  },
  establishedRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  establishedCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  establishedCardImage: {
    width: "100%",
    height: 80,
    backgroundColor: "#E5E7EB",
  },
  establishedCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  establishedCardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: "500",
  },
  directoryScroller: {
    paddingHorizontal: spacing.lg,
    gap: 12,
    marginBottom: spacing.xl,
  },
  directoryCard: {
    width: 118,
    height: 122,
    backgroundColor: SURFACE_ALT,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  directoryLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  directoryLogo: {
    width: "100%",
    height: "100%",
  },
  directoryFallback: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  directoryName: {
    color: "#18181B",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
    textTransform: "uppercase",
  },
  categoryScroller: {
    paddingHorizontal: spacing.lg,
    gap: 24,
    marginBottom: spacing.xl,
  },
  categoryCard: {
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
  homeProductGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  previewCard: {
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
  previewImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#E5E7EB",
  },
  previewBody: {
    padding: 12,
  },
  previewMeta: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  previewTitle: {
    color: "#18181B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 4,
  },
  previewCompany: {
    color: "#71717A",
    fontSize: 12,
  },
  resultsContent: {
    paddingHorizontal: spacing.lg,
  },
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  resultsCount: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sortLabel: {
    color: SECTION_MUTED,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.45,
  },
  resultsLoader: {
    paddingVertical: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  resultImageWrap: {
    aspectRatio: 1,
    backgroundColor: "#F7F5F4",
    position: "relative",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  purityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  purityBadgeText: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: "700",
  },
  resultBody: {
    padding: spacing.md,
  },
  resultCompany: {
    color: "#A8A29E",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  resultMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  resultMetaText: {
    flex: 1,
    color: SECTION_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  resultPriceRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F4",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultPrice: {
    color: colors.accentGold,
    fontSize: 18,
    fontWeight: "700",
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F4",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyShell: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  emptyIllustrationWrap: {
    width: 256,
    height: 256,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: colors.accentGold,
    opacity: 0.06,
  },
  emptyBackCard: {
    position: "absolute",
    width: 170,
    height: 210,
    borderRadius: 16,
    backgroundColor: SURFACE_ALT,
    borderWidth: 1,
    borderColor: "#F1F1F1",
    padding: spacing.md,
    opacity: 0.48,
    transform: [{ rotate: "-8deg" }, { translateX: -10 }, { translateY: -10 }],
  },
  emptyBackLineWide: {
    width: "68%",
    height: 14,
    borderRadius: 999,
    backgroundColor: "#E8E4E2",
    marginBottom: spacing.sm,
  },
  emptyBackBox: {
    width: "100%",
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#E8E4E2",
    marginBottom: spacing.sm,
  },
  emptyBackLineNarrow: {
    width: "52%",
    height: 14,
    borderRadius: 999,
    backgroundColor: "#E8E4E2",
  },
  emptyFrontCard: {
    width: 180,
    height: 220,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#F1F1F1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  emptyFrontIcon: {
    position: "absolute",
    top: 44,
    right: 44,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  emptyBody: {
    color: SECTION_MUTED,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyPrimaryButton: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: colors.text,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  emptyPrimaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  recommendedBlock: {
    width: "100%",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },
  recommendedLabel: {
    color: "#A8A29E",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  recommendedChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  recommendedChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  recommendedChipText: {
    color: SECTION_MUTED,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17, 17, 17, 0.4)",
  },
  modalScrim: {
    flex: 1,
  },
  modalSheet: {
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  modalHandleWrap: {
    alignItems: "center",
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E7E5E4",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  filterSectionLabel: {
    color: SECTION_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  filterChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    backgroundColor: colors.surface,
  },
  optionChipSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  optionChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  optionChipTextSelected: {
    color: colors.surface,
  },
  purityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  purityCard: {
    width: "47%",
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F1F1F1",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  purityCardSelected: {
    borderColor: colors.accentGold,
    backgroundColor: "#FAF7EF",
    shadowColor: colors.accentGold,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  purityFocusTag: {
    position: "absolute",
    top: -10,
    backgroundColor: colors.accentGold,
    color: colors.surface,
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  purityCardTitle: {
    color: "#A8A29E",
    fontSize: 20,
    fontWeight: "700",
  },
  purityCardTitleSelected: {
    color: colors.text,
  },
  purityCardSubtitle: {
    marginTop: 6,
    color: "#A8A29E",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  purityCardSubtitleSelected: {
    color: colors.accentGold,
  },
  attributeSection: {
    marginTop: spacing.sm,
  },
  rangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rangeValue: {
    color: colors.accentGold,
    fontSize: 14,
    fontWeight: "700",
  },
  rangeTrackWrap: {
    paddingHorizontal: 2,
    paddingTop: spacing.sm,
  },
  rangeTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E7E5E4",
    marginTop: 16,
  },
  rangeOptionsRow: {
    marginTop: -10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rangeStopItem: {
    alignItems: "center",
    flex: 1,
  },
  rangeTick: {
    width: 2,
    height: 12,
    backgroundColor: "#D6D3D1",
    marginBottom: spacing.sm,
  },
  rangeTickSelected: {
    backgroundColor: colors.accentGold,
    width: 4,
  },
  rangeTickFirst: {
    marginLeft: 0,
  },
  rangeTickLast: {
    marginRight: 0,
  },
  rangeStopLabel: {
    color: "#A8A29E",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  rangeStopLabelSelected: {
    color: colors.text,
  },
  modalFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  modalSecondaryButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  modalPrimaryButton: {
    flex: 2,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  modalPrimaryButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
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
});

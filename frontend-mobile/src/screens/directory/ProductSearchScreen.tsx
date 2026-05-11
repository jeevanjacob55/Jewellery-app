import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { getJson } from "../../api/client";
import { getMarketFilterConfig, searchMarketProducts } from "../../api/market";
import { FilterChip } from "../../components/FilterChip";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Company, ProductFilterConfigResponse, ProductSearchResult } from "../../types/api";
import { ProductSearchFilterSheet, ProductSearchFilters } from "./ProductSearchFilterSheet";

type ProductSearchRouteParams = {
  companyId?: number;
  companyName?: string;
  categoryName?: string;
  categorySlug?: string;
  query?: string;
  openFilters?: boolean;
  collectionId?: number;
  collectionSlug?: string;
  sourceRowId?: number;
};

type SortKey = "popularity" | "newest" | "price_low_to_high" | "price_high_to_low";

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "popularity", label: "Popular" },
  { key: "newest", label: "Newest" },
  { key: "price_low_to_high", label: "Price Low-High" },
  { key: "price_high_to_low", label: "Price High-Low" },
];

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function CatalogSkeleton() {
  return (
    <View style={styles.content}>
      <View style={styles.companyPanel}>
        <SkeletonBlock height={14} width="28%" rounded={999} />
        <SkeletonBlock height={28} width="52%" />
        <SkeletonBlock height={18} width="72%" />
      </View>
      <SkeletonBlock height={54} rounded={radii.lg} />
      <View style={styles.resultsToolbar}>
        <SkeletonBlock height={40} width="34%" rounded={999} />
        <SkeletonBlock height={40} width="28%" rounded={999} />
      </View>
      <View style={styles.resultGrid}>
        {[0, 1, 2, 3].map((item) => (
          <View key={`skeleton-${item}`} style={styles.resultCard}>
            <SkeletonBlock height={150} rounded={radii.lg} />
            <View style={styles.resultCopy}>
              <SkeletonBlock height={16} width="84%" />
              <SkeletonBlock height={12} width="48%" />
              <SkeletonBlock height={14} width="64%" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildBaseFilters(companyId: number | null, categorySlug: string | null): ProductSearchFilters {
  return {
    productType: null,
    categorySlug,
    subcategorySlug: null,
    purity: null,
    companyId,
    state: null,
    priceMin: "",
    priceMax: "",
    weightMin: "",
    weightMax: "",
    attributes: {},
  };
}

function normalizeFilters(filters: ProductSearchFilters, scopedCompanyId: number | null): ProductSearchFilters {
  const normalizedAttributes = Object.fromEntries(
    Object.entries(filters.attributes).filter(([key, value]) => key.trim() && value.trim()),
  );
  return {
    ...filters,
    companyId: scopedCompanyId ?? filters.companyId,
    priceMin: filters.priceMin.trim(),
    priceMax: filters.priceMax.trim(),
    weightMin: filters.weightMin.trim(),
    weightMax: filters.weightMax.trim(),
    attributes: normalizedAttributes,
  };
}

function syncFiltersWithConfig(
  filters: ProductSearchFilters,
  config: ProductFilterConfigResponse | null,
  scopedCompanyId: number | null,
): ProductSearchFilters {
  const normalized = normalizeFilters(filters, scopedCompanyId);
  if (!config) {
    return normalized;
  }

  const next: ProductSearchFilters = { ...normalized };
  const selectedCategory = config.categories.find((category) => category.slug === next.categorySlug) ?? null;

  if (selectedCategory) {
    next.productType = selectedCategory.product_type;
    if (next.subcategorySlug && !selectedCategory.subcategories.some((subcategory) => subcategory.slug === next.subcategorySlug)) {
      next.subcategorySlug = null;
    }
    const allowedAttributeKeys = new Set(
      selectedCategory.attributes
        .filter((attribute) => attribute.type !== "number")
        .map((attribute) => attribute.key),
    );
    next.attributes = Object.fromEntries(
      Object.entries(next.attributes).filter(([key, value]) => allowedAttributeKeys.has(key) && value.trim()),
    );
  } else {
    next.categorySlug = null;
    next.subcategorySlug = null;
    next.attributes = {};
  }

  if (next.companyId && !config.companies.some((company) => company.id === next.companyId) && scopedCompanyId === null) {
    next.companyId = null;
  }
  if (next.state && !config.states.includes(next.state)) {
    next.state = null;
  }

  return next;
}

function formatSlugLabel(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProductSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const params = (route.params ?? {}) as ProductSearchRouteParams;
  const scopedCompanyId = typeof params.companyId === "number" ? params.companyId : null;
  const scopedCategorySlug = (params.categorySlug ?? params.categoryName ?? "").trim() || null;
  const companyScoped = scopedCompanyId !== null;

  const [company, setCompany] = useState<Company | null>(null);
  const [filterConfig, setFilterConfig] = useState<ProductFilterConfigResponse | null>(null);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState((params.query ?? "").trim());
  const [draftSearchTerm, setDraftSearchTerm] = useState(params.query ?? "");
  const [filters, setFilters] = useState<ProductSearchFilters>(() => buildBaseFilters(scopedCompanyId, scopedCategorySlug));
  const [draftFilters, setDraftFilters] = useState<ProductSearchFilters>(() => buildBaseFilters(scopedCompanyId, scopedCategorySlug));
  const [sort, setSort] = useState<SortKey>("popularity");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextBaseFilters = buildBaseFilters(scopedCompanyId, scopedCategorySlug);
    setSearchTerm((params.query ?? "").trim());
    setDraftSearchTerm(params.query ?? "");
    setFilters(nextBaseFilters);
    setDraftFilters(nextBaseFilters);
    setSort("popularity");
  }, [params.query, scopedCategorySlug, scopedCompanyId]);

  useEffect(() => {
    if (params.openFilters) {
      setDraftFilters((current) => syncFiltersWithConfig(current, filterConfig, scopedCompanyId));
      setFilterSheetVisible(true);
    }
  }, [filterConfig, params.openFilters, scopedCompanyId]);

  useEffect(() => {
    let active = true;

    async function loadContext() {
      try {
        const [nextCompany, nextConfig] = await Promise.all([
          scopedCompanyId ? getJson<Company>(`/directory/companies/${scopedCompanyId}/`) : Promise.resolve(null),
          getMarketFilterConfig(),
        ]);

        if (!active) {
          return;
        }

        setCompany(nextCompany);
        setFilterConfig(nextConfig);
        setFilters((current) => syncFiltersWithConfig(current, nextConfig, scopedCompanyId));
        setDraftFilters((current) => syncFiltersWithConfig(current, nextConfig, scopedCompanyId));
      } catch {
        if (active) {
          setError("Unable to load search filters right now.");
        }
      }
    }

    void loadContext();

    return () => {
      active = false;
    };
  }, [scopedCompanyId]);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const searchResponse = await searchMarketProducts({
          search: searchTerm || undefined,
          product_type: filters.productType ?? undefined,
          category: filters.categorySlug ?? undefined,
          subcategory: filters.subcategorySlug ?? undefined,
          purity: filters.purity ?? undefined,
          sort,
          company: typeof filters.companyId === "number" ? filters.companyId : undefined,
          state: filters.state ?? undefined,
          price_min: filters.priceMin || undefined,
          price_max: filters.priceMax || undefined,
          weight_min: filters.weightMin || undefined,
          weight_max: filters.weightMax || undefined,
          attributes: filters.attributes,
        });

        if (!active) {
          return;
        }

        setProducts(searchResponse.results);
        setResultCount(searchResponse.count);
        setError(null);
      } catch {
        if (active) {
          setError("Unable to load this product catalog right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
          setSearching(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [filters, searchTerm, sort]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const [nextCompany, searchResponse] = await Promise.all([
        scopedCompanyId ? getJson<Company>(`/directory/companies/${scopedCompanyId}/`) : Promise.resolve(company),
        searchMarketProducts({
          search: searchTerm || undefined,
          product_type: filters.productType ?? undefined,
          category: filters.categorySlug ?? undefined,
          subcategory: filters.subcategorySlug ?? undefined,
          purity: filters.purity ?? undefined,
          sort,
          company: typeof filters.companyId === "number" ? filters.companyId : undefined,
          state: filters.state ?? undefined,
          price_min: filters.priceMin || undefined,
          price_max: filters.priceMax || undefined,
          weight_min: filters.weightMin || undefined,
          weight_max: filters.weightMax || undefined,
          attributes: filters.attributes,
        }),
      ]);
      setCompany(nextCompany);
      setProducts(searchResponse.results);
      setResultCount(searchResponse.count);
      setError(null);
    } catch {
      setError("Unable to refresh this catalog right now.");
    } finally {
      setRefreshing(false);
    }
  }

  function submitSearch() {
    const nextSearchTerm = draftSearchTerm.trim();
    if (nextSearchTerm === searchTerm) {
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchTerm(nextSearchTerm);
  }

  function openFilterSheet() {
    setDraftFilters(filters);
    setFilterSheetVisible(true);
  }

  function applyFilters() {
    setSearching(true);
    setFilters(syncFiltersWithConfig(draftFilters, filterConfig, scopedCompanyId));
    setFilterSheetVisible(false);
  }

  function updateSort(nextSort: SortKey) {
    if (nextSort === sort) {
      return;
    }
    setSearching(true);
    setSort(nextSort);
  }

  function handleClearAll() {
    const nextBase = buildBaseFilters(scopedCompanyId, companyScoped ? null : null);
    setFilterSheetVisible(false);
    setDraftSearchTerm("");
    setSearchTerm("");
    setDraftFilters(nextBase);
    setFilters(nextBase);
    setSort("popularity");
    setSearching(true);

    if (!companyScoped) {
      navigation.navigate("MainTabs", { screen: "Market" });
    }
  }

  function updateFilters(nextFilters: ProductSearchFilters) {
    setDraftFilters(syncFiltersWithConfig(nextFilters, filterConfig, scopedCompanyId));
  }

  function applyImmediateFilterChange(nextFilters: ProductSearchFilters) {
    setSearching(true);
    setFilters(syncFiltersWithConfig(nextFilters, filterConfig, scopedCompanyId));
  }

  const selectedCategory = filterConfig?.categories.find((category) => category.slug === filters.categorySlug) ?? null;
  const selectedSubcategory = selectedCategory?.subcategories.find((subcategory) => subcategory.slug === filters.subcategorySlug) ?? null;
  const selectedCompany = !companyScoped && typeof filters.companyId === "number"
    ? filterConfig?.companies.find((item) => item.id === filters.companyId) ?? null
    : null;
  const scopedCategoryLabel = formatSlugLabel(scopedCategorySlug);
  const headerTitle = company?.name ?? selectedCategory?.name ?? (scopedCategoryLabel || "Products");
  const headerLocation = company
    ? [company.city, company.state].filter(Boolean).join(", ")
    : selectedCategory
      ? `${formatSlugLabel(selectedCategory.product_type)} catalogue`
      : "Market catalog";

  const activeChips: ActiveFilterChip[] = [];
  if (searchTerm) {
    activeChips.push({
      key: "search",
      label: `Search: ${searchTerm}`,
      onRemove: () => {
        setDraftSearchTerm("");
        setSearchTerm("");
      },
    });
  }
  if (filters.productType) {
    activeChips.push({
      key: "productType",
      label: formatSlugLabel(filters.productType),
      onRemove: () =>
        applyImmediateFilterChange({
          ...filters,
          productType: null,
          categorySlug: null,
          subcategorySlug: null,
          attributes: {},
        }),
    });
  }
  if (selectedCategory) {
    activeChips.push({
      key: "category",
      label: selectedCategory.name,
      onRemove: () =>
        applyImmediateFilterChange({
          ...filters,
          categorySlug: null,
          subcategorySlug: null,
          attributes: {},
        }),
    });
  }
  if (selectedSubcategory) {
    activeChips.push({
      key: "subcategory",
      label: selectedSubcategory.name,
      onRemove: () => applyImmediateFilterChange({ ...filters, subcategorySlug: null }),
    });
  }
  if (filters.purity) {
    activeChips.push({
      key: "purity",
      label: filters.purity,
      onRemove: () => applyImmediateFilterChange({ ...filters, purity: null }),
    });
  }
  if (filters.state) {
    activeChips.push({
      key: "state",
      label: filters.state,
      onRemove: () => applyImmediateFilterChange({ ...filters, state: null }),
    });
  }
  if (selectedCompany) {
    activeChips.push({
      key: "company",
      label: selectedCompany.name,
      onRemove: () => applyImmediateFilterChange({ ...filters, companyId: null }),
    });
  }
  if (filters.priceMin || filters.priceMax) {
    activeChips.push({
      key: "price",
      label: `Price: ${filters.priceMin || "0"} - ${filters.priceMax || "Any"}`,
      onRemove: () => applyImmediateFilterChange({ ...filters, priceMin: "", priceMax: "" }),
    });
  }
  if (filters.weightMin || filters.weightMax) {
    activeChips.push({
      key: "weight",
      label: `Weight: ${filters.weightMin || "0"}g - ${filters.weightMax || "Any"}g`,
      onRemove: () => applyImmediateFilterChange({ ...filters, weightMin: "", weightMax: "" }),
    });
  }
  if (selectedCategory) {
    const eligibleAttributes = selectedCategory.attributes.filter((attribute) => attribute.type !== "number");
    for (const attribute of eligibleAttributes) {
      const value = filters.attributes[attribute.key];
      if (!value) {
        continue;
      }
      activeChips.push({
        key: `attribute-${attribute.key}`,
        label: `${attribute.label}: ${value}`,
        onRemove: () => {
          const nextAttributes = { ...filters.attributes };
          delete nextAttributes[attribute.key];
          applyImmediateFilterChange({ ...filters, attributes: nextAttributes });
        },
      });
    }
  }

  const hasClearableState = Boolean(
    searchTerm ||
      filters.productType ||
      filters.categorySlug ||
      filters.subcategorySlug ||
      filters.purity ||
      filters.state ||
      (!companyScoped && filters.companyId) ||
      filters.priceMin ||
      filters.priceMax ||
      filters.weightMin ||
      filters.weightMax ||
      Object.keys(filters.attributes).length,
  );

  if (loading) {
    return (
      <AppScreen safeAreaEdges={["top"]} backgroundColor={colors.background} scrollable>
        <CatalogSkeleton />
      </AppScreen>
    );
  }

  if (error && !company && !products.length && !filterConfig) {
    return <ScreenState title="Catalog unavailable" detail={error} />;
  }

  return (
    <>
      <AppScreen
        safeAreaEdges={["top"]}
        backgroundColor={colors.background}
        scrollable
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.md) + 88 }]}
      >
        <View style={styles.companyPanel}>
          <Text style={styles.panelEyebrow}>{company ? "Company Catalog" : "Product Catalog"}</Text>
          <Text style={styles.panelTitle}>{headerTitle}</Text>
          <Text style={styles.panelMeta}>{headerLocation}</Text>
          {company ? (
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("CompanyProfile", { companyId: company.id, companyName: company.name })}>
              <Text style={styles.secondaryButtonText}>View Company Details</Text>
            </Pressable>
          ) : null}
        </View>

      <View style={styles.searchShell}>
        <View style={styles.searchFieldWrap}>
          <MaterialIcons name="search" size={20} color="#4C4546" style={styles.searchIcon} />
          <TextInput
            value={draftSearchTerm}
            onChangeText={setDraftSearchTerm}
            onSubmitEditing={submitSearch}
            placeholder={company ? "Search this company's products" : "Search products"}
            placeholderTextColor="#7A7D7D"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <Pressable style={styles.searchButton} onPress={submitSearch}>
          <Text style={styles.searchButtonText}>{searching ? "Searching..." : "Search"}</Text>
        </Pressable>
      </View>

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <View style={styles.resultsHeader}>
          <View style={styles.resultsSummary}>
            <Text style={styles.resultsCount}>{`${resultCount} ${resultCount === 1 ? "Product" : "Products"}`}</Text>
            {companyScoped ? <Text style={styles.resultsHint}>Only products from this company are shown.</Text> : <Text style={styles.resultsHint}>Advanced filters are live for this search.</Text>}
          </View>
          <Pressable style={styles.filterButton} onPress={openFilterSheet}>
            <Text style={styles.filterButtonText}>Filters</Text>
          </Pressable>
        </View>

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((option) => (
            <FilterChip key={option.key} label={option.label} selected={sort === option.key} onPress={() => updateSort(option.key)} />
          ))}
        </View>

        {activeChips.length ? (
          <View style={styles.activeChipsWrap}>
            {activeChips.map((chip) => (
              <Pressable key={chip.key} onPress={chip.onRemove} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{`${chip.label}  x`}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {products.length ? (
          <View style={styles.resultGrid}>
            {products.map((product) => (
              <Pressable
                key={product.id}
                style={styles.resultCard}
                onPress={() => navigation.navigate("ProductDetail", { productId: product.id, companyId: product.company_id })}
              >
                <View style={styles.resultImageWrap}>
                  {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={styles.resultImage} />
                  ) : (
                    <View style={styles.resultImageFallback}>
                      <Text style={styles.resultImageFallbackText}>{product.title.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultTitle} numberOfLines={2}>
                    {product.title}
                  </Text>
                  <Text style={styles.resultMeta}>{product.company_name}</Text>
                  <Text style={styles.resultMeta}>
                    {[product.purity, product.weight_grams ? `${product.weight_grams}g` : null].filter(Boolean).join(" | ")}
                  </Text>
                  {product.attribute_label && product.attribute_value ? (
                    <Text style={styles.attributeMeta}>{`${product.attribute_label}: ${product.attribute_value}`}</Text>
                  ) : null}
                  {product.price ? <Text style={styles.resultPrice}>{`Rs. ${product.price}`}</Text> : <Text style={styles.resultPriceMuted}>Price on request</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No products found.</Text>
            <Text style={styles.emptyDetail}>Try changing your search, adjusting filters, or clearing the current selection.</Text>
            {hasClearableState ? (
              <Pressable style={styles.clearFiltersButton} onPress={handleClearAll}>
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </AppScreen>

      <ProductSearchFilterSheet
        visible={filterSheetVisible}
        filters={draftFilters}
        config={filterConfig}
        companyScoped={companyScoped}
        onChange={updateFilters}
        onApply={applyFilters}
        onClearAll={handleClearAll}
        onClose={() => setFilterSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  companyPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  panelEyebrow: {
    color: colors.mutedText,
    ...typography.eyebrow,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  panelMeta: {
    color: colors.mutedText,
    ...typography.body,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  searchShell: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  searchFieldWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  searchButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.text,
    justifyContent: "center",
  },
  searchButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  inlineError: {
    color: colors.negative,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  resultsSummary: {
    flex: 1,
    gap: spacing.xs,
  },
  resultsCount: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  resultsHint: {
    color: colors.mutedText,
    fontSize: 12,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  filterButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  activeChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  activeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  activeChipText: {
    color: colors.surface,
    fontWeight: "700",
  },
  resultsToolbar: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  resultCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  resultImageWrap: {
    height: 152,
    backgroundColor: colors.surfaceAlt,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultImageFallbackText: {
    color: colors.mutedText,
    fontSize: 28,
    fontWeight: "800",
  },
  resultCopy: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 40,
  },
  resultMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  attributeMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  resultPrice: {
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  resultPriceMuted: {
    color: colors.mutedText,
    fontWeight: "700",
    marginTop: spacing.sm,
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
  clearFiltersButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.text,
  },
  clearFiltersButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  skeletonBlock: {
    backgroundColor: "#ECE7E7",
  },
});

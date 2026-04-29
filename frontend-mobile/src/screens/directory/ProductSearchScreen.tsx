import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getJson } from "../../api/client";
import { searchMarketProducts } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Company, ProductSearchResult } from "../../types/api";

type ProductSearchRouteParams = {
  companyId?: number;
  companyName?: string;
  categoryName?: string;
  query?: string;
  collectionId?: number;
  collectionSlug?: string;
  sourceRowId?: number;
};

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

export function ProductSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const params = (route.params ?? {}) as ProductSearchRouteParams;
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState(params.query ?? "");
  const [draftSearchTerm, setDraftSearchTerm] = useState(params.query ?? "");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchTerm(params.query ?? "");
    setDraftSearchTerm(params.query ?? "");
  }, [params.query]);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const [nextCompany, searchResponse] = await Promise.all([
          params.companyId ? getJson<Company>(`/directory/companies/${params.companyId}/`) : Promise.resolve(null),
          searchMarketProducts({
            company: params.companyId,
            category: params.categoryName,
            search: searchTerm || undefined,
          }),
        ]);

        if (!active) {
          return;
        }

        setCompany(nextCompany);
        setProducts(searchResponse.results);
        setError(null);
      } catch {
        if (active) {
          setError("Unable to load this product catalog right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setSearching(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [params.categoryName, params.companyId, searchTerm]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const [nextCompany, searchResponse] = await Promise.all([
        params.companyId ? getJson<Company>(`/directory/companies/${params.companyId}/`) : Promise.resolve(null),
        searchMarketProducts({
          company: params.companyId,
          category: params.categoryName,
          search: searchTerm || undefined,
        }),
      ]);
      setCompany(nextCompany);
      setProducts(searchResponse.results);
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

  if (loading) {
    return (
      <AppScreen safeAreaEdges={["top"]} backgroundColor={colors.background} scrollable>
        <CatalogSkeleton />
      </AppScreen>
    );
  }

  if (error && !company && !products.length) {
    return <ScreenState title="Catalog unavailable" detail={error} />;
  }

  const headerTitle = company?.name ?? params.companyName ?? params.categoryName ?? "Products";
  const headerLocation = company ? [company.city, company.state].filter(Boolean).join(", ") : "Market catalog";

  return (
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
        <TextInput
          value={draftSearchTerm}
          onChangeText={setDraftSearchTerm}
          onSubmitEditing={submitSearch}
          placeholder={company ? "Search this company's products" : "Search products"}
          placeholderTextColor="#7A7D7D"
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={submitSearch}>
          <Text style={styles.searchButtonText}>{searching ? "Searching..." : "Search"}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{`${products.length} ${products.length === 1 ? "Product" : "Products"}`}</Text>
        {params.companyId ? <Text style={styles.resultsHint}>Only products from this company are shown.</Text> : null}
      </View>

      {products.length ? (
        <View style={styles.resultGrid}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              style={styles.resultCard}
              onPress={() => navigation.navigate("ProductDetail", { productId: product.id, companyId: product.company_id })}
            >
              <View style={styles.resultImageWrap}>
                {product.image_url ? <Image source={{ uri: product.image_url }} style={styles.resultImage} /> : <View style={styles.resultImageFallback}><Text style={styles.resultImageFallbackText}>{product.title.slice(0, 1).toUpperCase()}</Text></View>}
              </View>
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                <Text style={styles.resultMeta}>{product.company_name}</Text>
                <Text style={styles.resultMeta}>
                  {[product.purity, product.weight_grams ? `${product.weight_grams}g` : null].filter(Boolean).join(" | ")}
                </Text>
                {product.price ? <Text style={styles.resultPrice}>{`Rs. ${product.price}`}</Text> : <Text style={styles.resultPriceMuted}>Price on request</Text>}
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No products matched this catalog view.</Text>
          <Text style={styles.emptyDetail}>Try another search term or refresh after the company publishes more products.</Text>
        </View>
      )}
    </AppScreen>
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
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
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
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  resultsCount: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  resultsHint: {
    color: colors.mutedText,
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  inlineError: {
    color: colors.negative,
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
  skeletonBlock: {
    backgroundColor: "#ECE7E7",
  },
});

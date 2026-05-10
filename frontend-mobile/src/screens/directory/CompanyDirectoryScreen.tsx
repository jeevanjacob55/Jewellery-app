import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCompanies } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Company } from "../../types/api";

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function CompanyDirectorySkeleton() {
  return (
    <View style={styles.content}>
      <View style={styles.headerShell}>
        <View style={styles.headerRow}>
          <SkeletonBlock height={22} width={40} rounded={20} />
          <View style={styles.headerTitleGroup}>
            <SkeletonBlock height={16} width={32} rounded={8} />
            <SkeletonBlock height={24} width={196} />
          </View>
          <SkeletonBlock height={22} width={22} rounded={11} />
        </View>
        <View style={styles.searchRow}>
          <SkeletonBlock height={48} rounded={radii.md} />
          <SkeletonBlock height={48} width={48} rounded={radii.md} />
        </View>
      </View>

      <View style={styles.listShell}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={`company-directory-skeleton-${item}`} style={[styles.listRow, item > 0 ? styles.listRowBorder : null]}>
            <SkeletonBlock height={48} width={48} rounded={radii.md} />
            <View style={styles.listRowCopy}>
              <SkeletonBlock height={18} width="64%" />
              <SkeletonBlock height={14} width="46%" />
            </View>
            <SkeletonBlock height={18} width={18} rounded={9} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CompanyDirectoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCompanies(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextCompanies = await getCompanies();
      setCompanies(nextCompanies);
      setError(null);
    } catch {
      setError("Unable to load the company directory right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return companies;
    }

    return companies.filter((company) =>
      [company.name, company.city, company.state]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [companies, query]);

  const hasCompanies = companies.length > 0;
  const isSearchEmpty = hasCompanies && filteredCompanies.length === 0;

  if (loading && !companies.length) {
    return (
      <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background} scrollable>
        <CompanyDirectorySkeleton />
      </AppScreen>
    );
  }

  if (!companies.length && error) {
    return (
      <AppScreen
        safeAreaEdges={["top", "bottom"]}
        backgroundColor={colors.background}
        scrollable
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadCompanies(true)} tintColor={colors.text} />}
      >
        <View style={styles.content}>
          <DirectoryHeader
            onBack={() => navigation.goBack()}
            onNotifications={() => navigation.navigate("Notifications")}
          />
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Company directory unavailable</Text>
            <Text style={styles.emptyDetail}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadCompanies()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      safeAreaEdges={["top", "bottom"]}
      backgroundColor={colors.background}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadCompanies(true)} tintColor={colors.text} />}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + Math.max(insets.bottom, spacing.md) }]}
    >
      <DirectoryHeader onBack={() => navigation.goBack()} onNotifications={() => navigation.navigate("Notifications")} />

      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <MaterialIcons name="search" size={20} color="#4C4546" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search companies or locations"
            placeholderTextColor="#7E7576"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <Pressable style={styles.filterButton} disabled accessibilityState={{ disabled: true }}>
          <MaterialIcons name="tune" size={22} color="#1A1A1A" />
        </Pressable>
      </View>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionEyebrow}>All Companies</Text>
        <View style={styles.sectionDivider} />
      </View>

      {isSearchEmpty ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No companies matched your search</Text>
          <Text style={styles.emptyDetail}>Try a different company name, city, or state to keep browsing the directory.</Text>
        </View>
      ) : hasCompanies ? (
        <View style={styles.listShell}>
          {filteredCompanies.map((company, index) => (
            <Pressable
              key={company.id}
              style={[styles.listRow, index > 0 ? styles.listRowBorder : null]}
              onPress={() => navigation.navigate("CompanyProfile", { companyId: company.id, companyName: company.name })}
            >
              <View style={styles.leadingVisual}>
                {company.logo_image_url ? (
                  <Image source={{ uri: company.logo_image_url }} style={styles.leadingImage} />
                ) : (
                  <Text style={styles.leadingFallback}>{getInitials(company.name)}</Text>
                )}
              </View>
              <View style={styles.listRowCopy}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyMeta} numberOfLines={1}>
                  {getLocationLabel(company.city, company.state)}
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color="#7E7576" />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No companies are live in the directory yet</Text>
          <Text style={styles.emptyDetail}>Approved companies will appear here as soon as they are published.</Text>
        </View>
      )}
    </AppScreen>
  );
}

function DirectoryHeader({ onBack, onNotifications }: { onBack: () => void; onNotifications: () => void }) {
  return (
    <View style={styles.headerShell}>
      <View style={styles.headerRow}>
        <Pressable style={styles.headerIconButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={22} color="#000000" />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <MaterialIcons name="business" size={22} color="#000000" />
          <Text style={styles.headerTitle}>COMPANY DIRECTORY</Text>
        </View>
        <Pressable style={styles.headerIconButton} onPress={onNotifications}>
          <MaterialIcons name="notifications-none" size={22} color="#1B1C1C" />
        </Pressable>
      </View>
    </View>
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

function getLocationLabel(city?: string | null, state?: string | null) {
  const parts = [city, state].filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unavailable";
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  headerShell: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#CFC4C5",
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    color: "#000000",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchFieldWrap: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: spacing.md,
    zIndex: 1,
  },
  searchInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#CFC4C5",
    borderRadius: radii.md,
    paddingLeft: 46,
    paddingRight: spacing.md,
    color: "#1B1C1C",
    fontSize: 15,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#CFC4C5",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionEyebrow: {
    color: "#775A19",
    ...typography.eyebrow,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 1.1,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#CFC4C5",
    opacity: 0.4,
  },
  listShell: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(207, 196, 197, 0.45)",
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  listRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#E3E2E2",
  },
  leadingVisual: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "#E9E8E7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  leadingImage: {
    width: "100%",
    height: "100%",
  },
  leadingFallback: {
    color: "#4C4546",
    fontSize: 16,
    fontWeight: "800",
  },
  listRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  companyName: {
    color: "#000000",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  companyMeta: {
    color: "#838484",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  inlineError: {
    color: colors.negative,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(207, 196, 197, 0.45)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  emptyDetail: {
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
  skeletonBlock: {
    backgroundColor: "#ECE7E7",
  },
});

import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { FilterChip } from "../../components/FilterChip";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, spacing } from "../../theme/tokens";
import { Company } from "../../types/api";

const tierOptions = ["All", "PREMIUM", "PRO", "NORMAL"];

export function MarketTiersScreen() {
  const navigation = useNavigation<any>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCompanies() {
      try {
        const nextCompanies = await getJson<Company[]>("/directory/companies/");
        if (!active) {
          return;
        }
        setCompanies(nextCompanies);
      } catch {
        if (active) {
          setError("Unable to load the directory right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCompanies();

    return () => {
      active = false;
    };
  }, []);

  const filteredCompanies = companies.filter((company) => {
    const matchesTier = selectedTier === "All" || company.tier === selectedTier;
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTier && matchesSearch;
  });

  if (loading) {
    return <ScreenState title="Loading market tiers" detail="Sorting member businesses by tier and category." loading />;
  }

  if (error && !companies.length) {
    return <ScreenState title="Directory unavailable" detail={error} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeading>Market Tiers</SectionHeading>
      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search company, city, or category"
        style={styles.searchInput}
      />
      <View style={styles.chipWrap}>
        {tierOptions.map((tier) => (
          <FilterChip key={tier} label={tier} selected={selectedTier === tier} onPress={() => setSelectedTier(tier)} />
        ))}
      </View>

      {filteredCompanies.map((company) => (
        <Pressable
          key={company.id}
          onPress={() => navigation.navigate("CompanyProfile", { companyId: company.id, companyName: company.name })}
        >
          <SurfaceCard>
            <View style={styles.row}>
              <View style={styles.companyBlock}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.location}>
                  {company.city}, {company.state}
                </Text>
                <Text style={styles.meta}>{company.category}</Text>
              </View>
              <Text style={styles.badge}>{company.tier}</Text>
            </View>
          </SurfaceCard>
        </Pressable>
      ))}

      {!filteredCompanies.length ? (
        <SurfaceCard>
          <Text style={styles.emptyTitle}>No companies match this filter</Text>
          <Text style={styles.meta}>Try a broader tier or remove the search term.</Text>
        </SurfaceCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  companyBlock: { flex: 1, paddingRight: spacing.md },
  companyName: { color: colors.text, fontWeight: "700", fontSize: 18 },
  location: { color: colors.mutedText, marginTop: spacing.xs },
  meta: { color: colors.mutedText, marginTop: spacing.xs },
  badge: { color: colors.accentGold, fontWeight: "800", letterSpacing: 1 },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
});

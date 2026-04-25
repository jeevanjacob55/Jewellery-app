import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, spacing } from "../../theme/tokens";
import { Company } from "../../types/api";

export function CompanyProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const companyId = route.params?.companyId;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      if (!companyId) {
        setError("No company was selected.");
        setLoading(false);
        return;
      }

      try {
        const nextCompany = await getJson<Company>(`/directory/companies/${companyId}/`);
        if (active) {
          setCompany(nextCompany);
        }
      } catch {
        if (active) {
          setError("Unable to load the company profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCompany();

    return () => {
      active = false;
    };
  }, [companyId]);

  if (loading) {
    return <ScreenState title="Loading company profile" detail="Pulling verification and product details." loading />;
  }

  if (!company) {
    return <ScreenState title="Company unavailable" detail={error ?? "Choose a company from the market tier list."} />;
  }

  const verificationBadges = [
    company.verification?.gst_registered ? "GST Registered" : null,
    company.verification?.bis_hallmarked ? "BIS Hallmarked" : null,
    company.verification?.export_licensed ? "Export Licensed" : null,
  ].filter(Boolean);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeading>{company.name}</SectionHeading>
      <SurfaceCard>
        <Text style={styles.meta}>
          {company.city}, {company.state}
        </Text>
        <Text style={styles.meta}>Tier: {company.tier}</Text>
        <Text style={styles.meta}>Category: {company.category}</Text>
        <Text style={styles.meta}>Daily capacity: {company.daily_capacity || "Not shared yet"}</Text>
        <Text style={styles.meta}>Specialization: {company.specialization || "Not shared yet"}</Text>
        <Text style={styles.about}>{company.about || "Company overview will appear here once published."}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.title}>Verification</Text>
        <Text style={styles.verification}>{verificationBadges.length ? verificationBadges.join(" • ") : "Verification details pending"}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.title}>Products</Text>
        {company.products.length ? (
          company.products.map((product) => (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productCopy}>
                <Text style={styles.productTitle}>{product.name}</Text>
                <Text style={styles.meta}>
                  {product.purity} • {product.weight_grams}g
                </Text>
                <Text style={styles.meta}>{product.description}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No approved products published yet.</Text>
        )}
        <Pressable style={styles.ctaButton} onPress={() => navigation.navigate("ProductSearch", { companyId: company.id })}>
          <Text style={styles.ctaText}>Search Products</Text>
        </Pressable>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  meta: { color: colors.mutedText, marginBottom: spacing.xs },
  about: { color: colors.text, marginTop: spacing.sm, lineHeight: 22 },
  verification: { marginTop: spacing.sm, color: colors.text, fontWeight: "700" },
  productRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productCopy: {
    gap: spacing.xs,
  },
  productTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  ctaButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.text,
  },
  ctaText: { color: colors.surface, fontWeight: "700", textAlign: "center" },
});

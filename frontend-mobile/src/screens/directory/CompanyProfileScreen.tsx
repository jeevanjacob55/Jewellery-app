import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, radii, spacing } from "../../theme/tokens";
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
        {company.hero_image_url ? <Image source={{ uri: company.hero_image_url }} style={styles.heroImage} /> : null}

        <View style={styles.companyHeader}>
          <View style={styles.logoWrap}>
            {company.logo_image_url ? <Image source={{ uri: company.logo_image_url }} style={styles.logoImage} /> : <Text style={styles.logoFallback}>{getInitials(company.name)}</Text>}
          </View>
          <View style={styles.companyHeaderCopy}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.meta}>
              {company.city}, {company.state}
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>Tier: {company.tier}</Text>
        <Text style={styles.meta}>Category: {company.category}</Text>
        <Text style={styles.meta}>Daily capacity: {company.daily_capacity || "Not shared yet"}</Text>
        <Text style={styles.meta}>Specialization: {company.specialization || "Not shared yet"}</Text>
        <Text style={styles.about}>{company.about || "Company overview will appear here once published."}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.title}>Verification</Text>
        <Text style={styles.verification}>{verificationBadges.length ? verificationBadges.join(" | ") : "Verification details pending"}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.title}>Products</Text>
        {company.products.length ? (
          company.products.map((product) => (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productCopy}>
                <Text style={styles.productTitle}>{product.name}</Text>
                <Text style={styles.meta}>
                  {product.purity} | {product.weight_grams}g
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

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  heroImage: {
    width: "100%",
    height: 208,
    borderRadius: 14,
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  companyHeaderCopy: {
    flex: 1,
  },
  companyName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 2,
  },
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
    borderRadius: radii.sm,
  },
  ctaText: { color: colors.surface, fontWeight: "700", textAlign: "center" },
});

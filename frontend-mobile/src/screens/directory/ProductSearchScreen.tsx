import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRoute } from "@react-navigation/native";

import { getJson, postJson } from "../../api/client";
import { FilterChip } from "../../components/FilterChip";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { Company, EnquiryPayload } from "../../types/api";

type ProductCard = {
  id: number;
  companyId: number;
  companyName: string;
  name: string;
  purity: string;
  weightGrams: string;
  description: string;
};

const purityOptions = ["All", "22K", "24K"];

export function ProductSearchScreen() {
  const route = useRoute<any>();
  const { guestSession, user } = useSession();
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPurity, setSelectedPurity] = useState("All");
  const [requesterName, setRequesterName] = useState(user?.first_name || guestSession?.guest_profile.guest_name || "");
  const [requesterPhone, setRequesterPhone] = useState(user?.member_profile?.phone_number || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingFor, setSubmittingFor] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const companies = await getJson<Company[]>("/directory/companies/");
        if (!active) {
          return;
        }

        const flattenedProducts = companies.flatMap((company) =>
          company.products.map((product) => ({
            id: product.id,
            companyId: company.id,
            companyName: company.name,
            name: product.name,
            purity: product.purity,
            weightGrams: product.weight_grams,
            description: product.description,
          })),
        );

        const scopedProducts = route.params?.companyId
          ? flattenedProducts.filter((product) => product.companyId === route.params.companyId)
          : flattenedProducts;
        setProducts(scopedProducts);
      } catch {
        if (active) {
          setMessage("Unable to load products right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [route.params?.companyId]);

  const filteredProducts = products.filter((product) => {
    const matchesPurity = selectedPurity === "All" || product.purity === selectedPurity;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPurity && matchesSearch;
  });

  async function submitEnquiry(product: ProductCard) {
    if (!requesterName.trim() || !requesterPhone.trim()) {
      setMessage("Add your name and phone number before sending an enquiry.");
      return;
    }

    const payload: EnquiryPayload = {
      company: product.companyId,
      product: product.id,
      requester_name: requesterName.trim(),
      requester_phone: requesterPhone.trim(),
      notes: notes.trim() || `Interested in ${product.name}`,
    };

    setSubmittingFor(product.id);
    setMessage(null);
    try {
      await postJson("/directory/enquiries/", payload);
      setMessage(`Enquiry sent for ${product.name}.`);
      setNotes("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send enquiry.");
    } finally {
      setSubmittingFor(null);
    }
  }

  if (loading) {
    return <ScreenState title="Loading products" detail="Preparing filters and company catalog listings." loading />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeading>Product Search</SectionHeading>

      <SurfaceCard>
        <TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search product or company" style={styles.input} />
        <View style={styles.chipWrap}>
          {purityOptions.map((purity) => (
            <FilterChip key={purity} label={purity} selected={selectedPurity === purity} onPress={() => setSelectedPurity(purity)} />
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.title}>Enquiry details</Text>
        <TextInput value={requesterName} onChangeText={setRequesterName} placeholder="Your name" style={styles.input} />
        <TextInput value={requesterPhone} onChangeText={setRequesterPhone} placeholder="Phone number" style={styles.input} />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes for the supplier"
          multiline
          style={[styles.input, styles.notesInput]}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </SurfaceCard>

      {filteredProducts.map((product) => (
        <SurfaceCard key={product.id}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.meta}>{product.companyName}</Text>
          <Text style={styles.meta}>
            {product.purity} • {product.weightGrams}g
          </Text>
          <Text style={styles.meta}>{product.description}</Text>
          <Pressable style={styles.actionButton} onPress={() => submitEnquiry(product)} disabled={submittingFor === product.id}>
            <Text style={styles.actionText}>{submittingFor === product.id ? "Sending..." : "Enquire Now"}</Text>
          </Pressable>
        </SurfaceCard>
      ))}

      {!filteredProducts.length ? (
        <SurfaceCard>
          <Text style={styles.title}>No matching products</Text>
          <Text style={styles.meta}>Try clearing your search or changing purity filters.</Text>
        </SurfaceCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  meta: { color: colors.mutedText, marginBottom: spacing.xs },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  actionButton: {
    backgroundColor: colors.text,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  actionText: { color: colors.surface, textAlign: "center", fontWeight: "700" },
  message: { color: colors.text, marginTop: spacing.xs },
});

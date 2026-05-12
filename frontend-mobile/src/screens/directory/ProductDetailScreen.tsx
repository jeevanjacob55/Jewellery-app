import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createProductEnquiry, getProductDetail, toggleProductWishlist } from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { ProductDetail } from "../../types/api";

type ProductDetailRouteParams = {
  productId?: number;
  companyId?: number;
  collectionId?: number;
  collectionSlug?: string;
  sourceRowId?: number;
};

function SkeletonBlock({ height, width = "100%", rounded = radii.md }: { height: number; width?: number | `${number}%`; rounded?: number }) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: rounded }]} />;
}

function DetailSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SkeletonBlock height={360} rounded={radii.lg} />
      <View style={styles.thumbnailRow}>
        <SkeletonBlock height={64} width={64} rounded={radii.md} />
        <SkeletonBlock height={64} width={64} rounded={radii.md} />
        <SkeletonBlock height={64} width={64} rounded={radii.md} />
      </View>
      <View style={styles.section}>
        <SkeletonBlock height={12} width="30%" />
        <SkeletonBlock height={34} width="72%" />
        <SkeletonBlock height={18} width="58%" />
      </View>
      <SkeletonBlock height={110} rounded={radii.lg} />
      <SkeletonBlock height={78} rounded={radii.lg} />
      <View style={styles.actionStack}>
        <SkeletonBlock height={50} rounded={radii.lg} />
        <SkeletonBlock height={50} rounded={radii.lg} />
        <SkeletonBlock height={50} rounded={radii.lg} />
      </View>
      <SkeletonBlock height={220} rounded={radii.lg} />
      <SkeletonBlock height={140} rounded={radii.lg} />
    </ScrollView>
  );
}

export function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { me, guestSession, status } = useSession();
  const params = (route.params ?? {}) as ProductDetailRouteParams;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [wishlistSubmitting, setWishlistSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!params.productId) {
        setError("No product was selected.");
        setLoading(false);
        return;
      }

      try {
        const nextProduct = await getProductDetail(params.productId);
        if (!active) {
          return;
        }
        setProduct(nextProduct);
        setSelectedImageIndex(0);
        setError(null);
      } catch {
        if (active) {
          setError("Could not load product details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [params.productId, status]);

  const selectedImage = product?.images[selectedImageIndex] ?? product?.images[0] ?? null;
  const priceLabel = useMemo(() => formatPriceLabel(product), [product]);
  const shortSpecs = useMemo(() => {
    if (!product) {
      return "";
    }
    return [product.purity, product.weight, product.length].filter(Boolean).join(" | ");
  }, [product]);

  async function handleShare() {
    if (!product) {
      return;
    }

    try {
      await Share.share({
        message: product.share_url ? `${product.name}\n${product.share_url}` : product.name,
        url: product.share_url ?? undefined,
        title: product.name,
      });
    } catch {
      setActionMessage("Unable to open share options right now.");
    }
  }

  async function handleToggleWishlist() {
    if (!product) {
      return;
    }
    if (status !== "authenticated") {
      Alert.alert("Sign in required", "Sign in as a member to save products and news.");
      return;
    }

    const previousValue = product.is_wishlisted;
    setWishlistSubmitting(true);
    setActionMessage(null);
    setProduct((current) => (current ? { ...current, is_wishlisted: !current.is_wishlisted } : current));

    try {
      const response = await toggleProductWishlist(product.id);
      setProduct((current) => (current ? { ...current, is_wishlisted: response.is_wishlisted } : current));
      setActionMessage(response.is_wishlisted ? "Product saved to your wishlist." : "Product removed from your wishlist.");
    } catch (nextError) {
      setProduct((current) => (current ? { ...current, is_wishlisted: previousValue } : current));
      setActionMessage(nextError instanceof Error ? nextError.message : "Unable to update your wishlist right now.");
    } finally {
      setWishlistSubmitting(false);
    }
  }

  async function handleRequestFinalPrice() {
    if (!product) {
      return;
    }

    const requesterName = me?.user.name || guestSession?.guest_profile.guest_name || "";
    const requesterPhone = me?.user.phone || "";

    if (!requesterName.trim() || !requesterPhone.trim()) {
      setActionMessage("Add your name and phone number to your profile before requesting the final price.");
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      await createProductEnquiry(product.id, {
        type: "FINAL_PRICE_REQUEST",
        message: "I would like to know the final price for this product.",
        requester_name: requesterName.trim(),
        requester_phone: requesterPhone.trim(),
      });
      setActionMessage("Final price request sent to the seller.");
    } catch (nextError) {
      setActionMessage(nextError instanceof Error ? nextError.message : "Unable to send your price request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWhatsApp() {
    if (!product?.company.whatsapp) {
      return;
    }

    const message = buildWhatsAppMessage(product);
    const digits = product.company.whatsapp.replace(/[^\d+]/g, "");
    await Linking.openURL(`https://wa.me/${digits.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`);
  }

  async function handleCall() {
    if (!product?.company.phone) {
      return;
    }
    await Linking.openURL(`tel:${product.company.phone}`);
  }

  if (loading) {
    return (
      <AppScreen safeAreaEdges={["top"]} backgroundColor={colors.background} scrollable>
        <DetailSkeleton />
      </AppScreen>
    );
  }

  if (!product) {
    return <ScreenState title="Product unavailable" detail={error ?? "This product is no longer available."} />;
  }

  const hasWhatsApp = Boolean(product.company.whatsapp);
  const hasPhone = Boolean(product.company.phone);
  const specRows = [
    { label: "Purity", value: product.purity },
    { label: "Weight", value: product.weight },
    { label: "Length", value: product.length },
    { label: "Category", value: product.category },
    { label: "Subcategory", value: product.subcategory },
    { label: "Availability", value: product.availability },
  ].filter((item) => item.value);

  return (
    <AppScreen safeAreaEdges={["top"]} backgroundColor={colors.background}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Text style={styles.iconText}>{"<"}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => void handleToggleWishlist()} disabled={wishlistSubmitting}>
              <MaterialIcons
                name={product.is_wishlisted ? "favorite" : "favorite-border"}
                size={18}
                color={product.is_wishlisted ? colors.accentGold : colors.text}
              />
              <Text style={[styles.iconLabelText, product.is_wishlisted ? styles.savedIconText : null]}>
                {product.is_wishlisted ? "Saved" : "Save"}
              </Text>
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => void handleShare()}>
              <MaterialIcons name="share" size={18} color={colors.text} />
              <Text style={styles.iconLabelText}>Share</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 128 + Math.max(insets.bottom, spacing.md) }]} showsVerticalScrollIndicator={false}>
          <View style={styles.galleryCard}>
            <View style={styles.mainImageWrap}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage.url }} style={styles.mainImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderImageText}>{product.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
            </View>
            {product.images.length > 1 ? (
              <View style={styles.dotsRow}>
                {product.images.map((image, index) => (
                  <View key={`${image.url}-${index}`} style={[styles.dot, selectedImageIndex === index ? styles.dotActive : null]} />
                ))}
              </View>
            ) : null}
            {product.images.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
                {product.images.map((image, index) => (
                  <Pressable key={`${image.url}-${index}`} style={[styles.thumbnailButton, selectedImageIndex === index ? styles.thumbnailButtonActive : null]} onPress={() => setSelectedImageIndex(index)}>
                    <Image source={{ uri: image.url }} style={styles.thumbnailImage} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.section}>
            {product.collection_label ? <Text style={styles.collectionLabel}>{product.collection_label}</Text> : null}
            <Text style={styles.productTitle}>{product.name}</Text>
            {shortSpecs ? <Text style={styles.shortSpec}>{shortSpecs}</Text> : null}
          </View>

          <View style={styles.companyCard}>
            <View style={styles.companyInfo}>
              <View style={styles.companyLogoWrap}>
                {product.company.logo ? <Image source={{ uri: product.company.logo }} style={styles.companyLogo} /> : <Text style={styles.companyLogoFallback}>{getInitials(product.company.name)}</Text>}
              </View>
              <View style={styles.companyCopy}>
                <Text style={styles.companyName}>{product.company.name}</Text>
                <Text style={styles.companyLocation}>{product.company.location}</Text>
              </View>
            </View>
            <Pressable style={styles.companyButton} onPress={() => navigation.navigate("ProductSearch", { companyId: product.company.id, companyName: product.company.name })}>
              <Text style={styles.companyButtonText}>View Company</Text>
            </Pressable>
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Price Range</Text>
            <Text style={styles.priceValue}>{priceLabel}</Text>
            <Text style={styles.priceHint}>Final price may vary based on gold rate, making charge, and seller confirmation.</Text>
          </View>

          <View style={styles.actionStack}>
            <ActionButton label={submitting ? "Sending..." : "Request Final Price"} tone="gold" onPress={() => void handleRequestFinalPrice()} />
            <ActionButton label="WhatsApp Enquiry" tone="whatsapp" disabled={!hasWhatsApp} onPress={() => void handleWhatsApp()} />
            <ActionButton label="Call Seller" tone="dark" disabled={!hasPhone} onPress={() => void handleCall()} />
          </View>

          {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}

          <View style={styles.specsCard}>
            <Text style={styles.sectionLabel}>Product Specifications</Text>
            <View style={styles.specGrid}>
              {specRows.map((row) => (
                <View key={row.label} style={styles.specCell}>
                  <Text style={styles.specLabel}>{row.label}</Text>
                  <Text style={[styles.specValue, row.label === "Availability" ? styles.specValueSuccess : null]}>{row.value}</Text>
                </View>
              ))}
              {product.hallmark ? (
                <View style={[styles.specCell, styles.specCellWide]}>
                  <Text style={styles.specLabel}>Hallmark</Text>
                  <Text style={styles.specValue}>{product.hallmark}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {product.description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionLabel}>{product.description.length > 140 ? "Craftsmanship" : "Description"}</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <StickyAction label="Final Price" tone="gold" onPress={() => void handleRequestFinalPrice()} />
          <StickyAction label="WhatsApp" tone="whatsapp" disabled={!hasWhatsApp} onPress={() => void handleWhatsApp()} />
          <StickyAction label="Call" tone="dark" disabled={!hasPhone} onPress={() => void handleCall()} />
        </View>
      </View>
    </AppScreen>
  );
}

function ActionButton({
  label,
  tone,
  disabled = false,
  onPress,
}: {
  label: string;
  tone: "gold" | "whatsapp" | "dark";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.primaryButton, toneStyles[tone], disabled ? styles.buttonDisabled : null]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.primaryButtonText, disabled ? styles.buttonDisabledText : null]}>{label}</Text>
    </Pressable>
  );
}

function StickyAction({
  label,
  tone,
  disabled = false,
  onPress,
}: {
  label: string;
  tone: "gold" | "whatsapp" | "dark";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.stickyAction, toneStyles[tone], disabled ? styles.buttonDisabled : null]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.stickyActionText, disabled ? styles.buttonDisabledText : null]}>{label}</Text>
    </Pressable>
  );
}

function buildWhatsAppMessage(product: ProductDetail) {
  const lines = [
    "Hello, I am interested in this product:",
    "",
    `Product: ${product.name}`,
    product.purity ? `Purity: ${product.purity}` : null,
    product.weight ? `Weight: ${product.weight}` : null,
    "",
    "Please share the final price and availability.",
    product.share_url ? product.share_url : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function formatPriceLabel(product: ProductDetail | null) {
  if (!product?.price_min && !product?.price_max) {
    return "Price available on request";
  }

  const min = product.price_min ? formatCurrency(product.price_min) : null;
  const max = product.price_max ? formatCurrency(product.price_max) : null;

  if (min && max && min !== max) {
    return `${min} - ${max}`;
  }

  return min ?? max ?? "Price available on request";
}

function formatCurrency(value: string) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `Rs. ${value}`;
  }
  return `Rs. ${numericValue.toLocaleString("en-IN")}`;
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

const toneStyles = StyleSheet.create({
  gold: { backgroundColor: colors.accentGold },
  whatsapp: { backgroundColor: "#25D366" },
  dark: { backgroundColor: colors.text },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconButton: {
    minWidth: 52,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  iconText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  iconLabelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  savedIconText: {
    color: colors.accentGold,
  },
  disabledIconButton: {
    opacity: 0.5,
  },
  disabledIconText: {
    color: colors.mutedText,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  galleryCard: {
    gap: spacing.md,
  },
  mainImageWrap: {
    height: 360,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderImageText: {
    color: colors.mutedText,
    fontSize: 40,
    fontWeight: "800",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CFC9C7",
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.text,
  },
  thumbnailRow: {
    gap: spacing.sm,
  },
  thumbnailButton: {
    width: 68,
    height: 68,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailButtonActive: {
    borderColor: colors.accentGold,
    borderWidth: 2,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  section: {
    gap: spacing.xs,
  },
  collectionLabel: {
    color: colors.accentGold,
    ...typography.eyebrow,
  },
  productTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  shortSpec: {
    color: colors.mutedText,
    fontSize: 16,
  },
  companyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  companyLogoWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  companyLogo: {
    width: "100%",
    height: "100%",
  },
  companyLogoFallback: {
    color: colors.text,
    fontWeight: "800",
  },
  companyCopy: {
    flex: 1,
  },
  companyName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  companyLocation: {
    color: colors.mutedText,
    marginTop: 2,
  },
  companyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
  },
  companyButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  priceCard: {
    gap: spacing.xs,
  },
  priceLabel: {
    color: colors.mutedText,
    ...typography.eyebrow,
  },
  priceValue: {
    color: colors.accentGold,
    fontSize: 30,
    fontWeight: "800",
  },
  priceHint: {
    color: colors.mutedText,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  actionStack: {
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  actionMessage: {
    color: colors.text,
    fontSize: 13,
  },
  specsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    color: colors.mutedText,
    ...typography.eyebrow,
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  specCell: {
    width: "50%",
    minHeight: 74,
    padding: spacing.md,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  specCellWide: {
    width: "100%",
    borderRightWidth: 0,
  },
  specLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  specValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  specValueSuccess: {
    color: colors.positive,
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  descriptionText: {
    color: colors.mutedText,
    ...typography.body,
  },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  stickyAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  stickyActionText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    backgroundColor: "#D7D4D3",
  },
  buttonDisabledText: {
    color: "#666A6A",
  },
  skeletonBlock: {
    backgroundColor: "#ECE7E7",
  },
});

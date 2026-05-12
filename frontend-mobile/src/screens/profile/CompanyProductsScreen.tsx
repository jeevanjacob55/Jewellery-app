import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { uploadBinary } from "../../api/client";
import {
  attachProductImage,
  getCompanyOptions,
  createCompanyProduct,
  createProductImageUploadSession,
  finalizeProductMediaAsset,
  getCompanyManagementDetail,
  getMarketFilterConfig,
  getRegionHierarchy,
  updateCompanyProduct,
} from "../../api/market";
import { AppScreen } from "../../components/AppScreen";
import { FilterChip } from "../../components/FilterChip";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import {
  AudienceTargetInput,
  CompanyOption,
  CompanyManagementDetail,
  CompanyManagementProduct,
  CompanyManagementProductImage,
  ProductFilterCategory,
  ProductFilterConfigResponse,
  RegionState,
} from "../../types/api";

type ProductStatusFilter = "all" | "active" | "inactive";
type EditorMode = "create" | "edit";

type ProductFormState = {
  name: string;
  categoryId: number | null;
  subcategoryId: number | null;
  weightGrams: string;
  purity: string;
  price: string;
  description: string;
  isActive: boolean;
  includeTargets: AudienceDraft[];
  excludeTargets: AudienceDraft[];
};

type AudienceDraft = {
  key: string;
  targetType: AudienceTargetInput["target_type"];
  targetId: string;
};

type HierarchyOption = {
  id: number;
  label: string;
};

const PRODUCT_TARGET_TYPE_LABELS: Record<AudienceTargetInput["target_type"], string> = {
  platform: "Platform",
  state: "State",
  association: "Association",
  unit: "Unit",
  company: "Company",
  user: "User",
};

let nextAudienceDraftId = 1;

function createAudienceDraft(
  targetType: AudienceTargetInput["target_type"] = "platform",
  targetId = "",
): AudienceDraft {
  const key = `mobile-product-audience-${nextAudienceDraftId}`;
  nextAudienceDraftId += 1;
  return {
    key,
    targetType,
    targetId,
  };
}

function buildAudienceDrafts(product: CompanyManagementProduct | null, mode: "include" | "exclude") {
  if (!product) {
    return mode === "include" ? [createAudienceDraft("platform")] : [];
  }

  const drafts = product.targets
    .filter((target) => target.mode === mode)
    .map((target) => createAudienceDraft(target.target_type, target.target_id ? String(target.target_id) : ""));

  if (mode === "include" && !drafts.length) {
    return [createAudienceDraft("platform")];
  }
  return drafts;
}

function buildEmptyFormState(categories: ProductFilterCategory[] = [], purityOptions: string[] = []): ProductFormState {
  return {
    name: "",
    categoryId: categories[0]?.id ?? null,
    subcategoryId: null,
    weightGrams: "",
    purity: purityOptions[0] ?? "22K",
    price: "",
    description: "",
    isActive: false,
    includeTargets: [createAudienceDraft("platform")],
    excludeTargets: [],
  };
}

function buildEditFormState(product: CompanyManagementProduct): ProductFormState {
  return {
    name: product.name,
    categoryId: product.category_id,
    subcategoryId: product.subcategory_id,
    weightGrams: product.weight_grams,
    purity: product.purity,
    price: product.price ?? "",
    description: product.description,
    isActive: product.is_active,
    includeTargets: buildAudienceDrafts(product, "include"),
    excludeTargets: buildAudienceDrafts(product, "exclude"),
  };
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "PR";
}

function formatPrice(value: string | null) {
  if (!value) {
    return "Price on request";
  }
  return `Rs ${value}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getStatusTone(isActive: boolean) {
  return isActive ? colors.positive : "#7E7576";
}

function getProductVisibilityTitle(product: CompanyManagementProduct) {
  return product.visibility.status === "visible" ? "Visible now" : "Hidden from public view";
}

function getProductVisibilityTone(product: CompanyManagementProduct) {
  return product.visibility.status === "visible" ? colors.positive : "#B14444";
}

function getAudienceTargetTypeLabel(targetType: AudienceTargetInput["target_type"]) {
  return PRODUCT_TARGET_TYPE_LABELS[targetType];
}

function formatAudienceTargetLabel(
  targetType: AudienceTargetInput["target_type"],
  targetId: string,
  options: HierarchyOption[],
) {
  if (targetType === "platform") {
    return "Platform-wide audience";
  }

  const matchedOption = options.find((option) => String(option.id) === targetId);
  if (matchedOption) {
    return `${getAudienceTargetTypeLabel(targetType)}: ${matchedOption.label}`;
  }

  if (targetId.trim()) {
    return `${getAudienceTargetTypeLabel(targetType)} #${targetId.trim()}`;
  }

  return `${getAudienceTargetTypeLabel(targetType)} target`;
}

function buildEditorVisibilityPreview(
  isActive: boolean,
  includeTargets: AudienceDraft[],
  excludeTargets: AudienceDraft[],
  company: CompanyManagementDetail["company"] | null,
  getTargetOptions: (targetType: AudienceTargetInput["target_type"]) => HierarchyOption[],
) {
  const blockers: string[] = [];

  if (!isActive) {
    blockers.push("This product is saved as a hidden draft.");
  }
  if (company && !company.is_active) {
    blockers.push("The company profile is inactive.");
  }
  if (company && !company.is_approved) {
    blockers.push("The company is awaiting admin approval.");
  }
  if (!includeTargets.length) {
    blockers.push("Add at least one audience include target.");
  }

  const includeLabels = includeTargets.map((item) => formatAudienceTargetLabel(item.targetType, item.targetId, getTargetOptions(item.targetType)));
  const excludeLabels = excludeTargets.map((item) => formatAudienceTargetLabel(item.targetType, item.targetId, getTargetOptions(item.targetType)));

  if (blockers.length) {
    return {
      status: "hidden" as const,
      title: "Hidden from public view",
      audienceLabel: "Only company managers and admins can access it from management screens.",
      detail: "The product will stay out of the public catalog until every blocker is cleared.",
      blockers,
    };
  }

  const isPlatformOnly =
    includeTargets.length === 1 &&
    includeTargets[0]?.targetType === "platform" &&
    !includeTargets[0]?.targetId &&
    excludeTargets.length === 0;

  const detailParts = [
    includeLabels.length ? `Included audiences: ${includeLabels.join(", ")}.` : "No audiences selected yet.",
  ];
  if (excludeLabels.length) {
    detailParts.push(`Excluded audiences: ${excludeLabels.join(", ")}.`);
  }
  detailParts.push(
    company?.is_market_visible
      ? "Visible in public product search, product details, wishlist, and enquiry flows."
      : "Visible in public product search, product details, wishlist, and enquiry flows. Market screen placement is controlled separately and is currently hidden for this company.",
  );

  return {
    status: "visible" as const,
    title: isPlatformOnly ? "Public listing" : "Targeted listing",
    audienceLabel: isPlatformOnly
      ? "Public catalog visitors, signed-in members, and admins can view it."
      : "Only matching signed-in users, company managers, and admins can view this product.",
    detail: detailParts.join(" "),
    blockers: [],
  };
}

function parseAudienceTargetDraft(item: AudienceDraft, label: string): AudienceTargetInput {
  if (item.targetType === "platform") {
    return {
      target_type: "platform",
      target_id: null,
    };
  }

  const parsedId = Number(item.targetId);
  if (!Number.isInteger(parsedId) || parsedId < 1) {
    throw new Error(`${label} needs a valid target id.`);
  }

  return {
    target_type: item.targetType,
    target_id: parsedId,
  };
}

export function CompanyProductsScreen() {
  const navigation = useNavigation<any>();
  const { me, status } = useSession();
  const companyId = me?.company?.id ?? null;
  const isCompanyAdmin = Boolean(me?.user.has_company && me.company && me.user.can_manage_products && !me.user.is_admin);

  const [management, setManagement] = useState<CompanyManagementDetail | null>(null);
  const [filterConfig, setFilterConfig] = useState<ProductFilterConfigResponse | null>(null);
  const [hierarchy, setHierarchy] = useState<RegionState[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOptionsError, setFormOptionsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(buildEmptyFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [imageManagerProductId, setImageManagerProductId] = useState<number | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);

  const categories = filterConfig?.categories ?? [];
  const purityOptions = filterConfig?.purity_options ?? ["18K", "22K", "24K"];

  useEffect(() => {
    if (!isCompanyAdmin || !companyId) {
      setLoading(false);
      return;
    }

    void loadWorkspace({ showLoader: true });
  }, [companyId, isCompanyAdmin]);

  const filteredProducts = useMemo(() => {
    const products = management?.products ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      if (statusFilter === "active" && !product.is_active) {
        return false;
      }
      if (statusFilter === "inactive" && product.is_active) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        product.name,
        product.category_name,
        product.subcategory_name ?? "",
        product.purity,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [management?.products, query, statusFilter]);

  const imageManagerProduct = useMemo(
    () => management?.products.find((product) => product.id === imageManagerProductId) ?? null,
    [imageManagerProductId, management?.products],
  );

  const stateOptions = useMemo<HierarchyOption[]>(
    () => hierarchy.map((state) => ({ id: state.id, label: state.name })),
    [hierarchy],
  );

  const associationOptions = useMemo<HierarchyOption[]>(
    () =>
      hierarchy.flatMap((state) =>
        state.associations.map((association) => ({
          id: association.id,
          label: `${association.name} (${state.name})`,
        })),
      ),
    [hierarchy],
  );

  const unitOptions = useMemo<HierarchyOption[]>(
    () =>
      hierarchy.flatMap((state) =>
        state.associations.flatMap((association) =>
          association.district_units.flatMap((districtUnit) =>
            districtUnit.units.map((unit) => ({
              id: unit.id,
              label: `${unit.name} (${districtUnit.name}, ${association.name})`,
            })),
          ),
        ),
      ),
    [hierarchy],
  );

  const selectableCompanyOptions = useMemo<HierarchyOption[]>(
    () =>
      companyOptions.map((company) => ({
        id: company.id,
        label: `${company.name}${company.city ? ` (${company.city}, ${company.state})` : ""}`,
      })),
    [companyOptions],
  );

  const getTargetOptions = useMemo(
    () => (targetType: AudienceTargetInput["target_type"]) => {
      if (targetType === "state") {
        return stateOptions;
      }
      if (targetType === "association") {
        return associationOptions;
      }
      if (targetType === "unit") {
        return unitOptions;
      }
      if (targetType === "company") {
        return selectableCompanyOptions;
      }
      return [];
    },
    [associationOptions, selectableCompanyOptions, stateOptions, unitOptions],
  );

  const editorVisibility = useMemo(
    () =>
      buildEditorVisibilityPreview(
        formState.isActive,
        formState.includeTargets,
        formState.excludeTargets,
        management?.company ?? null,
        getTargetOptions,
      ),
    [formState.excludeTargets, formState.includeTargets, formState.isActive, getTargetOptions, management?.company],
  );

  const hasProducts = Boolean(management?.products.length);
  const isSearchEmpty = hasProducts && filteredProducts.length === 0;

  async function loadWorkspace({ showLoader = false, showRefresh = false }: { showLoader?: boolean; showRefresh?: boolean } = {}) {
    if (!companyId) {
      setError("No linked company is available for this account.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else if (showLoader || !management) {
      setLoading(true);
    }

    try {
      const [managementResult, filterResult, hierarchyResult, companyOptionsResult] = await Promise.allSettled([
        getCompanyManagementDetail(companyId),
        getMarketFilterConfig(),
        getRegionHierarchy(),
        getCompanyOptions(),
      ]);

      if (managementResult.status === "rejected") {
        throw managementResult.reason;
      }

      setManagement(managementResult.value);
      setError(null);

      const optionErrors: string[] = [];

      if (filterResult.status === "fulfilled") {
        setFilterConfig(filterResult.value);
      } else {
        optionErrors.push("Product categories could not be refreshed.");
      }

      if (hierarchyResult.status === "fulfilled") {
        setHierarchy(hierarchyResult.value);
      } else {
        optionErrors.push("Audience region options could not be refreshed.");
      }

      if (companyOptionsResult.status === "fulfilled") {
        setCompanyOptions(companyOptionsResult.value);
      } else {
        optionErrors.push("Company audience options could not be refreshed.");
      }

      setFormOptionsError(optionErrors.length ? `${optionErrors.join(" ")} Existing products are still available.` : null);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load your company products right now."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openCreateModal() {
    setEditorMode("create");
    setEditingProductId(null);
    setFormError(null);
    setFormState(buildEmptyFormState(categories, purityOptions));
    setEditorVisible(true);
  }

  function openEditModal(product: CompanyManagementProduct) {
    setEditorMode("edit");
    setEditingProductId(product.id);
    setFormError(null);
    setFormState(buildEditFormState(product));
    setEditorVisible(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }
    setEditorVisible(false);
    setFormError(null);
  }

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setFormState((currentValue) => ({ ...currentValue, [key]: value }));
  }

  function updateAudienceDraft(mode: "include" | "exclude", key: string, patch: Partial<AudienceDraft>) {
    const field = mode === "include" ? "includeTargets" : "excludeTargets";
    setFormState((current) => ({
      ...current,
      [field]: current[field].map((item) => {
        if (item.key !== key) {
          return item;
        }
        const nextItem = { ...item, ...patch };
        if (patch.targetType === "platform") {
          nextItem.targetId = "";
        }
        return nextItem;
      }),
    }));
  }

  function addAudienceDraft(mode: "include" | "exclude") {
    const field = mode === "include" ? "includeTargets" : "excludeTargets";
    setFormState((current) => ({
      ...current,
      [field]: [...current[field], createAudienceDraft("platform")],
    }));
  }

  function removeAudienceDraft(mode: "include" | "exclude", key: string) {
    const field = mode === "include" ? "includeTargets" : "excludeTargets";
    setFormState((current) => {
      const nextItems = current[field].filter((item) => item.key !== key);
      return {
        ...current,
        [field]: mode === "include" && !nextItems.length ? [createAudienceDraft("platform")] : nextItems,
      };
    });
  }

  function getSubcategoryOptions(categoryId: number | null) {
    return categories.find((category) => category.id === categoryId)?.subcategories ?? [];
  }

  function renderAudienceTargetField(mode: "include" | "exclude", item: AudienceDraft) {
    if (item.targetType === "platform") {
      return (
        <View style={styles.audienceHelperCard}>
          <Text style={styles.audienceHelperTitle}>Platform audience</Text>
          <Text style={styles.audienceHelperCopy}>This target applies globally and does not need an id.</Text>
        </View>
      );
    }

    const options = getTargetOptions(item.targetType);
    const quickOptions = options.slice(0, 12);
    const hasMoreOptions = options.length > quickOptions.length;

    return (
      <View style={styles.audienceFieldStack}>
        <Text style={styles.audienceFieldLabel}>Target id</Text>
        <TextInput
          value={item.targetId}
          onChangeText={(value) => updateAudienceDraft(mode, item.key, { targetId: value })}
          placeholder={item.targetType === "user" ? "Enter user id" : "Enter target id"}
          placeholderTextColor="#7E7576"
          keyboardType="number-pad"
          style={styles.fieldInput}
        />
        {quickOptions.length ? (
          <>
            <Text style={styles.audienceFieldLabel}>Quick select</Text>
            <View style={styles.chipWrap}>
              {quickOptions.map((option) => (
                <FilterChip
                  key={`${item.key}-${option.id}`}
                  label={option.label}
                  selected={item.targetId === String(option.id)}
                  onPress={() => updateAudienceDraft(mode, item.key, { targetId: String(option.id) })}
                />
              ))}
            </View>
            {hasMoreOptions ? (
              <Text style={styles.helperText}>More options are available. You can also type a target id directly.</Text>
            ) : null}
          </>
        ) : null}
      </View>
    );
  }

  async function handleSaveProduct() {
    if (!companyId) {
      setFormError("No linked company is available for this account.");
      return;
    }

    if (!formState.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!formState.categoryId) {
      setFormError("Choose a category before saving the product.");
      return;
    }
    if (!formState.weightGrams.trim()) {
      setFormError("Weight is required.");
      return;
    }
    if (!formState.purity.trim()) {
      setFormError("Purity is required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formState.name.trim(),
        category: formState.categoryId,
        subcategory: formState.subcategoryId,
        weight_grams: formState.weightGrams.trim(),
        purity: formState.purity.trim(),
        price: formState.price.trim() ? formState.price.trim() : null,
        description: formState.description.trim(),
        is_active: formState.isActive,
        include_targets: formState.includeTargets.map((item, index) => parseAudienceTargetDraft(item, `Include target ${index + 1}`)),
        exclude_targets: formState.excludeTargets.map((item, index) => parseAudienceTargetDraft(item, `Exclude target ${index + 1}`)),
      };

      if (editorMode === "create") {
        const createdProduct = await createCompanyProduct(companyId, payload);
        await loadWorkspace();
        setEditorVisible(false);
        setImageMessage("Product created. Add images before activating it if your tier requires photo minimums.");
        setImageManagerProductId(createdProduct.id);
      } else if (editingProductId) {
        await updateCompanyProduct(companyId, editingProductId, payload);
        await loadWorkspace();
        setEditorVisible(false);
      }
    } catch (saveError) {
      setFormError(getErrorMessage(saveError, "Unable to save the product right now."));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleProduct(product: CompanyManagementProduct) {
    if (!companyId) {
      return;
    }

    setActionProductId(product.id);
    try {
      await updateCompanyProduct(companyId, product.id, { is_active: !product.is_active });
      await loadWorkspace();
    } catch (toggleError) {
      Alert.alert("Unable to update product", getErrorMessage(toggleError, "Try again in a moment."));
    } finally {
      setActionProductId(null);
    }
  }

  async function handleAddImage(product: CompanyManagementProduct) {
    if (!companyId) {
      return;
    }

    setImageBusy(true);
    setImageMessage(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setImageMessage("Media library permission is required to add a product image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const filename = asset.fileName ?? asset.uri.split("/").pop() ?? "product-image.jpg";
      const uploadSession = await createProductImageUploadSession(companyId, product.id, filename);
      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();
      const mimeType = asset.mimeType ?? blob.type ?? "image/jpeg";

      await uploadBinary(uploadSession.upload_url, blob, mimeType);

      const finalizedAsset = await finalizeProductMediaAsset(companyId, product.id, {
        object_key: uploadSession.object_key,
        bucket_name: uploadSession.bucket_name,
        original_filename: filename,
        mime_type: mimeType,
        file_size: blob.size,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
      });

      await attachProductImage(companyId, product.id, finalizedAsset.asset_id);
      await loadWorkspace();
      setImageManagerProductId(product.id);
      setImageMessage("Product image uploaded successfully.");
    } catch (uploadError) {
      setImageMessage(getErrorMessage(uploadError, "Unable to upload the product image right now."));
    } finally {
      setImageBusy(false);
    }
  }

  function handleRemoveImage(product: CompanyManagementProduct, image: CompanyManagementProductImage) {
    Alert.alert("Remove image", "This will remove the image from this product.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeImage(product, image);
        },
      },
    ]);
  }

  async function removeImage(product: CompanyManagementProduct, image: CompanyManagementProductImage) {
    if (!companyId) {
      return;
    }

    setImageBusy(true);
    setImageMessage(null);
    try {
      const nextAssetIds = product.images
        .filter((item) => item.asset_id !== image.asset_id)
        .map((item) => item.asset_id);

      await updateCompanyProduct(companyId, product.id, {
        image_asset_ids: nextAssetIds,
      });
      await loadWorkspace();
      setImageManagerProductId(product.id);
      setImageMessage("Product image removed.");
    } catch (removeError) {
      setImageMessage(getErrorMessage(removeError, "Unable to remove the product image right now."));
    } finally {
      setImageBusy(false);
    }
  }

  if (status !== "authenticated") {
    return <ScreenState title="Member login required" detail="Manage Products is reserved for authenticated company admins." />;
  }

  if (!companyId) {
    return <ScreenState title="Products unavailable" detail="No linked company is available for this account." />;
  }

  if (!isCompanyAdmin) {
    return <ScreenState title="Products unavailable" detail="This workspace is visible only to company admins linked to a company account." />;
  }

  if (loading && !management) {
    return <ScreenState title="Loading product workspace" detail="Fetching your company catalog and tier limits." loading />;
  }

  if (!management) {
    return <ScreenState title="Products unavailable" detail={error ?? "Unable to load your company products right now."} />;
  }

  const { company } = management;
  const subcategoryOptions = getSubcategoryOptions(formState.categoryId);

  return (
    <>
      <AppScreen
        safeAreaEdges={["top", "bottom"]}
        backgroundColor={colors.background}
        scrollable
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadWorkspace({ showRefresh: true })} tintColor={colors.text} />}
        contentContainerStyle={styles.content}
      >
        <SurfaceCard>
          <Text style={styles.eyebrow}>Company Admin Workspace</Text>
          <Text style={styles.title}>{company.name}</Text>
          <Text style={styles.subtitle}>Manage your live catalog, product drafts, and tier-aware image requirements from mobile.</Text>

          <View style={styles.planBanner}>
            <View style={styles.planCopy}>
              <Text style={styles.planLabel}>Current Plan</Text>
              <Text style={styles.planValue}>{company.tier.name}</Text>
            </View>
            <MaterialIcons name="inventory-2" size={34} color="#775A19" />
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {company.active_product_count}/{company.tier.max_products}
              </Text>
              <Text style={styles.metricLabel}>Live products</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{company.total_product_count}</Text>
              <Text style={styles.metricLabel}>Total products</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {company.tier.min_photos_per_product}-{company.tier.max_photos_per_product}
              </Text>
              <Text style={styles.metricLabel}>Photos per live product</Text>
            </View>
          </View>

          <View style={styles.primaryActionRow}>
            <Pressable style={styles.primaryButton} onPress={openCreateModal}>
              <MaterialIcons name="add-circle-outline" size={18} color={colors.surface} />
              <Text style={styles.primaryButtonText}>Add Product</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("CompanyPlan")}>
              <MaterialIcons name="receipt-long" size={18} color={colors.text} />
              <Text style={styles.secondaryButtonText}>View Plan</Text>
            </Pressable>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.searchRow}>
            <View style={styles.searchFieldWrap}>
              <MaterialIcons name="search" size={20} color="#4C4546" style={styles.searchIcon} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search products, categories, or purity"
                placeholderTextColor="#7E7576"
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <FilterChip label="All" selected={statusFilter === "all"} onPress={() => setStatusFilter("all")} />
            <FilterChip label="Active" selected={statusFilter === "active"} onPress={() => setStatusFilter("active")} />
            <FilterChip label="Inactive" selected={statusFilter === "inactive"} onPress={() => setStatusFilter("inactive")} />
          </View>
        </SurfaceCard>

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        {formOptionsError ? <Text style={styles.inlineNote}>{formOptionsError}</Text> : null}

        <SurfaceCard>
          <Text style={styles.sectionEyebrow}>Admin Portal Split</Text>
          <Text style={styles.portalNote}>
            Mobile is optimized for quick product operations. Bulk imports, dense catalog edits, and advanced reporting should stay in the full admin portal.
          </Text>
        </SurfaceCard>

        {isSearchEmpty ? (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>No products matched your search</Text>
            <Text style={styles.emptyDetail}>Try a different product name, category, or status filter.</Text>
          </SurfaceCard>
        ) : hasProducts ? (
          filteredProducts.map((product) => {
            const previewImage = product.images[0]?.url ?? null;
            const isBusy = actionProductId === product.id || imageBusy;

            return (
              <SurfaceCard key={product.id}>
                <View style={styles.productHeader}>
                  <View style={styles.productVisual}>
                    {previewImage ? (
                      <Image source={{ uri: previewImage }} style={styles.productVisualImage} />
                    ) : (
                      <Text style={styles.productVisualFallback}>{getInitials(product.name)}</Text>
                    )}
                  </View>
                  <View style={styles.productHeaderCopy}>
                    <View style={styles.productTitleRow}>
                      <Text style={styles.productTitle}>{product.name}</Text>
                      <View style={[styles.statusPill, { backgroundColor: `${getStatusTone(product.is_active)}18` }]}>
                        <Text style={[styles.statusPillText, { color: getStatusTone(product.is_active) }]}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.productMeta}>
                      {product.category_name}
                      {product.subcategory_name ? ` · ${product.subcategory_name}` : ""}
                    </Text>
                    <Text style={styles.productMeta}>
                      {product.purity} · {product.weight_grams}g
                    </Text>
                    <Text style={styles.productMeta}>{formatPrice(product.price)}</Text>
                  </View>
                </View>

                {product.description ? (
                  <Text style={styles.productDescription} numberOfLines={3}>
                    {product.description}
                  </Text>
                ) : null}

                <View style={styles.visibilityPanel}>
                  <Text style={styles.visibilityLabel}>Visibility</Text>
                  <Text style={[styles.visibilityTitle, { color: getProductVisibilityTone(product) }]}>{getProductVisibilityTitle(product)}</Text>
                  <Text style={styles.visibilityCopy}>{product.visibility.audience_label}</Text>
                  <Text style={styles.visibilityCopy}>{product.visibility.detail}</Text>
                  {product.visibility.blockers.map((blocker) => (
                    <Text key={blocker} style={styles.visibilityBlocker}>
                      - {blocker}
                    </Text>
                  ))}
                </View>

                <View style={styles.productFooter}>
                  <Text style={styles.imageCountLabel}>{product.image_count} image(s) attached</Text>
                  <View style={styles.productActionRow}>
                    <Pressable style={styles.smallActionButton} onPress={() => openEditModal(product)} disabled={isBusy}>
                      <Text style={styles.smallActionButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.smallActionButton} onPress={() => setImageManagerProductId(product.id)} disabled={isBusy}>
                      <Text style={styles.smallActionButtonText}>Images</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallActionButton, styles.smallActionButtonDark]}
                      onPress={() => void handleToggleProduct(product)}
                      disabled={isBusy}
                    >
                      <Text style={[styles.smallActionButtonText, styles.smallActionButtonDarkText]}>
                        {actionProductId === product.id ? "Saving..." : product.is_active ? "Deactivate" : "Activate"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </SurfaceCard>
            );
          })
        ) : (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>No products created yet</Text>
            <Text style={styles.emptyDetail}>Add your first product, then upload images and activate it when it meets your tier rules.</Text>
          </SurfaceCard>
        )}
      </AppScreen>

      <Modal visible={editorVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditor}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.modalHeaderButton} onPress={closeEditor} disabled={saving}>
              <MaterialIcons name="close" size={22} color="#1B1C1C" />
            </Pressable>
            <Text style={styles.modalTitle}>{editorMode === "create" ? "Add Product" : "Edit Product"}</Text>
            <Pressable style={[styles.modalSaveButton, saving ? styles.disabledButton : null]} onPress={() => void handleSaveProduct()} disabled={saving}>
              <Text style={styles.modalSaveButtonText}>{saving ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Product name</Text>
            <TextInput
              value={formState.name}
              onChangeText={(value) => updateForm("name", value)}
              placeholder="Enter product name"
              placeholderTextColor="#7E7576"
              style={styles.fieldInput}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipWrap}>
              {categories.map((category) => (
                <FilterChip
                  key={category.id}
                  label={category.name}
                  selected={formState.categoryId === category.id}
                  onPress={() => {
                    updateForm("categoryId", category.id);
                    updateForm("subcategoryId", null);
                  }}
                />
              ))}
            </View>

            {subcategoryOptions.length ? (
              <>
                <Text style={styles.fieldLabel}>Subcategory</Text>
                <View style={styles.chipWrap}>
                  <FilterChip label="None" selected={formState.subcategoryId === null} onPress={() => updateForm("subcategoryId", null)} />
                  {subcategoryOptions.map((subcategory) => (
                    <FilterChip
                      key={subcategory.id}
                      label={subcategory.name}
                      selected={formState.subcategoryId === subcategory.id}
                      onPress={() => updateForm("subcategoryId", subcategory.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.inlineFieldGrid}>
              <View style={styles.inlineField}>
                <Text style={styles.fieldLabel}>Weight (g)</Text>
                <TextInput
                  value={formState.weightGrams}
                  onChangeText={(value) => updateForm("weightGrams", value)}
                  placeholder="0.00"
                  placeholderTextColor="#7E7576"
                  keyboardType="decimal-pad"
                  style={styles.fieldInput}
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.fieldLabel}>Price</Text>
                <TextInput
                  value={formState.price}
                  onChangeText={(value) => updateForm("price", value)}
                  placeholder="Optional"
                  placeholderTextColor="#7E7576"
                  keyboardType="decimal-pad"
                  style={styles.fieldInput}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Purity</Text>
            <View style={styles.chipWrap}>
              {purityOptions.map((purity) => (
                <FilterChip key={purity} label={purity} selected={formState.purity === purity} onPress={() => updateForm("purity", purity)} />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={formState.description}
              onChangeText={(value) => updateForm("description", value)}
              placeholder="Add notes, styling details, or production context"
              placeholderTextColor="#7E7576"
              style={[styles.fieldInput, styles.descriptionInput]}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Product visibility</Text>
            <View style={styles.visibilityOptionGrid}>
              <Pressable
                style={[styles.visibilityOption, !formState.isActive ? styles.visibilityOptionActive : null]}
                onPress={() => updateForm("isActive", false)}
              >
                <Text style={[styles.visibilityOptionTitle, !formState.isActive ? styles.visibilityOptionTitleActive : null]}>Hidden draft</Text>
                <Text style={styles.visibilityOptionCopy}>Keep it off the public catalog while you prepare details and images.</Text>
              </Pressable>
              <Pressable
                style={[styles.visibilityOption, formState.isActive ? styles.visibilityOptionActive : null]}
                onPress={() => updateForm("isActive", true)}
              >
                <Text style={[styles.visibilityOptionTitle, formState.isActive ? styles.visibilityOptionTitleActive : null]}>Public listing</Text>
                <Text style={styles.visibilityOptionCopy}>Turn on public visibility rules once audience targets and company approval are ready.</Text>
              </Pressable>
            </View>

            <View style={styles.audienceSection}>
              <View style={styles.audienceSectionHeader}>
                <View style={styles.audienceSectionCopy}>
                  <Text style={styles.audienceSectionLabel}>Include targets</Text>
                  <Text style={styles.audienceSectionTitle}>Who should be able to view this product</Text>
                </View>
                <Pressable style={styles.audienceActionButton} onPress={() => addAudienceDraft("include")}>
                  <Text style={styles.audienceActionButtonText}>Add</Text>
                </Pressable>
              </View>

              {formState.includeTargets.map((item, index) => (
                <View key={item.key} style={styles.audienceCard}>
                  <View style={styles.audienceRowHeader}>
                    <Text style={styles.audienceCardTitle}>Include target {index + 1}</Text>
                    <Pressable
                      style={[styles.removeImageButton, formState.includeTargets.length === 1 ? styles.disabledButton : null]}
                      onPress={() => removeAudienceDraft("include", item.key)}
                      disabled={formState.includeTargets.length === 1}
                    >
                      <MaterialIcons name="delete-outline" size={18} color={colors.negative} />
                    </Pressable>
                  </View>
                  <View style={styles.chipWrap}>
                    {Object.entries(PRODUCT_TARGET_TYPE_LABELS).map(([value, label]) => (
                      <FilterChip
                        key={`${item.key}-include-${value}`}
                        label={label}
                        selected={item.targetType === value}
                        onPress={() =>
                          updateAudienceDraft("include", item.key, {
                            targetType: value as AudienceTargetInput["target_type"],
                            targetId: "",
                          })
                        }
                      />
                    ))}
                  </View>
                  {renderAudienceTargetField("include", item)}
                </View>
              ))}
            </View>

            <View style={styles.audienceSection}>
              <View style={styles.audienceSectionHeader}>
                <View style={styles.audienceSectionCopy}>
                  <Text style={styles.audienceSectionLabel}>Exclude targets</Text>
                  <Text style={styles.audienceSectionTitle}>Optional audience overrides to hide this product</Text>
                </View>
                <Pressable style={styles.audienceActionButton} onPress={() => addAudienceDraft("exclude")}>
                  <Text style={styles.audienceActionButtonText}>Add</Text>
                </Pressable>
              </View>

              {formState.excludeTargets.length ? (
                formState.excludeTargets.map((item, index) => (
                  <View key={item.key} style={styles.audienceCard}>
                    <View style={styles.audienceRowHeader}>
                      <Text style={styles.audienceCardTitle}>Exclude target {index + 1}</Text>
                      <Pressable style={styles.removeImageButton} onPress={() => removeAudienceDraft("exclude", item.key)}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.negative} />
                      </Pressable>
                    </View>
                    <View style={styles.chipWrap}>
                      {Object.entries(PRODUCT_TARGET_TYPE_LABELS).map(([value, label]) => (
                        <FilterChip
                          key={`${item.key}-exclude-${value}`}
                          label={label}
                          selected={item.targetType === value}
                          onPress={() =>
                            updateAudienceDraft("exclude", item.key, {
                              targetType: value as AudienceTargetInput["target_type"],
                              targetId: "",
                            })
                          }
                        />
                      ))}
                    </View>
                    {renderAudienceTargetField("exclude", item)}
                  </View>
                ))
              ) : (
                <View style={styles.audienceHelperCard}>
                  <Text style={styles.audienceHelperTitle}>No exclusions yet</Text>
                  <Text style={styles.audienceHelperCopy}>
                    Add an exclusion only when a matching audience should be blocked even though it was included above.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.editorVisibilityPanel}>
              <Text style={[styles.visibilityTitle, { color: editorVisibility.status === "visible" ? colors.positive : "#B14444" }]}>
                {editorVisibility.title}
              </Text>
              <Text style={styles.visibilityCopy}>{editorVisibility.audienceLabel}</Text>
              <Text style={styles.visibilityCopy}>{editorVisibility.detail}</Text>
              {editorVisibility.blockers.map((blocker) => (
                <Text key={blocker} style={styles.visibilityBlocker}>
                  - {blocker}
                </Text>
              ))}
            </View>

            <Text style={styles.helperText}>
              Active products must stay within your plan limits: max {company.tier.max_products} live products and {company.tier.min_photos_per_product}-
              {company.tier.max_photos_per_product} images per live product.
            </Text>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={Boolean(imageManagerProduct)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!imageBusy) {
            setImageManagerProductId(null);
            setImageMessage(null);
          }
        }}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalHeaderButton}
              onPress={() => {
                if (!imageBusy) {
                  setImageManagerProductId(null);
                  setImageMessage(null);
                }
              }}
              disabled={imageBusy}
            >
              <MaterialIcons name="close" size={22} color="#1B1C1C" />
            </Pressable>
            <Text style={styles.modalTitle}>Manage Images</Text>
            <Pressable
              style={[styles.modalSaveButton, imageBusy ? styles.disabledButton : null]}
              onPress={() => imageManagerProduct && void handleAddImage(imageManagerProduct)}
              disabled={!imageManagerProduct || imageBusy}
            >
              <Text style={styles.modalSaveButtonText}>{imageBusy ? "Working..." : "Add Image"}</Text>
            </Pressable>
          </View>

          {imageManagerProduct ? (
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
              <Text style={styles.fieldLabel}>{imageManagerProduct.name}</Text>
              <Text style={styles.helperText}>
                Your current plan allows {company.tier.min_photos_per_product}-{company.tier.max_photos_per_product} images for each live product.
              </Text>
              {imageMessage ? <Text style={styles.inlineNote}>{imageMessage}</Text> : null}

              {imageManagerProduct.images.length ? (
                <View style={styles.imageList}>
                  {imageManagerProduct.images.map((image) => (
                    <View key={image.asset_id} style={styles.imageCard}>
                      <Image source={{ uri: image.url }} style={styles.imageCardPreview} />
                      <View style={styles.imageCardCopy}>
                        <Text style={styles.imageCardTitle} numberOfLines={1}>
                          {image.original_filename}
                        </Text>
                        <Text style={styles.imageCardMeta}>Asset #{image.asset_id}</Text>
                      </View>
                      <Pressable style={styles.removeImageButton} onPress={() => handleRemoveImage(imageManagerProduct, image)} disabled={imageBusy}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.negative} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <SurfaceCard>
                  <Text style={styles.emptyTitle}>No images attached yet</Text>
                  <Text style={styles.emptyDetail}>Upload product images here, then activate the product when it meets your tier rules.</Text>
                </SurfaceCard>
              )}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: "#8A6400",
    ...typography.eyebrow,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  planBanner: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#DCCB9C",
    backgroundColor: "#FFF8E7",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planCopy: {
    flex: 1,
  },
  planLabel: {
    color: "#775A19",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  planValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  metricGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  metricTile: {
    borderRadius: radii.md,
    backgroundColor: "#F7F2F2",
    padding: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  primaryActionRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingLeft: 46,
    paddingRight: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  filterRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sectionEyebrow: {
    color: "#775A19",
    ...typography.eyebrow,
    marginBottom: spacing.xs,
  },
  portalNote: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  inlineError: {
    color: colors.negative,
    fontSize: 13,
    lineHeight: 18,
  },
  inlineNote: {
    color: "#775A19",
    fontSize: 13,
    lineHeight: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  emptyDetail: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  productHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  productVisual: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: "#E9E8E7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productVisualImage: {
    width: "100%",
    height: "100%",
  },
  productVisualFallback: {
    color: "#4C4546",
    fontSize: 18,
    fontWeight: "800",
  },
  productHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  productTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  productTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  productDescription: {
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 21,
  },
  visibilityPanel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#F6F0E9",
    gap: 4,
  },
  visibilityLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  visibilityCopy: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  visibilityBlocker: {
    color: "#8C3A3A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  productFooter: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  imageCountLabel: {
    color: "#775A19",
    fontSize: 13,
    fontWeight: "600",
  },
  productActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  smallActionButton: {
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  smallActionButtonDark: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  smallActionButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  smallActionButtonDarkText: {
    color: colors.surface,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  modalHeaderButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  modalSaveButton: {
    minWidth: 72,
    minHeight: 40,
    borderRadius: radii.md,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  modalSaveButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalBody: {
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  fieldInput: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  visibilityOptionGrid: {
    gap: spacing.sm,
  },
  audienceSection: {
    gap: spacing.sm,
  },
  audienceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  audienceSectionCopy: {
    flex: 1,
    gap: 2,
  },
  audienceSectionLabel: {
    color: "#775A19",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  audienceSectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  audienceActionButton: {
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  audienceActionButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  audienceCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  audienceRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  audienceCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  audienceFieldStack: {
    gap: spacing.sm,
  },
  audienceFieldLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  audienceHelperCard: {
    borderRadius: radii.md,
    backgroundColor: "#F6F0E9",
    padding: spacing.md,
    gap: 4,
  },
  audienceHelperTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  audienceHelperCopy: {
    color: colors.mutedText,
    lineHeight: 19,
  },
  visibilityOption: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 6,
  },
  visibilityOptionActive: {
    borderColor: "#775A19",
    backgroundColor: "#FFF7E8",
  },
  visibilityOptionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  visibilityOptionTitleActive: {
    color: "#5D4201",
  },
  visibilityOptionCopy: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  editorVisibilityPanel: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#F6F0E9",
    gap: 4,
  },
  inlineFieldGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
    gap: spacing.sm,
  },
  helperText: {
    color: colors.mutedText,
    lineHeight: 20,
  },
  formError: {
    color: colors.negative,
    lineHeight: 20,
  },
  imageList: {
    gap: spacing.sm,
  },
  imageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  imageCardPreview: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: "#E9E8E7",
  },
  imageCardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  imageCardTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  imageCardMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  removeImageButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});

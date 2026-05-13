export type Tokens = {
  access: string;
  refresh: string;
};

export type SessionInfo = {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    role_display_name: string;
    is_admin: boolean;
    has_company: boolean;
    can_manage_products: boolean;
  };
  hierarchy: {
    association: string | null;
    state: string | null;
  };
  company: {
    id: number;
    name: string;
    plan: string;
    is_active: boolean;
    is_approved: boolean;
    upgrade_url: string | null;
  } | null;
  counts: {
    pending_approvals_count: number;
    unread_notifications_count: number;
  };
};

export type AdminOverviewWorkItem = {
  key: string;
  label: string;
  count: number;
  route: string | null;
};

export type AdminOverviewActivityItem = {
  id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
};

export type AdminOverviewQuickAction = {
  label: string;
  description: string;
  route: string;
};

export type RegionHierarchyUnit = {
  id: number;
  name: string;
};

export type RegionHierarchyDistrict = {
  id: number;
  name: string;
  units: RegionHierarchyUnit[];
};

export type RegionHierarchyAssociation = {
  id: number;
  name: string;
  district_units: RegionHierarchyDistrict[];
};

export type RegionHierarchyState = {
  id: number;
  name: string;
  associations: RegionHierarchyAssociation[];
};

export type AdminOverviewResponse = {
  scope: {
    label: string;
    scope_type: string;
    role: string;
  };
  kpis: {
    pending_approvals: number;
    active_companies: number;
    active_products: number;
    published_news: number;
    upcoming_meetings: number;
    rate_last_updated_at: string | null;
    rate_freshness_label: string;
  };
  pending_work: AdminOverviewWorkItem[];
  recent_activity: AdminOverviewActivityItem[];
  quick_actions: AdminOverviewQuickAction[];
};

export type CompanyOption = {
  id: number;
  name: string;
  city: string;
  state: string;
};

export type AudienceTargetInput = {
  target_type: "platform" | "state" | "association" | "unit" | "company" | "user";
  target_id: number | null;
};

export type ProductOption = {
  id: number;
  name: string;
  company_id: number;
  company_name: string;
};

export type NewsTargetInput = AudienceTargetInput;

export type AdminNewsRecord = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  image_asset_id: number | null;
  created_by_id: number;
  publisher_type: "platform" | "association" | "unit" | "company";
  publisher_id: number | null;
  status: "draft" | "published" | "pending_approval" | "rejected";
  approved_by_id: number | null;
  published_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  targets: Array<{
    id: number;
    target_type: NewsTargetInput["target_type"];
    target_id: number | null;
    mode: "include" | "exclude";
  }>;
};

export type AdminNewsCreatePayload = {
  title: string;
  description: string;
  image_asset_id?: number | null;
  publisher_type: AdminNewsRecord["publisher_type"];
  publisher_id: number | null;
  include_targets: NewsTargetInput[];
  exclude_targets: NewsTargetInput[];
  save_as_draft: boolean;
};

export type AdminNewsCreateResponse = {
  message: string;
  news: AdminNewsRecord;
};

type AdminNewsCreateApiResponse = AdminNewsRecord & {
  message?: string;
};

export type ApiClientConfig = {
  getTokens?: () => Tokens | null;
  onTokensUpdated?: (tokens: Tokens | null) => void;
  onUnauthorized?: () => void;
};

export type UploadSession = {
  object_key: string;
  bucket_name: string;
  visibility: string;
  expires_in: number;
  upload_url: string;
};

export type FinalizedMediaAsset = {
  asset_id: number;
  object_key: string;
  public_url: string;
  original_filename: string;
};

export type AdvertisementActionType = "external_url" | "internal_screen" | "product" | "company" | "category";
export type AdvertisementPlacement = "dashboard_hero" | "market_banner" | "news_inline";
export type AdvertisementStatus = "draft" | "submitted" | "approved" | "rejected" | "expired";

export type AdvertisementTargeting = {
  state_id: number | null;
  state_name: string | null;
  association_id: number | null;
  association_name: string | null;
  district_operational_unit_id: number | null;
  district_operational_unit_name: string | null;
  unit_id: number | null;
  unit_name: string | null;
};

export type AdvertisementCampaignRecord = {
  id: number;
  title: string;
  description: string;
  label_text: string;
  background_color: string;
  placement: AdvertisementPlacement;
  action_type: AdvertisementActionType;
  action_payload: Record<string, unknown>;
  action_value: string;
  priority: number;
  is_active: boolean;
  reach: string;
  status: AdvertisementStatus;
  start_date: string | null;
  end_date: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  asset_id: number | null;
  advertiser_name: string;
  company: {
    id: number;
    name: string;
    is_active: boolean;
    is_approved: boolean;
  } | null;
  targeting: AdvertisementTargeting;
};

export type AdvertisementCampaignPayload = {
  title: string;
  description: string;
  label_text: string;
  background_color: string;
  placement: AdvertisementPlacement;
  action_type: AdvertisementActionType;
  action_value: string;
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "submitted";
  asset_id?: number | null;
  targeting: {
    state_id: number | null;
    association_id: number | null;
    district_operational_unit_id: number | null;
    unit_id: number | null;
  };
};

export type AdvertisementCampaignMutationResponse = {
  message: string;
  advertisement: AdvertisementCampaignRecord;
};

export type TierCapabilitySummary = {
  can_manage_products: boolean;
  can_activate_products: boolean;
  can_request_upgrade: boolean;
  can_request_downgrade: boolean;
  market_visibility_type: string;
  hero_eligible: boolean;
  fairness_weight: number;
  premium_floor_share: string;
  cooldown_hours: number;
};

export type CompanyTierRecord = {
  id: number;
  name: string;
  slug: string;
  description: string;
  max_products: number;
  min_photos_per_product: number;
  max_photos_per_product: number;
  max_companies_allowed: number | null;
  price: string;
  is_free: boolean;
  is_active: boolean;
  base_weight: number;
  hero_eligible: boolean;
  premium_floor_share: string;
  cooldown_hours: number;
  display_priority: number;
  visibility_type: string;
  current_company_count: number;
};

export type TierChangeRequestRecord = {
  id: number;
  request_type: "upgrade" | "downgrade";
  status: "pending" | "approved" | "rejected" | "cancelled";
  company_note: string;
  admin_note: string;
  current_tier_name: string;
  requested_tier_name: string;
  retain_active_product_ids: number[];
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  company: {
    id: number;
    name: string;
    state: string;
  };
  current_tier: CompanyTierRecord;
  requested_tier: CompanyTierRecord;
  requested_by_name: string;
  reviewed_by_name: string | null;
  active_product_count: number;
  downgrade_context: {
    allowed_active_products: number;
    active_product_ids: number[];
    overflow_product_ids: number[];
    requires_product_selection: boolean;
  } | null;
};

export type CompanyTierManagementOverview = {
  current_tier: CompanyTierRecord;
  company: {
    id: number;
    name: string;
    active_product_count: number;
    is_active: boolean;
    is_approved: boolean;
  };
  capabilities: TierCapabilitySummary;
  active_products: CompanyManagementProduct[];
  available_upgrades: CompanyTierRecord[];
  available_downgrades: CompanyTierRecord[];
  pending_request: TierChangeRequestRecord | null;
  requests: TierChangeRequestRecord[];
};

export type TierAdminDetail = {
  tier: CompanyTierRecord;
  enrolled_companies: Array<{
    id: number;
    name: string;
    city: string;
    state: string;
    is_active: boolean;
    is_approved: boolean;
    active_product_count: number;
  }>;
  pending_request_count: number;
  recent_requests: TierChangeRequestRecord[];
};

export type TierChangeRequestMutationResponse = {
  message: string;
  request: TierChangeRequestRecord;
};

export type MarketScreenSettings = {
  hero_auto_scroll_seconds: 3 | 5;
};

export type AssociationSpotlightItem = {
  id: number;
  association: number;
  association_name: string;
  state_name: string;
  asset_id: number;
  image_url: string;
  title: string;
  subtitle: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssociationSpotlightCollection = {
  association: {
    id: number;
    name: string;
    state_name: string;
  };
  config: {
    enabled: boolean;
    duration_seconds: number;
    scroll_speed: "slow" | "medium" | "fast" | string;
    max_items: number;
    reshow_policy: "next_app_launch" | "every_dashboard_visit" | string;
  };
  items: AssociationSpotlightItem[];
};

export type AssociationSpotlightPayload = {
  association_id?: number;
  asset_id: number;
  title?: string;
  subtitle?: string;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type CompanyManagementProductImage = {
  asset_id: number;
  url: string;
  original_filename: string;
};

export type CompanyManagementProductVisibility = {
  status: "visible" | "hidden";
  audience_label: string;
  detail: string;
  blockers: string[];
};

export type ProductVisibilityTargetRecord = AudienceTargetInput & {
  id: number;
  mode: "include" | "exclude";
};

export type CompanyManagementProduct = {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  category_product_type: ProductTypeKey;
  subcategory_id: number | null;
  subcategory_name: string | null;
  weight_grams: string;
  purity: string;
  price: string | null;
  description: string;
  attribute_values: Record<string, string>;
  is_active: boolean;
  created_at: string;
  image_count: number;
  images: CompanyManagementProductImage[];
  targets: ProductVisibilityTargetRecord[];
  visibility: CompanyManagementProductVisibility;
};

export type CompanyManagementDetail = {
  company: {
    id: number;
    name: string;
    category: string;
    city: string;
    state: string;
    about: string;
    daily_capacity: string;
    specialization: string;
    is_active: boolean;
    is_approved: boolean;
    is_market_visible: boolean;
    hero_image_url: string | null;
    logo_image_url: string | null;
    verification: {
      gst_registered: boolean;
      bis_hallmarked: boolean;
      export_licensed: boolean;
    };
    tier: {
      id: number;
      name: string;
      visibility_type: string;
      max_products: number;
      min_photos_per_product: number;
      max_photos_per_product: number;
    };
    active_product_count: number;
    total_product_count: number;
  };
  products: CompanyManagementProduct[];
};

export type CompanyManagementUpdatePayload = {
  name?: string;
  category?: string;
  city?: string;
  state?: string;
  about?: string;
  daily_capacity?: string;
  specialization?: string;
};

export type CompanyImageAttachPayload = {
  asset_id: number;
  slot: "logo" | "hero";
};

export type ProductTypeKey = "gold" | "diamond" | "silver" | "other";

export type ProductFilterCategory = {
  id: number;
  name: string;
  slug: string;
  product_type: ProductTypeKey;
  icon_key: string;
  subcategories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  attributes: Array<{
    id: number;
    key: string;
    label: string;
    type: string;
    options: unknown[];
    is_required: boolean;
  }>;
};

export type ProductFilterConfig = {
  categories: ProductFilterCategory[];
  purity_options: string[];
};

export type CompanyProductUpsertPayload = {
  name: string;
  category: number;
  subcategory: number | null;
  weight_grams: string;
  purity: string;
  price: string | null;
  description: string;
  is_active: boolean;
  image_asset_ids: number[];
  attribute_values?: Record<string, string>;
  include_targets?: AudienceTargetInput[];
  exclude_targets?: AudienceTargetInput[];
};

export type AdminTaxonomyAttribute = {
  id: number;
  category: number;
  key: string;
  label: string;
  type: string;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  display_order: number;
};

export type AdminTaxonomySubcategory = {
  id: number;
  category: number;
  name: string;
  slug: string;
  is_active: boolean;
  display_order: number;
};

export type AdminTaxonomyCategory = {
  id: number;
  name: string;
  slug: string;
  product_type: ProductTypeKey;
  icon_key: string;
  is_active: boolean;
  display_order: number;
  subcategories: AdminTaxonomySubcategory[];
  attributes: AdminTaxonomyAttribute[];
};

export type AdminTaxonomyGroup = {
  key: ProductTypeKey;
  label: string;
  categories: AdminTaxonomyCategory[];
};

export type AdminTaxonomyResponse = {
  product_types: AdminTaxonomyGroup[];
};

export type AdminTaxonomyCategoryPayload = {
  name: string;
  slug?: string;
  product_type: ProductTypeKey;
  icon_key: string;
  is_active: boolean;
  display_order: number;
};

export type AdminTaxonomySubcategoryPayload = {
  category: number;
  name: string;
  slug?: string;
  is_active: boolean;
  display_order: number;
};

export type AdminTaxonomyAttributePayload = {
  category: number;
  key: string;
  label: string;
  type: string;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  display_order: number;
};

export type RateCatalogSubcategory = {
  id?: number;
  name: string;
  unit_label: string;
  current_value: string | null;
};

export type RateCatalogCategory = {
  id?: number;
  name: string;
  unit_label: string;
  current_value: string | null;
  subcategories: RateCatalogSubcategory[];
};

export type AssociationRateCatalog = {
  association: {
    id: number;
    name: string;
    state_name: string;
  };
  updated_at_label: string;
  categories: RateCatalogCategory[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

let config: ApiClientConfig = {};

export function configureApiClient(nextConfig: ApiClientConfig) {
  config = nextConfig;
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedMessage = extractErrorMessage(item);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nestedMessage = extractErrorMessage(nestedValue);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
  }
  return null;
}

async function requestJson<T>(path: string, init: RequestInit = {}, retrying = false, overrideTokens: Tokens | null = null): Promise<T> {
  const tokens = overrideTokens ?? config.getTokens?.() ?? null;
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (tokens?.access) {
    headers.set("Authorization", `Bearer ${tokens.access}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && tokens?.refresh && !retrying) {
    try {
      const nextTokens = await refreshAccessToken(tokens.refresh);
      config.onTokensUpdated?.(nextTokens);
      return requestJson<T>(path, init, true, nextTokens);
    } catch {
      config.onTokensUpdated?.(null);
      config.onUnauthorized?.();
      throw new Error("Your session expired. Please sign in again.");
    }
  }

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const errorBody = (await response.json()) as Record<string, unknown>;
      const extractedMessage = extractErrorMessage(errorBody);
      if (extractedMessage) {
        message = extractedMessage;
      }
    } catch {
      if (response.status === 401) {
        message = "Invalid username or password.";
      }
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function loginWithPassword(payload: { username: string; password: string }) {
  return requestJson<Tokens>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken(refresh: string) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    throw new Error("Unable to refresh session.");
  }

  const payload = (await response.json()) as { access: string };
  return { access: payload.access, refresh };
}

export async function fetchSessionInfo(overrideTokens: Tokens | null = null) {
  const payload = await requestJson<Partial<SessionInfo>>("/me/", {}, false, overrideTokens);
  return {
    user: {
      id: payload.user?.id ?? 0,
      name: payload.user?.name ?? "Admin User",
      email: payload.user?.email ?? "",
      phone: payload.user?.phone ?? null,
      avatar: payload.user?.avatar ?? null,
      role: payload.user?.role ?? "",
      role_display_name: payload.user?.role_display_name ?? "Administrator",
      is_admin: payload.user?.is_admin ?? false,
      has_company: payload.user?.has_company ?? false,
      can_manage_products: payload.user?.can_manage_products ?? false,
    },
    hierarchy: {
      association: payload.hierarchy?.association ?? null,
      state: payload.hierarchy?.state ?? null,
    },
    company: payload.company
      ? {
          id: payload.company.id ?? 0,
          name: payload.company.name ?? "",
          plan: payload.company.plan ?? "",
          is_active: payload.company.is_active ?? false,
          is_approved: payload.company.is_approved ?? false,
          upgrade_url: payload.company.upgrade_url ?? null,
        }
      : null,
    counts: {
      pending_approvals_count: payload.counts?.pending_approvals_count ?? 0,
      unread_notifications_count: payload.counts?.unread_notifications_count ?? 0,
    },
  };
}

export async function fetchAdminOverview() {
  const payload = await requestJson<Partial<AdminOverviewResponse>>("/admin/");
  return {
    scope: {
      label: payload.scope?.label ?? "Current Scope",
      scope_type: payload.scope?.scope_type ?? "platform",
      role: payload.scope?.role ?? "administrator",
    },
    kpis: {
      pending_approvals: payload.kpis?.pending_approvals ?? 0,
      active_companies: payload.kpis?.active_companies ?? 0,
      active_products: payload.kpis?.active_products ?? 0,
      published_news: payload.kpis?.published_news ?? 0,
      upcoming_meetings: payload.kpis?.upcoming_meetings ?? 0,
      rate_last_updated_at: payload.kpis?.rate_last_updated_at ?? null,
      rate_freshness_label: payload.kpis?.rate_freshness_label ?? "Waiting for data",
    },
    pending_work: Array.isArray(payload.pending_work) ? payload.pending_work : [],
    recent_activity: Array.isArray(payload.recent_activity) ? payload.recent_activity : [],
    quick_actions: Array.isArray(payload.quick_actions) ? payload.quick_actions : [],
  };
}

export async function fetchRegionHierarchy() {
  return requestJson<RegionHierarchyState[]>("/regions/");
}

export async function createAdminNews(payload: AdminNewsCreatePayload) {
  const response = await requestJson<AdminNewsCreateApiResponse>("/news/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const { message, ...news } = response;
  return {
    message: message ?? "News submitted.",
    news,
  };
}

export async function fetchCompanyOptions() {
  const payload = await requestJson<Array<Partial<CompanyOption>>>("/directory/companies/");
  return payload.map((company) => ({
    id: company.id ?? 0,
    name: company.name ?? "Unnamed company",
    city: company.city ?? "",
    state: company.state ?? "",
  })).filter((company) => company.id > 0);
}

export async function requestNewsUploadSession(filename: string) {
  return requestJson<UploadSession>("/news/upload-session/", {
    method: "POST",
    body: JSON.stringify({ filename }),
  });
}

export async function finalizeNewsMediaAsset(payload: {
  object_key: string;
  bucket_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
}) {
  return requestJson<FinalizedMediaAsset>("/news/media-assets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchProductOptions(companyId?: number) {
  const params = new URLSearchParams();
  if (companyId) {
    params.set("company", String(companyId));
  }
  const query = params.toString();
  const payload = await requestJson<{ results: Array<Partial<ProductOption>> }>(`/products/${query ? `?${query}` : ""}`);
  return (payload.results ?? [])
    .map((product) => ({
      id: product.id ?? 0,
      name: product.name ?? "Unnamed product",
      company_id: product.company_id ?? 0,
      company_name: product.company_name ?? "",
    }))
    .filter((product) => product.id > 0);
}

export async function requestAdvertisementUploadSession(filename: string) {
  return requestJson<UploadSession>("/ads/upload-session/", {
    method: "POST",
    body: JSON.stringify({ filename }),
  });
}

export async function finalizeAdvertisementMediaAsset(payload: {
  object_key: string;
  bucket_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
}) {
  return requestJson<FinalizedMediaAsset>("/ads/media-assets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCompanyAdvertisements() {
  return requestJson<{ results: AdvertisementCampaignRecord[] }>("/ads/campaigns/");
}

export async function createCompanyAdvertisement(payload: AdvertisementCampaignPayload) {
  return requestJson<AdvertisementCampaignMutationResponse>("/ads/campaigns/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyAdvertisement(adId: number, payload: Partial<AdvertisementCampaignPayload>) {
  return requestJson<AdvertisementCampaignMutationResponse>(`/ads/campaigns/${adId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchPendingAdvertisementApprovals() {
  return requestJson<{ results: AdvertisementCampaignRecord[] }>("/ads/submitted/");
}

export async function approveAdvertisement(adId: number) {
  return requestJson<AdvertisementCampaignMutationResponse>(`/ads/${adId}/approve/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectAdvertisement(adId: number) {
  return requestJson<AdvertisementCampaignMutationResponse>(`/ads/${adId}/reject/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchAssociationRateCatalog() {
  return requestJson<AssociationRateCatalog>("/dashboard/admin/association-rate-catalog/");
}

export async function saveAssociationRateCatalog(payload: { categories: RateCatalogCategory[] }) {
  return requestJson<AssociationRateCatalog>("/dashboard/admin/association-rate-catalog/", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function requestAssociationSpotlightUploadSession(filename: string, associationId?: number) {
  return requestJson<UploadSession>("/dashboard/admin/association-spotlights/upload-session/", {
    method: "POST",
    body: JSON.stringify({
      filename,
      association_id: associationId ?? null,
    }),
  });
}

export async function finalizeAssociationSpotlightMediaAsset(payload: {
  object_key: string;
  bucket_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  association_id?: number;
}) {
  return requestJson<FinalizedMediaAsset>("/dashboard/admin/association-spotlights/media-assets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAssociationSpotlights(associationId?: number) {
  const params = new URLSearchParams();
  if (associationId) {
    params.set("association_id", String(associationId));
  }
  return requestJson<AssociationSpotlightCollection>(
    `/dashboard/admin/association-spotlights/${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function createAssociationSpotlight(payload: AssociationSpotlightPayload) {
  return requestJson<AssociationSpotlightItem>("/dashboard/admin/association-spotlights/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAssociationSpotlight(itemId: number, payload: Partial<AssociationSpotlightPayload>) {
  return requestJson<AssociationSpotlightItem>(`/dashboard/admin/association-spotlights/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAssociationSpotlight(itemId: number) {
  return requestJson<{ message: string }>(`/dashboard/admin/association-spotlights/${itemId}/`, {
    method: "DELETE",
  });
}

export async function reorderAssociationSpotlights(itemIds: number[], associationId?: number) {
  return requestJson<{ items: AssociationSpotlightItem[] }>("/dashboard/admin/association-spotlights/reorder/", {
    method: "POST",
    body: JSON.stringify({
      item_ids: itemIds,
      association_id: associationId ?? null,
    }),
  });
}

export async function fetchAdminMarketScreenSettings() {
  return requestJson<MarketScreenSettings>("/admin/market-screen-settings/");
}

export async function updateAdminMarketScreenSettings(payload: MarketScreenSettings) {
  return requestJson<MarketScreenSettings>("/admin/market-screen-settings/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchCompanyManagement(companyId: number) {
  return requestJson<CompanyManagementDetail>(`/directory/companies/${companyId}/manage/`);
}

export async function fetchCompanyTierManagementOverview() {
  return requestJson<CompanyTierManagementOverview>("/directory/companies/tier-management/");
}

export async function fetchCompanyTierRequests() {
  return requestJson<{ results: TierChangeRequestRecord[] }>("/directory/companies/tier-requests/");
}

export async function createCompanyTierRequest(payload: {
  requested_tier_id: number;
  company_note?: string;
  retain_active_product_ids?: number[];
}) {
  return requestJson<TierChangeRequestMutationResponse>("/directory/companies/tier-requests/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelCompanyTierRequest(requestId: number) {
  return requestJson<TierChangeRequestMutationResponse>(`/directory/companies/tier-requests/${requestId}/cancel/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function saveCompanyManagement(companyId: number, payload: CompanyManagementUpdatePayload) {
  return requestJson<CompanyManagementDetail>(`/directory/companies/${companyId}/manage/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchProductFilterConfig() {
  return requestJson<ProductFilterConfig>("/products/filter-config/");
}

export async function fetchAdminTaxonomy() {
  return requestJson<AdminTaxonomyResponse>("/admin/directory/taxonomy/");
}

export async function createAdminTaxonomyCategory(payload: AdminTaxonomyCategoryPayload) {
  return requestJson<AdminTaxonomyCategory>("/admin/directory/taxonomy/categories/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminTaxonomyCategory(categoryId: number, payload: Partial<AdminTaxonomyCategoryPayload>) {
  return requestJson<AdminTaxonomyCategory>(`/admin/directory/taxonomy/categories/${categoryId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createAdminTaxonomySubcategory(payload: AdminTaxonomySubcategoryPayload) {
  return requestJson<AdminTaxonomySubcategory>("/admin/directory/taxonomy/subcategories/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminTaxonomySubcategory(subcategoryId: number, payload: Partial<AdminTaxonomySubcategoryPayload>) {
  return requestJson<AdminTaxonomySubcategory>(`/admin/directory/taxonomy/subcategories/${subcategoryId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createAdminTaxonomyAttribute(payload: AdminTaxonomyAttributePayload) {
  return requestJson<AdminTaxonomyAttribute>("/admin/directory/taxonomy/attributes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminTaxonomyAttribute(attributeId: number, payload: Partial<AdminTaxonomyAttributePayload>) {
  return requestJson<AdminTaxonomyAttribute>(`/admin/directory/taxonomy/attributes/${attributeId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminTiers() {
  return requestJson<CompanyTierRecord[]>("/admin/directory/tiers/");
}

export async function fetchAdminTierDetail(tierId: number) {
  return requestJson<TierAdminDetail>(`/admin/directory/tiers/${tierId}/`);
}

export async function updateAdminTier(tierId: number, payload: Partial<CompanyTierRecord>) {
  return requestJson<CompanyTierRecord>(`/admin/directory/tiers/${tierId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminTierRequests() {
  return requestJson<{ results: TierChangeRequestRecord[] }>("/admin/directory/tier-requests/");
}

export async function approveAdminTierRequest(requestId: number, admin_note = "") {
  return requestJson<TierChangeRequestMutationResponse>(`/admin/directory/tier-requests/${requestId}/approve/`, {
    method: "POST",
    body: JSON.stringify({ admin_note }),
  });
}

export async function rejectAdminTierRequest(requestId: number, admin_note = "") {
  return requestJson<TierChangeRequestMutationResponse>(`/admin/directory/tier-requests/${requestId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ admin_note }),
  });
}

export async function requestCompanyUploadSession(companyId: number, filename: string) {
  return requestJson<UploadSession>(`/directory/companies/${companyId}/upload-session/`, {
    method: "POST",
    body: JSON.stringify({ filename }),
  });
}

export async function finalizeCompanyMediaAsset(
  companyId: number,
  payload: {
    object_key: string;
    bucket_name: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
    width: number;
    height: number;
  },
) {
  return requestJson<FinalizedMediaAsset>(`/directory/companies/${companyId}/media-assets/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function attachCompanyImage(companyId: number, payload: CompanyImageAttachPayload) {
  return requestJson<CompanyManagementDetail>(`/directory/companies/${companyId}/images/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createCompanyProduct(companyId: number, payload: CompanyProductUpsertPayload) {
  return requestJson<CompanyManagementProduct>(`/directory/companies/${companyId}/products/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyProduct(companyId: number, productId: number, payload: Partial<CompanyProductUpsertPayload>) {
  return requestJson<CompanyManagementProduct>(`/directory/companies/${companyId}/products/${productId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadFileToSession(uploadUrl: string, file: File) {
  const resolvedUploadUrl = uploadUrl.startsWith("http")
    ? uploadUrl
    : new URL(uploadUrl, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`).toString();

  const response = await fetch(resolvedUploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Image upload failed.");
  }
}

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

export type CompanyManagementProductImage = {
  asset_id: number;
  url: string;
  original_filename: string;
};

export type CompanyManagementProduct = {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  subcategory_id: number | null;
  subcategory_name: string | null;
  weight_grams: string;
  purity: string;
  price: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
  image_count: number;
  images: CompanyManagementProductImage[];
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

export type ProductFilterCategory = {
  id: number;
  name: string;
  slug: string;
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
      const errorBody = (await response.json()) as Record<string, string[] | string>;
      const firstValue = Object.values(errorBody)[0];
      if (typeof firstValue === "string") {
        message = firstValue;
      } else if (Array.isArray(firstValue) && firstValue[0]) {
        message = firstValue[0];
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
  return requestJson<SessionInfo>("/me/", {}, false, overrideTokens);
}

export async function fetchAdminOverview() {
  return requestJson<AdminOverviewResponse>("/admin/");
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

export async function fetchCompanyManagement(companyId: number) {
  return requestJson<CompanyManagementDetail>(`/directory/companies/${companyId}/manage/`);
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
  return requestJson(`/directory/companies/${companyId}/products/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyProduct(companyId: number, productId: number, payload: Partial<CompanyProductUpsertPayload>) {
  return requestJson(`/directory/companies/${companyId}/products/${productId}/`, {
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

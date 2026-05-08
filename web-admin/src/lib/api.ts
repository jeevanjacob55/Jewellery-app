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

export type ApiClientConfig = {
  getTokens?: () => Tokens | null;
  onTokensUpdated?: (tokens: Tokens | null) => void;
  onUnauthorized?: () => void;
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

export async function fetchAssociationRateCatalog() {
  return requestJson<AssociationRateCatalog>("/dashboard/admin/association-rate-catalog/");
}

export async function saveAssociationRateCatalog(payload: { categories: RateCatalogCategory[] }) {
  return requestJson<AssociationRateCatalog>("/dashboard/admin/association-rate-catalog/", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

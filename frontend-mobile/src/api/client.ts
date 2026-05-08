import { AuthTokens } from "../types/api";

const DEFAULT_API_BASE_URL = "http://10.0.2.2:8000/api";
const REQUEST_TIMEOUT_MS = 10000;
const NETWORK_ERROR_MESSAGE =
  "Unable to reach the backend. Check EXPO_PUBLIC_API_BASE_URL and confirm your phone can access your computer.";

type ApiClientConfig = {
  getTokens?: () => AuthTokens | null;
  onTokensUpdated?: (tokens: AuthTokens | null) => Promise<void> | void;
  onUnauthorized?: () => Promise<void> | void;
};

let config: ApiClientConfig = {};

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return new URL(pathOrUrl, API_BASE_URL).toString();
  }
}

export function resolveApiUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) {
    return null;
  }
  return resolveUrl(pathOrUrl);
}

export function configureApiClient(nextConfig: ApiClientConfig) {
  config = nextConfig;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  authenticated?: boolean;
  retrying?: boolean;
};

async function refreshAccessToken(refresh: string): Promise<AuthTokens | null> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { access: string };
  return { access: payload.access, refresh };
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokens = config.getTokens?.() ?? null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.authenticated && tokens?.access) {
    headers.Authorization = `Bearer ${tokens.access}`;
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(resolveUrl(`${API_BASE_URL}${path}`), {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (response.status === 401 && options.authenticated && !options.retrying && tokens?.refresh) {
    const refreshedTokens = await refreshAccessToken(tokens.refresh);
    if (refreshedTokens) {
      await config.onTokensUpdated?.(refreshedTokens);
      return requestJson<T>(path, { ...options, retrying: true });
    }

    await config.onUnauthorized?.();
  }

  if (!response.ok) {
    let message = `Request failed for ${path}`;
    try {
      const errorBody = (await response.json()) as Record<string, string[] | string>;
      const firstValue = Object.values(errorBody)[0];
      if (typeof firstValue === "string") {
        message = firstValue;
      } else if (Array.isArray(firstValue) && firstValue[0]) {
        message = firstValue[0];
      }
    } catch {
      // Fall back to the default message when the error response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getJson<T>(path: string, authenticated = false): Promise<T> {
  return requestJson<T>(path, { authenticated });
}

export function postJson<T>(path: string, body: unknown, authenticated = false): Promise<T> {
  return requestJson<T>(path, { method: "POST", body, authenticated });
}

export function patchJson<T>(path: string, body: unknown, authenticated = false): Promise<T> {
  return requestJson<T>(path, { method: "PATCH", body, authenticated });
}

export async function uploadBinary(uploadUrl: string, body: Blob, mimeType: string): Promise<void> {
  const response = await fetchWithTimeout(resolveUrl(uploadUrl), {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Unable to upload the reference image.");
  }
}

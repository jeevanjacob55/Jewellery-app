import { getJson, patchJson, postJson } from "./client";
import {
  Company,
  CompanyManagementDetail,
  CompanyManagementProduct,
  CompanyOption,
  CompanyProductWritePayload,
  CompanyTierManagementOverview,
  CompanyTierRequestActionResponse,
  CompanyTierRequestCreatePayload,
  MarketFeedData,
  MediaAssetFinalizePayload,
  MediaAssetFinalizeResponse,
  MediaUploadSession,
  Product,
  ProductDetail,
  ProductEnquiryPayload,
  ProductFilterConfigResponse,
  ProductSearchResponse,
  RegionState,
} from "../types/api";

export type MarketProductSearchParams = {
  search?: string;
  product_type?: "gold" | "diamond" | "silver" | "other";
  category?: string;
  subcategory?: string;
  purity?: string;
  sort?: string;
  company?: number;
  state?: string;
  price_min?: string;
  price_max?: string;
  weight_min?: string;
  weight_max?: string;
  product_id?: number;
  attributes?: Record<string, string>;
};

export function getMarketFeed() {
  return getJson<MarketFeedData>("/directory/market/", true);
}

export function getCompanies() {
  return getJson<Company[]>("/directory/companies/", true);
}

export function getCompanyManagementDetail(companyId: number) {
  return getJson<CompanyManagementDetail>(`/directory/companies/${companyId}/manage/`, true);
}

export function getCompanyTierManagementOverview() {
  return getJson<CompanyTierManagementOverview>("/directory/companies/tier-management/", true);
}

export function getMarketFilterConfig() {
  return getJson<ProductFilterConfigResponse>("/products/filter-config/", true);
}

export function createCompanyTierRequest(payload: CompanyTierRequestCreatePayload) {
  return postJson<CompanyTierRequestActionResponse>("/directory/companies/tier-requests/", payload, true);
}

export function cancelCompanyTierRequest(requestId: number) {
  return postJson<CompanyTierRequestActionResponse>(`/directory/companies/tier-requests/${requestId}/cancel/`, {}, true);
}

export function createCompanyProduct(companyId: number, payload: CompanyProductWritePayload) {
  return postJson<CompanyManagementProduct>(`/directory/companies/${companyId}/products/`, payload, true);
}

export function updateCompanyProduct(companyId: number, productId: number, payload: CompanyProductWritePayload) {
  return patchJson<CompanyManagementProduct>(`/directory/companies/${companyId}/products/${productId}/`, payload, true);
}

export function createProductImageUploadSession(companyId: number, productId: number, filename: string) {
  return postJson<MediaUploadSession>(
    `/directory/companies/${companyId}/products/${productId}/images/upload-session/`,
    { filename },
    true,
  );
}

export function finalizeProductMediaAsset(companyId: number, productId: number, payload: MediaAssetFinalizePayload) {
  return postJson<MediaAssetFinalizeResponse>(
    `/directory/companies/${companyId}/products/${productId}/media-assets/`,
    payload,
    true,
  );
}

export function attachProductImage(companyId: number, productId: number, assetId: number) {
  return postJson<CompanyManagementProduct>(
    `/directory/companies/${companyId}/products/${productId}/images/`,
    { asset_id: assetId },
    true,
  );
}

export function searchMarketProducts(params: MarketProductSearchParams) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.product_type) {
    searchParams.set("product_type", params.product_type);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.subcategory) {
    searchParams.set("subcategory", params.subcategory);
  }
  if (params.purity) {
    searchParams.set("purity", params.purity);
  }
  if (params.sort) {
    searchParams.set("sort", params.sort);
  }
  if (typeof params.company === "number") {
    searchParams.set("company", params.company.toString());
  }
  if (params.state?.trim()) {
    searchParams.set("state", params.state.trim());
  }
  if (params.price_min?.trim()) {
    searchParams.set("price_min", params.price_min.trim());
  }
  if (params.price_max?.trim()) {
    searchParams.set("price_max", params.price_max.trim());
  }
  if (params.weight_min?.trim()) {
    searchParams.set("weight_min", params.weight_min.trim());
  }
  if (params.weight_max?.trim()) {
    searchParams.set("weight_max", params.weight_max.trim());
  }
  if (typeof params.product_id === "number") {
    searchParams.set("product_id", params.product_id.toString());
  }
  for (const [key, value] of Object.entries(params.attributes ?? {})) {
    if (value.trim()) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return getJson<ProductSearchResponse>(`/products/${query ? `?${query}` : ""}`, true);
}

export function getProductDetail(productId: number) {
  return getJson<ProductDetail>(`/products/${productId}/`, true);
}

export function toggleProductWishlist(productId: number) {
  return postJson<{ product_id: number; is_wishlisted: boolean }>(`/products/${productId}/wishlist/`, {}, true);
}

export function createProductEnquiry(productId: number, payload: ProductEnquiryPayload) {
  return postJson(`/products/${productId}/enquiries/`, payload, true);
}

export function getRegionHierarchy() {
  return getJson<RegionState[]>("/regions/", true);
}

export async function getCompanyOptions() {
  const companies = await getJson<Array<Partial<CompanyOption>>>("/directory/companies/", true);
  return companies
    .map((company) => ({
      id: company.id ?? 0,
      name: company.name ?? "Unnamed company",
      city: company.city ?? "",
      state: company.state ?? "",
    }))
    .filter((company) => company.id > 0);
}

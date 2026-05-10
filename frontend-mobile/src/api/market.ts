import { getJson, patchJson, postJson } from "./client";
import {
  Company,
  CompanyManagementDetail,
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
} from "../types/api";

export type MarketProductSearchParams = {
  search?: string;
  category?: string;
  subcategory?: string;
  purity?: string;
  sort?: string;
  company?: number;
  product_id?: number;
  attributes?: Record<string, string>;
};

export function getMarketFeed() {
  return getJson<MarketFeedData>("/directory/market/");
}

export function getCompanies() {
  return getJson<Company[]>("/directory/companies/");
}

export function getCompanyManagementDetail(companyId: number) {
  return getJson<CompanyManagementDetail>(`/directory/companies/${companyId}/manage/`, true);
}

export function getCompanyTierManagementOverview() {
  return getJson<CompanyTierManagementOverview>("/directory/companies/tier-management/", true);
}

export function getMarketFilterConfig() {
  return getJson<ProductFilterConfigResponse>("/products/filter-config/");
}

export function createCompanyTierRequest(payload: CompanyTierRequestCreatePayload) {
  return postJson<CompanyTierRequestActionResponse>("/directory/companies/tier-requests/", payload, true);
}

export function cancelCompanyTierRequest(requestId: number) {
  return postJson<CompanyTierRequestActionResponse>(`/directory/companies/tier-requests/${requestId}/cancel/`, {}, true);
}

export function createCompanyProduct(companyId: number, payload: CompanyProductWritePayload) {
  return postJson<Product>(`/directory/companies/${companyId}/products/`, payload, true);
}

export function updateCompanyProduct(companyId: number, productId: number, payload: CompanyProductWritePayload) {
  return patchJson<Product>(`/directory/companies/${companyId}/products/${productId}/`, payload, true);
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
  return postJson<Product>(
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
  if (typeof params.product_id === "number") {
    searchParams.set("product_id", params.product_id.toString());
  }
  for (const [key, value] of Object.entries(params.attributes ?? {})) {
    if (value.trim()) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return getJson<ProductSearchResponse>(`/products/${query ? `?${query}` : ""}`);
}

export function getProductDetail(productId: number, authenticated = false) {
  return getJson<ProductDetail>(`/products/${productId}/`, authenticated);
}

export function toggleProductWishlist(productId: number) {
  return postJson<{ product_id: number; is_wishlisted: boolean }>(`/products/${productId}/wishlist/`, {}, true);
}

export function createProductEnquiry(productId: number, payload: ProductEnquiryPayload) {
  return postJson(`/products/${productId}/enquiries/`, payload);
}

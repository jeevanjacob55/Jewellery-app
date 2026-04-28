import { getJson } from "./client";
import { MarketFeedData, ProductFilterConfigResponse, ProductSearchResponse } from "../types/api";

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

export function getMarketFilterConfig() {
  return getJson<ProductFilterConfigResponse>("/products/filter-config/");
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

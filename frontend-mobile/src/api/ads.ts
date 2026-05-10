import { getJson, postJson, resolveApiUrl } from "./client";
import { AdvertisementListResponse, AdvertisementPlacement } from "../types/api";

type AdEventPayload = {
  placement: AdvertisementPlacement;
  guest_id?: string;
};

type RawAdvertisementItem = AdvertisementListResponse["results"][number] & {
  image_url?: string | null;
};

type RawAdvertisementListResponse = Omit<AdvertisementListResponse, "results"> & {
  results: RawAdvertisementItem[];
};

function normalizeAdvertisement(item: RawAdvertisementItem) {
  return {
    ...item,
    image_url: resolveApiUrl(item.image_url ?? null),
  };
}

export async function getAdvertisements(placement: AdvertisementPlacement): Promise<AdvertisementListResponse> {
  const response = await getJson<RawAdvertisementListResponse>(`/ads/?placement=${encodeURIComponent(placement)}`);
  return {
    ...response,
    results: response.results.map(normalizeAdvertisement),
  };
}

export function recordAdImpression(adId: number, payload: AdEventPayload) {
  return postJson<void>(`/ads/${adId}/impression/`, payload);
}

export function recordAdClick(adId: number, payload: AdEventPayload) {
  return postJson<void>(`/ads/${adId}/click/`, payload);
}

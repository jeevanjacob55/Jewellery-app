import { getJson, postJson } from "./client";
import { AdvertisementListResponse, AdvertisementPlacement } from "../types/api";

type AdEventPayload = {
  placement: AdvertisementPlacement;
  guest_id?: string;
};

export function getAdvertisements(placement: AdvertisementPlacement) {
  return getJson<AdvertisementListResponse>(`/ads/?placement=${encodeURIComponent(placement)}`);
}

export function recordAdImpression(adId: number, payload: AdEventPayload) {
  return postJson<void>(`/ads/${adId}/impression/`, payload);
}

export function recordAdClick(adId: number, payload: AdEventPayload) {
  return postJson<void>(`/ads/${adId}/click/`, payload);
}

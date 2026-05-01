import { getJson } from "./client";
import { AssociationRateDetailResponse, DashboardData, StateRatesData } from "../types/api";

export function getAssociationRates(authenticated = false) {
  return getJson<DashboardData>("/dashboard/", authenticated);
}

export function getStateRates() {
  return getJson<StateRatesData>("/dashboard/state-rates/");
}

export function getAssociationRateDetail(associationId: number) {
  return getJson<AssociationRateDetailResponse>(`/dashboard/associations/${associationId}/`);
}

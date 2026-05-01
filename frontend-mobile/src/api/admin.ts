import { getJson } from "./client";
import {
  AdminMarketPreviewResponse,
  AdminMarketReportSummaryResponse,
  AdminMarketUnderServedReportResponse,
} from "../types/api";

export function getAdminMarketPreview(heroDays = 0) {
  return getJson<AdminMarketPreviewResponse>(`/admin/market-preview/?hero_days=${heroDays}`, true);
}

export function getAdminMarketReportSummary(days = 7) {
  return getJson<AdminMarketReportSummaryResponse>(`/admin/market-report/summary/?days=${days}`, true);
}

export function getAdminMarketUnderServed(days = 7) {
  return getJson<AdminMarketUnderServedReportResponse>(`/admin/market-report/under-served/?days=${days}`, true);
}

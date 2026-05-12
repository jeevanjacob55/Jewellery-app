import { getJson, postJson } from "./client";
import { NotificationFeedResponse, NotificationFeedType } from "../types/api";

export function getNotifications(filterType: NotificationFeedType = "all") {
  const suffix = filterType === "all" ? "" : `?type=${filterType}`;
  return getJson<NotificationFeedResponse>(`/notifications/${suffix}`, true);
}

export function markNotificationRead(notificationId: number) {
  return postJson<{ unread_count: number }>(`/notifications/${notificationId}/read/`, {}, true);
}

export function markAllNotificationsRead() {
  return postJson<{ updated_count: number; unread_count: number }>("/notifications/read-all/", {}, true);
}

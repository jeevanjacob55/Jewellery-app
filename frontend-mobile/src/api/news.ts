import { getJson, postJson, resolveApiUrl } from "./client";
import { NewsData, NewsDetail, NewsFeedItem } from "../types/api";

type RawNewsImageFields = {
  image_url?: string | null;
  image?: string | null;
};

type RawNewsFeedItem = Omit<NewsFeedItem, "image_url"> & RawNewsImageFields;
type RawNewsDetail = Omit<NewsDetail, "image_url" | "related_items"> &
  RawNewsImageFields & {
    related_items?: RawNewsFeedItem[] | { results?: RawNewsFeedItem[] } | null;
  };
type RawNewsData = Omit<NewsData, "featured_news" | "items"> & {
  featured_news?: RawNewsFeedItem | RawNewsFeedItem[] | null;
  items?: RawNewsFeedItem[] | { results?: RawNewsFeedItem[] } | null;
  meetings?: NewsData["meetings"] | { results?: NewsData["meetings"] } | null;
  ticker?: {
    gold?: number | string | null;
    silver?: number | string | null;
  } | null;
};

function normalizeNewsImage<T extends RawNewsImageFields>(item: T): Omit<T, "image" | "image_url"> & { image_url: string | null } {
  const imageUrl = resolveApiUrl(item.image_url ?? item.image ?? null);
  return {
    ...item,
    image_url: imageUrl,
  };
}

function toArray<T>(value: T[] | { results?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value.results)) {
    return value.results;
  }
  return [];
}

function normalizeNewsItem(item: RawNewsFeedItem): NewsFeedItem {
  return normalizeNewsImage(item);
}

function normalizeTickerValue(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function getNewsFeed(authenticated = false): Promise<NewsData> {
  const response = await getJson<RawNewsData>("/news/", authenticated);
  const featuredNewsSource = Array.isArray(response.featured_news) ? response.featured_news[0] ?? null : response.featured_news ?? null;
  return {
    ...response,
    featured_news: featuredNewsSource ? normalizeNewsItem(featuredNewsSource) : null,
    items: toArray(response.items).map(normalizeNewsItem),
    meetings: toArray(response.meetings),
    ticker: {
      gold: normalizeTickerValue(response.ticker?.gold),
      silver: normalizeTickerValue(response.ticker?.silver),
    },
  };
}

export async function getNewsDetail(newsId: number, authenticated = false): Promise<NewsDetail> {
  const response = await getJson<RawNewsDetail>(`/news/${newsId}/`, authenticated);
  const normalized = normalizeNewsImage(response);
  return {
    ...normalized,
    related_items: toArray(response.related_items).map(normalizeNewsItem),
  };
}

export function toggleNewsBookmark(newsId: number) {
  return postJson<{ news_id: number; is_bookmarked: boolean }>(`/news/${newsId}/bookmark/`, {}, true);
}

import { getJson, resolveApiUrl } from "./client";
import { NewsData, NewsDetail, NewsFeedItem } from "../types/api";

type RawNewsImageFields = {
  image_url?: string | null;
  image?: string | null;
};

type RawNewsFeedItem = Omit<NewsFeedItem, "image_url"> & RawNewsImageFields;
type RawNewsDetail = Omit<NewsDetail, "image_url"> & RawNewsImageFields;
type RawNewsData = Omit<NewsData, "featured_news" | "items"> & {
  featured_news?: RawNewsFeedItem | null;
  items?: RawNewsFeedItem[];
};

function normalizeNewsImage<T extends RawNewsImageFields>(item: T): Omit<T, "image" | "image_url"> & { image_url: string | null } {
  const imageUrl = resolveApiUrl(item.image_url ?? item.image ?? null);
  return {
    ...item,
    image_url: imageUrl,
  };
}

export async function getNewsFeed(authenticated = false): Promise<NewsData> {
  const response = await getJson<RawNewsData>("/news/", authenticated);
  return {
    ...response,
    featured_news: response.featured_news ? normalizeNewsImage(response.featured_news) : null,
    items: response.items?.map((item) => normalizeNewsImage(item)) ?? [],
  };
}

export async function getNewsDetail(newsId: number, authenticated = false): Promise<NewsDetail> {
  const response = await getJson<RawNewsDetail>(`/news/${newsId}/`, authenticated);
  return normalizeNewsImage(response);
}

export type SessionStatus = "booting" | "signedOut" | "guest" | "authenticated";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginSuccessResponse extends AuthTokens {
  status: "success";
  me: MeResponse;
}

export type GoogleLoginBlockedStatus =
  | "access_required"
  | "pending_approval"
  | "rejected"
  | "inactive"
  | "account_conflict";

export interface GoogleLoginBlockedResponse {
  status: GoogleLoginBlockedStatus;
  message: string;
  email?: string;
}

export type GoogleLoginResponse = LoginSuccessResponse | GoogleLoginBlockedResponse;

export interface NotificationPreferences {
  rate_alerts: boolean;
  news_alerts: boolean;
  ad_alerts: boolean;
  meeting_alerts: boolean;
  product_alerts: boolean;
}

export interface CompanyNotificationSubscription {
  company_id: number;
  name: string;
  city: string;
  state: string;
  logo_image_url: string | null;
  subscribed_at: string;
}

export type NotificationFeedType = "all" | "product" | "news" | "meeting" | "rate";

export type NotificationTargetRoute = "ProductDetail" | "NewsDetail" | "MeetingDetail" | "RateDetails";

export interface NotificationFeedItem {
  id: number;
  type: Exclude<NotificationFeedType, "all">;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
  target_route: NotificationTargetRoute;
  target_payload: Record<string, unknown>;
}

export interface NotificationFeedResponse {
  results: NotificationFeedItem[];
  unread_count: number;
}

export interface MeUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  role_display_name: string;
  is_admin: boolean;
  has_company: boolean;
  can_manage_products: boolean;
}

export interface MeHierarchy {
  association: string | null;
  state: string | null;
}

export interface MeCompany {
  id: number;
  name: string;
  plan: string;
  upgrade_url: string | null;
}

export interface MeCounts {
  pending_approvals_count: number;
  unread_notifications_count: number;
}

export interface MeResponse {
  user: MeUser;
  hierarchy: MeHierarchy;
  company: MeCompany | null;
  counts: MeCounts;
}

export interface HierarchyReference {
  id: number;
  name: string;
}

export interface MemberProfile {
  phone_number: string;
  company_name: string;
  state: HierarchyReference | null;
  association: HierarchyReference | null;
  district_operational_unit: HierarchyReference | null;
  unit: HierarchyReference | null;
  membership_tier: string;
}

export interface UserScopedRole {
  role: string;
  scope_type: string;
  scope_id: number | null;
}

export interface MemberUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  corporate_email: string;
  role: string;
  jeweller_id: string;
  is_verified_member: boolean;
  onboarding_completed: boolean;
  member_profile: MemberProfile | null;
  notification_preferences: NotificationPreferences | null;
  roles?: UserScopedRole[];
}

export interface UpdateMemberProfileValues {
  phone_number?: string;
  company_name?: string;
  state_id?: number | null;
  association_id?: number | null;
  district_operational_unit_id?: number | null;
  unit_id?: number | null;
}

export interface UpdateMemberUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  corporate_email?: string;
  onboarding_completed?: boolean;
  member_profile?: UpdateMemberProfileValues;
}

export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

export interface GuestProfile {
  guest_name: string;
  state: HierarchyReference | null;
  association: HierarchyReference | null;
  district_operational_unit: HierarchyReference | null;
  unit: HierarchyReference | null;
}

export interface GuestAccessPayload {
  guest_name: string;
  state_id: number;
  association_id?: number;
  district_operational_unit_id?: number;
  unit_id?: number;
}

export interface MemberAccessRequestPayload {
  full_name: string;
  phone_number: string;
  email: string;
  business_name: string;
  state_id: number;
  association_id: number;
  district_operational_unit_id: number;
  unit_id: number;
  notes: string;
}

export interface MemberAccessRequestResponse {
  message: string;
  request: {
    id: number;
    full_name: string;
    email: string;
    business_name: string;
    state: HierarchyReference;
    association: HierarchyReference;
    district_operational_unit: HierarchyReference;
    unit: HierarchyReference;
    status: string;
    created_at: string;
  };
}

export interface GuestSession {
  access_type: "guest";
  guest_profile: GuestProfile;
  capabilities: string[];
}

export interface SessionInfo {
  auth_provider: string;
  supports_google_sso: boolean;
  play_store_target: string;
  firebase_messaging_enabled: boolean;
}

export interface Unit {
  id: number;
  name: string;
}

export interface DistrictOperationalUnit {
  id: number;
  name: string;
  units: Unit[];
}

export interface Association {
  id: number;
  name: string;
  district_units: DistrictOperationalUnit[];
}

export interface RegionState {
  id: number;
  name: string;
  associations: Association[];
}

export interface CompanyOption {
  id: number;
  name: string;
  city: string;
  state: string;
}

export interface DashboardData {
  association: { id: number | null; name: string };
  updated_at_label: string;
  headline_rates: DashboardHeadlineRates;
  comparisons: Array<{
    label: string;
    gold_22k: number;
  }>;
  other_associations: DashboardAssociationRateSummary[];
  global_trends: {
    usd_inr: number;
    gold_oz: number;
    silver_oz: number;
  };
  quick_actions: string[];
  dashboard_welcome_filmstrip: DashboardWelcomeFilmstripData | null;
}

export interface DashboardWelcomeFilmstripItem {
  id: number;
  image_url: string;
  title: string;
  subtitle: string;
}

export interface DashboardWelcomeFilmstripData {
  enabled: boolean;
  association_id: number;
  duration_seconds: number;
  scroll_speed: "slow" | "medium" | "fast" | string;
  reshow_policy: "next_app_launch" | "every_dashboard_visit" | string;
  items: DashboardWelcomeFilmstripItem[];
}

export interface DashboardRateMetric {
  value: number;
  trend: string;
  change_value: number;
  change_percent: number;
  change_label: string;
  change_percent_label: string;
}

export interface DashboardHeadlineRates {
  gold_22k: DashboardRateMetric;
  gold_24k: DashboardRateMetric;
  silver: DashboardRateMetric;
}

export interface DashboardAssociationRateSummary {
  id: number;
  name: string;
  state_name: string;
  updated_at_label: string;
  gold_22k: number;
  gold_24k: number;
  silver: number;
  headline_rates: DashboardHeadlineRates;
}

export interface StateAssociationRates {
  id: number;
  name: string;
  state_name: string;
  updated_at_label: string;
  gold_22k: number;
  gold_24k: number;
  silver: number;
  headline_rates: DashboardHeadlineRates;
}

export interface StateRatesSummary {
  id: number;
  name: string;
  associations: StateAssociationRates[];
}

export interface StateRatesData {
  states: StateRatesSummary[];
}

export interface AssociationRateDetailContext {
  id: number;
  name: string;
  state_name: string;
}

export interface AssociationRateDetailItem {
  key: string;
  label: string;
  unit_label: string;
  value: number;
  trend: string;
  change_value: number;
  change_percent: number;
  change_label: string;
  change_percent_label: string;
}

export interface AssociationRateDetailGroup {
  key: string;
  title: string;
  icon_key: string;
  items: AssociationRateDetailItem[];
}

export interface AssociationRateDetailNotice {
  eyebrow: string;
  body: string;
}

export interface AssociationRateDetailResponse {
  association: AssociationRateDetailContext;
  updated_at_label: string;
  hero_badge_label: string;
  rate_groups: AssociationRateDetailGroup[];
  notice: AssociationRateDetailNotice;
}

export interface CompanyVerification {
  gst_registered: boolean;
  bis_hallmarked: boolean;
  export_licensed: boolean;
}

export interface Product {
  id: number;
  name: string;
  weight_grams: string;
  purity: string;
  price?: string | null;
  description: string;
  category_name: string;
  category_slug?: string;
  subcategory_name?: string | null;
  subcategory_slug?: string | null;
  image_url: string | null;
  attributes?: ProductAttributeEntry[];
  is_active?: boolean;
}

export interface ProductAttributeEntry {
  key: string;
  label: string;
  value: string;
}

export interface Company {
  id: number;
  name: string;
  category: string;
  tier: string;
  tier_id?: number;
  tier_visibility_type?: string;
  max_products?: number;
  city: string;
  state: string;
  state_ref?: HierarchyReference | null;
  association_ref?: HierarchyReference | null;
  about: string;
  daily_capacity: string;
  specialization: string;
  verification: CompanyVerification | null;
  products: Product[];
  hero_image_url: string | null;
  logo_image_url: string | null;
  is_notification_enabled?: boolean;
  admin_priority?: number;
  is_active?: boolean;
  is_approved?: boolean;
}

export interface CompanyManagementTier {
  id: number;
  name: string;
  visibility_type: string;
  max_products: number;
  min_photos_per_product: number;
  max_photos_per_product: number;
}

export interface CompanyManagementSummary {
  id: number;
  name: string;
  category: string;
  city: string;
  state: string;
  about: string;
  daily_capacity: string;
  specialization: string;
  is_active: boolean;
  is_approved: boolean;
  is_market_visible: boolean;
  hero_image_url: string | null;
  logo_image_url: string | null;
  verification: CompanyVerification | null;
  tier: CompanyManagementTier;
  active_product_count: number;
  total_product_count: number;
}

export interface CompanyManagementProductImage {
  asset_id: number;
  url: string;
  original_filename: string;
}

export interface CompanyManagementProductVisibility {
  status: "visible" | "hidden";
  audience_label: string;
  detail: string;
  blockers: string[];
}

export interface AudienceTargetInput {
  target_type: "platform" | "state" | "association" | "unit" | "company" | "user";
  target_id: number | null;
}

export interface ProductVisibilityTargetRecord extends AudienceTargetInput {
  id: number;
  mode: "include" | "exclude";
}

export interface CompanyManagementProduct {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  category_product_type: "gold" | "diamond" | "silver" | "other";
  subcategory_id: number | null;
  subcategory_name: string | null;
  weight_grams: string;
  purity: string;
  price: string | null;
  description: string;
  attribute_values: Record<string, string>;
  is_active: boolean;
  created_at: string;
  image_count: number;
  images: CompanyManagementProductImage[];
  targets: ProductVisibilityTargetRecord[];
  visibility: CompanyManagementProductVisibility;
}

export interface CompanyManagementDetail {
  company: CompanyManagementSummary;
  products: CompanyManagementProduct[];
}

export interface CompanyTierDefinition {
  id: number;
  name: string;
  slug: string;
  description: string;
  max_products: number;
  min_photos_per_product: number;
  max_photos_per_product: number;
  max_companies_allowed: number | null;
  price: string;
  is_free: boolean;
  is_active: boolean;
  base_weight: number;
  hero_eligible: boolean;
  premium_floor_share: string;
  cooldown_hours: number;
  display_priority: number;
  visibility_type: string;
  current_company_count: number;
}

export interface CompanyTierManagementCompany {
  id: number;
  name: string;
  active_product_count: number;
  is_active: boolean;
  is_approved: boolean;
}

export interface CompanyTierManagementCapabilities {
  can_manage_products: boolean;
  can_activate_products: boolean;
  can_request_upgrade: boolean;
  can_request_downgrade: boolean;
  market_visibility_type: string;
  hero_eligible: boolean;
  fairness_weight: number;
  premium_floor_share: string;
  cooldown_hours: number;
}

export interface CompanyTierRequest {
  id: number;
  request_type: string;
  status: string;
  company_note: string;
  admin_note: string;
  current_tier_name: string;
  requested_tier_name: string;
  retain_active_product_ids: number[];
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  requested_tier: CompanyTierDefinition;
}

export interface CompanyTierManagementOverview {
  current_tier: CompanyTierDefinition;
  company: CompanyTierManagementCompany;
  capabilities: CompanyTierManagementCapabilities;
  active_products: CompanyManagementProduct[];
  available_upgrades: CompanyTierDefinition[];
  available_downgrades: CompanyTierDefinition[];
  pending_request: CompanyTierRequest | null;
  requests: CompanyTierRequest[];
}

export interface CompanyTierRequestCreatePayload {
  requested_tier_id: number;
  company_note?: string;
}

export interface CompanyTierRequestActionResponse {
  message: string;
  request: CompanyTierRequest;
}

export interface CompanyProductWritePayload {
  category?: number;
  subcategory?: number | null;
  name?: string;
  weight_grams?: string;
  purity?: string;
  price?: string | null;
  description?: string;
  is_active?: boolean;
  image_asset_ids?: number[];
  attribute_values?: Record<string, string>;
  include_targets?: AudienceTargetInput[];
  exclude_targets?: AudienceTargetInput[];
}

export interface MarketCompanyCard {
  company_id: number;
  name: string;
  hero_image_url: string | null;
  logo_image_url: string | null;
  is_verified: boolean;
  city: string;
  state: string;
  tier_visibility_type: string;
}

export interface MarketCategoryCard {
  id: number;
  name: string;
  slug: string;
  icon_key: string;
}

export interface MarketProductCard {
  id: number;
  title: string;
  image_url: string | null;
  purity: string;
  weight_grams: string;
  company_id: number;
  company_name: string;
}

export type MarketRowType = "company_tier" | "category_collection" | "product_collection";
export type MarketRowLayout = "hero_company" | "grid_company" | "rail_company" | "rail_category" | "grid_product";
export type MarketServingMode = "scheduled_hero" | "weighted_companies" | "latest_products" | "dormant";

interface MarketRowBase {
  id: number;
  title: string;
  row_type: MarketRowType;
  layout: MarketRowLayout;
  sort_order: number;
  is_enabled: boolean;
}

export interface MarketCompanyRow extends MarketRowBase {
  row_type: "company_tier";
  layout: "hero_company" | "grid_company" | "rail_company";
  zone_key?: string | null;
  serving_mode?: MarketServingMode | null;
  items: MarketCompanyCard[];
}

export interface MarketCategoryRow extends MarketRowBase {
  row_type: "category_collection";
  layout: "rail_category";
  zone_key?: null;
  serving_mode?: null;
  items: MarketCategoryCard[];
}

export interface MarketProductRow extends MarketRowBase {
  row_type: "product_collection";
  layout: "grid_product";
  zone_key?: string | null;
  serving_mode?: MarketServingMode | null;
  items: MarketProductCard[];
}

export type MarketRow = MarketCompanyRow | MarketCategoryRow | MarketProductRow;

export interface MarketFeedSettings {
  hero_auto_scroll_seconds: 3 | 5;
}

export interface MarketFeedData {
  rows: MarketRow[];
  settings: MarketFeedSettings;
}

export interface AdminMarketHeroScheduleEntry {
  slot_key: string;
  slot_index: number;
  serves_at: string;
  zone_key: string;
  title: string;
  wildcard_slot: boolean;
  selection_reason: string | null;
  company: MarketCompanyCard | null;
}

export interface AdminMarketPreviewResponse {
  rows: MarketRow[];
  candidate_count: number;
  applied_override_count: number;
  fallback_used: boolean;
  hero_schedule: AdminMarketHeroScheduleEntry[];
}

export interface AdminMarketReportTopCompany {
  company_id: number;
  name: string;
  tier_name: string;
  total_serves: number;
}

export interface AdminMarketZoneSummary {
  zone_key: string;
  title: string;
  total_serves: number;
  selection_reasons: Record<string, number>;
  top_companies: AdminMarketReportTopCompany[];
}

export interface AdminMarketTierSummary {
  tier_id: number | null;
  tier_slug: string | null;
  tier_name: string | null;
  total_serves: number;
}

export interface AdminMarketReportSummaryResponse {
  days: number;
  window_start: string;
  window_end: string;
  fairness_enabled: boolean;
  zones: AdminMarketZoneSummary[];
  tiers: AdminMarketTierSummary[];
}

export interface AdminMarketUnderServedEntry {
  company_id: number;
  company_name: string;
  tier_id: number;
  tier_name: string;
  zone_key: string;
  zone_title: string;
  actual_serves: number;
  target_serves: string;
  deficit: string;
}

export interface AdminMarketUnderServedReportResponse {
  days: number;
  window_start: string;
  window_end: string;
  fairness_enabled: boolean;
  results: AdminMarketUnderServedEntry[];
}

export type ProductFilterAttributeType = "select" | "range" | "number";

export interface ProductFilterAttributeDefinition {
  id: number;
  key: string;
  label: string;
  type: ProductFilterAttributeType;
  options: Array<string | Record<string, unknown>>;
  is_required: boolean;
}

export interface ProductFilterSubCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ProductFilterCategory {
  id: number;
  name: string;
  slug: string;
  product_type: "gold" | "diamond" | "silver" | "other";
  icon_key: string;
  subcategories: ProductFilterSubCategory[];
  attributes: ProductFilterAttributeDefinition[];
}

export interface ProductFilterCompany {
  id: number;
  name: string;
}

export interface ProductFilterConfigResponse {
  categories: ProductFilterCategory[];
  purity_options: string[];
  companies: ProductFilterCompany[];
  states: string[];
  price_min: string | null;
  price_max: string | null;
  weight_min: string | null;
  weight_max: string | null;
}

export interface ProductSearchResult {
  id: number;
  company_id: number;
  company_name: string;
  title: string;
  category_name: string;
  category_slug: string;
  category_product_type: "gold" | "diamond" | "silver" | "other";
  subcategory_name: string | null;
  subcategory_slug: string | null;
  purity: string;
  weight_grams: string;
  price: string | null;
  image_url: string | null;
  attribute_label: string | null;
  attribute_value: string | null;
  attributes: ProductAttributeEntry[];
}

export interface ProductSearchResponse {
  count: number;
  results: ProductSearchResult[];
  sort: string;
}

export interface ProductDetailImage {
  url: string;
  type: "image" | "video";
}

export interface ProductDetailCompany {
  id: number;
  name: string;
  location: string;
  logo: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface ProductDetail {
  id: number;
  name: string;
  collection_label: string | null;
  purity: string;
  weight: string;
  length: string | null;
  category: string;
  category_slug: string;
  category_product_type: "gold" | "diamond" | "silver" | "other";
  subcategory: string | null;
  availability: string;
  hallmark: string | null;
  price_min: string | null;
  price_max: string | null;
  description: string;
  images: ProductDetailImage[];
  company: ProductDetailCompany;
  is_wishlisted: boolean;
  share_url: string | null;
}

export type AdvertisementPlacement = "dashboard_hero" | "market_banner" | "news_inline";

export type AdvertisementActionType = "external_url" | "internal_screen" | "product" | "company" | "category";

export interface AdvertisementActionPayload {
  url?: string;
  screen?: string;
  params?: Record<string, unknown>;
  product_id?: number;
  company_id?: number;
  category?: string;
}

export interface AdvertisementItem {
  id: number;
  label: string;
  title: string;
  description: string;
  image_url: string | null;
  background_color: string;
  action_type: AdvertisementActionType;
  action_payload: AdvertisementActionPayload;
}

export interface AdvertisementListResponse {
  results: AdvertisementItem[];
}

export interface ServicesData {
  overview: Array<{
    title: string;
    status: string;
  }>;
  services: string[];
  metrics: {
    average_tat_days: number;
    accuracy: string;
  };
}

export interface NewsFeedItem {
  id: number;
  title: string;
  description: string;
  publisher_type: string;
  publisher_id: number | null;
  published_at: string | null;
  image_url: string | null;
  is_bookmarked: boolean;
}

export interface NewsDetail {
  id: number;
  title: string;
  description: string;
  publisher_type: string;
  publisher_id: number | null;
  published_at: string | null;
  image_url: string | null;
  is_bookmarked: boolean;
  related_items?: NewsFeedItem[];
}

export interface NewsData {
  urgent_alert: {
    title: string;
    summary: string;
  };
  featured_news?: NewsFeedItem | null;
  items?: NewsFeedItem[];
  meetings: MeetingListItem[];
  ticker: {
    gold: number;
    silver: number;
  };
}

export type MeetingRsvpState = "attending" | "maybe" | "not_attending";

export interface MeetingAudienceTarget {
  id: number;
  target_type: string;
  target_id: number | null;
  mode: string;
}

export interface MeetingResponseSummary {
  attending: number;
  maybe: number;
  not_attending: number;
}

export interface MeetingListItem {
  id: number;
  title: string;
  start_datetime: string;
  venue_name: string;
  venue_address: string;
  google_maps_link: string;
  meeting_mode: string;
  online_meeting_link: string;
  current_user_response: MeetingRsvpState | null;
}

export interface MeetingDetail {
  id: number;
  title: string;
  description: string;
  created_by_id: number | null;
  organizer_type: string;
  organizer_id: number | null;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  venue_address: string;
  google_maps_link: string;
  meeting_mode: string;
  online_meeting_link: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_user_response: MeetingRsvpState | null;
  response_summary: MeetingResponseSummary;
  targets: MeetingAudienceTarget[];
}

export interface ReverseSearchResponse {
  id: number;
  message: string;
  availability_label: string;
  created_at: string;
}

export interface ReverseSearchAttachment {
  id: number;
  original_filename: string;
  object_key: string;
  visibility: string;
  moderation_status: string;
  uploaded_at: string;
}

export interface ReverseSearchRequest {
  id: number;
  notes: string;
  status: string;
  created_at: string;
  attachments: ReverseSearchAttachment[];
  responses: ReverseSearchResponse[];
}

export interface ReverseSearchUploadSession {
  object_key: string;
  bucket_name: string;
  visibility: string;
  expires_in: number;
  upload_url: string;
}

export interface MediaUploadSession {
  object_key: string;
  bucket_name: string;
  visibility: string;
  expires_in: number;
  upload_url: string;
}

export interface MediaAssetFinalizePayload {
  object_key: string;
  bucket_name: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
}

export interface MediaAssetFinalizeResponse {
  asset_id: number;
  object_key: string;
  public_url: string;
  original_filename: string;
}

export interface EnquiryPayload {
  company: number;
  product?: number;
  requester_name: string;
  requester_phone: string;
  notes: string;
}

export interface ProductEnquiryPayload {
  type?: string;
  message?: string;
  requester_name: string;
  requester_phone: string;
}

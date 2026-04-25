export type SessionStatus = "booting" | "signedOut" | "guest" | "authenticated";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface NotificationPreferences {
  rate_alerts: boolean;
  news_alerts: boolean;
  ad_alerts: boolean;
  meeting_alerts: boolean;
}

export interface MemberProfile {
  phone_number: string;
  company_name: string;
  state_name: string;
  district_name: string;
  local_chapter_name: string;
  membership_tier: string;
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
}

export interface GuestProfile {
  guest_name: string;
  state: string;
  district?: string;
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

export interface RegionChapter {
  id: number;
  name: string;
}

export interface RegionDistrict {
  id: number;
  name: string;
  chapters: RegionChapter[];
}

export interface RegionState {
  id: number;
  name: string;
  districts: RegionDistrict[];
}

export interface DashboardData {
  headline_rates: {
    gold_22k: { value: number; trend: string };
    gold_24k: { value: number; trend: string };
    silver: { value: number; trend: string };
  };
  comparisons: Array<{
    label: string;
    gold_22k: number;
  }>;
  global_trends: {
    usd_inr: number;
    gold_oz: number;
    silver_oz: number;
  };
  quick_actions: string[];
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
  description: string;
}

export interface Company {
  id: number;
  name: string;
  category: string;
  tier: string;
  city: string;
  state: string;
  about: string;
  daily_capacity: string;
  specialization: string;
  verification: CompanyVerification | null;
  products: Product[];
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

export interface NewsData {
  urgent_alert: {
    title: string;
    summary: string;
  };
  meetings: Array<{
    title: string;
    venue: string;
    calendar_url: string;
  }>;
  ticker: {
    gold: number;
    silver: number;
  };
}

export interface ReverseSearchResponse {
  id: number;
  message: string;
  availability_label: string;
  created_at: string;
}

export interface ReverseSearchRequest {
  id: number;
  notes: string;
  status: string;
  created_at: string;
  responses: ReverseSearchResponse[];
}

export interface EnquiryPayload {
  company: number;
  product?: number;
  requester_name: string;
  requester_phone: string;
  notes: string;
}

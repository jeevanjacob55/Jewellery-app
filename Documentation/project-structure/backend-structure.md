# Backend Structure

## Backend Layout
- `backend/manage.py`
  - Django command entrypoint.
- `backend/config/`
  - Framework configuration and shared infrastructure.
- `backend/apps/`
  - Business domains split into focused Django apps.
- `backend/media/`
  - Local development media storage for uploaded files.

## Domain Summary
- `accounts`
  - Login/session metadata, guest access, member profile updates, notification preferences, scoped role logic.
- `regions`
  - Master hierarchy for states, associations, district operational units, and units.
- `rates`
  - Dashboard rate summaries, state comparisons, and association-level rate detail payloads.
- `directory`
  - Company tiers, market feed selection, company catalog, products, wishlists, enquiries, image/media workflows, and market analytics.
- `news`
  - News publishing, audience targeting, approval routing, meeting scheduling, and RSVP visibility rules.
- `ads`
  - Ad delivery, upload sessions, targeting, approvals, impression/click analytics.
- `reverse_search`
  - Private image-backed reverse-design request workflow.
- `services_app`
  - Compliance request/reminder dashboard.
- `admin_ops`
  - Admin dashboard stubs, hierarchy management, and deterministic demo seeding.

## File: backend/manage.py
- Purpose: Standard Django CLI bootstrap.
- Key responsibilities:
  - Sets `DJANGO_SETTINGS_MODULE`.
  - Delegates all management commands to Django.

## File: backend/config/settings.py
- Purpose: Central Django runtime configuration.
- Key responsibilities:
  - Registers installed apps and middleware.
  - Configures JWT auth, SQLite/database settings, CORS, media paths, and market-feed feature flags.
  - Defines environment-backed settings for upload TTLs and company plan upgrade URL.

## File: backend/config/urls.py
- Purpose: Main API routing table.
- Key responsibilities:
  - Exposes health and mock-upload endpoints.
  - Mounts every domain app under `/api/...`.
- Important classes / endpoints:
  - `HealthView`: lightweight health-check endpoint.
  - `/api/auth/`, `/api/me/`, `/api/regions/`, `/api/dashboard/`, `/api/directory/`, `/api/products/`, `/api/news/`, `/api/meetings/`, `/api/ads/`, `/api/admin/`.

## File: backend/config/storage.py
- Purpose: Shared media upload helper layer.
- Key responsibilities:
  - Builds mock signed upload sessions for public and private files.
  - Stores temporary mock-upload metadata used by finalize flows.
- Important classes / functions:
  - `UploadSession`: upload-session payload contract.
  - `build_mock_signed_upload()`: generates object key, bucket, TTL, and upload URL.
  - `MockUploadView`: accepts PUT uploads for local/mock storage flows.

## File: backend/apps/accounts/models.py
- Purpose: User identity, membership profile, admin scope, and preference models.
- Key responsibilities:
  - Extends Django `AbstractUser` with business roles and member metadata.
  - Persists hierarchy-linked member profiles and notification preferences.
  - Models scoped admin roles and pending member-access requests.
- Important classes / functions:
  - `User`: root auth model with scoped-role helpers and admin-access properties.
  - `MemberProfile`: ties a user to state/association/unit hierarchy and company name.
  - `NotificationPreference`: stores rate/news/ad/meeting opt-ins.
  - `MemberAccessRequest`: pending onboarding request submitted by prospective members.
  - `UserRole`: normalized scoped-role assignments for platform/state/association/unit/company.
  - `AdminScopeAssignment`: legacy-style admin scope assignment model.

## File: backend/apps/accounts/serializers.py
- Purpose: Request/response contracts for account and profile APIs.
- Key responsibilities:
  - Validates hierarchy consistency when creating guest/member payloads.
  - Supports partial updates to user and nested member-profile data.
  - Shapes `/me/`, preferences, guest access, and access-request responses.
- Important classes / functions:
  - `UpdateUserSerializer`: updates user fields and nested `MemberProfile`.
  - `GuestAccessSerializer`: validates guest hierarchy selection.
  - `MemberAccessRequestCreateSerializer`: validates member onboarding requests.
  - `UserSerializer`, `MemberProfileSerializer`, `NotificationPreferenceSerializer`.

## File: backend/apps/accounts/views.py
- Purpose: Account-facing API handlers.
- Key responsibilities:
  - Issues guest session payloads.
  - Creates member access requests.
  - Serves and updates current-user profile data.
  - Reads and updates notification preferences.
  - Exposes basic session metadata for clients.
- Important classes / endpoints:
  - `GuestAccessView`: POST guest access session.
  - `MemberAccessRequestView`: POST prospective member request.
  - `MeView`: GET/PATCH current user, linked company, and counts.
  - `NotificationPreferenceView`: GET/PATCH preference state.
  - `SessionInfoView`: GET auth/platform capability metadata.

## File: backend/apps/accounts/urls.py
- Purpose: Authentication and access-request routing.
- Key responsibilities:
  - Registers JWT login/refresh and guest/member-access endpoints.

## File: backend/apps/accounts/me_urls.py
- Purpose: Current-user routing.
- Key responsibilities:
  - Registers `/api/me/` and `/api/me/preferences/`.

## File: backend/apps/regions/models.py
- Purpose: Canonical geographic/association hierarchy.
- Key responsibilities:
  - Defines state -> association -> district operational unit -> unit relationships.
- Important classes:
  - `RegionState`
  - `Association`
  - `DistrictOperationalUnit`
  - `Unit`

## File: backend/apps/regions/serializers.py
- Purpose: Hierarchy read serializers.
- Key responsibilities:
  - Serializes the full nested region tree for clients and admin tools.
- Important classes:
  - `RegionStateSerializer`
  - `AssociationSerializer`
  - `DistrictOperationalUnitSerializer`
  - `UnitSerializer`

## File: backend/apps/regions/views.py
- Purpose: Public hierarchy lookup API.
- Key responsibilities:
  - Returns the full nested region hierarchy with prefetch optimization.
- Important classes / endpoints:
  - `RegionHierarchyView`: GET `/api/regions/`.

## File: backend/apps/regions/urls.py
- Purpose: Region routing.
- Key responsibilities:
  - Maps the hierarchy endpoint.

## File: backend/apps/rates/models.py
- Purpose: Bullion and comparison rate storage.
- Key responsibilities:
  - Stores association rates, external comparison snapshots, and global trend data.
- Important classes:
  - `AssociationRate`
  - `ExternalMarketRate`
  - `GlobalTrendSnapshot`

## File: backend/apps/rates/serializers.py
- Purpose: Dashboard and rate-detail response schemas.
- Key responsibilities:
  - Defines typed payloads for dashboard, state-rates, and association-detail responses.
- Important classes:
  - `DashboardResponseSerializer`
  - `StateRatesResponseSerializer`
  - `AssociationRateDetailResponseSerializer`

## File: backend/apps/rates/views.py
- Purpose: Rate aggregation and public dashboard APIs.
- Key responsibilities:
  - Computes rate trends from latest vs previous association snapshots.
  - Builds dashboard payloads, state summaries, and detailed association rate groups.
- Important classes / functions:
  - `build_dashboard_payload()`: member-context dashboard payload.
  - `build_state_rates_payload()`: cross-state comparison payload.
  - `build_association_rate_detail_payload()`: detailed 22K/24K/silver breakdown.
  - `DashboardView`: GET `/api/dashboard/`.
  - `StateRatesView`: GET `/api/dashboard/state-rates/`.
  - `AssociationRateDetailView`: GET `/api/dashboard/associations/<id>/`.

## File: backend/apps/directory/models.py
- Purpose: Core market-directory data model.
- Key responsibilities:
  - Stores companies, tiers, products, categories, media assets, enquiries, and market-serving runtime data.
  - Stores market-zone scheduling, eligibility, overrides, and exposure analytics.
- Important classes:
  - `CompanyTier`, `Company`
  - `MarketRow`, `MarketZone`, `ZoneEligibilityRule`, `PlacementOverride`, `ExposureLedger`
  - `ProductCategory`, `ProductSubCategory`, `ProductAttributeDefinition`
  - `Product`, `ProductWishlist`
  - `MediaAsset`, `CompanyImage`, `ProductImage`, `ProductAttributeValue`
  - `Enquiry`, `CompanyVerification`

## File: backend/apps/directory/services.py
- Purpose: Directory business rules and market-feed selection engine.
- Key responsibilities:
  - Enforces tier limits for products and product images.
  - Applies tier downgrade rules and product-retention validation.
  - Builds zone-based market feeds, hero schedules, fairness calculations, and exposure reports.
- Important classes / functions:
  - `TierValidationError`
  - `user_can_manage_company()`
  - `validate_company_tier_capacity()`
  - `validate_company_can_activate_product()`
  - `apply_tier_change_with_selected_products()`
  - `build_market_zone_feed()`
  - `build_market_preview_payload()`
  - `build_market_report_summary()`
  - `build_under_served_report()`

## File: backend/apps/directory/serializers.py
- Purpose: Payload layer for directory, catalog, and market-admin APIs.
- Key responsibilities:
  - Shapes company/product payloads for public catalog screens.
  - Serializes market rows, filter metadata, product detail, enquiries, and admin market controls.
  - Validates tier assignment, product creation/update, product images, and override payloads.
- Important classes / functions:
  - `CompanySerializer`, `ProductSerializer`, `ProductDetailSerializer`
  - `MarketRowSerializer`, `MarketFeedSerializer`
  - `ProductFilterCategorySerializer`, `ProductSearchResultSerializer`
  - `CompanyTierSerializer`, `MarketZoneSerializer`, `PlacementOverrideSerializer`
  - `ProductWriteSerializer`, `CompanyTierAssignmentSerializer`, `CompanyTierAssignmentConfirmSerializer`

## File: backend/apps/directory/views.py
- Purpose: Public directory/catalog APIs plus super-admin market controls.
- Key responsibilities:
  - Serves companies, market feed, filter config, product search/detail, wishlists, enquiries, and image upload sessions.
  - Provides admin APIs for company tiers, zones, market rows, overrides, preview, reporting, and company visibility.
- Important classes / endpoints:
  - `CompanyListView`, `CompanyDetailView`
  - `MarketFeedView`
  - `ProductFilterConfigView`, `ProductSearchView`, `ProductDetailView`
  - `ProductWishlistToggleView`, `ProductEnquiryCreateView`, `EnquiryCreateView`
  - `CompanyImageUploadSessionView`, `ProductImageUploadSessionView`, `ProductImageAttachView`
  - `CompanyProductListCreateView`, `CompanyProductDetailView`
  - `AdminCompanyTierListCreateView`, `AdminCompanyTierDetailView`, `AdminCompanyTierToggleView`
  - `AdminMarketZoneListCreateView`, `AdminMarketZoneDetailView`, `AdminMarketZoneEligibilityRuleView`
  - `AdminMarketRowListCreateView`, `AdminMarketRowDetailView`
  - `AdminPlacementOverrideListCreateView`, `AdminPlacementOverrideDetailView`
  - `AdminMarketPreviewView`, `AdminMarketReportSummaryView`, `AdminMarketUnderServedReportView`
  - `AdminCompanyTierAssignmentView`, `AdminCompanyTierAssignmentConfirmView`, `AdminCompanyMarketVisibilityView`

## File: backend/apps/directory/urls.py
- Purpose: Company and market-directory routing.
- Key responsibilities:
  - Registers public company endpoints, market feed, general enquiries, and company-managed product/image endpoints.

## File: backend/apps/directory/product_urls.py
- Purpose: Product-catalog routing.
- Key responsibilities:
  - Registers product search, filter config, detail, wishlist, and product-specific enquiry endpoints.

## File: backend/apps/news/models.py
- Purpose: News, targeting, meetings, and RSVP storage.
- Key responsibilities:
  - Stores news items with publisher scope and approval state.
  - Stores audience include/exclude targets for news and meetings.
  - Stores meetings, responses, alerts, and legacy feed helpers.
- Important classes:
  - `News`, `NewsBookmark`, `NewsTarget`
  - `Meeting`, `MeetingTarget`, `MeetingResponse`
  - `Alert`, `NewsItem`, `MeetingEvent`

## File: backend/apps/news/services.py
- Purpose: Core business rules for scoped news publishing and meeting visibility.
- Key responsibilities:
  - Validates who can publish news and for which audience.
  - Resolves whether news publishes directly or requires approval.
  - Computes visibility tokens from user/member/company scope.
  - Validates meeting organizer scope, audience scope, meeting visibility, and RSVP rules.
- Important classes / functions:
  - `NewsValidationError`
  - `create_news_with_targets()`
  - `can_user_review_news()`
  - `is_news_visible_to_user()`
  - `create_meeting_with_targets()`
  - `update_meeting_with_targets()`
  - `get_visible_meetings_for_user()`
  - `respond_to_meeting()`

## File: backend/apps/news/serializers.py
- Purpose: News feed, detail, creation, meeting, and RSVP payload schemas.
- Key responsibilities:
  - Shapes feed/detail payloads including bookmark state and related news.
  - Validates news/meeting create and update inputs.
  - Serializes meeting response summaries and audience targets.
- Important classes / functions:
  - `NewsFeedResponseSerializer`, `NewsDetailSerializer`, `NewsSerializer`
  - `CreateNewsSerializer`, `RejectNewsSerializer`
  - `MeetingSerializer`, `CreateMeetingSerializer`, `UpdateMeetingSerializer`, `MeetingRespondSerializer`
  - `get_news_image_url()`

## File: backend/apps/news/views.py
- Purpose: News and meetings API surface.
- Key responsibilities:
  - Serves the news feed, detailed news pages, bookmarks, approvals, rejections, meeting lists, meeting detail, cancellation, and RSVPs.
  - Delegates business rules to `services.py`.
- Important classes / endpoints:
  - `NewsFeedView`, `NewsDetailView`, `NewsBookmarkToggleView`
  - `NewsApproveView`, `NewsRejectView`
  - `MeetingListCreateView`, `MeetingDetailView`
  - `MeetingCancelView`, `MeetingRespondView`

## File: backend/apps/news/urls.py
- Purpose: News-routing table.
- Key responsibilities:
  - Registers feed, detail, bookmark, approve, and reject endpoints.

## File: backend/apps/news/meeting_urls.py
- Purpose: Meeting-routing table.
- Key responsibilities:
  - Registers meeting list/create, detail, cancel, and RSVP endpoints.

## File: backend/apps/ads/models.py
- Purpose: Advertisement domain model.
- Key responsibilities:
  - Stores ad creatives, targeting, approval metadata, assets, impressions, and clicks.
- Important classes:
  - `Advertisement`
  - `AdTargeting`
  - `AdAsset`
  - `AdApproval`
  - `AdImpression`
  - `AdClick`

## File: backend/apps/ads/serializers.py
- Purpose: Ad delivery and event payload schemas.
- Key responsibilities:
  - Shapes public ad cards.
  - Validates impression/click event payloads.
- Important classes:
  - `AdvertisementSerializer`
  - `AdEventSerializer`
  - `AdImpressionSerializer`
  - `AdClickSerializer`

## File: backend/apps/ads/views.py
- Purpose: Ad delivery and analytics endpoints.
- Key responsibilities:
  - Returns active, approved ads for a requested placement.
  - Issues ad asset upload sessions.
  - Records impressions and clicks for authenticated or guest traffic.
- Important classes / endpoints:
  - `AdvertisementOverviewView`
  - `AdvertisementUploadSessionView`
  - `AdvertisementImpressionView`
  - `AdvertisementClickView`

## File: backend/apps/ads/urls.py
- Purpose: Advertisement routing.
- Key responsibilities:
  - Registers list, upload-session, impression, and click endpoints.

## File: backend/apps/reverse_search/models.py
- Purpose: Reverse-design request persistence.
- Key responsibilities:
  - Stores request status, private attachments, and supplier responses.
- Important classes:
  - `ReverseSearchRequest`
  - `ReverseSearchAttachment`
  - `ReverseSearchResponse`

## File: backend/apps/reverse_search/serializers.py
- Purpose: Reverse-search payload schemas.
- Key responsibilities:
  - Shapes request, attachment, and response payloads.
  - Validates upload-session and attachment-finalization inputs.
- Important classes:
  - `ReverseSearchRequestSerializer`
  - `ReverseSearchAttachmentSerializer`
  - `ReverseSearchResponseSerializer`
  - `ReverseSearchUploadSessionSerializer`
  - `ReverseSearchFinalizeAttachmentSerializer`

## File: backend/apps/reverse_search/views.py
- Purpose: Protected reverse-search workflow endpoints.
- Key responsibilities:
  - Creates/list requests for the current user.
  - Issues private upload sessions for reference images.
  - Finalizes uploads by converting mock-upload metadata into `MediaAsset` records.
- Important classes / endpoints:
  - `ReverseSearchListCreateView`
  - `ReverseSearchUploadSessionView`
  - `ReverseSearchFinalizeAttachmentView`
  - `ReverseSearchStatusListView`

## File: backend/apps/reverse_search/urls.py
- Purpose: Reverse-search routing.
- Key responsibilities:
  - Registers list/create, status, upload-session, and finalize-attachment endpoints.

## File: backend/apps/services_app/models.py
- Purpose: Compliance/service dashboard storage.
- Key responsibilities:
  - Stores service types, open compliance requests, and reminders.
- Important classes:
  - `ServiceType`
  - `ComplianceRequest`
  - `ComplianceReminder`

## File: backend/apps/services_app/serializers.py
- Purpose: Compliance dashboard response schema.
- Key responsibilities:
  - Shapes the overview list, service list, and metrics block for the mobile services screen.

## File: backend/apps/services_app/views.py
- Purpose: Compliance dashboard aggregation API.
- Key responsibilities:
  - Combines open requests, reminders, service labels, average turnaround, and accuracy metrics into a single payload.
- Important classes / functions:
  - `build_compliance_dashboard_payload()`
  - `ComplianceDashboardView`

## File: backend/apps/services_app/urls.py
- Purpose: Services-routing table.
- Key responsibilities:
  - Registers the services dashboard endpoint.

## File: backend/apps/admin_ops/models.py
- Purpose: Admin audit model.
- Key responsibilities:
  - Stores audit-log events for important admin actions.
- Important classes:
  - `AuditLog`

## File: backend/apps/admin_ops/permissions.py
- Purpose: Reusable admin permission gates.
- Key responsibilities:
  - Separates general admin-console access from true super-admin-only operations.
- Important classes:
  - `HasAdminAccess`
  - `IsSuperAdmin`

## File: backend/apps/admin_ops/serializers.py
- Purpose: Admin hierarchy mutation serializers.
- Key responsibilities:
  - Validates association creation and bulk district/unit creation inputs.
  - Serializes hierarchy trees and mutation results.
- Important classes / functions:
  - `AssociationCreateSerializer`
  - `DistrictUnitBulkCreateSerializer`
  - `UnitBulkCreateSerializer`
  - `SuperAdminHierarchySerializer`
  - `build_bulk_create_result()`

## File: backend/apps/admin_ops/views.py
- Purpose: Admin-overview and hierarchy-management endpoints.
- Key responsibilities:
  - Serves high-level admin overview widgets.
  - Returns hierarchy data for super admins.
  - Creates associations and bulk-creates district units and units.
- Important classes / endpoints:
  - `AdminOverviewView`
  - `HierarchyManagementView`
  - `AssociationCreateView`
  - `DistrictUnitBulkCreateView`
  - `UnitBulkCreateView`

## File: backend/apps/admin_ops/urls.py
- Purpose: Admin routing entrypoint.
- Key responsibilities:
  - Mounts admin overview and hierarchy APIs.
  - Re-exports the directory market-admin endpoints under `/api/admin/...`.

## File: backend/apps/admin_ops/demo_seed.py
- Purpose: Deterministic local/demo data generator.
- Key responsibilities:
  - Seeds regions, users, scoped roles, companies, products, rates, news, meetings, ads, reverse-search records, and audit logs.
  - Supports full reset and repeatable local environments.
- Important classes / functions:
  - `DEMO_PASSWORD`
  - `reset_demo_data()`
  - `seed_demo_data()`
  - `_seed_regions()`, `_seed_users()`, `_seed_directory()`, `_seed_rates()`, `_seed_news()`, `_seed_ads()`, `_seed_reverse_search()`

## File: backend/apps/admin_ops/management/commands/seed_demo_data.py
- Purpose: CLI entrypoint for demo data seeding.
- Key responsibilities:
  - Exposes `manage.py seed_demo_data`.
  - Supports `--reset` for clean reseeding.

## Test File Pattern
- Each app includes `tests.py` and, where needed, specialized test files such as `backend/apps/admin_ops/tests_seed.py`.
- These files are the fastest way to understand expected API behavior and seeded-data assumptions.

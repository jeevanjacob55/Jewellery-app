# Feature Mapping

## Authentication And Session Bootstrap
- Backend:
  - `backend/apps/accounts/views.py`
  - `backend/apps/accounts/serializers.py`
  - `backend/apps/accounts/models.py`
  - `backend/apps/accounts/urls.py`
  - `backend/apps/accounts/me_urls.py`
- Frontend:
  - `frontend-mobile/src/session/SessionProvider.tsx`
  - `frontend-mobile/src/api/client.ts`
  - `frontend-mobile/src/storage/sessionStorage.ts`
  - `frontend-mobile/src/screens/auth/LoginScreen.tsx`

## Guest Access And Member Access Requests
- Backend:
  - `backend/apps/accounts/views.py`
  - `backend/apps/accounts/serializers.py`
  - `backend/apps/regions/models.py`
- Frontend:
  - `frontend-mobile/src/screens/auth/LoginScreen.tsx`
  - `frontend-mobile/src/types/api.ts`

## Region Hierarchy And Scope Selection
- Backend:
  - `backend/apps/regions/models.py`
  - `backend/apps/regions/serializers.py`
  - `backend/apps/regions/views.py`
  - `backend/apps/regions/urls.py`
- Frontend:
  - `frontend-mobile/src/types/api.ts`
  - `frontend-mobile/src/screens/profile/EditProfileScreen.tsx`
  - `frontend-mobile/src/screens/auth/LoginScreen.tsx`

## Member Profile And Notification Preferences
- Backend:
  - `backend/apps/accounts/models.py`
  - `backend/apps/accounts/serializers.py`
  - `backend/apps/accounts/views.py`
- Frontend:
  - `frontend-mobile/src/session/SessionProvider.tsx`
  - `frontend-mobile/src/screens/profile/MemberProfileScreen.tsx`
  - `frontend-mobile/src/screens/profile/EditProfileScreen.tsx`
  - `frontend-mobile/src/screens/profile/NotificationSettingsScreen.tsx`

## Rates Dashboard And Association Comparison
- Backend:
  - `backend/apps/rates/models.py`
  - `backend/apps/rates/serializers.py`
  - `backend/apps/rates/views.py`
  - `backend/apps/rates/urls.py`
- Frontend:
  - `frontend-mobile/src/api/rates.ts`
  - `frontend-mobile/src/screens/dashboard/HomeDashboardScreen.tsx`
  - `frontend-mobile/src/screens/dashboard/AssociationRatesScreen.tsx`
  - `frontend-mobile/src/screens/dashboard/StateRatesScreen.tsx`
  - `frontend-mobile/src/screens/dashboard/RateDetailsScreen.tsx`
  - `frontend-mobile/src/screens/dashboard/PriceCards.tsx`

## Company Directory And Market Feed
- Backend:
  - `backend/apps/directory/models.py`
  - `backend/apps/directory/services.py`
  - `backend/apps/directory/serializers.py`
  - `backend/apps/directory/views.py`
  - `backend/apps/directory/urls.py`
- Frontend:
  - `frontend-mobile/src/api/market.ts`
  - `frontend-mobile/src/screens/directory/MarketTiersScreen.tsx`
  - `frontend-mobile/src/screens/directory/CompanyProfileScreen.tsx`

## Product Search, Detail, Wishlist, And Enquiries
- Backend:
  - `backend/apps/directory/models.py`
  - `backend/apps/directory/serializers.py`
  - `backend/apps/directory/views.py`
  - `backend/apps/directory/product_urls.py`
- Frontend:
  - `frontend-mobile/src/api/market.ts`
  - `frontend-mobile/src/screens/directory/ProductSearchScreen.tsx`
  - `frontend-mobile/src/screens/directory/ProductDetailScreen.tsx`

## Company Product Management And Media Attachment
- Backend:
  - `backend/apps/directory/views.py`
  - `backend/apps/directory/serializers.py`
  - `backend/apps/directory/services.py`
  - `backend/config/storage.py`
- Frontend:
  - `frontend-mobile/src/session/SessionProvider.tsx`
  - `frontend-mobile/src/types/api.ts`

## Market Tiering, Zones, Overrides, And Visibility Controls
- Backend:
  - `backend/apps/directory/models.py`
  - `backend/apps/directory/services.py`
  - `backend/apps/directory/serializers.py`
  - `backend/apps/directory/views.py`
  - `backend/apps/admin_ops/urls.py`
- Frontend:
  - `frontend-mobile/src/api/admin.ts`
  - `frontend-mobile/src/screens/profile/AdminToolsScreens.tsx`

## Market Preview, Exposure Reporting, And Fairness Reporting
- Backend:
  - `backend/apps/directory/services.py`
  - `backend/apps/directory/views.py`
  - `backend/apps/directory/serializers.py`
- Frontend:
  - `frontend-mobile/src/api/admin.ts`
  - `frontend-mobile/src/screens/profile/AdminToolsScreens.tsx`

## News Publishing, Targeting, And Approval Flow
- Backend:
  - `backend/apps/news/models.py`
  - `backend/apps/news/services.py`
  - `backend/apps/news/serializers.py`
  - `backend/apps/news/views.py`
  - `backend/apps/news/urls.py`
- Frontend:
  - `frontend-mobile/src/api/news.ts`
  - `frontend-mobile/src/screens/news/NewsAlertsScreen.tsx`
  - `frontend-mobile/src/screens/news/NewsDetailScreen.tsx`

## Meeting Scheduling, Visibility, And RSVP
- Backend:
  - `backend/apps/news/models.py`
  - `backend/apps/news/services.py`
  - `backend/apps/news/serializers.py`
  - `backend/apps/news/views.py`
  - `backend/apps/news/meeting_urls.py`
- Frontend:
  - `frontend-mobile/src/screens/news/NewsAlertsScreen.tsx`
  - `frontend-mobile/src/screens/news/MeetingDetailScreen.tsx`
  - `frontend-mobile/src/types/api.ts`

## Advertisement Delivery And Interaction Tracking
- Backend:
  - `backend/apps/ads/models.py`
  - `backend/apps/ads/serializers.py`
  - `backend/apps/ads/views.py`
  - `backend/apps/ads/urls.py`
- Frontend:
  - `frontend-mobile/src/api/ads.ts`
  - `frontend-mobile/src/components/AdvertisementCarousel.tsx`
  - `frontend-mobile/src/screens/dashboard/HomeDashboardScreen.tsx`

## Reverse Design Search
- Backend:
  - `backend/apps/reverse_search/models.py`
  - `backend/apps/reverse_search/serializers.py`
  - `backend/apps/reverse_search/views.py`
  - `backend/apps/reverse_search/urls.py`
  - `backend/config/storage.py`
- Frontend:
  - `frontend-mobile/src/screens/reverse-search/ReverseSearchScreen.tsx`
  - `frontend-mobile/src/api/client.ts`
  - `frontend-mobile/src/types/api.ts`

## Services And Compliance Dashboard
- Backend:
  - `backend/apps/services_app/models.py`
  - `backend/apps/services_app/serializers.py`
  - `backend/apps/services_app/views.py`
  - `backend/apps/services_app/urls.py`
- Frontend:
  - `frontend-mobile/src/screens/services/ServicesScreen.tsx`
  - `frontend-mobile/src/types/api.ts`

## Admin Overview And Hierarchy Management
- Backend:
  - `backend/apps/admin_ops/views.py`
  - `backend/apps/admin_ops/serializers.py`
  - `backend/apps/admin_ops/permissions.py`
  - `backend/apps/admin_ops/urls.py`
- Frontend:
  - `frontend-mobile/src/screens/profile/AdminToolsScreens.tsx`
  - `frontend-mobile/src/screens/profile/ProfileDrawer.tsx`

## Demo Data And Local Environment Bootstrap
- Backend:
  - `backend/apps/admin_ops/demo_seed.py`
  - `backend/apps/admin_ops/management/commands/seed_demo_data.py`
  - `backend/apps/admin_ops/tests_seed.py`
- Frontend:
  - No dedicated runtime UI; this supports local backend-driven development and seeded mobile testing.

## Web Admin Shell
- Backend:
  - No dedicated backend-only implementation in this repo; it currently reflects existing platform capabilities rather than owning separate APIs.
- Frontend:
  - `web-admin/src/App.tsx`
  - `web-admin/src/main.tsx`
  - `web-admin/src/pages/LandingPage.tsx`
  - `web-admin/src/pages/AdminDashboardPage.tsx`

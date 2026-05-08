# Frontend Structure

## Frontend Surfaces
- `frontend-mobile/`
  - Main runtime client for members, guests, admins, and directory/news/services workflows.
- `web-admin/`
  - Secondary React web surface used as a landing/admin shell.

## Mobile Folder Map
- `frontend-mobile/App.tsx`
  - App root with providers and navigation container.
- `frontend-mobile/src/api/`
  - Endpoint-specific client wrappers around the shared HTTP layer.
- `frontend-mobile/src/navigation/`
  - Stack/tabs and custom bottom navigation.
- `frontend-mobile/src/session/`
  - Auth bootstrap, session persistence, and current-user context.
- `frontend-mobile/src/storage/`
  - AsyncStorage-backed token and guest-session persistence.
- `frontend-mobile/src/components/`
  - Reusable presentation components shared across screens.
- `frontend-mobile/src/screens/`
  - Feature screens grouped by domain.
- `frontend-mobile/src/theme/`
  - Tokens for colors, spacing, typography, and radius.
- `frontend-mobile/src/types/`
  - Shared TypeScript API models used throughout the app.
- `frontend-mobile/android/`
  - Native Android project used by Expo.
- `frontend-mobile/scripts/`
  - Local helper scripts, currently including Android USB preparation.
- `frontend-mobile/References/`
  - UI reference assets and HTML mockups, not production runtime code.

## File: frontend-mobile/App.tsx
- Purpose: Mobile app root component.
- Key responsibilities:
  - Wraps the app in `SafeAreaProvider`, `SessionProvider`, and `NavigationContainer`.
  - Boots the navigation tree and status bar.

## File: frontend-mobile/src/navigation/RootNavigator.tsx
- Purpose: Complete mobile route map.
- Key responsibilities:
  - Switches between splash, login, and authenticated flows.
  - Defines the main tab navigator and all feature stack screens.
- Important classes / screens:
  - `MainTabs`: Home, Market, Services, News, Profile.
  - Authenticated stack routes for rates, product detail, news detail, meetings, admin tools, and reverse search.

## File: frontend-mobile/src/navigation/BottomNavigationBar.tsx
- Purpose: Custom bottom-tab UI.
- Key responsibilities:
  - Replaces the default React Navigation tab bar with branded icons and labels.

## File: frontend-mobile/src/session/SessionProvider.tsx
- Purpose: Global session and current-user state manager.
- Key responsibilities:
  - Bootstraps stored JWT tokens or guest session state.
  - Configures the shared API client with token refresh and unauthorized handling.
  - Exposes sign-in, guest access, user refresh, profile update, preference update, and sign-out actions.
- Important classes / functions:
  - `SessionProvider`
  - `useSession()`

## File: frontend-mobile/src/storage/sessionStorage.ts
- Purpose: Session persistence helpers.
- Key responsibilities:
  - Stores and retrieves JWT tokens and guest session payloads from AsyncStorage.

## File: frontend-mobile/src/api/client.ts
- Purpose: Shared HTTP client for the mobile app.
- Key responsibilities:
  - Resolves API base URLs and absolute media URLs.
  - Sends GET/POST/PATCH JSON requests.
  - Handles JWT refresh flow on `401`.
  - Supports binary upload for signed-upload flows.
- Important classes / functions:
  - `API_BASE_URL`
  - `configureApiClient()`
  - `getJson()`, `postJson()`, `patchJson()`
  - `uploadBinary()`
  - `resolveApiUrl()`

## File: frontend-mobile/src/api/rates.ts
- Purpose: Rates API wrapper.
- Key responsibilities:
  - Fetches dashboard, state-rates, and association-detail data.

## File: frontend-mobile/src/api/market.ts
- Purpose: Market and product catalog API wrapper.
- Key responsibilities:
  - Fetches market feed and filter config.
  - Builds product search query strings.
  - Fetches product detail and submits wishlist/enquiry actions.

## File: frontend-mobile/src/api/news.ts
- Purpose: News API wrapper.
- Key responsibilities:
  - Normalizes feed/detail payload shape.
  - Resolves relative image URLs to absolute URLs.
  - Toggles news bookmarks.

## File: frontend-mobile/src/api/ads.ts
- Purpose: Advertisement API wrapper.
- Key responsibilities:
  - Fetches ads by placement.
  - Records impressions and clicks.

## File: frontend-mobile/src/api/admin.ts
- Purpose: Admin market-insights API wrapper.
- Key responsibilities:
  - Loads market preview, summary report, and under-served fairness report for admin screens.

## File: frontend-mobile/src/types/api.ts
- Purpose: Central TypeScript contract layer for backend responses and request payloads.
- Key responsibilities:
  - Defines typed shapes for auth, hierarchy, rates, directory, ads, news, meetings, reverse search, services, and admin reports.

## File: frontend-mobile/src/theme/tokens.ts
- Purpose: Shared design tokens.
- Key responsibilities:
  - Defines colors, spacing, radii, and typography constants reused across screens.

## File: frontend-mobile/src/components/AppScreen.tsx
- Purpose: Layout wrapper for screen-safe area and optional scrolling.
- Key responsibilities:
  - Standardizes high-level screen container behavior.

## File: frontend-mobile/src/components/AppHeader.tsx
- Purpose: Reusable title/subtitle header block.
- Key responsibilities:
  - Provides consistent screen-level heading layout.

## File: frontend-mobile/src/components/ScreenState.tsx
- Purpose: Standard loading/empty/error state component.
- Key responsibilities:
  - Keeps fallback UI consistent across async screens.

## File: frontend-mobile/src/components/SurfaceCard.tsx
- Purpose: Reusable card container.
- Key responsibilities:
  - Standardizes elevated content blocks across the app.

## File: frontend-mobile/src/components/AdvertisementCarousel.tsx
- Purpose: Shared ad carousel component.
- Key responsibilities:
  - Displays ad placements and reports interaction callbacks back to screens.

## File: frontend-mobile/src/screens/auth/LoginScreen.tsx
- Purpose: Entry screen for member login and guest continuation.
- Key responsibilities:
  - Handles sign-in mode switching and session start flows.

## File: frontend-mobile/src/screens/dashboard/HomeDashboardScreen.tsx
- Purpose: Mobile home dashboard.
- Key responsibilities:
  - Loads headline rates and dashboard summaries.
  - Acts as the primary entry to rates, market, news, services, and ads.

## File: frontend-mobile/src/screens/dashboard/PriceCards.tsx
- Purpose: Shared dashboard/rates UI building blocks.
- Key responsibilities:
  - Provides reusable cards, metric rows, skeletons, tabs, and detail blocks for rates screens.

## File: frontend-mobile/src/screens/dashboard/AssociationRatesScreen.tsx
- Purpose: Association comparison screen.
- Key responsibilities:
  - Shows the “other associations” rate list from the dashboard payload.

## File: frontend-mobile/src/screens/dashboard/StateRatesScreen.tsx
- Purpose: State-wise rate browsing screen.
- Key responsibilities:
  - Displays grouped association rates for each state.

## File: frontend-mobile/src/screens/dashboard/RateDetailsScreen.tsx
- Purpose: Association rate detail screen.
- Key responsibilities:
  - Renders detailed 24K/22K/silver rate groups and institutional notice text.

## File: frontend-mobile/src/screens/directory/MarketTiersScreen.tsx
- Purpose: Market home/feed screen.
- Key responsibilities:
  - Renders mixed market rows such as hero companies, featured companies, categories, and product rows.
  - Acts as the main entry into company and product discovery.

## File: frontend-mobile/src/screens/directory/ProductSearchScreen.tsx
- Purpose: Search and filter screen for products.
- Key responsibilities:
  - Calls filter-config and search APIs.
  - Supports category, subcategory, purity, company, and dynamic attribute filters.

## File: frontend-mobile/src/screens/directory/ProductDetailScreen.tsx
- Purpose: Product detail and enquiry screen.
- Key responsibilities:
  - Displays product gallery, company contact info, wishlist state, and enquiry/WhatsApp actions.

## File: frontend-mobile/src/screens/directory/CompanyProfileScreen.tsx
- Purpose: Company detail screen.
- Key responsibilities:
  - Shows company overview, verification badges, and product catalog summary.

## File: frontend-mobile/src/screens/news/NewsAlertsScreen.tsx
- Purpose: News feed and meetings hub.
- Key responsibilities:
  - Loads urgent alert, featured news, feed items, ticker values, and upcoming meetings.
  - Supports tabbed switching between combined/news/meetings views.

## File: frontend-mobile/src/screens/news/NewsDetailScreen.tsx
- Purpose: Detailed news reader.
- Key responsibilities:
  - Renders body content, bookmark controls, and related news items.

## File: frontend-mobile/src/screens/news/MeetingDetailScreen.tsx
- Purpose: Meeting detail and RSVP screen.
- Key responsibilities:
  - Displays meeting metadata and current-user response state.

## File: frontend-mobile/src/screens/services/ServicesScreen.tsx
- Purpose: Compliance dashboard screen.
- Key responsibilities:
  - Loads compliance overview items, service grid, and operational metrics from `/services/`.

## File: frontend-mobile/src/screens/reverse-search/ReverseSearchScreen.tsx
- Purpose: Private reverse-design request workflow UI.
- Key responsibilities:
  - Creates a reverse-search request.
  - Picks a gallery image, uploads it via signed-upload flow, finalizes attachment metadata, and shows responses.

## File: frontend-mobile/src/screens/profile/MemberProfileScreen.tsx
- Purpose: Primary profile/home for signed-in members.
- Key responsibilities:
  - Shows current user, hierarchy, company, and profile utility actions.

## File: frontend-mobile/src/screens/profile/NotificationSettingsScreen.tsx
- Purpose: Notification preference management.
- Key responsibilities:
  - Lets members update rate/news/ad/meeting notification toggles.

## File: frontend-mobile/src/screens/profile/EditProfileScreen.tsx
- Purpose: Profile-edit workflow.
- Key responsibilities:
  - Updates member name, email, company, and hierarchy-linked profile information.

## File: frontend-mobile/src/screens/profile/ProfileDrawer.tsx
- Purpose: Profile-side action menu.
- Key responsibilities:
  - Routes users to account tools, settings, and admin-only utilities.

## File: frontend-mobile/src/screens/profile/AdminToolsScreens.tsx
- Purpose: Mobile admin utility screens.
- Key responsibilities:
  - Shows pending-approval count.
  - Surfaces market preview/report/fairness data for admin operators.
  - Includes placeholder shells for future mobile user/news admin workflows.
- Important classes / screens:
  - `PendingApprovalsScreen`
  - `ManageUsersScreen`
  - `ManageNewsScreen`
  - `MarketInsightsScreen`

## File: frontend-mobile/src/screens/splash/SplashScreen.tsx
- Purpose: Session bootstrap screen.
- Key responsibilities:
  - Holds the app while auth/guest state is being restored.

## Web Admin Folder Map
- `web-admin/src/main.tsx`
  - React/Vite bootstrap.
- `web-admin/src/App.tsx`
  - Composes the two current page sections into one shell.
- `web-admin/src/pages/`
  - Page-level sections for landing and admin overview content.
- `web-admin/src/theme/styles.css`
  - Global stylesheet for the web surface.

## File: web-admin/src/main.tsx
- Purpose: Web app entrypoint.
- Key responsibilities:
  - Mounts the React app and loads the global stylesheet.

## File: web-admin/src/App.tsx
- Purpose: Root web shell.
- Key responsibilities:
  - Renders the landing page and admin dashboard preview on the same page.

## File: web-admin/src/pages/LandingPage.tsx
- Purpose: Product/marketing overview section.
- Key responsibilities:
  - Communicates the platform proposition and links users toward the admin shell and Play Store release.

## File: web-admin/src/pages/AdminDashboardPage.tsx
- Purpose: Admin-capability preview section.
- Key responsibilities:
  - Highlights operational areas such as approvals, rates, reverse search, and media storage.

## File: web-admin/src/theme/styles.css
- Purpose: Shared styling for the web surface.
- Key responsibilities:
  - Provides layout, typography, spacing, and section styling for the landing/admin shell.

## Current Frontend Split
- `frontend-mobile/` is the real operational client with API integration and business workflows.
- `web-admin/` currently documents/admin-previews the platform rather than replacing the mobile admin flows.

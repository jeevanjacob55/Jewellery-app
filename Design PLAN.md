# Jewellery Association App Plan: Django API + React Native Android + Firebase-Hosted Admin/Landing

## Summary
Build the product as a mobile-first B2B platform for jewellery association members, with:
- `React Native` frontend for the Android app distributed through the `Google Play Store`
- `Django + Django REST Framework` backend for business logic, admin workflows, and APIs
- `Firebase Hosting` for a public landing site plus a web admin/operations shell
- `Firebase Cloud Messaging` for push notifications to the Android app
- Reverse design search in v1 as a `manual supplier response workflow`, not AI matching

The repo currently contains design/spec assets only, so implementation should be treated as a greenfield build guided by the existing screen designs and the design system in `Proposed design/`.

## Key Changes And Architecture
### 1. Product surfaces
- `Android app (React Native)`: member app, guest browsing, onboarding, dashboard, market tiers, company profiles, product catalog, services, news, profile, ad requests, reverse search submission
- `Web admin + landing (Firebase Hosting)`: public association landing pages plus admin login shell for operations staff
- `Django admin/ops API`: internal workflows for member verification, ad approvals, bullion rate updates, compliance requests, news publishing, reverse-search lead assignment

### 2. Backend design
- Use `Django REST Framework` with token-based auth; prefer `JWT` for mobile sessions
- Use `PostgreSQL` as the system of record
- Keep Django’s built-in admin for internal staff, then expose needed workflows through REST endpoints for the hosted admin shell
- Organize modules by domain:
  - `accounts`: auth, roles, guest/member/admin access, profile, notification preferences
  - `regions`: state, district, local chapter hierarchy
  - `rates`: gold/silver rates, global trends, market comparison sources
  - `directory`: market tiers, companies, verification badges, product catalog, enquiries
  - `reverse_search`: image submission, assignment, supplier replies, status tracking
  - `services`: compliance requests, due dates, TAT metrics
  - `news`: alerts, meetings, banners, ticker items
  - `ads`: advertiser intake, targeting, preview metadata, approval state
  - `admin_ops`: audit logs, dashboards, revenue/member metrics

### 3. Primary entities and interfaces
Important public/backend interfaces to define up front:
- `User`, `MemberProfile`, `Role`, `NotificationPreference`
- `RegionState`, `RegionDistrict`, `LocalChapter`
- `AssociationRate`, `ExternalMarketRate`, `GlobalTrendSnapshot`
- `Company`, `CompanyVerification`, `Product`, `ProductImage`, `ProductCategory`
- `Enquiry`, `ReverseSearchRequest`, `ReverseSearchResponse`
- `ServiceType`, `ComplianceRequest`, `ComplianceReminder`
- `NewsItem`, `Alert`, `MeetingEvent`
- `Advertisement`, `AdTargeting`, `AdAsset`, `AdApproval`
- `AuditLog`

Core API groups:
- `/auth/` login, Google sign-in exchange, guest access, refresh/logout
- `/me/` profile, region selection, notification settings
- `/dashboard/` rates, trends, shortcuts, alerts
- `/directory/` market tiers, company detail, products, enquiries
- `/reverse-search/` upload request, status, supplier responses
- `/services/` compliance cards, service requests
- `/news/` alerts, meetings, ticker
- `/ads/` advertiser submission, preview metadata, status
- `/admin/` approvals, analytics, logs, manual updates

## Media Storage Plan
### 1. Storage choice
- Use `cloud object storage` for all uploaded images, not PostgreSQL and not Firebase Hosting
- Recommended default: `Google Cloud Storage` because it fits well with Firebase/Google services and supports signed URLs, lifecycle rules, and CDN delivery
- Django stores only `metadata and permissions`, not the binaries themselves

### 2. What gets stored where
- `Company logos and company gallery images`: object storage bucket under a `companies/` prefix
- `Product/catalog images`: object storage bucket under a `products/` prefix
- `Advertisement creatives`: object storage bucket under an `ads/` prefix
- `Reverse-search uploads`: separate protected bucket or protected prefix under `reverse-search/`
- `Landing-site/editorial assets`: can live in the frontend build or in object storage depending on whether non-technical staff need to update them

Recommended path structure:
- `companies/{company_id}/logo/...`
- `companies/{company_id}/gallery/...`
- `products/{company_id}/{product_id}/...`
- `ads/{advertiser_id}/{campaign_id}/...`
- `reverse-search/{request_id}/original/...`
- `reverse-search/{request_id}/responses/...`

### 3. Metadata owned by Django
For each media item, Django should store:
- owning entity id
- uploader user id
- storage path/object key
- public/private visibility
- mime type
- original filename
- image width/height
- file size
- upload timestamp
- moderation/approval status where relevant
- optional alt text / caption / display order

Suggested models:
- `MediaAsset`
- `CompanyImage`
- `ProductImage`
- `AdAsset`
- `ReverseSearchAttachment`

### 4. Access rules
- `Company logos`, approved company gallery images, approved product images, and approved ad creatives can be readable by app users through CDN/public URLs
- `Reverse-search uploads` must be private by default and served through short-lived signed URLs or backend proxy endpoints
- `Unapproved ad creatives` should remain private to advertiser/admin users
- `Admin evidence or verification documents` should be private and never exposed directly in the mobile client

### 5. Upload workflow
- Mobile/web client requests an upload session from Django
- Django validates role, file type, size, and target entity
- Django returns a signed upload URL or controlled upload token
- Client uploads directly to object storage
- Client notifies Django to finalize the upload
- Django saves metadata, attaches the asset to the domain record, and marks it `pending_review` if moderation is needed

This keeps uploads scalable and avoids routing large files through the Django app server.

### 6. Image processing policy
- Generate multiple sizes for public-facing images:
  - thumbnail
  - card/list size
  - full-detail size
- Preserve originals for reprocessing when needed
- Compress JPEG/WEBP variants for mobile performance
- Enforce file limits:
  - logos: smaller limit
  - product/company gallery: medium limit
  - ad creatives: strict dimension and aspect-ratio validation
  - reverse-search uploads: moderate limit with max count per request

### 7. CDN and caching
- Serve public images through `Cloud CDN` or equivalent in front of object storage
- Use long cache headers for versioned image URLs
- Bust cache by changing object key/version when an image is replaced
- Keep reverse-search/private assets off public CDN paths unless signed delivery is supported safely

## Frontend Implementation
- Use `React Native` with a production-ready navigation stack and typed API layer
- Build the app directly from the existing 12 screen concepts, preserving the current visual language: white/light grey surfaces, restrained gold accents, tabular financial typography
- App navigation:
  - splash
  - auth/onboarding
  - 5-tab bottom nav for primary modules
  - nested stacks for company profile, filters, enquiry forms, reverse search, settings
- State handling:
  - auth/session state
  - selected region context
  - dashboard/rates cache
  - notification preferences
  - upload and enquiry states
- Reverse search v1 behavior:
  - user uploads an image and adds optional notes
  - backend stores request metadata and routes it to suppliers/marketers/admin staff
  - suppliers/admin reply manually with availability, similar product, or rejection
  - user sees status such as `Submitted`, `Under Review`, `Supplier Responded`, `Closed`
- Android release readiness:
  - Firebase push notifications
  - crash/error logging
  - app signing, package name, privacy policy URL, Play Store assets, content rating, test track rollout

## Delivery Plan
### Phase 1: Foundation
- Set up Django project, DRF, PostgreSQL, auth, region hierarchy, admin roles, audit logging
- Provision object storage buckets, access policies, upload/finalize flow, and media metadata models
- Scaffold React Native app with design tokens derived from the existing design system
- Establish CI/CD, environment separation, and API contract conventions

### Phase 2: Core member experience
- Implement splash, auth/onboarding, guest flow, home dashboard, rate comparison, profile/preferences
- Deliver market tiers, company profile, product search, and enquiry flow
- Add company/product image rendering with thumbnails and lazy loading
- Add news/alerts and meetings with calendar deep links

### Phase 3: Operational modules
- Implement services/compliance workflows
- Implement advertiser submission and approval workflows, including creative upload/preview
- Implement reverse search manual-review workflow with protected image access
- Add admin analytics, logs, and manual rate/news/media management

### Phase 4: Release and deployment
- Host landing/admin web on Firebase Hosting
- Deploy Django API and PostgreSQL to a managed cloud environment
- Configure FCM, monitoring, backups, CDN, and media lifecycle rules
- Prepare Android signed builds, internal testing, closed testing, and Play Store production submission

## Test Plan
- Auth tests: member login, Google login, guest access, token refresh, role-based access
- Region tests: onboarding selection, region-filtered rates/news/directory data
- Dashboard tests: rate snapshots, comparison toggles, trend data fallback behavior
- Directory tests: tier visibility, company verification badges, product filtering, enquiry creation
- Media tests: upload authorization, file validation, metadata persistence, thumbnail generation, signed/private asset access
- Reverse search tests: image upload validation, request assignment, manual response lifecycle, user notifications
- Services tests: due-date calculations, status cards, request submissions
- Ads tests: asset validation, targeting rules, approval flow, preview rendering metadata
- Admin tests: manual rate updates, user verification, analytics aggregation, audit logs
- Mobile QA: low-network states, image upload retries, push notifications, Android permissions, deep links
- Release QA: signed Android bundle, Play Console checklist, privacy policy, store listing assets, crash-free smoke test

## Assumptions And Defaults
- `Firebase Hosting` is used for the public landing site and web admin shell, not for serving the Android app binary
- The first mobile release targets `Android / Play Store`; iOS is out of scope for v1 unless added later
- Reverse design search is `manual`, handled by suppliers/marketers/admin staff rather than AI matching
- `Google Cloud Storage` is the default image/file store; if the team prefers Firebase Storage, the same workflow can be used with Django still owning metadata and permissions
- Existing `Proposed design/` screens and design system are the source of truth for the initial UI direction

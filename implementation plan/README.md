# Jewellery Association App: Full Implementation Roadmap

This folder contains the detailed implementation handbook for building the project from scratch using:

- `Django + Django REST Framework` for the backend API and internal operations
- `PostgreSQL` as the primary database
- `React Native + Expo` for the Android app
- `React` for the Firebase-hosted landing page and web admin shell
- `Firebase Hosting` for the landing/admin frontend
- `Firebase Cloud Messaging` for push notifications
- `Google Cloud Storage` or `Firebase Storage` for images and upload assets

These documents are written to be execution-focused. The goal is that a developer can follow them from step 1 to the final release without having to invent missing architecture or delivery decisions.

## Documents In This Folder

1. `01-foundation-and-environment.md`
   Sets up the repo, environments, dependencies, local conventions, branch strategy, and initial execution order.
2. `02-backend-django-api.md`
   Defines the Django architecture, apps, models, APIs, auth, admin workflows, migrations, and seed strategy.
3. `03-media-storage-and-image-handling.md`
   Defines how company images, product images, ad creatives, and reverse-search uploads are stored, validated, processed, and delivered.
4. `04-react-native-mobile-app.md`
   Defines how the Android app will be built screen by screen, how state will work, and how the app integrates with backend APIs and uploads.
5. `05-web-admin-firebase-and-operations.md`
   Defines the landing page, hosted admin shell, Firebase Hosting setup, operational workflows, and admin permissions.
6. `06-testing-deployment-and-playstore.md`
   Defines testing, CI/CD, staging, monitoring, production deployment, Play Store rollout, and post-launch support.

## Master Execution Order

Follow the project in this exact sequence:

### Step 1. Lock the repo structure
- Keep the current monorepo shape:
  - `backend/`
  - `frontend-mobile/`
  - `web-admin/`
  - `Proposed design/`
  - `implementation plan/`
- Confirm that design HTML and screen PNGs remain reference assets only.
- Do not build production logic inside `Proposed design/`.

### Step 2. Prepare the developer environment
- Create a Python virtual environment for Django.
- Install backend dependencies from `backend/requirements.txt`.
- Install Node dependencies in `frontend-mobile/` and `web-admin/`.
- Create `.env` files for backend and frontend environments.
- Confirm Python, Node, npm, and Expo CLI versions across the team.

### Step 3. Bring up the backend first
- Finish Django settings, migrations, and database connections.
- Build the data model and admin interfaces.
- Implement auth, regional hierarchy, dashboard, directory, media, news, services, ads, and reverse-search endpoints.
- Add seed data so frontend work can start against realistic responses.

### Step 4. Implement the upload and media pipeline
- Create cloud buckets and access policies.
- Add signed upload session endpoints.
- Add upload finalization and metadata persistence.
- Add image validation, processing, and public/private delivery rules.

### Step 5. Build the mobile app shell
- Build navigation, theme tokens, auth flow, and state container.
- Implement all main screens against seeded APIs.
- Add uploads, notifications, offline states, and error handling.

### Step 6. Build the web landing and hosted admin shell
- Create the public landing pages.
- Create the admin dashboard shell.
- Connect admin pages to real Django APIs.
- Lock permissions and admin-only routes.

### Step 7. Replace mock data with production-backed behavior
- Convert placeholder responses into database-backed querysets.
- Seed realistic regional, company, product, rate, alert, and ad data.
- Verify filters, search, moderation, and assignment flows.

### Step 8. Add operational workflows
- Manual rate updates
- User verification
- Media moderation
- Ad approvals
- Reverse-search response handling
- Compliance request management

### Step 9. Add test coverage
- Backend unit and integration tests
- Frontend component and screen tests where practical
- Manual QA scripts for uploads, onboarding, rates, news, and admin workflows

### Step 10. Deploy staging
- Deploy Django API to a managed host
- Deploy PostgreSQL
- Configure storage buckets
- Deploy web admin to Firebase Hosting
- Connect FCM for Android

### Step 11. Run release hardening
- Validate security, permissions, caching, image access, and signed URLs
- Run UAT with realistic member/admin flows
- Prepare privacy policy, support contact, screenshots, and release notes

### Step 12. Release to Play Store
- Create signed Android bundle
- Upload to internal testing
- Move to closed testing
- Resolve Play Console issues
- Roll out production gradually

### Step 13. Monitor production
- Track crashes, response times, failed uploads, push notification delivery, and admin actions
- Review audit logs and suspicious activity
- Fix high-impact defects before adding new features

### Step 14. Phase 2 work after stable launch
- iOS support if needed
- AI-driven reverse design matching
- richer analytics
- self-service advertiser billing
- multi-language support

## Delivery Principles

- Backend is the source of truth for business rules, permissions, and workflow state.
- Storage buckets hold binaries; the database stores metadata and access control.
- The mobile app is optimized for Android first.
- Firebase Hosting is only for the landing/admin frontend, not for Android app distribution.
- Reverse search in v1 is manual review, not AI matching.
- Every major milestone must end in something runnable, not only partially scaffolded code.

## Definition Of “Implementation Complete”

The implementation is complete when all of the following are true:

- Members can authenticate, complete onboarding, and receive region-filtered content.
- Guests can browse limited company and market directory data.
- Rates, trends, news, and meetings show live backend data.
- Companies and products display approved images from cloud storage.
- Enquiries, ad submissions, compliance requests, and reverse-search submissions can be created end to end.
- Admin users can verify members, approve ads, update rates, review uploads, and respond to operational queues.
- The Android app is built, signed, tested, and accepted in Google Play production.
- The landing/admin frontend is hosted on Firebase Hosting.
- Monitoring, backups, and operational runbooks are in place.

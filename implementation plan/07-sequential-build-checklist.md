# 07. Sequential Build Checklist

Use this file as the day-to-day execution order. Unlike the other documents, this is written as one continuous sequence from the first task to the last release task.

## Build Sequence

### 1. Repo cleanup
- confirm the monorepo structure is correct
- leave `Proposed design/` untouched as reference material
- confirm `backend/`, `frontend-mobile/`, and `web-admin/` are the only implementation surfaces

### 2. Environment setup
- create backend virtual environment
- install Python requirements
- install mobile npm packages
- install web-admin npm packages
- create `.env` files for each surface

### 3. Backend bootstrap
- verify Django settings load
- verify `manage.py` works
- configure database connection
- run initial migrations
- create superuser
- verify `/api/health/`

### 4. Accounts domain
- finish custom user model fields
- add profile and notification preference relationships
- add JWT login and refresh
- add guest access endpoint
- add `/api/me/`
- add update profile and preference endpoints

### 5. Regions domain
- create state model
- create district model
- create local chapter model
- add nested hierarchy serializer
- add onboarding hierarchy endpoint
- seed initial regional data

### 6. Rates domain
- create association rate model
- create external market rate model
- create trend snapshot model
- add dashboard serializer/view
- add latest snapshot selection logic
- add manual rate update admin flow

### 7. Directory domain
- create company model
- create verification model
- create product category model
- create product model
- create enquiry model
- add company list/detail endpoints
- add product filter/search behavior
- add enquiry create endpoint

### 8. Media metadata model
- create `MediaAsset`
- create `CompanyImage`
- create `ProductImage`
- connect media to company and product models
- define moderation statuses
- define public/private visibility

### 9. Storage integration
- create cloud buckets
- define object key rules
- add signed upload session helpers
- add finalize-upload endpoints
- add public/private delivery URL logic

### 10. Reverse search
- create request model
- create attachment model
- create response model
- add create/list/detail endpoints
- add upload session endpoint
- add response workflow
- lock private access rules

### 11. Services and compliance
- create service type model
- create compliance request model
- create reminder model
- add services dashboard endpoint
- add request create/update flows

### 12. News and alerts
- create news model
- create alert model
- create meeting model
- add news feed endpoint
- add publish/unpublish admin behavior

### 13. Ads and advertiser flow
- create advertisement model
- create targeting model
- create ad asset model
- create approval model
- add advertiser draft flow
- add upload session flow
- add approve/reject flow
- add active approved ads endpoint

### 14. Admin operations
- create audit log model
- add admin overview endpoint
- add pending queue counts
- add audit logging hooks to important actions

### 15. Backend migrations and seeders
- generate migrations for all apps
- review migrations
- migrate local database
- create seed command or fixture loader
- load realistic sample data

### 16. Backend tests
- auth tests
- permission tests
- region tests
- dashboard tests
- directory tests
- upload tests
- reverse-search privacy tests
- ad moderation tests

### 17. Mobile theme system
- finalize color tokens
- finalize spacing and radius tokens
- create typography helpers
- build shared card/button components

### 18. Mobile navigation
- build stack navigator
- build bottom tabs
- add splash route
- add auth flow
- add detail routes

### 19. Splash screen
- design with association branding
- add timed navigation logic
- check token on app open

### 20. Login and onboarding screens
- build login form
- add guest path
- add Google sign-in entry point placeholder or real integration
- add state/district/chapter selection
- save onboarding completion

### 21. Dashboard screen
- build rates card
- build comparison UI
- build global trends section
- build quick actions section
- connect to real dashboard API

### 22. Market tiers screen
- build tiered company list layouts
- add category chips
- connect filters
- navigate to company detail

### 23. Company profile screen
- build verification section
- build about and capacity section
- build gallery
- build enquiry CTA
- load approved images

### 24. Product search screen
- build filter bottom sheet
- connect purity, weight, and category filters
- render product cards with images
- connect enquiry action

### 25. Reverse-search mobile flow
- build upload UI
- add note input
- create request through API
- request upload session
- upload file
- finalize attachment
- render status history and responses

### 26. Services screen
- build due cards
- build action-required cards
- build service grid
- connect service data

### 27. News screen
- build urgent alert hero
- build meetings list
- build ticker section
- add calendar deep links

### 28. Member profile screen
- build member identity block
- build notification toggles
- build security/support/logout actions
- connect to `/api/me/`

### 29. Mobile API and state hardening
- centralize API client
- add auth token storage
- add session refresh handling
- add retry and error handling
- add loading and empty states

### 30. Mobile notifications
- integrate Firebase app config
- register device for FCM
- store device token
- handle foreground/background notifications
- deep link into related screens

### 31. Web landing
- build home page
- add feature/value sections
- add privacy policy page
- add support/contact page
- add Play Store call-to-action

### 32. Web admin shell
- build admin layout
- add route protection
- add dashboard overview page
- connect summary metrics

### 33. Web admin workflows
- member verification page
- rate management page
- news/meeting management page
- ad review page
- reverse-search queue page
- media moderation page
- audit log page

### 34. Firebase Hosting
- confirm `firebase.json`
- configure project in `.firebaserc`
- build `web-admin`
- deploy hosted frontend
- verify route rewrites

### 35. Real storage and image pipeline
- replace mock signed upload helpers with real provider integration
- add derivative image generation
- add public/private URL generation
- test upload finalization and access control

### 36. Staging deployment
- provision backend host
- provision Postgres
- provision storage buckets
- deploy API
- migrate staging database
- deploy hosted web app
- connect staging mobile build

### 37. UAT and business workflow validation
- member onboarding
- guest browse
- admin verification
- rate update
- ad approval
- reverse-search manual response
- news publishing
- upload moderation

### 38. Monitoring and support tooling
- add backend logging
- add crash/error monitoring
- add release version labeling
- prepare support and rollback notes

### 39. Android release prep
- finalize package id
- create signing key
- set version code/name
- prepare app icon and screenshots
- complete privacy policy and support pages

### 40. Play Console release
- upload internal test build
- fix issues
- run closed testing
- complete data safety form
- complete content rating
- submit production release

### 41. Production monitoring
- track login failures
- track upload failures
- track notification delivery
- track crash reports
- track operational queues

### 42. Phase 2 backlog
- iOS support
- AI reverse matching
- richer analytics
- advertiser billing
- localization

## Exit Criteria

The build sequence is complete only when:

- production backend is live
- Firebase-hosted web frontend is live
- Play Store Android release is live
- uploads and media access rules work correctly
- admins can manage the platform without manual database edits
- members can use the core workflows successfully end to end

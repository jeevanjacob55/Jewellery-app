# 04. React Native Mobile App

This document explains how to build the Android app from the first screen to the final release-ready version.

## Goal

Deliver a polished Android app that matches the design system and supports the full member journey:

- splash
- login and onboarding
- dashboard
- market tiers
- company profile
- product search
- reverse search
- services
- news
- member profile
- advertiser interactions where applicable

## Step 1. Lock the mobile technology decisions

Use:

- `Expo` for the initial React Native workflow
- `React Navigation` for stack and bottom tabs
- a typed API layer
- a lightweight centralized state approach

Recommended v1 state split:

- session/auth state
- onboarding region state
- cached dashboard payload
- directory filters
- upload state
- notification preference state

## Step 2. Convert design tokens into code

The design system in `Proposed design/jewellery_association_design_system/DESIGN.md` must be translated into:

- colors
- spacing
- radii
- typography rules
- shadow rules
- button variants
- card styles
- market trend color semantics

Implementation tasks:

1. keep tokens in `src/theme/`
2. create reusable text styles
3. create reusable surface card and button components
4. create chips, list items, badges, and stat blocks

## Step 3. Build app navigation

Navigation structure:

1. splash stack
2. auth stack
3. main tab navigator
4. nested detail stacks

Required routes:

- Splash
- Login
- Onboarding
- Home
- Market Tiers
- Company Profile
- Product Search
- Reverse Search
- Services
- News
- Member Profile
- Advertiser submission flow if exposed in the mobile app

Bottom tabs:

- Home
- Market
- Services
- News
- Profile

## Step 4. Implement the splash screen

Requirements from the spec:

- association brand
- grayscale portraits of leadership
- gold-accented titles
- auto-dismiss after 3 seconds

Implementation:

- create a timed splash route
- if auth token exists, move to main flow
- if no auth token, move to login

Do not fetch heavy data on the splash screen beyond lightweight session checks.

## Step 5. Implement login and onboarding

### Login requirements

- email/password login
- Google SSO entry point
- guest access

### Onboarding requirements

- state selection
- district selection
- local chapter selection

### Implementation details

- fetch region hierarchy from `/api/regions/`
- store selected region in secure local state
- after onboarding completion, call backend profile update endpoint
- guest mode must receive a reduced navigation capability set

### Error states

- invalid credentials
- missing region selection
- no network
- expired session

## Step 6. Implement the home dashboard

Sections:

- rate card
- comparison toggles
- global trends
- quick actions
- optional alert summary

Data source:

- `/api/dashboard/`

Important UI behavior:

- show the last updated timestamp
- show positive/negative trends clearly
- use tabular number styling for financial values
- allow pull-to-refresh

## Step 7. Implement market tiers

Requirements:

- category chips
- premium cards
- pro cards
- normal grid entries

Data source:

- `/api/directory/companies/`

Implementation order:

1. render tier sections
2. add category filter chips
3. add state/region-aware filtering if needed
4. navigate to company detail

## Step 8. Implement company profile

Sections:

- hero block
- verification badges
- about section
- capacity and specialization
- vertical visual catalog
- enquiry CTA

Data source:

- `/api/directory/companies/{id}/`

Image behavior:

- show company logo if available
- show approved gallery images
- use image placeholders and loading states

## Step 9. Implement product search

Requirements:

- bottom-sheet filter UI
- purity filter
- weight range filter
- category filter
- product cards with images and enquiry CTA

Data source:

- directory/product search endpoint or company/product filter params

Implementation:

1. build filter sheet UI
2. connect filter state to query params
3. debounce search/filter requests if needed
4. allow navigating back to company detail or submitting enquiry directly

## Step 10. Implement reverse search

V1 behavior is manual review.

UI sections:

- upload entry
- optional notes
- status history
- supplier/admin responses

Implementation:

1. create request record
2. request signed upload session
3. upload image directly to storage
4. finalize attachment
5. poll or refresh request status

Show statuses:

- Submitted
- Under Review
- Supplier Responded
- Closed

## Step 11. Implement services and compliance

Sections:

- due soon cards
- action required cards
- service grid
- metrics footer

Data source:

- `/api/services/`

If request creation is included in v1:

- add service request form
- submit to backend
- show current request status

## Step 12. Implement news and alerts

Sections:

- urgent policy alert
- meeting cards
- compact ticker

Data source:

- `/api/news/`

Important interaction:

- “Add to Calendar” deep links
- push notification deep links to relevant content

## Step 13. Implement member profile

Sections:

- member status
- Jeweller ID
- notification preferences
- security/support/logout

Data source:

- `/api/me/`

Add:

- toggle updates for notification preferences
- visible verification state
- logout action clearing local tokens

## Step 14. Implement uploader UX

Needed for:

- reverse search
- ad submission if mobile supports it
- possible company/product submission later

UX rules:

- show upload progress
- allow retry on failure
- prevent duplicate taps
- surface validation errors clearly
- show success only after finalize endpoint succeeds

## Step 15. Implement push notifications

Use FCM for:

- rate alerts
- urgent policy alerts
- meeting reminders
- reverse-search responses
- ad review notifications if advertiser flows exist in mobile

Tasks:

1. register device token
2. store token against user
3. handle foreground notification UI
4. handle deep links from tapped notifications

## Step 16. Add offline and error handling

Every major screen needs:

- loading state
- empty state
- retry state
- partial data state when possible

Critical flows needing careful resilience:

- login
- dashboard refresh
- product filtering
- reverse-search upload

## Step 17. Add analytics and crash visibility

Track:

- login failures
- onboarding completion
- enquiry submissions
- reverse-search submissions
- push open rate
- upload failures

Do not track sensitive content from private uploads.

## Step 18. Add mobile QA checklist

Test on:

- low-end Android device
- average device
- high-resolution device

Validate:

- layout
- scroll performance
- upload reliability
- tab navigation
- notification behavior
- deep linking

## Definition Of Done

Mobile implementation is complete when:

- all primary screens are connected to real APIs
- uploads work end to end
- region-aware data changes by onboarding selection
- guests and members see different capabilities
- notifications reach the device and open the correct screen
- the Android build is stable enough for internal testing

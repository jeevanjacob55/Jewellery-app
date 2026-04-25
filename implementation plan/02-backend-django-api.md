# 02. Backend Django API

This document describes the detailed backend implementation order and the exact responsibility of each Django domain app.

## Goal

Build a secure backend that owns:

- authentication and permissions
- regional filtering
- business workflows
- upload authorization
- admin operations
- auditability

## Step 1. Finalize the Django app layout

Keep these apps:

- `accounts`
- `regions`
- `rates`
- `directory`
- `reverse_search`
- `services_app`
- `news`
- `ads`
- `admin_ops`

Why this split:

- it matches business domains
- it prevents a single oversized app
- it makes admin permissions and testing easier

## Step 2. Finish base settings

In `backend/config/settings.py`:

- use `django-environ` for all secrets and environment values
- keep `AUTH_USER_MODEL = "accounts.User"`
- keep DRF and JWT configured
- configure `corsheaders`
- prepare separate settings behavior for local, staging, and production if environment complexity grows

Add next:

- secure cookie and CSRF settings for hosted admin if session-based admin features are added
- production logging configuration
- storage backend configuration

## Step 3. Implement the `accounts` domain fully

### Models

- `User`
- `MemberProfile`
- `NotificationPreference`

### Required fields

`User`
- `username`
- `email`
- `corporate_email`
- `role`
- `jeweller_id`
- `is_verified_member`
- `onboarding_completed`

`MemberProfile`
- `phone_number`
- `company_name`
- `state_name`
- `district_name`
- `local_chapter_name`
- `membership_tier`

`NotificationPreference`
- `rate_alerts`
- `news_alerts`
- `ad_alerts`
- `meeting_alerts`

### API work

Implement:

- JWT login
- token refresh
- guest access
- `/api/me/`
- update profile endpoint
- update notification preferences endpoint
- onboarding completion endpoint

### Permission rules

- guests can only browse allowed public endpoints
- members can access member features
- advertisers can submit creatives
- suppliers/admins can manage reverse-search responses
- admins can access operations endpoints

## Step 4. Implement the `regions` domain

### Models

- `RegionState`
- `RegionDistrict`
- `LocalChapter`

### Requirements

- maintain a proper foreign key hierarchy
- prevent duplicate names within the same parent
- provide one hierarchy endpoint for onboarding

### API work

Implement:

- list all states with nested districts and chapters
- optional lightweight endpoints for state-only or district-only lookups if payload size becomes too large

### Data ownership

- regions are managed by admin staff
- onboarding stores selected ids or normalized values on the profile

## Step 5. Implement the `rates` domain

### Models

- `AssociationRate`
- `ExternalMarketRate`
- `GlobalTrendSnapshot`

### Business rules

- each association rate is tied to a region or region label
- the dashboard must always be able to show the latest active rate snapshot
- manual admin updates must be auditable

### API work

Implement:

- dashboard endpoint
- rate comparison endpoint
- region-scoped rate fetch
- admin manual update endpoint

### Important backend behavior

- never let the client calculate authoritative rates
- rates shown in the UI must come from backend responses only
- add a timestamp to every snapshot sent to the client

## Step 6. Implement the `directory` domain

### Models

- `Company`
- `CompanyVerification`
- `ProductCategory`
- `Product`
- `MediaAsset`
- `CompanyImage`
- `ProductImage`
- `Enquiry`

### Company requirements

Company records must support:

- discovery tier
- business category
- location
- about content
- operational capacity
- verification badges

### Product requirements

Products must support:

- company ownership
- product category
- weight
- purity
- images
- enquiry relation

### API work

Implement:

- company list with filters
- company detail
- product search
- product filter endpoint or query params
- create enquiry
- list user enquiries if that user view is needed in v1

### Filtering rules

Support filters for:

- tier
- category
- state
- district or city if stored
- purity
- weight range
- product category

### Search strategy

V1 can use simple database filtering.

Do not add Elasticsearch or a separate search system in v1 unless data scale proves it necessary.

## Step 7. Implement the media metadata model in the backend

The backend must own:

- upload session generation
- metadata persistence
- moderation state
- signed/private delivery rules

At minimum, persist:

- uploader
- bucket
- object key
- visibility
- mime type
- file size
- width and height
- caption
- alt text
- moderation status

Create finalize endpoints after upload so the database becomes authoritative only once a file is actually stored.

## Step 8. Implement the `reverse_search` domain

### Models

- `ReverseSearchRequest`
- `ReverseSearchAttachment`
- `ReverseSearchResponse`

### Status lifecycle

Use:

- `submitted`
- `under_review`
- `supplier_responded`
- `closed`

### V1 workflow

1. member creates request
2. member uploads attachment
3. admin or supplier reviews request
4. supplier/admin posts a response
5. status updates
6. member gets a push notification or in-app status update

### API work

Implement:

- create request
- list current user requests
- get request detail
- create upload session for attachments
- finalize attachment
- admin/supplier response endpoint
- admin assignment endpoint if assignments are introduced

### Security

- attachments are private
- signed URLs must be short-lived
- only authorized users can access request details

## Step 9. Implement the `services_app` domain

### Models

- `ServiceType`
- `ComplianceRequest`
- `ComplianceReminder`

### UI-driven requirements

Support:

- due in X days
- action required statuses
- turnaround time metrics
- service request creation

### API work

Implement:

- services dashboard
- service request creation
- list current user service requests
- admin update of status

## Step 10. Implement the `news` domain

### Models

- `NewsItem`
- `Alert`
- `MeetingEvent`

### Requirements

- urgent alerts for policy changes
- meeting cards with calendar links
- secondary ticker data on the screen

### API work

Implement:

- news feed endpoint
- urgent alert endpoint
- meetings endpoint
- admin create/publish/unpublish actions

## Step 11. Implement the `ads` domain

### Models

- `Advertisement`
- `AdTargeting`
- `AdAsset`
- `AdApproval`

### Workflow

1. advertiser creates a draft
2. advertiser uploads creative
3. advertiser chooses reach
4. admin reviews
5. admin approves or rejects
6. approved campaigns become eligible for display

### API work

Implement:

- create advertisement
- get advertisement detail
- create ad upload session
- finalize ad asset
- submit for review
- admin approve/reject
- list approved active ads for app placement

## Step 12. Implement the `admin_ops` domain

### Models

- `AuditLog`

### Minimum admin APIs

- overview metrics
- pending verification counts
- pending ad approvals
- pending reverse-search items
- recent audit logs

### Audit logging rules

Create an audit record when:

- rates are updated
- a member is verified
- an ad is approved/rejected
- reverse-search status changes
- a protected upload is accessed through a privileged path if needed

## Step 13. Build the serializer and view strategy

Guidelines:

- use DRF serializers for input validation
- keep heavy business logic out of views
- use services or helper functions when logic becomes reusable
- do not return giant nested payloads unless the screen actually needs them

Preferred layering:

1. models
2. serializers
3. service/helpers
4. views
5. urls

## Step 14. Build migrations and seed data

After each app stabilizes:

1. create migrations
2. review generated files
3. migrate locally
4. load seed data
5. test admin screens

Seed scripts should create:

- sample admin
- sample member
- sample advertiser
- sample supplier
- regions
- rates
- companies
- products
- media metadata
- news
- ads

## Step 15. Replace placeholder API responses

The scaffold currently contains some placeholder JSON responses.

Replace them in this order:

1. regions
2. rates/dashboard
3. directory list/detail
4. news
5. services
6. ads
7. reverse search
8. admin overview

Do not start broad frontend integration until at least steps 1 through 4 are database-backed.

## Step 16. Add backend tests

Write tests for:

- JWT login and refresh
- guest access restrictions
- region hierarchy
- dashboard payload shape
- directory filtering
- enquiry creation
- upload-session authorization
- reverse-search privacy
- ad approval workflow
- admin-only endpoints

## Definition Of Done

Backend implementation is complete when:

- migrations exist and apply cleanly
- seed data can populate a local database
- all core API groups return real database-backed data
- uploads are authorized through backend-controlled sessions
- admin flows are permissioned and auditable
- automated tests cover the most important flows

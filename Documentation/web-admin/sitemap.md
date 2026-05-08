# Web Admin Sitemap

## App Shell

### Global layout

- Persistent left sidebar
- Top header with page title, scope switcher, search, notifications, profile menu
- Main content area
- Right-side drawer or modal for detail views, approval review, and quick edits

### Global header tools

- Global search
- Date range filter when relevant
- Scope badge
- Notification bell
- Admin profile menu

## Sidebar Sitemap

```txt
/admin
  /overview
  /approvals
    /access-requests
    /advertisements
    /news
    /upgrade-requests
    /company-approvals
  /analytics
    /summary
    /market
    /ads
    /content
    /engagement
  /rates
    /today
    /associations
    /states
    /global-trends
    /history
  /advertisements
    /campaigns
    /campaigns/new
    /placements
    /creative-review
    /performance
  /market
    /companies
    /products
    /categories
    /subcategories
    /attributes
    /tiers
    /market-zones
    /market-rows
    /placement-overrides
  /users
    /all
    /members
    /admins
    /advertisers
    /company-admins
    /access-requests
  /content
    /news
    /alerts
    /meetings
    /drafts
    /scheduled
    /archived
  /hierarchy
    /states
    /associations
    /district-units
    /units
  /audit-logs
  /settings
    /platform
    /notifications
    /profile
    /security
```

## Screen By Screen

## 1. Overview

### Route

- `/admin/overview`

### Purpose

- Landing page for admins
- Show system health, pending operational work, and quick actions

### Main sections

- KPI cards
  Active members, pending approvals, active companies, live ads, upcoming meetings, rate freshness
- Quick actions
  Approve item, create campaign, create news, create meeting, assign tier, update rates
- Operational alerts
  stale rates, ad approvals waiting, missing content, failed uploads
- Recent activity
  last admin actions, last approvals, recent publishing events
- Scoped summary
  current admin scope, region coverage, visible branches

### Primary actions

- Open approvals queue
- Jump to create ad
- Jump to create news
- Jump to rates today
- Jump to user management

## 2. Approvals

### Route group

- `/admin/approvals`

### Child screens

#### `/admin/approvals/access-requests`

- Review member access requests
- Table columns
  applicant, business, state, association, submitted at, status, reviewer
- Row actions
  view, approve, reject, assign reviewer

#### `/admin/approvals/advertisements`

- Review submitted campaigns and creatives
- Table columns
  campaign, advertiser, placement, schedule, status, submitted at
- Row actions
  preview, approve, reject, request changes

#### `/admin/approvals/news`

- Review news drafts requiring approval
- Table columns
  headline, publisher scope, author, status, submitted at
- Row actions
  preview, approve, reject, request changes

#### `/admin/approvals/upgrade-requests`

- Review company tier upgrade requests
- Table columns
  company, current tier, requested tier, requester, submitted at, status
- Row actions
  compare tiers, approve, reject

#### `/admin/approvals/company-approvals`

- Review new or inactive companies before market visibility
- Table columns
  company, owner, state, tier, product count, status
- Row actions
  approve, reject, inspect profile

### Shared detail drawer

- item summary
- submitted metadata
- scope and hierarchy
- notes and reviewer comments
- approve/reject controls

## 3. Analytics

### Route group

- `/admin/analytics`

### Child screens

#### `/admin/analytics/summary`

- Top-level operational KPIs
- Trend lines for members, companies, approvals, ads, content output

#### `/admin/analytics/market`

- Market exposure by zone
- Exposure by tier
- Under-served companies
- Hero schedule preview
- Existing backend reports should feed this page first

#### `/admin/analytics/ads`

- impressions, clicks, CTR, top placements, top campaigns
- filters by placement, advertiser, campaign, date

#### `/admin/analytics/content`

- published news count
- urgent alert usage
- meeting count and attendance trend

#### `/admin/analytics/engagement`

- rate detail taps
- product views
- company profile views
- meeting RSVPs

### Shared filters

- Date range
- State
- Association
- Tier
- Placement

## 4. Rate System

### Route group

- `/admin/rates`

### Child screens

#### `/admin/rates/today`

- Today's official rates dashboard
- Show current 22K, 24K, silver, last update time, source, trend
- Actions
  add update, mark official, publish, rollback, compare previous

#### `/admin/rates/associations`

- List of association-level rates
- Filters
  state, association, freshness, missing values
- Actions
  view detail, edit, mark stale, publish

#### `/admin/rates/states`

- State comparison table
- Highlight missing boards and outliers

#### `/admin/rates/global-trends`

- USD/INR, gold ounce, silver ounce, other external feeds
- Actions
  refresh feed, compare snapshots

#### `/admin/rates/history`

- Historical audit trail of rate changes
- Filters
  date, association, editor, source

### Supporting overlays

- manual rate update form
- import preview modal
- discrepancy review drawer

## 5. Advertisements

### Route group

- `/admin/advertisements`

### Child screens

#### `/admin/advertisements/campaigns`

- Main campaign listing
- Table columns
  title, advertiser, placement, schedule, priority, status, performance snapshot
- Actions
  edit, submit, pause, approve, reject, duplicate, archive

#### `/admin/advertisements/campaigns/new`

- Campaign creation flow
- Sections
  basics, creative, placement, targeting, action config, schedule, review

#### `/admin/advertisements/placements`

- Placement-level configuration
- Show dashboard hero, market banner, news inline, future placements
- Actions
  enable, disable, reorder, inspect fill rate

#### `/admin/advertisements/creative-review`

- Creative moderation queue
- Preview assets, copy, target links, moderation notes

#### `/admin/advertisements/performance`

- Campaign performance analytics
- Top campaigns, low CTR campaigns, placement trends

### Campaign form options

- Title
- Advertiser
- Placement
- Date range
- Priority
- Background color
- Creative asset
- Action type
- Action payload
- Target scope
- Status

## 6. Market & Products

### Route group

- `/admin/market`

### Child screens

#### `/admin/market/companies`

- Company management
- Table columns
  company, state, tier, visibility type, admin priority, product usage, active, approved
- Actions
  approve, deactivate, assign tier, edit visibility, inspect products

#### `/admin/market/products`

- Product moderation and management
- Table columns
  product, company, category, purity, status, images, updated at
- Actions
  view, edit, deactivate, approve, inspect attributes

#### `/admin/market/categories`

- Manage product categories
- Actions
  create, edit, reorder, activate, deactivate

#### `/admin/market/subcategories`

- Manage subcategories linked to categories
- Actions
  create, edit, reorder, activate, deactivate

#### `/admin/market/attributes`

- Manage dynamic attribute definitions
- Show category, key, label, type, required, active, display order
- Actions
  create, edit, reorder, activate, deactivate

#### `/admin/market/tiers`

- Company tier management
- Show max products, image rules, max companies, price, visibility type, active
- Actions
  create tier, edit tier, activate, deactivate, inspect usage

#### `/admin/market/market-zones`

- Manage feed zones and eligibility
- Actions
  create zone, edit zone, edit rules, inspect exposure

#### `/admin/market/market-rows`

- Manage home feed rows
- Actions
  create row, edit layout, change order, enable, disable

#### `/admin/market/placement-overrides`

- Manual override interface for feed placement
- Actions
  pin company, remove pin, set window, inspect conflicts

### Detail screens and drawers

- Company detail
  profile, tier, product usage, linked admins, approval history
- Product detail
  media, attributes, moderation state, company context
- Tier impact preview
  downgrade warning, excess products, slot usage

## 7. Users

### Route group

- `/admin/users`

### Child screens

#### `/admin/users/all`

- Master user listing

#### `/admin/users/members`

- Verified and standard members

#### `/admin/users/admins`

- Scoped admin management

#### `/admin/users/advertisers`

- Advertiser account management

#### `/admin/users/company-admins`

- Company-linked admin users

#### `/admin/users/access-requests`

- Shortcut view of onboarding requests

### User detail screen

- Route
  `/admin/users/:userId`
- Sections
  profile, hierarchy, scoped roles, company links, verification, notifications, audit history
- Actions
  verify member, deactivate, assign scope, revoke scope, link company, resend onboarding

## 8. News & Meetings

### Route group

- `/admin/content`

### Child screens

#### `/admin/content/news`

- Published and draft news list
- Actions
  create, edit, submit for approval, publish, archive

#### `/admin/content/alerts`

- Urgent alert management
- Actions
  create alert, edit severity, publish, expire

#### `/admin/content/meetings`

- Meeting management
- Actions
  create, edit, cancel, publish, inspect RSVPs

#### `/admin/content/drafts`

- Combined drafts view

#### `/admin/content/scheduled`

- Future-scheduled content

#### `/admin/content/archived`

- Archived content history

### Content editor screens

#### `/admin/content/news/new`

- Headline, summary, body, image, scope, targets, save draft, submit, publish

#### `/admin/content/meetings/new`

- Title, description, organizer scope, venue, maps link, mode, online link, schedule, audience, publish

### Supporting views

- news preview drawer
- approval notes drawer
- meeting RSVP summary modal

## 9. Hierarchy

### Route group

- `/admin/hierarchy`

### Child screens

#### `/admin/hierarchy/states`

- State list and summary counts

#### `/admin/hierarchy/associations`

- Association list
- Actions
  create association, edit, activate, inspect district units

#### `/admin/hierarchy/district-units`

- District unit management
- Actions
  bulk create, rename, move if valid

#### `/admin/hierarchy/units`

- Unit management
- Actions
  bulk create, rename, move if valid

### Shared hierarchy tools

- branch explorer tree
- bulk create modal
- validation error panel

## 10. Audit Logs

### Route

- `/admin/audit-logs`

### Purpose

- Central history of privileged system actions

### Columns

- Actor
- Role
- Action
- Module
- Target type
- Target id
- Scope
- Timestamp
- Metadata summary

### Filters

- module
- action type
- admin
- date range
- status

## 11. Settings

### Route group

- `/admin/settings`

### Child screens

#### `/admin/settings/platform`

- Brand settings
- placement defaults
- approval rules
- dashboard defaults

#### `/admin/settings/notifications`

- Admin notification preferences
- email and push rules

#### `/admin/settings/profile`

- Admin profile
- display name, email, avatar

#### `/admin/settings/security`

- password change
- session list
- device/session revoke

## Cross-Screen Patterns

### Table-heavy modules

- approvals
- campaigns
- companies
- products
- users
- audit logs

### Drawer-first detail views

- approval review
- user details
- campaign preview
- company quick inspect
- rate discrepancy review

### Full-page forms

- create campaign
- create news
- create meeting
- create/edit tier

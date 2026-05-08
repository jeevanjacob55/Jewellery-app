# Web Admin Components

This document lists the reusable UI pieces needed to build the web admin console cleanly.

## Layout Components

## `AdminAppShell`

- Persistent sidebar
- Top header
- Main content slot
- Optional right drawer slot

## `AdminSidebar`

- Role-aware navigation groups
- Active route state
- Collapsible sections
- Scope badge or current branch label

## `AdminTopbar`

- Page title
- Breadcrumbs
- Global search
- Context filters
- Notifications
- Profile menu

## `PageSection`

- Standard section wrapper with title, subtitle, and action area

## `StatsCardRow`

- Reusable KPI card row for overview and analytics pages

## Data Display Components

## `MetricCard`

- Label
- Value
- Trend
- Optional comparison period

## `AdminDataTable`

- Sortable columns
- Sticky header
- Bulk selection
- Empty state
- Row actions

## `FilterToolbar`

- Search input
- Select filters
- Date range
- Clear filters
- Saved view support later

## `StatusBadge`

- draft
- submitted
- approved
- rejected
- scheduled
- active
- inactive
- stale

## `ScopeBadge`

- platform
- state
- association
- district operational unit
- unit
- company

## `ActivityFeed`

- Recent actions and system updates

## `AuditTimeline`

- Rich event log for entity detail drawers

## Detail And Overlay Components

## `SideDetailDrawer`

- Used for approval review, user details, company quick inspect, campaign preview

## `ConfirmActionModal`

- Approve
- Reject
- Deactivate
- Publish
- Cancel meeting

## `ReviewPanel`

- Reviewer notes
- decision controls
- history of prior comments

## `ComparisonPanel`

- Before vs after
- current tier vs requested tier
- previous rate vs new rate

## Form Components

## `AdminFormLayout`

- Standard two-column or single-column admin form wrapper

## `FieldGroupCard`

- Group related settings or fields in card sections

## `TargetScopeSelector`

- State
- Association
- District unit
- Unit
- Company
- Include/exclude support later

## `ScheduleFields`

- start date
- end date
- publish time
- expiry time

## `ActionPayloadBuilder`

- Dynamic form for ad action type and payload
- external URL
- internal screen
- product
- company
- category

## `RichTextEditor`

- News and content creation

## `MediaUploader`

- Image upload
- preview
- moderation status

## `BulkCreateModal`

- For district units and units

## Domain-Specific Components

## `ApprovalQueueTable`

- Shared approvals list with type-aware actions

## `RateFreshnessCard`

- last update
- stale warning
- missing source warning

## `RateEntryTable`

- gold 22K
- gold 24K
- silver
- trend and source

## `CampaignPreviewCard`

- placement preview
- asset preview
- CTA target preview

## `CompanyTierCard`

- max products
- photo rules
- company slot usage
- visibility type

## `MarketExposureChart`

- zone exposure
- tier exposure
- fairness metrics

## `MeetingAudienceSummary`

- organizer scope
- included targets
- attendee counts

## Page Composition Map

## Overview

- `AdminAppShell`
- `AdminTopbar`
- `MetricCard`
- `ActivityFeed`
- `PageSection`

## Approvals

- `FilterToolbar`
- `ApprovalQueueTable`
- `SideDetailDrawer`
- `ReviewPanel`

## Analytics

- `FilterToolbar`
- `MetricCard`
- `MarketExposureChart`
- `PageSection`

## Rate System

- `RateFreshnessCard`
- `RateEntryTable`
- `ComparisonPanel`
- `ConfirmActionModal`

## Advertisements

- `AdminDataTable`
- `CampaignPreviewCard`
- `ActionPayloadBuilder`
- `ScheduleFields`
- `MediaUploader`

## Market & Products

- `AdminDataTable`
- `CompanyTierCard`
- `FieldGroupCard`
- `SideDetailDrawer`

## Users

- `AdminDataTable`
- `ScopeBadge`
- `StatusBadge`
- `SideDetailDrawer`

## News & Meetings

- `AdminDataTable`
- `RichTextEditor`
- `TargetScopeSelector`
- `MeetingAudienceSummary`

## Hierarchy

- `AdminDataTable`
- `BulkCreateModal`
- `SideDetailDrawer`

## Audit Logs

- `AdminDataTable`
- `FilterToolbar`
- `AuditTimeline`


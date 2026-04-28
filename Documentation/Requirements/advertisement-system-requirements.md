# Advertisement System Requirements

## Purpose

The advertisement system allows approved advertisers and association-approved campaigns to occupy premium visibility slots across the mobile experience without breaking trust, relevance, or platform governance.

## Primary Users

- Advertiser
- Admin reviewer
- Member viewing ads
- Guest viewing public-safe ads

## Product Goal

Create a controlled ad platform that supports sponsored visibility while maintaining content quality, regional relevance, and approval traceability.

## Ideal Product Approach

- Separate ad creation, targeting, asset upload, approval, and delivery into clear lifecycle stages.
- Keep ad delivery placement-based and rule-driven.
- Use moderation and approval before public display.
- Prefer association-scoped targeting over broad untargeted campaigns.

## Ad Lifecycle

1. Advertiser creates campaign metadata.
2. Advertiser uploads asset(s).
3. Advertiser configures targeting.
4. Admin reviews and approves or rejects.
5. Eligible ad becomes available for placement delivery.
6. Platform measures impressions and taps.

## Core Functional Requirements

### Campaign Model

- Advertiser ownership
- Title
- Reach type
- Start date
- End date
- Status:
  - draft
  - submitted
  - approved
  - rejected
  - expired

### Asset Management

- Support media upload sessions for private asset staging.
- Asset metadata should include:
  - placement
  - filename
  - mime type
  - visibility
  - moderation state

### Targeting

- Support targeting by:
  - state
  - association
  - district operational unit
  - unit
- Validation must ensure every child target belongs to the selected parent target.

### Approval

- Admin can approve or reject a campaign.
- Approval should capture:
  - approver
  - timestamp
  - notes

### Delivery

- Ads should be returned by placement.
- Initial placements should support:
  - dashboard hero
  - market tiers banner
  - news inline

## Backend Requirements

Recommended capability split:

- Ad management endpoints for authenticated advertiser/admin workflows
- Ad delivery endpoints for mobile rendering
- Upload-session endpoints for asset ingestion

Recommended delivery contract:

- `GET /api/ads/?placement=dashboard_hero`

Recommended management contracts:

- `POST /api/ads/`
- `PATCH /api/ads/{id}/`
- `POST /api/ads/upload-session/`
- `POST /api/ads/{id}/submit/`
- `POST /api/ads/{id}/approve/`
- `POST /api/ads/{id}/reject/`

## Mobile Requirements

- Ads must be visually distinct from core content.
- Sponsored content must be labeled.
- Ad slots should fail gracefully when no approved ad is available.
- Tapping an ad should support:
  - external link
  - internal destination
  - lead form

## Governance Requirements

- No ad should render publicly without approval.
- Expired campaigns must stop rendering automatically.
- All approval actions should be auditable.
- Platform should support future category restrictions and advertiser policy rules.

## Analytics Recommendations

- Impression count
- Tap count
- Placement CTR
- Targeting breakdown by region
- Approval turnaround time

## Acceptance Criteria

- Advertiser can upload and configure a campaign.
- Admin can review and approve/reject it.
- Approved ads can be delivered by placement and target scope.
- Expired or rejected ads never appear in public delivery feeds.

## Future Enhancements

- Budget and spend tracking
- Rotation and priority rules
- Frequency capping
- Rich media and video support
- Campaign performance dashboard

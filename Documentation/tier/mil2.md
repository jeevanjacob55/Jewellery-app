# Milestone 2: Control Plane And Market Feed Cutover

## Summary
Milestone 2 should make the new zone-based system operational on the backend without adding admin UI yet.

This milestone will:

- make `MarketZone` the live market-feed source
- keep a rollback-safe fallback to the existing `MarketRow` feed path
- add admin APIs for zones, eligibility rules, overrides, and company market visibility
- implement scheduled hero selection plus deterministic weighted ordering for company zones
- activate live `PlacementOverride` behavior
- start writing serve-level `ExposureLedger` records from the public market feed
- keep `latest_products` dormant in the public feed for now

This milestone will not include mobile admin UI, product-zone feed rendering, rolling-window fairness guarantees, or reporting dashboards.

## Key Changes
### 1. Cut over the public feed to `MarketZone`, with rollback fallback
Update the market-feed read path so `build_market_feed_payload()` becomes zone-first.

Serving rules:
- If `DIRECTORY_MARKET_ZONE_FEED_ENABLED` is `False`, return the current `MarketRow` payload unchanged.
- If the zone service raises an internal error, fall back to the current `MarketRow` payload and log the failure.
- If enabled and healthy, return rows derived from enabled `MarketZone` records only.
- Exclude `latest_products` from the live public feed in this milestone.

Public response shape:
- Keep `rows[]` as the top-level contract.
- Keep current company-card item shape so the mobile market screen still renders.
- Add optional row metadata:
  - `zone_key`
  - `serving_mode`
- Do not add product-row payloads yet.

### 2. Add the missing zone-control fields and admin APIs
Add one additive migration to extend `MarketZone` with the minimum runtime control needed for live serving:

Recommended new `MarketZone` fields:
- `serving_mode`
  - `scheduled_hero`
  - `weighted_companies`
  - `dormant`
- `slot_interval_hours` for scheduled hero windows
- optional `cooldown_override_hours` nullable, to override tier cooldown when needed

Default seeded behavior:
- `hero_spotlight` → `scheduled_hero`, `slot_interval_hours=6`
- `featured_companies` → `weighted_companies`
- `rising_companies` → `weighted_companies`
- `latest_products` → `dormant`

Add backend admin APIs only:
- `GET/POST /admin/market-zones/`
- `PATCH /admin/market-zones/<id>/`
- `GET/PATCH /admin/market-zones/<id>/eligibility-rules/`
- `GET/POST /admin/placement-overrides/`
- `PATCH /admin/placement-overrides/<id>/`
- `PATCH /admin/directory/companies/<company_id>/market-visibility/`
  - manage `is_market_visible`
  - manage `admin_priority`
- `GET /admin/market-preview/`
  - read-only computed lineup using the same service as the public feed
  - no exposure writes

Also extend `CompanyTierSerializer` and `CompanyTierWriteSerializer` to expose/edit:
- `base_weight`
- `hero_eligible`
- `premium_floor_share`
- `cooldown_hours`

### 3. Implement the live serving logic
Use one shared market-serving service for both public feed and admin preview.

Candidate eligibility for company zones:
- company must be `is_active=True`
- company must be `is_approved=True`
- company must be `is_market_visible=True`
- tier must be `is_active=True`
- zone must be `is_enabled=True`
- a matching `ZoneEligibilityRule` must have `is_eligible=True`
- active `block` overrides exclude the company from that zone

Override precedence:
1. active `pin`
2. active `boost`
3. normal weighted ordering
4. `block` always excludes

Hero zone behavior:
- one company per slot
- slot duration = `slot_interval_hours`, default 6 hours
- determine slot index from current server time in UTC
- every 5th slot is a wildcard slot
  - wildcard slot uses hero-zone rules with `is_wildcard=True`
  - normal slots prefer hero-zone rules with `is_wildcard=False`
- apply cooldown:
  - exclude companies whose `last_featured_at` is within the applicable cooldown window when alternatives exist
  - if no alternative exists, allow the best available eligible company
- ordering inside the candidate pool:
  - active `pin` first
  - active `boost` next
  - `tier.base_weight * rule.weight_multiplier`
  - `admin_priority`
  - `created_at`
  - `id`

Weighted company-zone behavior for `featured_companies` and `rising_companies`:
- deterministic ordering, not randomized in this milestone
- score by:
  - active `pin`
  - active `boost`
  - `tier.base_weight * rule.weight_multiplier`
  - `admin_priority`
  - `created_at`
  - `id`
- return up to `zone.capacity` companies
- no rolling-window minimum exposure guarantee yet

State updates on live public feed only:
- when `hero_spotlight` serves a company, set `company.last_featured_at` to the current slot serve time
- create one `ExposureLedger` row per returned company per zone with:
  - `company`
  - `tier`
  - `zone`
  - `event_type="served"`
  - `served_at`
  - metadata including `source="public_market_feed"` and slot key when applicable
- preview endpoint must not write exposure records or update `last_featured_at`

### 4. Preserve compatibility and keep dormant work out
Keep these deferred to Milestone 3 or later:
- `latest_products` public feed rows
- product-card market row contract
- impression/view tracking
- rolling-window fairness floors
- reporting endpoints
- admin UI

## API And Type Changes
Public feed:
- keep `MarketFeedData.rows[]`
- extend each row with optional:
  - `zone_key?: string`
  - `serving_mode?: "scheduled_hero" | "weighted_companies" | "dormant"`

Admin/backend:
- extend tier write/read payloads with the 4 visibility-policy fields
- add market-zone CRUD payloads:
  - `id`, `key`, `title`, `description`, `layout`, `capacity`, `sort_order`, `is_enabled`, `serving_mode`, `slot_interval_hours`, `cooldown_override_hours`
- add eligibility-rule payloads:
  - `id`, `zone_id`, `tier_id`, `is_eligible`, `is_wildcard`, `weight_multiplier`, `guaranteed_share`
- add override payloads:
  - `id`, `company_id`, `zone_id`, `action`, `starts_at`, `ends_at`, `priority`, `notes`, `is_active`
- add preview response using the public feed row shape plus diagnostics:
  - `candidate_count`
  - `applied_override_count`
  - `fallback_used`

## Test Plan
Add or extend tests for:

- zone admin CRUD
  - create/list/patch `MarketZone`
  - patch `serving_mode`, `capacity`, and `is_enabled`
- eligibility-rule admin behavior
  - update rule values
  - uniqueness on `(zone, tier)` still enforced
- company market-visibility admin endpoint
  - `is_market_visible=False` removes company from zone feed
  - `admin_priority` affects weighted ordering
- public market feed cutover
  - zone-enabled path returns rows derived from `MarketZone`
  - fallback setting returns current legacy `MarketRow` behavior
  - `latest_products` is excluded from the public feed
- hero zone logic
  - normal slot selects non-wildcard eligible hero candidates
  - every 5th slot uses wildcard candidates
  - cooldown prevents immediate repeat when alternatives exist
  - pinned company wins when active
  - blocked company is excluded
- weighted zone logic
  - higher effective weight ranks ahead of lower weight
  - boost beats normal weighting
  - pin beats boost
- preview endpoint
  - returns the computed lineup
  - does not create `ExposureLedger` rows
  - does not update `last_featured_at`
- exposure logging
  - live public feed creates one serve-level ledger row per returned company per zone
- compatibility
  - existing company detail/list endpoints remain unchanged
  - current mobile market screen can consume the new `rows[]` payload without breaking

## Assumptions
- Milestone 2 is backend/API-only.
- The live public feed becomes zone-first in this milestone.
- `latest_products` remains seeded and manageable, but not live.
- Deterministic weighted ordering is sufficient for this milestone; no randomized exploration is introduced yet.
- Cooldown and wildcard cadence go live now; rolling-window lower-tier guarantees do not.
- `ExposureLedger` starts recording live public feed serves only, not preview calls or client-side impressions.
- A simple rollback switch via `DIRECTORY_MARKET_ZONE_FEED_ENABLED` is required and must default to safe behavior in non-production environments.

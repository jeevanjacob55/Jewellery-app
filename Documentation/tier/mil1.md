# Milestone 1: Tier Foundation Models And Seed Data

## Summary
Implement only the schema and validation foundation for the new architecture while keeping all current market endpoints and behavior intact.

This milestone will:

- reuse `CompanyTier` and `Company.tier_ref` as the canonical company-tier relationship
- add new visibility-domain models alongside the existing `MarketRow` system
- seed the 6 plans and 4 new zones
- add the missing `Company` visibility fields needed for future milestones
- preserve current product-tier validation behavior and cover it with targeted tests

No market feed API changes, no rotation logic, no ranking logic, no admin UI, and no exposure-writing logic will be added in this milestone.

## Key Changes
### 1. Extend existing tier and company foundation
Use the current `CompanyTier` model as the base plan model and add only the fields needed for future visibility policy support.

Recommended `CompanyTier` additions for Milestone 1:
- `base_weight`
- `hero_eligible`
- `premium_floor_share`
- `cooldown_hours`

Keep existing fields and behavior:
- `max_products`
- `min_photos_per_product`
- `max_photos_per_product`
- `max_companies_allowed`
- `price`
- `is_free`
- `is_active`

Extend `Company` without replacing current relationships:
- keep existing `tier_ref`
- keep existing `admin_priority`
- add `is_market_visible`
- add `last_featured_at` nullable datetime

Do not add a parallel `tier` field in Milestone 1.

### 2. Add new models without touching the current market feed system
Introduce new models in `apps.directory.models` and keep `MarketRow` unchanged.

Recommended models:

- `MarketZone`
  - `key` unique slug-like identifier
  - `title`
  - `description`
  - `layout`
  - `sort_order`
  - `capacity`
  - `is_enabled`

- `ZoneEligibilityRule`
  - foreign key to `MarketZone`
  - foreign key to `CompanyTier`
  - `is_eligible`
  - `is_wildcard`
  - `weight_multiplier`
  - `guaranteed_share`
  - uniqueness on `(zone, tier)`

- `PlacementOverride`
  - foreign key to `Company`
  - foreign key to `MarketZone`
  - `action` enum for `pin`, `boost`, `block`
  - `starts_at`
  - `ends_at`
  - `priority`
  - `notes`
  - `is_active`

- `ExposureLedger`
  - foreign key to `Company`
  - optional foreign key to `CompanyTier`
  - optional foreign key to `MarketZone`
  - `event_type`
  - `served_at`
  - `metadata` JSON
  - structure only; no writing logic in this milestone

Keep these new models isolated from current public APIs for now.

### 3. Seed plans and zones in a compatibility-safe way
Do not replace existing seeding. Extend it safely.

Seed the 6 tiers:
- `prime-signature`
- `prime-classic`
- `prime-premier`
- `prime-elite`
- `prime-circle`
- `prime-unique`

Seed the 4 zones in the new `MarketZone` model only:
- `hero_spotlight`
- `featured_companies`
- `rising_companies`
- `latest_products`

Seed baseline `ZoneEligibilityRule` records for every tier/zone combination needed for future milestones. These can be simple defaults now, as long as they are explicit and deterministic.

Do not map these zones into `MarketRow` yet.

### 4. Preserve and test current tier validation
Current product count and image validation already exists in `services.py` and serializer flows. Milestone 1 should preserve this behavior and ensure it remains covered after schema changes.

Validation expectations to preserve:
- active products cannot exceed `tier_ref.max_products`
- active products must meet `tier_ref.min_photos_per_product`
- active products cannot exceed `tier_ref.max_photos_per_product`

No new rotation, ranking, or visibility-serving validation is added in this milestone.

## Implementation Notes
- Prefer a single non-destructive migration chain in `apps.directory`.
- Use data migrations or extend existing seed patterns for deterministic local/dev/test setup.
- Keep all current serializers, views, URLs, and market feed assembly untouched unless a no-op compatibility adjustment is strictly required.
- If a new enum is needed for `layout` or override `action`, define it in the new models instead of reusing `MarketRow` assumptions.

## Test Plan
Add or extend tests for the following:

- seed data correctness
  - 6 company tiers exist
  - 4 market zones exist
  - expected tier slugs and zone keys are present
  - representative `ZoneEligibilityRule` rows exist

- tier product-count enforcement
  - company admin cannot activate a product beyond tier limit

- tier image-count enforcement
  - activation fails below minimum photo count
  - activation fails above maximum photo count

- compatibility checks
  - existing market feed tests still pass unchanged
  - existing company/tier assignment tests still pass unchanged

## Assumptions
- `Company.tier_ref` remains the only company-tier relation in Milestone 1.
- `MarketZone` is introduced alongside `MarketRow`, not as a replacement.
- `latest_products` is seeded as a zone even though no zone-driven feed behavior is implemented yet.
- `ExposureLedger` is schema-only in this milestone.
- Existing seed values for the 6 plans remain the source of truth unless a migration explicitly updates them in place.
- No public API contract changes are made in this milestone.

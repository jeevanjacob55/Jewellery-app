# Tier Management And Dynamic Market Visibility Plan

## Summary
Move the marketplace from a rigid `6 plans -> 3 fixed sections` model to a `plan entitlement + visibility policy + feed zones` model.

The recommended product shape is:

- Keep the 6 company plans as the source of business entitlements.
- Add configurable market zones instead of hardcoded visibility buckets.
- Use a hybrid serving model:
  - scheduled rotation for the highest-attention placements
  - weighted request-time ranking for the rest of the feed
  - manual admin overrides for campaigns and exceptions
- Guarantee lower-tier visibility with explicit floor rules, instead of letting them disappear behind premium tiers.

This preserves premium value while making the market feel fairer, fresher, and easier to manage.

## Key Changes
### 1. Split the current tier system into 3 layers
Introduce a clean separation:

- `Plan`: what a company is allowed to do.
  - Keep current constraints like `max_products`, image rules, company caps, active status, and price.
- `Visibility policy`: how often the plan should appear in premium vs standard discovery.
  - Add fields such as `base_weight`, `eligible_zones`, `hero_eligibility`, `premium_floor_share`, and `cooldown_hours`.
- `Feed zone`: where content can be shown in the market.
  - Replace the “featured / pro / normal” mental model with named zones that each have their own policy.

### 2. Replace the rigid 3 sections with a zone-based feed
Use this v1 zone layout:

1. `hero_spotlight`
   - One company at a time.
   - Scheduled rotation.
   - Default eligibility: `Prime Signature`, `Prime Classic`, `Prime Premier`.
   - Every 5th slot is a `wildcard discovery slot` reserved for `Prime Elite`, `Prime Circle`, or `Prime Unique`.

2. `featured_companies`
   - Horizontal rail.
   - Hybrid serving: scheduled pool + weighted ranking.
   - All 6 tiers eligible, but weighted heavily toward upper tiers.

3. `rising_companies`
   - Discovery-focused rail/grid.
   - All active approved companies eligible.
   - Explicit floor for lower tiers and freshness bias to avoid repeats.

4. `category_showcases`
   - Optional v1.5 / phase 2 zone.
   - Category-driven dynamic collections, not tier-driven.

This is better than the current model because it organizes the market around attention levels, not around a hardcoded 3-bucket taxonomy.

### 3. Define the first decision table
Create a business-facing decision table with these columns:

- Tier name
- Product entitlement
- Photo min/max
- Company cap
- Hero eligibility
- Eligible zones
- Base exposure weight
- Guaranteed premium share
- Cooldown before repeat hero exposure
- Override eligibility
- Notes / sales language

Recommended starting policy defaults:

- `Prime Signature`: weight 12, hero eligible, guaranteed premium windows, 24h hero cooldown
- `Prime Classic`: weight 9, hero eligible, high featured share, 24h hero cooldown
- `Prime Premier`: weight 7, hero eligible, medium-high featured share, 24h hero cooldown
- `Prime Elite`: weight 5, wildcard hero eligible, medium share, 18h cooldown
- `Prime Circle`: weight 3, wildcard hero eligible, low-but-guaranteed featured/discovery share, 12h cooldown
- `Prime Unique`: weight 1, wildcard hero eligible only in discovery slots, guaranteed discovery floor, 12h cooldown

Use a rolling-window guarantee:
- over any 7-day window, each active lower-tier company should receive some premium-zone opportunity if inventory and approval status allow
- premium tiers still receive materially more top-zone time

### 4. Build a dedicated admin domain for tiers and visibility
Since the chosen direction is API-first, phase the admin experience like this:

- Phase 1: dedicated admin APIs and policy objects
- Phase 2: dedicated admin UI consuming those APIs

Admin capabilities to support:

- Tier catalog
  - create/edit/archive plans
  - edit entitlement rules and exposure rules separately
- Zone catalog
  - define zone name, layout, capacity, ordering, visibility, and eligibility rules
- Rotation policy manager
  - set weights, wildcard cadence, cooldowns, repeat limits, and lower-tier floor rules
- Override manager
  - pin, boost, block, or schedule company placements for a date range
- Preview / simulation
  - “show me today’s lineup”
  - “show me the next 7 days of hero rotation”
  - “show me exposure share by tier if current rules continue”
- Reporting
  - zone fill rate
  - exposure share by tier
  - top-zone appearances by company
  - companies under-served relative to policy

## API And Type Changes
Extend the current tier and market-row contracts rather than keeping them as simple visibility buckets.

### Admin APIs
Add or evolve admin endpoints for:

- tier visibility policy CRUD
- zone CRUD
- override CRUD
- lineup preview
- exposure reporting

Recommended objects:

- `CompanyTier`
  - keep current entitlement fields
  - add visibility fields like `base_weight`, `hero_eligible`, `cooldown_hours`
- `MarketZone`
  - replaces the current fixed-row mindset
  - fields: `key`, `title`, `layout`, `capacity`, `serving_mode`, `is_enabled`, `sort_order`
- `ZoneEligibilityRule`
  - tier eligibility, wildcard rules, floor rules
- `PlacementOverride`
  - company, zone, action (`pin` / `boost` / `block`), start/end time, priority
- `ExposureLedger`
  - record zone serves per company for fairness and reporting

### Public market feed
Keep the existing `rows[]` response shape for mobile compatibility, but add zone metadata:

- `zone_key`
- `serving_mode`
- `items`
- optional future `served_at`

Do not expose ranking scores publicly in v1.

### Tracking default for v1
Use `feed serve` as the exposure event in v1:
- if a company is returned in a zone payload, count it as exposure
- upgrade to viewport impression tracking later if needed

## Test Plan
Cover both business policy correctness and feed behavior.

Required scenarios:

- tier entitlement validation still works for products, image counts, and company caps
- zone eligibility rejects ineligible tiers
- scheduled hero rotation respects hero eligibility and wildcard cadence
- weighted ranking prefers higher tiers without starving lower tiers
- lower-tier floor is satisfied over a rolling window
- cooldown prevents the same company from dominating hero placement
- overrides beat automatic ranking and expire correctly
- disabled zones drop out of the public feed cleanly
- empty premium pools fall back safely without breaking the feed
- preview output matches live lineup generation for the same time window
- current mobile market screen can render the new feed without structural breakage

## Assumptions And Defaults
- No per-user personalization in v1.
- Scheduling is server-time based.
- Companies must remain active and approved to participate in any zone.
- Paid tier value is expressed through guaranteed premium share and stronger weights, not absolute exclusivity.
- Lower-tier visibility is protected through floors and wildcard slots, not equal exposure.
- Manual override is exception-based, not the primary operating model.

## Research Basis
This plan follows common patterns from searchandising and recommendation systems:

- configurable merchandising rules, boosts, hides, and optional ranking rules: Algolia  
  https://www.algolia.com/doc/guides/managing-results/rules/merchandising-and-promoting/
- dynamic collections plus manual boost/bury/slotting on top of algorithmic ranking: Constructor  
  https://docs.constructor.com/docs/products-collections  
  https://docs.constructor.com/docs/products-ai-powered-product-discovery-results-ranking-at-constructor
- exploration/exploitation for changing content pools and offline evaluation of bandit-style serving: Microsoft Research  
  https://www.microsoft.com/en-us/research/publication/a-contextual-bandit-approach-to-personalized-news-article-recommendation-3/  
  https://www.microsoft.com/en-us/research/?p=687597
- fairness/popularity-bias caution: recommendation systems tend to reinforce already-popular items unless exposure is explicitly diversified  
  https://link.springer.com/article/10.1007/s11257-023-09364-z  
  https://link.springer.com/article/10.1007/s10844-026-01025-y

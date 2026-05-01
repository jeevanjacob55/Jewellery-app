# Milestone 4: Fairness, Reporting, And Thin Mobile Admin Insights

## Summary
Milestone 4 should make the zone system operationally fair and observable without expanding into full admin CRUD UI.

This milestone will:
- add rolling-window fairness to the weighted company zones
- expand admin preview into a real operator insight tool
- add historical exposure reporting APIs
- ship a thin read-only mobile admin screen that consumes preview and report data

This milestone will not include product-level exposure tracking, full tier/zone/override management UI, or a separate web admin.

## Key Changes
### 1. Add rolling-window fairness to weighted company zones
Introduce a new backend flag:
- `DIRECTORY_MARKET_FAIRNESS_ENABLED`, default `False`
- `DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS`, default `7`

Fairness applies only to:
- `featured_companies`
- `rising_companies`

Fairness does not change live selection for:
- `hero_spotlight`
- `latest_products`

Ranking behavior for weighted company zones when fairness is enabled:
1. active `pin`
2. active `boost`
3. positive exposure deficit, highest first
4. existing weighted score (`tier.base_weight * rule.weight_multiplier`)
5. `admin_priority`
6. `created_at`
7. `id`

Deficit calculation:
- use `ExposureLedger` rows from the last `DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS`
- compute deficits per company per zone
- derive target share from `ZoneEligibilityRule.guaranteed_share`
- divide each tier’s guaranteed share across currently eligible active companies in that tier for that zone
- only companies that are active, approved, market-visible, tier-active, and zone-eligible count in the denominator
- `block` still excludes a company entirely

Live serve metadata should be enriched in `ExposureLedger.metadata` for company-zone rows with:
- `selection_reason`: `pin` | `boost` | `fairness` | `weight`
- keep existing `source`
- keep existing `slot_key` for hero rows

### 2. Expand preview and reporting APIs
Public market APIs stay unchanged.

Admin APIs:
- extend `GET /admin/market-preview/`
  - keep current snapshot behavior
  - add optional `hero_days` query param, default `0`, max `14`
  - when `hero_days > 0`, include `hero_schedule`
  - preview remains read-only and must not write exposures or mutate `last_featured_at`
- add `GET /admin/market-report/summary/?days=7`
  - historical company-zone exposure totals only
  - return window metadata, totals by zone, totals by tier, and top companies per zone
  - include `selection_reason` breakdown from ledger metadata
- add `GET /admin/market-report/under-served/?days=7`
  - return companies with positive current deficit in fairness-enabled zones
  - include company, tier, zone, actual serves, target serves, and deficit

Reporting scope:
- company-level only
- include `hero_spotlight`, `featured_companies`, and `rising_companies`
- exclude `latest_products` and categories from reporting until product-aware tracking exists

Performance/data changes:
- add reporting-friendly indexes to `ExposureLedger` for time-window queries
- no new exposure model in this milestone
- no product-level ledger schema changes

### 3. Add a thin mobile admin insights surface
Use the existing mobile admin shell instead of building a separate client.

Add a new admin screen in the mobile app:
- `Market Insights`

The screen is read-only and should show:
- current live lineup preview
- next 7-day hero schedule
- last 7-day exposure summary by zone
- last 7-day exposure summary by tier
- under-served companies list

UI behavior:
- accessible only to admin/super-admin users
- wired into the existing admin tools/navigation path
- pull-to-refresh and standard loading/error/empty states
- no CRUD actions for tiers, zones, overrides, or company visibility in this milestone

### 4. Keep compatibility and rollout safe
- if `DIRECTORY_MARKET_FAIRNESS_ENABLED` is `False`, preserve current Milestone 3 ranking behavior exactly
- fairness changes affect only weighted company-zone ordering
- mixed public market feed remains behind the existing Milestone 3 rollout flags
- admin preview/report endpoints must function whether or not fairness is enabled, but their fairness-specific fields should reflect the current flag state

## API And Type Changes
Public APIs:
- no public contract changes in this milestone

Admin/backend:
- new settings:
  - `DIRECTORY_MARKET_FAIRNESS_ENABLED`
  - `DIRECTORY_MARKET_FAIRNESS_WINDOW_DAYS`
- extend `GET /admin/market-preview/` with:
  - `hero_days?: number`
  - `hero_schedule?: []`
- add:
  - `GET /admin/market-report/summary/?days=7`
  - `GET /admin/market-report/under-served/?days=7`

Mobile types:
- add admin preview/report response types for:
  - preview snapshot + hero schedule
  - exposure summary by zone/tier
  - under-served company entries

## Test Plan
Backend:
- fairness flag off preserves current weighted-zone ordering
- fairness flag on promotes under-served companies in `featured_companies` and `rising_companies`
- `pin`, `boost`, and `block` precedence still beats fairness logic
- inactive, hidden, or ineligible companies do not count toward deficit targets
- hero zone behavior remains unchanged when fairness is enabled
- preview endpoint returns deterministic hero schedules for requested future days
- preview endpoint still produces no writes
- summary report returns correct historical totals and selection-reason breakdown
- under-served report returns correct deficits and excludes satisfied companies
- existing public market feed tests continue to pass

Mobile:
- admin users can open the new Market Insights screen
- preview, summary, and under-served sections render from live API data
- loading, refresh, empty, and error states behave correctly
- non-admin users cannot access the screen

If there is still no frontend test harness for this area, use TypeScript validation plus a manual smoke checklist instead of introducing a new test framework here.

## Assumptions And Defaults
- The next milestone is backend fairness/reporting first, with only a thin read-only mobile admin surface.
- Fairness applies only to weighted company zones, not hero or latest-products rows.
- The fairness window is 7 days by default.
- Reporting remains company-level only; product-level exposure tracking stays deferred.
- Full management UI for tiers, zones, eligibility rules, overrides, and company visibility remains a later milestone.

# Milestone 3: Public Discovery Feed Completion

## Summary
Milestone 3 should finish the public Market experience on top of the new zone system by turning `GET /api/directory/market/` into a single mixed feed for companies, categories, and latest products.

This milestone will:
- keep the Milestone 2 company-zone backend intact
- add `latest_products` as a live product zone
- add a category rail into the same `rows[]` feed
- update the mobile Market screen to render mixed row types
- route latest product taps to the existing `ProductDetail` screen

This milestone will not include rolling-window fairness guarantees, reporting dashboards, exposure analytics expansion, or admin UI.

## Key Changes
### 1. Extend the public feed into a mixed `rows[]` contract
Keep `GET /api/directory/market/` as one endpoint and keep `rows[]` as the only top-level payload.

Use a discriminated row contract:
- `row_type="company_tier"`
  - existing company row behavior and existing company item shape stay unchanged
- `row_type="category_collection"`
  - `items` shape: `id`, `name`, `slug`, `icon_key`
- `row_type="product_collection"`
  - `items` shape: `id`, `title`, `image_url`, `purity`, `weight_grams`, `company_id`, `company_name`

Row metadata rules:
- company rows keep `zone_key` and `serving_mode`
- category row has `zone_key=null` and `serving_mode=null`
- latest products row uses `zone_key="latest_products"`

Feed order must be fixed and deterministic:
1. `hero_spotlight`
2. `featured_companies`
3. synthetic `category_collection`
4. `rising_companies`
5. `latest_products`

Empty rows should be omitted individually without breaking the rest of the screen.

### 2. Make `latest_products` a live zone and keep categories synthetic
Do not add a new model for categories in this milestone.

Backend changes:
- extend `MarketZone.ServingMode` with `latest_products`
- extend `MarketZone.Layout` with `grid_product`
- migrate the seeded `latest_products` zone to:
  - `serving_mode="latest_products"`
  - `layout="grid_product"`
- keep categories as a synthetic row built from active `ProductCategory` records, ordered by `display_order`, then `name`

Latest products selection rules:
- source from public products only
- product must be `is_active=True`
- company must be `is_active=True`, `is_approved=True`, `is_market_visible=True`
- company tier must be active
- order by `-created_at`, `-id`
- return up to `latest_products.capacity`
- no weighted ranking for products in this milestone
- no `PlacementOverride` behavior for products in this milestone

Exposure behavior:
- keep existing company exposure logging unchanged
- do not write `ExposureLedger` rows for categories or latest products in this milestone
- do not change the `ExposureLedger` schema yet

### 3. Add a safe rollout layer above the Milestone 2 feed
Introduce a new feature flag:
- `DIRECTORY_MARKET_MIXED_FEED_ENABLED`, default `False` outside production-safe rollout

Behavior:
- if the flag is `False`, preserve the current Milestone 2 response exactly
- if the flag is `True`, compose the mixed feed from:
  - existing zone-driven company rows
  - synthetic category row
  - live latest-products row
- if mixed-feed composition fails, log the failure and fall back to the current Milestone 2 payload

Do not remove the Milestone 2 `DIRECTORY_MARKET_ZONE_FEED_ENABLED` flag.
Do not remove `GET /api/directory/product-filter-config/`; the category row is a lightweight discovery rail, not a replacement for full filter metadata.

### 4. Update the mobile Market screen for mixed rows
Update mobile types so `MarketFeedData.rows[]` becomes a discriminated union by `row_type`.

Rendering rules:
- `company_tier`
  - keep existing hero, rail, and grid company cards
- `category_collection`
  - horizontal category rail with icon + label cards
- `product_collection`
  - two-column product grid using the latest products row

Navigation rules:
- company tap -> existing `ProductSearch` company-scoped flow
- category tap -> existing `ProductSearch` screen with `categoryName` set to the category slug
- latest product tap -> existing `ProductDetail` screen with `productId` and `companyId`

UI constraints:
- keep current loading, refresh, and empty-state behavior
- screen must remain usable when any one row type is empty
- do not add admin UI in this milestone

## API And Type Changes
Public market API:
- keep `rows[]` top-level
- allow row union:
  - `company_tier`
  - `category_collection`
  - `product_collection`

Type additions:
- `MarketCategoryCard`
  - `id`, `name`, `slug`, `icon_key`
- `MarketProductCard`
  - `id`, `title`, `image_url`, `purity`, `weight_grams`, `company_id`, `company_name`

Model/runtime additions:
- `MarketZone.serving_mode` adds `latest_products`
- `MarketZone.layout` adds `grid_product`

No admin API additions in this milestone.

## Test Plan
Backend:
- mixed feed returns all expected row types when enabled
- mixed feed preserves current Milestone 2 payload when the new flag is disabled
- mixed feed falls back to Milestone 2 payload on internal composition failure
- category row contains active categories in deterministic order
- latest products row contains only public-eligible products
- latest products row is ordered by newest first
- latest products row respects zone capacity
- empty category or product rows are omitted without breaking company rows
- existing company-zone tests still pass unchanged

Mobile:
- Market screen renders company, category, and product rows from one payload
- category tap opens `ProductSearch` with category scope
- latest product tap opens `ProductDetail`
- current company-row interactions still work
- screen remains stable when only some row types are present

If there is no established frontend test harness, use TypeScript compile validation plus a manual smoke checklist instead of introducing a new test framework in this milestone.

## Assumptions And Defaults
- Milestone 3 is the public discovery milestone, not the fairness/reporting milestone.
- Categories are not zone-managed yet; they are a synthetic row for now.
- Latest products become the first non-company live zone.
- Product exposure tracking is deferred until a product-aware ledger model is designed.
- Admin UI, rolling-window lower-tier guarantees, and reporting endpoints remain deferred to the following milestone.
mplemented Milestone 3 behind a new safe rollout flag.

What Changed
The market feed can now return a single mixed rows[] payload with company rows, a synthetic category rail, and a live latest_products row. The new composition lives in backend/apps/directory/views.py, with row builders in backend/apps/directory/services.py and mixed row serializers in backend/apps/directory/serializers.py. latest_products is now a real zone mode via backend/apps/directory/migrations/0009_market_mixed_feed_runtime.py, and the new rollout flag was added in backend/config/settings.py.

On mobile, frontend-mobile/src/types/api.ts now models discriminated market row types, and frontend-mobile/src/screens/directory/MarketTiersScreen.tsx renders:

company rows as before
category rows that open ProductSearch
product rows that open ProductDetail
The mixed feed only activates when both DIRECTORY_MARKET_ZONE_FEED_ENABLED=True and DIRECTORY_MARKET_MIXED_FEED_ENABLED=True. If mixed-feed composition fails, it falls back to the Milestone 2 zone-only payload, and if zone feed fails, it still falls back to legacy rows.

Tests
Added backend coverage in backend/apps/directory/tests.py for:

mixed feed row composition
mixed-feed fallback to zone-only
empty category/product row omission
latest-products ordering, capacity, and visibility filtering
Verified with:

backend\venv\Scripts\python.exe -m compileall backend\apps\directory backend\config
.\venv\Scripts\python.exe manage.py test apps.directory.tests
.\venv\Scripts\python.exe manage.py test apps.admin_ops.tests_seed
npm.cmd run lint
The fallback stack traces in the test run are expected from the intentional fallback tests. Unrelated existing local changes and untracked files were left alone.
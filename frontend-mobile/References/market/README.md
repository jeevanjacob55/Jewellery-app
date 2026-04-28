
# Market Screen Implementation Guide for Codex

## Goal

Implement the Market screen exactly based on the HTML reference designs placed in:


# 1. Market Screen Has 3 Main States

## State 1: Default Market Home

Reference:

frontend/references/market/market_home.html

This is the first screen users see when opening the Market tab.

Purpose:

- Showcase companies based on tiers
- Show categories
- Show latest products preview

Important:

This screen currently does NOT have a filter button in the reference design, but the implementation MUST add a filter button near the search bar.

Default screen sections:

1. Search bar
2. Filter button beside/near search bar
3. Featured Partners
4. Established Members
5. Directory
6. Categories
7. Latest Products preview
8. Bottom navigation

Behavior:

- Search bar placeholder: "Search products or companies..."
- Featured Partners are premium/highest-tier companies.
- Established Members are mid-tier/pro companies.
- Directory contains normal/basic companies.
- Latest Products is only a preview section, not the full product result mode.
- Tapping a category or searching should switch screen into Product Results mode.
- Tapping Filter opens the Filter Bottom Sheet.

---

## State 2: Product Results Screen

Reference:

frontend/references/market/market_results.html

This state appears when:

- User searches a product
- User taps a category
- User applies filters

Purpose:

Show actual products only.

Important:

When product search/filter mode is active, do NOT show:

- Featured Partners
- Established Members
- Directory
- Category showcase
- Latest Products preview section title

Instead show:

1. Header/search area
2. Filter button
3. Selected filter chips
4. Results count
5. Sort label
6. Two-column product grid

Product card should show:

- Product image
- Purity badge: 18K / 22K / 24K
- Company name
- Product name
- Weight
- Length or category-specific attribute
- Price if available
- Save/bookmark icon
- Add/plus button if present in design

Behavior:

- Selected filters appear as removable chips.
- User can remove individual filter chips.
- Product grid must be two columns.
- Product result mode must support scrolling.
- Bottom navigation remains visible.

---

## State 3: Empty Product Results

Reference:

frontend/references/market/market_empty.html

This state appears when:

- Search/filter returns zero products

Purpose:

Clearly explain that no products were found.

Show:

- Search bar
- Selected filter chips
- Empty illustration/card
- Text: "No products found"
- Helpful message based on search/filter
- Clear Filters button
- Recommended searches

Important:

Hide "Contact an Agent" for Phase 1.

Do NOT implement Contact an Agent button now.

Future enhancement only.

Behavior:

- Clear Filters button resets search + filters.
- After clearing filters, return to default Market Home state.
- Recommended search chips can trigger new search results.

---

# 2. Filter Bottom Sheet

Reference:

frontend/references/market/market_filter.html

This opens when user taps the Filter button.

Filter button must be available in:

- Default Market Home state
- Product Results state
- Empty Results state

Bottom sheet sections:

1. Category
2. Subcategory
3. Metal Purity
4. Dynamic category-specific attributes
5. Clear All button
6. Apply Filters button

---

# 3. Filter Logic

Filters must be dynamic and backend-driven.

Do not hardcode category-specific UI like:

```txt
if category == Chain then show Length
````

Instead:

* Backend provides category configuration.
* Frontend renders whatever attributes are returned for the selected category.

Example behavior:

```txt
Category: Chain
Show:
- Subcategories: Link Chain, Rope Chain, Box Chain, Figaro, Snake Chain
- Attribute: Chain Length

Category: Ring
Show:
- Attribute: Ring Size

Category: Coin
Show:
- Attribute: Weight

Category: Pure Gold
May have no subcategory.
```

If selected category has no subcategories:

* Hide Subcategory section completely.

If selected category has dynamic attributes:

* Render those attributes below purity.

---

# 4. Admin-Controlled Product Attribute System

The category, subcategory, purity, and dynamic attributes must be configurable by authorized admins.

Use this concept:

## Product Attribute System

Admin users with proper scope can manage:

* Product categories
* Product subcategories
* Product-specific attributes
* Attribute options
* Display order
* Active/inactive status

Examples:

```txt
Category: Chain
Attributes:
- Chain Length
- Weight

Category: Ring
Attributes:
- Ring Size
- Weight

Category: Bangle
Attributes:
- Bangle Size
- Weight

Category: Coin
Attributes:
- Weight
```

Super Admin has full control.

Scoped Product Admin can manage only allowed product configuration if such role exists.

---

# 5. Suggested Backend Tables

Use flexible tables. Do not make category-specific database columns for every attribute.

## ProductCategory

Fields:

* id
* name
* slug
* icon
* is_active
* display_order

## ProductSubCategory

Fields:

* id
* category
* name
* slug
* is_active
* display_order

## ProductAttributeDefinition

Fields:

* id
* category
* key
* label
* type
* options_json
* is_required
* is_active
* display_order

Example:

```txt
key: length
label: Chain Length
type: select
options_json: ["16 inch", "18 inch", "20 inch", "22 inch"]
```

## Product

Fields:

* id
* company
* category
* subcategory nullable
* title
* purity
* weight
* price nullable
* image
* description
* is_active
* created_at

## ProductAttributeValue

Fields:

* id
* product
* attribute_definition
* value

---

# 6. Required API Behavior

## Filter Config

Create endpoint:

```http
GET /api/products/filter-config/
```

Returns:

* categories
* subcategories
* purity options
* dynamic attributes for each category

Frontend uses this to render filter bottom sheet.

## Product Search

Create endpoint:

```http
GET /api/products/
```

Supports optional query params:

```txt
search
category
subcategory
purity
dynamic attributes like length, ring_size, weight
sort
```

Example:

```http
GET /api/products/?search=Gold Chain&category=chain&subcategory=link-chain&purity=22K&length=18-inch
```

Important:

* Missing filters should not break API.
* API should return empty list when no match.
* API should return result count.
* API should support two-column grid data.

---

# 7. Seed Data Required

Seed enough data to reproduce all 3 states.

## Companies

Create companies for:

### Featured Partners

* Aurum Collective
* Diamond Reserve
* Elite Bullion

### Established Members

* Vanguard Gems
* Royal Carats
* Artisan Guild
* Lustre Studio
* Supply Co.

### Directory

* Artisan Guild
* Lustre Studio
* Supply Co.

Each company should have:

* name
* logo/image
* tier: featured / established / normal
* display_order

## Categories

Seed:

* Rings
* Chains
* Bangles
* Necklaces
* Coins
* Pure Gold

## Chain Subcategories

Seed:

* Link Chain
* Rope Chain
* Box Chain
* Figaro
* Snake Chain

## Purity

Seed:

* 18K
* 22K
* 24K
* 999.9

## Attribute Definitions

### Chain

* Chain Length: 16 inch, 18 inch, 20 inch, 22 inch
* Weight

### Ring

* Ring Size
* Weight

### Bangle

* Bangle Size
* Weight

### Coin

* Weight

## Products

Seed products matching the reference:

* Curb Link Chain
* Pure Rope Chain
* Cuban Heavy Link Chain
* Snake Skin Chain
* Classic Gold Band
* Etoile Pendant
* Antiquity Bangles
* Legacy Bullion

Make sure some products match:

```txt
category = chain
purity = 22K
length = 18 inch
```

Also seed a case that returns no products for:

```txt
Rare Pink Argyle Diamond
Price: $50k+
Certified
In Stock
```

This is needed for empty-state testing.

---

# 8. Frontend Implementation Rules

## Market Home

Use reference:

frontend/references/market/market_home.html

Implement as:

* MarketScreen default mode
* Company sections visible
* Latest Products preview visible
* Search bar visible
* Add filter button even though reference does not show it

## Product Results

Use reference:

frontend/references/market/market_results.html

Implement as:

* Same MarketScreen component, but product mode active
* Company showcase hidden
* Product grid visible
* Filter chips visible
* Result count visible

## Empty Results

Use reference:

frontend/references/market/market_empty.html

Implement as:

* Product mode active
* Product grid replaced with empty state
* Contact Agent hidden
* Clear Filters visible

## Filter Modal

Use reference:

frontend/references/market/market_filter.html

Implement as:

* Bottom sheet
* Rounded top corners
* Drag handle
* Close button
* Fixed bottom action area
* Clear All + Apply Filters button

---

# 9. State Management

Market screen should maintain:

```txt
mode: "home" | "results" | "empty"

searchQuery
selectedCategory
selectedSubcategory
selectedPurity
selectedAttributes
selectedFilterChips
products
resultCount
isFilterOpen
isLoading
```

State rules:

```txt
Initial load:
mode = home

User searches:
fetch products
if products found -> mode = results
else -> mode = empty

User applies filters:
fetch products
if products found -> mode = results
else -> mode = empty

User clears filters:
reset all filters
mode = home
```

---

# 10. Critical UX Rules

* Do not show company showcase in Product Results mode.
* Do not show product result header in Market Home mode.
* Filter button must be accessible from all states.
* Search should search both products and companies from home, but once product search is active, show product results only.
* Selected filters must appear as chips.
* Chips should be removable.
* Clear Filters returns to Market Home.
* Contact Agent remains hidden in Phase 1.

---

# 11. Visual Accuracy Instructions

The HTML files in frontend/references/market/ are the visual source of truth.

Follow them for:

* spacing
* typography
* card sizes
* border radius
* shadows
* gold accent color
* white/luxury background
* bottom navigation placement
* search bar style
* product card style
* filter modal layout

Do not redesign the screen.

Convert the HTML reference designs into React Native components as closely as possible.

---

# 12. Suggested React Native Components

Create or update:

```txt
MarketScreen.tsx
MarketHomeSections.tsx
ProductResultsView.tsx
ProductEmptyState.tsx
MarketFilterBottomSheet.tsx
ProductCard.tsx
CompanyFeaturedCard.tsx
CompanyGridCard.tsx
DirectoryItem.tsx
FilterChip.tsx
CategoryIconCard.tsx
```

---

# 13. Final Expected Behavior

The final implementation should behave like this:

```txt
User opens Market tab
→ sees company showcase screen

User searches "Gold Chain"
→ sees product results screen with chain products

User taps filter
→ filter bottom sheet opens

User selects Chain + 22K + 18 inch
→ applies filters
→ sees two-column product grid

User searches rare item with no result
→ sees empty state

User taps Clear Filters
→ returns to default Market showcase
```

---

# 14. Do Not Do

Do NOT:

* Hardcode all filter options in frontend
* Keep filter button missing from Market home
* Show Contact Agent button in Phase 1
* Mix company showcase with product result mode
* Use separate unrelated screens for each state unless navigation already requires it
* Ignore the HTML reference files
* Redesign the UI from scratch

```

This README will give Codex the exact workflow and prevent it from mixing up the showcase screen, result screen, empty state, and filter modal.
```

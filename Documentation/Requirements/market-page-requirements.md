# Market Page Requirements

## Purpose

The Market page is the discovery and lead-generation layer of the platform. It helps members and public users browse featured companies, business categories, and recent products in a way that feels modern, curated, and commercially useful.

## Primary Users

- Guest user browsing suppliers
- Member sourcing products or companies
- Admin validating public market content

## Product Goal

Help users discover businesses and inventory quickly through a visually strong, mobile-first marketplace screen.

## Ideal Product Approach

- Use a single market-feed endpoint for the first screen load.
- Prioritize visual browsing before deep filtering.
- Keep top navigation anchored around search, featured partners, categories, and latest products.
- Separate premium visibility from organic visibility in a transparent way.

## Core Functional Requirements

### Sticky Search Header

- Search field stays visible while scrolling.
- Search submission routes to product/company search results.
- Search must support:
  - product name
  - company name
  - category term

### Featured Partners

- Show premium companies as large visual cards.
- Each card should include:
  - hero image
  - logo
  - company name
  - location
  - primary CTA
- CTA should route to a company-scoped product view or company profile.

### Established Members Section

- Show Pro-tier companies in grouped visual cards.
- Cards must feel premium but denser than featured partners.
- Layout spacing must adapt across phone widths.

### Directory Rail

- Show normal-tier companies in a lighter-weight horizontal browse format.
- Each item should include:
  - logo or fallback initials
  - company name

### Category Rail

- Show public product categories with iconography.
- Tapping a category applies a scoped search/filter.

### Latest Products Grid

- Show newest relevant products in a two-column grid.
- Each product card should include:
  - image
  - title
  - purity
  - weight
  - company name

## Content Rules

- Featured visibility comes from premium companies in V1.
- Pro and normal tiers remain organic directory content.
- Products should only be shown if they are eligible for public display.
- Missing images must degrade to clean placeholders.

## Backend Requirements

- Primary endpoint: `GET /api/directory/market/`
- Required sections:
  - `featured_partners`
  - `pro_companies`
  - `normal_companies`
  - `categories`
  - `latest_products`
- Market payload should be fully mobile-ready and not require additional composition for first render.

## Navigation Requirements

- Featured partner tap -> Company Profile
- Featured CTA -> Product Search scoped to company
- Pro/normal company tap -> Company Profile
- Category tap -> Product Search scoped to category
- Product tap -> Product Search scoped to product/company

## Mobile Requirements

- Safe-area compliant top spacing.
- Independent horizontal scrolling for all rails.
- Vertical parent list must remain smooth during mixed content rendering.
- Bottom tab bar must always keep `Market` visibly active.

## Non-Functional Requirements

- The initial market payload should be optimized for a responsive first render.
- Market images should use seeded/public preview URLs in demo mode.
- Empty sections must not block the rest of the screen.

## Admin / Moderation Considerations

- Premium and Pro tiering must be manageable from admin tooling.
- Public image moderation status should eventually gate market visibility.
- Search ranking rules should remain transparent and configurable.

## Acceptance Criteria

- User can open Market and see all five content sections from one request.
- Search input works on all device sizes.
- Category and product taps route to meaningful scoped results.
- The screen remains usable even if one or more sections are empty.

## Future Enhancements

- Search suggestions
- Saved searches
- Sponsored placements mixed into feed
- Product detail screen
- Infinite scroll and pagination

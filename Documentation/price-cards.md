
# Price Cards UI Implementation Notes

Reference files:

- `frontend/references/price-cards/pricedetail.html`
- `frontend/references/price-cards/associations_view.html`
- `frontend/references/price-cards/other_states.html`

## Main Instruction

Follow the visual design of the HTML reference files as strictly as possible.

The HTML files are the source of truth for:

- layout
- spacing
- card structure
- typography hierarchy
- colours
- icons/visual feel
- section order
- CTA placement

However, backend/API/data-model implementation notes are only suggestions. Adapt backend wiring to the existing project architecture.

---

## Frontend Priority

### Must closely match the references

1. `pricedetail.html`
   - Rate Details screen should visually match the provided design.
   - Preserve the hero card, rate group cards, notice card, and bottom navigation feel.

2. `associations_view.html`
   - Other Associations screen should visually match the provided compact table-card design.
   - Preserve search bar, card layout, trend column, and bottom banner style.

3. `other_states.html`
   - Other States screen should visually match the provided state-tab design.
   - Preserve horizontal tabs, large association cards, headline rate layout, and View Details CTA.

---

## User Flow

```txt
Dashboard
 ├── Other Associations
 │    └── associations_view.html style screen
 │         └── Tap card / View Details
 │              └── pricedetail.html style screen
 │
 └── Other States
      └── other_states.html style screen
           └── Select state tab
           └── Tap card / View Details
                └── pricedetail.html style screen
````

---

## Backend / Data Handling Guidance

Treat these as suggestions, not strict rules.

* Prefer fetching details by `associationId`.
* Prefer dynamic rate groups for the detail screen.
* Avoid hardcoding Diamond, Platinum, etc. if backend already supports flexible categories.
* If flexible categories are not ready, use the current backend shape and map it cleanly to the UI.
* Missing categories should ideally be hidden instead of showing empty cards.
* Compact cards can prioritize:

  * Gold 22K
  * Gold 24K
  * Silver

---

## Visual Matching Rules

These are important.

* Do not redesign the screens unless required by existing app constraints.
* Do not replace the reference layout with a generic list UI.
* Do not simplify the cards too much.
* Keep the premium spacing and clean card style.
* Preserve the visual difference between:

  * compact association cards
  * other-state market cards
  * full rate detail cards
* Keep the mobile-first layout.
* Preserve safe-area spacing.
* Use existing app navigation/components only where they do not damage the visual match.

---

## Suggested Components

Codex may adapt component names.

```txt
PriceSearchBar
StateTabs
AssociationCompactCard
AssociationStateCard
RateDetailsHeroCard
RateGroupCard
RateRow
TrendIndicator
NoticeCard
LoadingSkeleton
EmptyState
ErrorState
```

---

## Expected Result

The final implementation should feel like the provided HTML designs were converted into the app screens, while backend/API details are adapted intelligently to the current project.

```
```

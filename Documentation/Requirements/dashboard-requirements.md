# Dashboard Requirements

## Purpose

The dashboard is the primary member landing screen. It should act as a daily command center for association rates, market context, urgent updates, and fast navigation into deeper tools.

## Primary Users

- Verified member
- Guest user with limited access
- Admin using the member-facing app for sanity checks

## Product Goal

Help users answer these questions within the first 10 seconds:

- What are today's important rates?
- What has changed since the last update?
- Is there any urgent association notice?
- Where do I go next for market, news, services, or comparisons?

## Ideal Product Approach

- Use one aggregate dashboard endpoint for all high-priority dashboard data.
- Keep the layout scan-friendly and card-based.
- Treat the hero area as a status surface, not a marketing banner.
- Keep urgent alerts and time-sensitive content above secondary content.
- Make the dashboard useful even when some sections fail independently.

## Core Functional Requirements

### Header

- Show current association name for authenticated members.
- Fall back to platform or regional label for guests.
- Show last-updated label.
- Show notification entry point.

### Rate Summary

- Show headline rates for:
  - Gold 22K
  - Gold 24K
  - Silver
- Each rate must include:
  - current value
  - movement direction
  - human-readable recency

### Quick Actions

- Provide fast entry points to:
  - other associations
  - other states
  - market
  - services
  - news
- Actions must be tappable with a minimum 44x44 target.

### Alert / Banner Block

- Reserve a prominent slot for the most important active notice.
- If there is no urgent notice, the slot may show:
  - featured member benefit
  - approved advertisement
  - association campaign
- The fallback logic must be deterministic.

### News And Updates

- Show latest urgent alert.
- Show upcoming meetings when available.
- Show at least 2-3 recent updates in a compact list.
- Tapping any item should route to the full News screen.

### Market Context

- Dashboard may optionally include a lightweight market teaser:
  - featured partner
  - latest product preview
  - CTA to the Market tab
- This must not duplicate the full Market screen.

## Access Rules

- Authenticated members see association-scoped data when available.
- Guests may see public/global rates and public news only.
- Admins using the mobile app see the same data shape unless an admin mode is introduced later.

## Backend Requirements

- Primary endpoint: `GET /api/dashboard/`
- Recommended response groups:
  - `association`
  - `updated_at_label`
  - `headline_rates`
  - `comparisons`
  - `other_associations`
  - `global_trends`
  - `quick_actions`
  - `featured_banner`
  - `summary_updates`

## Mobile Requirements

- Safe-area aware header and hero section.
- Fast first paint with skeleton or loading state.
- Pull-to-refresh.
- Graceful partial rendering when one content block fails.
- No nested vertical scrolls.

## Non-Functional Requirements

- Time to meaningful content should feel under 2 seconds on seeded local/demo environments.
- Dashboard payload should remain compact enough for mobile startup.
- The design must scale cleanly across small Android phones and iPhones with cutouts.

## Analytics Recommendations

- Track dashboard view.
- Track quick-action taps.
- Track banner CTR.
- Track news item taps.
- Track pull-to-refresh.

## Acceptance Criteria

- A member can open the app and immediately see association name, rates, and at least one update block.
- A guest can access a public-safe dashboard without authentication errors.
- Missing banner or missing news must not break the screen.
- Dashboard content must be refreshable without app restart.

## Future Enhancements

- Personalized watchlists
- Rate alert subscriptions
- Saved market searches
- Admin-configurable dashboard modules

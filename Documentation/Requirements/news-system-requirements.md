# News System Requirements

## Purpose

The news system is the official communication layer for alerts, notices, meetings, and broader association updates.

## Primary Users

- Member
- Guest user
- Admin/content manager

## Product Goal

Ensure users can quickly understand what is urgent, what is upcoming, and what is informational, with the correct regional relevance and publishing controls.

## Ideal Product Approach

- Treat urgent alerts, standard news, and meetings as related but distinct content types.
- Keep one mobile feed endpoint that assembles the most important items into a user-friendly structure.
- Support both public and scoped content.

## Content Types

### Alerts

- Short, high-priority notices.
- Used for urgent regulatory, compliance, or association-wide updates.
- May include severity.

### News Items

- Standard editorial or operational updates.
- May include title, summary, body, image, and publication timestamp.

### Meetings / Events

- Time-bound association events.
- Include venue and calendar or RSVP action.

## Core Functional Requirements

### Feed Experience

- Show one urgent alert block at the top when active.
- Show a recent news list.
- Show upcoming meetings.
- Support tap-through into deeper detail or event actions.

### Publishing

- Admin/content editors can create, update, publish, unpublish, and archive content.
- Publishing state should be explicit.

### Scoping

- Content may be:
  - global
  - state-scoped
  - association-scoped
  - district/unit scoped in the future
- Public-safe content may be visible to guests.

### Prioritization

- Urgent alerts outrank all other content.
- Upcoming meetings should be ordered by start time.
- News items should be ordered by publication date.

## Backend Requirements

Recommended mobile endpoint:

- `GET /api/news/`

Recommended response groups:

- `urgent_alert`
- `meetings`
- `news_items`
- `ticker`

Recommended management endpoints:

- `POST /api/admin/news-items/`
- `PATCH /api/admin/news-items/{id}/`
- `POST /api/admin/alerts/`
- `POST /api/admin/meetings/`

## Mobile Requirements

- News screen should support both summary scan and deeper reading.
- Dashboard can consume only a compact subset of the feed.
- Empty states should communicate "no active alerts" or "no upcoming meetings" clearly.

## Editorial Requirements

- Headlines must be concise and useful.
- Summaries should be readable in list form.
- Urgent labels and severity styles must be consistent.
- Meetings must expose actionable metadata such as venue and calendar URL.

## Acceptance Criteria

- Users can see urgent alert, meetings, and recent updates from a single feed.
- Admin-published content appears in correct order.
- Guests do not see restricted content.
- No active alert state renders cleanly.

## Future Enhancements

- Rich article detail pages
- Attachments and PDFs
- RSVP and attendance tracking
- Per-topic news subscriptions

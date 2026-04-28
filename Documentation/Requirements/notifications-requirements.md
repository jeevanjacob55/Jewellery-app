# Notifications Requirements

## Purpose

The notification system keeps users informed about important changes without requiring them to constantly open and inspect every screen manually.

## Primary Users

- Member
- Guest user with limited notification capabilities
- Admin configuring or triggering important communications

## Product Goal

Deliver the right message to the right user at the right time with clear preference controls and minimal noise.

## Ideal Product Approach

- Start with preference-driven, event-based notifications.
- Support in-app notification surfaces first.
- Add push delivery only for high-value, clearly scoped events.
- Make notification settings simple and understandable.

## Notification Categories

- Rate alerts
- News alerts
- Advertisement updates
- Meeting reminders
- System/account notifications

## Current Preference Model

The current domain already supports:

- `rate_alerts`
- `news_alerts`
- `ad_alerts`
- `meeting_alerts`

This should remain the initial preference surface while the delivery engine evolves.

## Core Functional Requirements

### Preference Management

- Users can enable or disable notification categories.
- Preferences must be persisted server-side.
- Preferences should sync to the mobile app after login and on profile refresh.

### In-App Notification Surface

- Show notification entry point in dashboard/header.
- Support unread indicator.
- Support notification list with read/unread state.

### Event Triggers

The system should eventually generate notifications for:

- significant association rate change
- urgent alert published
- meeting scheduled or approaching
- approved member-relevant advertisement
- account or access-request status update

### Delivery Rules

- Only send categories the user has opted into.
- Respect scope:
  - global
  - state
  - association
  - district/unit when applicable
- Urgent notifications may bypass lower-priority digest rules but should still respect permission boundaries.

## Backend Requirements

Recommended endpoints:

- `GET /api/me/preferences/`
- `PATCH /api/me/preferences/`
- `GET /api/notifications/`
- `POST /api/notifications/{id}/read/`

Recommended internal services:

- event-to-notification mapper
- delivery channel router
- read-state tracker

## Mobile Requirements

- Notification icon should be visible in high-value screens such as Dashboard.
- Preferences should be editable in profile/settings.
- Empty notification list should explain that alerts will appear here when available.

## Push Notification Strategy

### V1

- In-app only
- Optional local badge/count support

### V2

- Expo push tokens / FCM/APNs pipeline
- background delivery for urgent and opted-in categories

## Governance Requirements

- Notification history should be auditable.
- Platform should prevent duplicate sends for the same event/user/category combination.
- Delivery failures should be observable in logs or admin reporting.

## Acceptance Criteria

- User can update preferences and see them persist.
- Important events can be surfaced in-app according to preference rules.
- Notification center can show empty, unread, and read states correctly.
- Scoped content only reaches eligible users.

## Future Enhancements

- Notification digests
- Silent data refresh triggers
- Admin broadcast composer
- Fine-grained topic subscriptions

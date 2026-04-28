# Company Login And Association Hierarchy Requirements

## Purpose

This system governs how users enter the platform, how access is scoped, and how business users map into the state -> association -> district unit -> unit hierarchy.

## Primary Users

- Verified member
- Guest user
- New business requesting access
- Admin approving access

## Product Goal

Ensure the platform is easy to access for legitimate users while preserving correct regional and association scoping for content, permissions, and reporting.

## Ideal Product Approach

- Keep login simple on mobile.
- Allow guest access for public-safe exploration.
- Make member onboarding request-driven and hierarchy-aware.
- Treat the association hierarchy as a foundational domain model shared across login, rates, news, ads, and notifications.

## User Modes

### Member Login

- Username/password login must remain the primary supported path.
- Login should return:
  - auth tokens
  - user profile
  - member profile
  - notification preferences

### Guest Access

- Guest can continue without full authentication.
- Guest must provide:
  - name
  - state
  - optional deeper hierarchy selections
- Guest access must only unlock public features.

### Member Access Request

- Non-member business users can request access from the login screen.
- Required request fields:
  - full name
  - phone number
  - email
  - business name
  - state
  - association
  - district operational unit
  - unit
  - optional notes

## Association Hierarchy Model

### Structure

- State
- Association
- District Operational Unit
- Unit

### Rules

- Every association belongs to one state.
- Every district operational unit belongs to one association.
- Every unit belongs to one district operational unit.
- User selections must cascade downward.
- Invalid cross-branch combinations must be rejected at backend validation level.

## Functional Requirements

### Region Loading

- Mobile app should load hierarchy from a public endpoint.
- Data should be returned in a nested format suitable for selection UIs.

### Member Profile

- Verified members should store hierarchy references in their profile.
- The selected hierarchy should drive:
  - dashboard association context
  - relevant news and meetings
  - advertisement targeting eligibility
  - notification routing

### Admin Scope

- Admin users may be scoped to:
  - association
  - district operational unit
  - unit
- Admin scope must restrict approval and content actions to the permitted region branch.

## Backend Requirements

- Login endpoint
- Guest access endpoint
- Member access request endpoint
- Public hierarchy endpoint
- Admin approval workflow for requests

Recommended public hierarchy endpoint:

- `GET /api/regions/`

Recommended auth and access endpoints:

- `POST /api/auth/login/`
- `POST /api/auth/guest-access/`
- `POST /api/auth/member-access-request/`

## UX Requirements

- Member and Guest modes should be visually distinct but on the same screen.
- Hierarchy selectors should only reveal the next level when the parent level is selected.
- Access request modal/screen must be scrollable and safe-area aware.
- Validation messages should explain what is missing in plain language.

## Security Requirements

- Member endpoints require valid auth tokens.
- Guest sessions must not receive privileged permissions.
- Access requests must be auditable and rate-limited in production.
- Password recovery and MFA should be planned even if deferred in V1.

## Acceptance Criteria

- Member can sign in and see the correct association-scoped experience.
- Guest can enter the app without a hard login block.
- New user can submit a full hierarchy-based access request.
- Invalid hierarchy combinations are rejected server-side.

## Future Enhancements

- OTP-based login
- SSO / Google login
- Multi-company user support
- Branch-switching for multi-location businesses

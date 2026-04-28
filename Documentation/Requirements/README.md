# Product Requirements Index

This folder contains implementation-oriented requirement documents for the core member-facing and admin-facing systems in the Jewellery Association platform.

Each document is written to serve three purposes:

1. Define the business goal and user value clearly.
2. Describe the ideal product approach for the current codebase.
3. Provide enough functional and technical direction for backend, mobile, admin, and QA work.

## Documents

- [dashboard-requirements.md](/abs/path/d:/Jewellery%20app/Jewellery-app/Documentation/Requirements/dashboard-requirements.md)
- [market-page-requirements.md](/abs/path/d:/Jewellery%20app/Jewellery-app/Documentation/Requirements/market-page-requirements.md)
- [company-login-association-hierarchy-requirements.md](/abs/path/d:/Jewellery%20app/Jewellery-app/Documentation/Requirements/company-login-association-hierarchy-requirements.md)
- [advertisement-system-requirements.md](/abs/path/d:/Jewellery%20app/Jewellery-app/Documentation/Requirements/advertisement-system-requirements.md)
- [news-system-requirements.md](/abs/path/d:/Jewellery%20app/Jewellery-app/Documentation/Requirements/news-system-requirements.md)
- [notifications-requirements.md](/abs/path/d:/Jewellery%20app/Jewellery-app/Documentation/Requirements/notifications-requirements.md)

## Recommended Reading Order

1. Company Login And Association Hierarchy
2. Dashboard
3. Market Page
4. News System
5. Notifications
6. Advertisement System

## Shared Product Principles

- Mobile-first execution with Expo / React Native.
- Clear association-scoped experiences for members and admins.
- Public browsing allowed where low-risk and high-value.
- Admin workflows must be auditable.
- Data should be served through aggregate endpoints for mobile screens when the screen depends on multiple domain objects.
- Empty states, partial-content states, and offline failure states must be designed intentionally.
- Safe-area compliance is mandatory on all mobile screens.

## Shared Technical Principles

- Django + DRF remains the source of truth for business rules.
- React Native clients should prefer typed aggregate payloads over stitching together many dependent requests on screen load.
- Seed data should support realistic demonstrations for every major screen and workflow.
- Feature flags or staged rollout controls should be preferred for unfinished high-impact systems such as ads and notifications.

# Web Admin Documentation

This folder defines the planned information architecture for the `web-admin` console.

The admin console should be a desktop-first, sidebar-based application with role-aware navigation.
It should support platform admins, scoped regional admins, and later lighter portals for company admins and advertisers.

## Documents

- `sitemap.md`
  Screen-by-screen sitemap, routes, sidebar structure, and page-level responsibilities.

- `role-access-matrix.md`
  Which roles can see which modules, and what level of control each role should have.

- `components.md`
  Shared web-admin UI components and patterns that should be reused across screens.

## Product Direction

- One main admin console for `super_admin` and scoped regional admins.
- Scope-aware data visibility for `state_admin`, `association_admin`, `district_admin`, and `unit_admin`.
- Company admins should use a lighter company portal instead of the full platform admin console.
- Advertisers should eventually use a separate advertiser portal for campaigns and reporting.

## Primary Admin Modules

- Overview
- Approvals
- Analytics
- Rate System
- Advertisements
- Market & Products
- Users
- News & Meetings
- Hierarchy
- Audit Logs
- Settings

## MVP Build Order

1. Overview
2. Approvals
3. Users
4. Rate System
5. Advertisements
6. Market & Products
7. News & Meetings
8. Hierarchy
9. Audit Logs


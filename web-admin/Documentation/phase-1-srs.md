# Web Admin Phase 1 SRS

## 1. Purpose

This document defines the **Phase 1 software requirements** for the Jewellery Association **web admin**.

The goal of Phase 1 is to deliver a practical admin console for the highest-value operational work:

- reviewing and acting on pending approvals
- managing market companies and products
- publishing and maintaining rates
- creating and controlling news and meetings
- handling core user and access administration

This phase should stay intentionally narrow. It is not the final platform vision. It is the first usable admin system.

## 2. Phase 1 Product Goal

Phase 1 should give admins a reliable desktop web interface where they can run the core business workflows that keep the mobile product operational.

The system should prioritize:

- clarity over complexity
- fast review workflows
- scope-aware admin access
- strong operational utility
- minimal training cost

## 3. Phase 1 Scope Summary

Phase 1 includes these modules:

1. Admin authentication and app shell
2. Overview dashboard
3. Approvals queue
4. Rates management
5. Market management
6. News and meetings management
7. User and access-request management

Phase 1 does **not** include advanced analytics, ad management, market exposure tuning, or complex system configuration.

## 4. Users And Roles

Phase 1 should support these roles in the web admin UI:

- `super_admin`
- `state_admin`
- `association_admin`

Phase 1 assumptions:

- `super_admin` has full access to all Phase 1 modules
- scoped admins only see data and actions inside their allowed scope
- `company_admin` and `advertiser` do not use this console in Phase 1

## 5. Core Product Principles

- Desktop-first admin experience
- Clean, table-oriented workflows
- Strong visibility of current scope
- Fast access to pending operational work
- Safe defaults for approval and publishing actions
- Minimal clicks for high-frequency tasks

## 6. Functional Requirements

## 6.1 Authentication And App Shell

### Goal

Provide a secure admin entry point and a consistent application shell.

### Requirements

- Admin users must be able to sign in to the web admin.
- The app must show a persistent left sidebar and top header.
- The top header must show:
  - page title
  - current admin scope
  - current admin identity
- The sidebar must expose only Phase 1 modules.
- Unauthorized users must not be able to access admin pages.
- Scoped admins must clearly see their active scope on every page.

### Phase 1 Navigation

- `/admin/overview`
- `/admin/approvals`
- `/admin/rates`
- `/admin/market`
- `/admin/content`
- `/admin/users`

## 6.2 Overview Dashboard

### Goal

Give admins one landing page that highlights urgent operational work.

### Requirements

- The overview page must be the default admin landing page.
- It must show high-value KPI cards:
  - pending approvals
  - active companies
  - active products
  - published news count
  - upcoming meetings count
  - rate freshness / last update state
- It must show a pending work section with links to the relevant queue pages.
- It must show a recent activity summary for important admin actions and publishing events.
- It must show quick actions for the most common workflows:
  - review approvals
  - update rates
  - add company/product content
  - create news
  - create meeting

### Non-goals For Phase 1

- trend analytics
- comparison charts
- operational forecasting

## 6.3 Approvals Queue

### Goal

Centralize approval work that affects platform readiness and trust.

### Requirements

- The system must provide a unified approvals area.
- Phase 1 approvals must cover:
  - member access requests
  - company approval / activation
  - product approval / moderation
  - news approval
  - meeting approval
- Each queue must support:
  - list view
  - status filter
  - scope-aware filtering
  - open detail panel or page
  - approve action
  - reject action
- Each approval record must show:
  - item identity
  - submitting user or owner
  - scope
  - submitted time
  - current status
- Approval detail must show enough context to make a decision without opening many extra screens.

### Minimum Actions

- approve
- reject
- view details

### Not Required In Phase 1

- reviewer assignment workflows
- request-changes workflow
- batch approvals
- SLA tracking

## 6.4 Rates Management

### Goal

Allow admins to keep official rates current and publishable.

### Requirements

- Admins must be able to view the current active rates.
- Admins must be able to create or update rate entries.
- Admins must be able to mark a rate update as the current official value.
- Admins must be able to see:
  - metal type
  - value
  - source
  - updated time
  - editor
- The rates page must support filtering by scope where applicable.
- The rates page must highlight stale or missing values.

### Minimum Phase 1 Views

- current rates dashboard
- rates list/history table
- rate edit/create form

### Not Required In Phase 1

- automated imports
- external feed orchestration
- advanced comparisons
- trend dashboards

## 6.5 Market Management

### Goal

Allow admins to control company and product visibility in the market experience.

### Requirements

- Admins must be able to list and inspect companies.
- Admins must be able to:
  - approve company visibility
  - deactivate a company
  - view company tier
  - inspect product count
- Admins must be able to list and inspect products.
- Admins must be able to:
  - approve products
  - deactivate products
  - edit basic product metadata
  - inspect product images and details
- Admins must be able to manage categories and subcategories at a basic CRUD level.

### Minimum Company List Columns

- company name
- scope / state / association
- tier
- visibility status
- approval status
- product count

### Minimum Product List Columns

- product title
- company
- category
- status
- updated time

### Minimum Phase 1 Forms

- company quick edit
- product quick edit
- category create/edit
- subcategory create/edit

### Not Required In Phase 1

- market zones
- market rows editor
- placement overrides
- tier pricing engine
- exposure fairness controls
- advanced merchandising controls

## 6.6 News And Meetings Management

### Goal

Give admins a single content workflow for important association communication.

### Requirements

- Admins must be able to list news items.
- Admins must be able to create, edit, publish, and archive news.
- Admins must be able to list meetings.
- Admins must be able to create, edit, publish, and cancel meetings.
- Content listings must support:
  - status filters
  - scope filters
  - author / owner visibility
- Forms must include only the fields needed for Phase 1 publishing.

### Minimum News Fields

- headline
- summary
- body
- cover image
- scope
- status

### Minimum Meeting Fields

- title
- description
- organizer scope
- venue or online link
- date and time
- status

### Not Required In Phase 1

- advanced content scheduling
- multi-stage editorial workflow
- content templates
- attendance analytics

## 6.7 User And Access Management

### Goal

Give admins visibility into who is on the platform and who is waiting to join.

### Requirements

- Admins must be able to list users in scope.
- The system must support a dedicated access-request view.
- Admins must be able to inspect:
  - member identity
  - role
  - scope
  - verification state
  - linked company if applicable
- Admins must be able to:
  - approve access requests
  - reject access requests
  - activate or deactivate a user
  - inspect profile details

### Minimum User List Columns

- name
- phone or email
- role
- scope
- status
- joined / submitted date

### Not Required In Phase 1

- role editor for every possible role
- bulk import
- bulk assignment
- impersonation

## 7. Shared UX Requirements

- Every module must support loading, empty, and error states.
- List pages must be optimized for scanning.
- Detail inspection should prefer drawer or modal patterns where practical.
- Destructive or important actions must require explicit confirmation.
- Success and failure feedback must be clear and immediate.
- Filters must be simple and high-value only.
- No page should depend on advanced charts to be usable.

## 8. Shared Data And Permission Rules

- All visible data must respect admin scope.
- Scoped admins must never be able to browse outside allowed hierarchy through UI filters.
- Approval and publish actions must respect backend authorization.
- Status labels must be consistent across modules.
- Records must expose enough metadata for admins to understand ownership and scope.

## 9. Non-Functional Requirements

- The web admin must be usable on common laptop and desktop widths.
- Phase 1 should optimize for Chrome-class modern browsers.
- Pages should feel responsive under normal operational loads.
- Core admin lists must be readable without excessive visual noise.
- The interface should follow a practical enterprise admin pattern, not a marketing-site pattern.

## 10. Out Of Scope For Phase 1

The following must be deferred:

- advanced analytics dashboards
- advertisement campaign management
- reverse-search operations console
- audit log explorer
- notification center
- hierarchy management console
- platform settings module
- market zone management
- market row composition editor
- placement override tooling
- company portal
- advertiser portal
- advanced workflow automation

## 11. Phase 1 Success Criteria

Phase 1 is successful when admins can:

1. sign in and reach a stable admin shell
2. see pending operational work from the overview page
3. approve or reject access, company, product, news, and meeting items
4. maintain official rates without needing engineering help
5. manage company and product visibility for the market experience
6. publish core association news and meetings
7. inspect and manage users within their allowed scope

## 12. Recommended Implementation Order

1. Authentication and app shell
2. Overview dashboard
3. Approvals queue
4. Rates management
5. Market management
6. News and meetings management
7. User and access management

This order gives the project a usable admin backbone early, then layers on the workflows that most directly affect the member-facing app.

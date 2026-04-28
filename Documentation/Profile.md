# Profile Page – Flexible Implementation Notes

## Purpose

Implement a clean, role-aware **Profile Page** for the Jewellery Platform Android app.

The Profile Page should act as a user control center showing:

* Who the user is
* Which association they belong to
* Which company they are connected to, if any
* What actions they are allowed to perform
* Their current company tier/product usage, if applicable
* Basic account/settings/support navigation

This guide is intentionally written as **implementation notes**, not strict rules. Codex can adapt model names, API structure, navigation, and UI components based on the existing codebase.

---

## 1. Product Intent

The Profile Page should not be just an edit form.

It should answer:

```text
Who am I?
Where do I belong?
What can I do?
What should I manage?
```

Recommended structure:

```text
Main Profile Page = identity + status + important actions
Profile Drawer/Menu = settings + secondary actions
```

---

## 2. Main Profile Page Layout

Suggested layout:

```text
------------------------------------------------
| PROFILE HEADER                               |
| [Avatar] User Name                           |
| Role • Location                              |
| Company Name optional                        |
| Association Name optional                    |
| Small edit icon optional                     |
------------------------------------------------

------------------------------------------------
| COMPANY CARD optional                        |
| Company Name                                 |
| Current Tier / Plan                          |
| Products Used: X / Limit                     |
| [Manage Products] / [View Products] [View Plan] |
------------------------------------------------

------------------------------------------------
| ASSOCIATION CARD optional                    |
| Association Name                             |
| Unit / District / Local info                 |
| Membership Status                            |
------------------------------------------------

------------------------------------------------
| ADMIN CARD optional                          |
| Admin Role                                   |
| Scope                                        |
| [Open Admin Panel]                           |
------------------------------------------------

------------------------------------------------
| QUICK ACTIONS                                |
| Manage Products / Meetings / News etc.       |
------------------------------------------------
```

---

## 3. Profile Header

Suggested data:

```text
- profile_photo/avatar
- full_name
- primary_role_label
- location_label
- company_name optional
- association_name optional
```

Suggested behavior:

* Show a small edit icon in the header if profile editing is supported.
* Do not make “Edit Profile” a large primary action on the main page.
* Keep account editing inside the Account/Profile menu as a secondary action.

Example:

```text
[Avatar] Ravi Kumar
Company Admin • Thrissur
ABC Jewellers
AKGSMA
```

---

## 4. Company Card

Show the Company Card only if the logged-in user is linked to at least one company.

Suggested fields:

```text
- company_name
- current_tier_name
- products_used
- max_products
- visibility_type optional
- company_status optional
```

Example:

```text
ABC Jewellers
Prime Elite Plan
Products: 5 / 7
[Manage Products] [View Plan]
```

---

## 5. Company Card Permissions

Actions must be permission-driven.

Suggested logic:

```text
If user is company_admin for this company:
    show Manage Products
    show View Plan

If user is company_manager and managers are allowed to manage products:
    show Manage Products
    show View Plan

If user is company_viewer or regular company staff:
    show View Products
    show View Plan

If user is not linked to company:
    hide Company Card
```

Important:

```text
Do not show buttons the user cannot use.
```

Avoid disabled buttons unless there is a strong UX reason.

---

## 6. View Plan / Tier Details Screen

This screen should show company plan details but should not allow direct self-upgrade in Phase 1.

Suggested content:

```text
Plan: Prime Elite

Limits:
- Max Products: 7
- Photos per product: 3–5

Visibility:
- Pro / Featured / Normal

Usage:
- Products Used: 5 / 7

Note:
- Plans are managed by platform admin.
```

Suggested CTA:

```text
Request Upgrade
```

Phase 1 behavior:

```text
Company Admin can request upgrade.
Super Admin approves and changes tier manually.
```

Future behavior:

```text
State Admin may approve upgrades only for companies inside their state.
```

---

## 7. Request Upgrade Screen

Suggested fields:

```text
- current_tier
- requested_tier
- optional message
```

Suggested model:

```text
UpgradeRequest
- id
- company_id
- requested_by
- current_tier_id
- requested_tier_id
- message
- status: pending / approved / rejected
- reviewed_by nullable
- reviewed_at nullable
- created_at
```

Suggested behavior:

```text
Company Admin submits request
↓
Request status = pending
↓
Super Admin reviews in web portal
↓
If approved, company tier is updated
```

---

## 8. Association Card

Show the Association Card only if the user is linked to an association/member profile.

Suggested fields:

```text
- association_name
- state
- district_operational_unit optional
- local_unit optional
- membership_status
```

Example:

```text
AKGSMA
Thrissur Unit
Status: Verified
```

Suggested behavior:

* Hide Association Card for users without association membership.
* Independent company users may not have an association.
* Association membership should control association-only content like member news, meetings, and official notices.

---

## 9. Admin Card

Show Admin Card only if the user has an admin role.

Suggested admin roles:

```text
- super_admin
- state_admin optional/future
- association_admin
- unit_admin
- company_admin
```

Suggested fields:

```text
- admin_role_label
- scope_label
- admin_portal_link/button optional
```

Example:

```text
Association Admin
Scope: AKGSMA
[Open Admin Panel]
```

Suggested behavior:

* If the app supports opening a web admin portal, show “Open Admin Panel”.
* If not supported in mobile, show admin scope only.
* Super Admin may see a shortcut to admin web portal.
* Company Admin may see company management shortcuts instead of a full admin panel.

---

## 10. Quick Actions

The main profile page should show only high-value actions.

Suggested actions based on role:

```text
Company Admin:
- Manage Products
- View Plan
- Meetings
- News

Association Admin:
- Meetings
- News
- Open Admin Panel

Unit Admin:
- Meetings
- News

Normal Member:
- Meetings
- News

Guest:
- Sign In / Request Access
```

Avoid showing low-frequency settings such as Change Password on the main profile page.

---

## 11. Profile Drawer / Menu

The drawer or profile menu should contain secondary actions and settings.

Suggested menu:

```text
Account
- Edit Profile

Company
- Manage Company Profile
- View Tier Details
- Request Upgrade

Association
- View Association Details

Notifications
- Preferences

Settings
- Change Password
- Logout

Support
- Help & Support
- Contact Admin
```

Suggested behavior:

* Show Company section only if user has company access.
* Show Association section only if user has association membership.
* Show admin-related links only for admin roles.
* Hide Activity/Analytics in Phase 1.

---

## 12. Phase 1 Exclusions

Do not include these in Phase 1 unless already implemented:

```text
- Activity logs
- Analytics dashboard
- Product performance reports
- Payment/subscription billing
- Direct self-upgrade/payment upgrade
```

Plans are manually controlled by Super Admin in Phase 1.

---

## 13. Suggested API Response for Profile Screen

Codex can adapt this to existing serializers/API style.

Suggested endpoint:

```text
GET /api/me/profile/
```

Suggested response shape:

```json
{
  "user": {
    "id": 1,
    "full_name": "Ravi Kumar",
    "phone": "9999999999",
    "email": "ravi@example.com",
    "avatar_url": null,
    "primary_role": "company_admin",
    "location_label": "Thrissur, Kerala"
  },
  "association": {
    "id": 10,
    "name": "AKGSMA",
    "unit_name": "Thrissur Unit",
    "membership_status": "verified"
  },
  "company": {
    "id": 20,
    "name": "ABC Jewellers",
    "role": "admin",
    "tier": {
      "id": 3,
      "name": "Prime Elite",
      "visibility_type": "pro",
      "max_products": 7,
      "min_photos_per_product": 3,
      "max_photos_per_product": 5
    },
    "products_used": 5,
    "can_manage_products": true,
    "can_request_upgrade": true
  },
  "admin": {
    "is_admin": true,
    "roles": [
      {
        "role": "company_admin",
        "scope_type": "company",
        "scope_id": 20,
        "scope_label": "ABC Jewellers"
      }
    ]
  },
  "permissions": {
    "can_manage_products": true,
    "can_view_plan": true,
    "can_request_upgrade": true,
    "can_open_admin_panel": false,
    "can_create_news": false,
    "can_create_meetings": false
  }
}
```

Notes:

* Backend should ideally send permission booleans so the frontend does not duplicate permission logic.
* Frontend should render UI based on permissions and available sections.

---

## 14. Suggested Conditional Rendering Rules

```text
If company == null:
    Hide Company Card and Company Menu

If association == null:
    Hide Association Card and Association Menu

If permissions.can_manage_products:
    Show Manage Products
Else if company exists:
    Show View Products

If permissions.can_request_upgrade:
    Show Request Upgrade

If admin.is_admin:
    Show Admin Card
```

---

## 15. Suggested Navigation Flow

```text
Profile Main
├── Edit Profile
├── Manage Products
│   ├── Product List
│   ├── Add Product
│   └── Edit Product
├── View Plan
│   └── Request Upgrade
├── Association Details
├── Notification Preferences
├── Change Password
└── Help & Support
```

---

## 16. Suggested UI Components

Codex may adapt names and architecture.

Possible components:

```text
ProfileScreen
ProfileHeader
CompanySummaryCard
AssociationSummaryCard
AdminScopeCard
ProfileQuickActions
ProfileDrawerMenu
TierDetailsScreen
UpgradeRequestScreen
```

---

## 17. Suggested Validation/Security Rules

Important:

```text
Frontend hiding is not security.
Backend must enforce permissions.
```

Examples:

```text
Only company_admin/allowed company manager can manage products.
Only company_admin can request upgrade for their company.
Only Super Admin can approve plan upgrade in Phase 1.
Users cannot access company data unless linked through CompanyUser or admin scope.
```

---

## 18. Suggested Tests

Suggested test cases:

* User without company does not receive company card/actions
* Company Admin sees Manage Products
* Company Viewer sees View Products, not Manage Products
* User without association does not receive association card
* Admin user sees admin scope card
* Normal member does not see admin card
* Company Admin can submit upgrade request
* Non-company user cannot request company upgrade
* Super Admin can approve upgrade request
* Non-super-admin cannot approve upgrade request in Phase 1

---

## 19. Final Product Rule Summary

```text
Main Profile Page = identity + current status + important actions
Drawer/Menu = settings + secondary actions
Actions must be permission-based
Company card appears only for company-linked users
Association card appears only for association-linked users
Admin card appears only for admin users
No Activity section in Phase 1
Plan upgrades are manual and controlled by Super Admin in Phase 1
```

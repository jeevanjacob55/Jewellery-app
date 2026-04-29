````md
# Profile System Implementation Plan
# Jewellery Association Platform

---

## 1. Core Decision

Profile System has two parts:

1. **Profile Screen**
   - Shows user identity only.
   - Shows basic personal details.
   - Shows association context.

2. **Sidebar Drawer**
   - Shows account actions.
   - Shows company tools.
   - Shows admin tools.
   - Shows settings and logout.

Do not mix these responsibilities.

---

# 2. Profile Screen

## 2.1 Purpose

The Profile Screen should answer:

- Who is this user?
- What is their role?
- What is their email and phone number?
- Which association and state do they belong to?

The Profile Screen must stay clean and simple.

---

## 2.2 Final Profile Screen Wireframe

```text
------------------------------------------------
| Profile                                      |
------------------------------------------------

              [ Profile Photo ]

              Jeevan Jacob
              Company Admin

------------------------------------------------
| Personal Details                             |
------------------------------------------------
| Email        jeevan@example.com              |
| Phone        +91 98765 43210                 |
------------------------------------------------

------------------------------------------------
| Association                                  |
------------------------------------------------
| Association  AKGSMA                          |
| State        Kerala                          |
------------------------------------------------
````

---

## 2.3 Profile Screen Must Show

```text
Profile photo
Name
Role
Email
Phone number
Association name
State
```

---

## 2.4 Profile Screen Must NOT Show

```text
Wishlist
Bookmarked News
Quick Navigation
Company Profile Card
Company Plan
Upgrade Plan
Admin Tools
Pending Approvals
Notification Settings
Fake labels like Platinum Member
District
Unit
Local chapter
```

---

# 3. Profile Card Redesign

## 3.1 Goal

The profile card should look clean, centered, and modern.

The previous design must be replaced if it looks like a random membership card or shows fake labels like “Platinum Member”.

---

## 3.2 Profile Card Wireframe

```text
------------------------------------------------
|                                              |
|              [ Profile Photo ]               |
|                                              |
|              Jeevan Jacob                    |
|              Company Admin                   |
|                                              |
------------------------------------------------
```

---

## 3.3 Profile Card Rules

* Profile photo must be circular.
* If photo is missing, show initials.
* Name should be bold and prominent.
* Role should be smaller and muted.
* Do not show membership tier.
* Do not show “Platinum Member”.
* Do not show company plan here.
* Do not show association hierarchy here.

---

# 4. Personal Details Card

## 4.1 Wireframe

```text
------------------------------------------------
| Personal Details                             |
------------------------------------------------
| Email        jeevan@example.com              |
| Phone        +91 98765 43210                 |
------------------------------------------------
```

---

## 4.2 Rules

* Show email if available.
* Show phone if available.
* If email is missing, show `Email not added`.
* If phone is missing, show `Phone not added`.
* Do not add edit buttons inside this card.
* Edit Profile must remain in Sidebar → Settings.

---

# 5. Association Card

## 5.1 Wireframe

```text
------------------------------------------------
| Association                                  |
------------------------------------------------
| Association  AKGSMA                          |
| State        Kerala                          |
------------------------------------------------
```

---

## 5.2 Rules

Association card must show only:

```text
Association name
State
```

Do not show:

```text
District
Unit
Local chapter
Membership tier
Company plan
Company name
```

---

# 6. Sidebar Drawer

## 6.1 Purpose

Sidebar Drawer is for secondary actions, account management, company management, admin tools, settings, and logout.

Do not duplicate bottom navigation items.

If Dashboard, Market, News, and Services already exist in bottom navigation, do not show them in the drawer.

---

## 6.2 Final Sidebar Wireframe

```text
------------------------------------------------
| [Avatar]  Jeevan Jacob                       |
|           Company Admin                      |
------------------------------------------------

| Company                                     |
| Show only for company users/admins          |
------------------------------------------------
| Manage Products                             |
| View Plan                                   |
| Upgrade Plan                                |
| Opens website for now                       |
------------------------------------------------

| Admin Tools                                 |
| Show only for admins                        |
------------------------------------------------
| Pending Approvals                           |
| Manage Users                                |
| Manage News                                 |
------------------------------------------------

| Settings                                    |
------------------------------------------------
| Notification Settings                       |
| Edit Profile                                |
| Help & Support                              |
------------------------------------------------

| Logout                                      |
------------------------------------------------
```

---

# 7. Sidebar Section Rules

## 7.1 Drawer Header

```text
------------------------------------------------
| [Avatar]  Jeevan Jacob                       |
|           Company Admin                      |
------------------------------------------------
```

Rules:

* Show avatar or initials.
* Show user name.
* Show user role.
* Tapping header opens Profile Screen.

---

## 7.2 Company Section

Show only if the logged-in user is linked to a company.

```text
Company
- Manage Products
- View Plan
- Upgrade Plan
```

Rules:

* Show `Manage Products` only if user can manage company products.
* Show `View Plan` for company-linked users.
* Show `Upgrade Plan` only for company admins.
* Upgrade Plan must open website for now.
* Do not implement in-app payment or plan upgrade flow in Phase 1.

---

## 7.3 Admin Tools Section

Show only if the user has admin permissions.

```text
Admin Tools
- Pending Approvals
- Manage Users
- Manage News
```

Rules:

* Normal members must never see Admin Tools.
* Company admins should not see Admin Tools unless they also have association admin permission.
* Pending Approvals means ads/news/access items waiting for admin approval.
* Approvals should open a separate screen, not happen directly inside the drawer.

---

## 7.4 Settings Section

Show for logged-in users.

```text
Settings
- Notification Settings
- Edit Profile
- Help & Support
```

Rules:

* Use exactly `Edit Profile`.
* Do not use `Edit Profiles`.
* Notification Settings must live here, not on the Profile Screen.

---

## 7.5 Logout

Rules:

* Logout must ask for confirmation.
* After logout, clear auth token/session.
* Redirect user to login or guest entry screen.

---

# 8. Guest User Drawer

For guests, keep drawer minimal.

```text
------------------------------------------------
| [Avatar]  Guest User                         |
|           Guest                              |
------------------------------------------------

| Settings                                    |
------------------------------------------------
| Help & Support                              |
------------------------------------------------

| Login / Sign Up                             |
------------------------------------------------
```

Rules:

* Do not show Company section.
* Do not show Admin Tools.
* Do not show Notification Settings unless guest notifications are supported.
* Do not show Logout; show Login / Sign Up instead.

---

# 9. Role-Based Rules

## Guest

Show:

```text
Profile header with Guest
Help & Support
Login / Sign Up
```

Hide:

```text
Company section
Admin Tools
Notification Settings
Logout
```

---

## Member

Show:

```text
Profile Screen
Association card
Settings
Logout
```

Hide:

```text
Company section unless linked to company
Admin Tools
Upgrade Plan
```

---

## Company Admin

Show:

```text
Profile Screen
Company section
Manage Products
View Plan
Upgrade Plan
Settings
Logout
```

Hide:

```text
Admin Tools unless also admin
```

---

## Association Admin / Super Admin

Show:

```text
Profile Screen
Admin Tools
Pending Approvals
Manage Users
Manage News
Settings
Logout
```

Show Company section only if the admin is also linked to a company.

---

# 10. API Requirements

## 10.1 Main Profile Endpoint

```http
GET /api/me/
```

Response should include:

```json
{
  "user": {
    "id": 1,
    "name": "Jeevan Jacob",
    "email": "jeevan@example.com",
    "phone": "+919876543210",
    "avatar": "https://example.com/avatar.jpg",
    "role": "COMPANY_ADMIN",
    "role_display_name": "Company Admin",
    "is_admin": false,
    "has_company": true,
    "can_manage_products": true
  },
  "hierarchy": {
    "state": "Kerala",
    "association": "AKGSMA"
  },
  "company": {
    "id": 10,
    "name": "ABC Jewellers",
    "plan": "Prime Elite",
    "upgrade_url": "https://example.com/upgrade"
  },
  "counts": {
    "pending_approvals_count": 0,
    "unread_notifications_count": 3
  }
}
```

Important:

* Frontend should only use `hierarchy.association` and `hierarchy.state` for the Profile Screen.
* Do not show district/unit on Profile Screen even if backend returns them.
* Do not show company details on Profile Screen.

---

# 11. Navigation Routes

```text
/profile
/company/products
/company/plan
/admin/approvals
/admin/users
/admin/news
/settings/notifications
/settings/edit-profile
/support
```

Upgrade Plan behavior:

```text
Open external website URL from company.upgrade_url
```

---

# 12. Loading, Empty, and Error States

## Loading

Use skeleton loading for:

```text
Profile card
Personal details card
Association card
Drawer header
Drawer sections
```

---

## Missing Data

```text
Missing avatar → show initials
Missing email → show "Email not added"
Missing phone → show "Phone not added"
Missing association → show "Association not assigned"
Missing state → show "State not assigned"
```

---

## Error

```text
Could not load profile.
[Retry]
```

Drawer error:

```text
Could not load account options.
[Retry]
```

---

# 13. Design Rules

## Profile Screen

* Keep it visually calm.
* Use card-based layout.
* Use enough spacing.
* Avoid clutter.
* No action-heavy sections.
* No fake membership labels.
* No company card.

## Sidebar Drawer

* Use clear section headings.
* Hide irrelevant sections completely.
* Do not duplicate bottom navigation.
* Keep drawer scrollable.
* Use badges only when meaningful.
* Admin actions should be visually separated from normal settings.

---

# 14. Do Not Implement

Do not implement:

```text
Wishlist in Profile Screen
Bookmarked News in Profile Screen
Quick Navigation in Profile Screen
Company Card in Profile Screen
Upgrade Plan in Profile Screen
Fake membership badge
Platinum Member label
District/Unit in Association card
Bottom navigation items inside drawer
In-app payment for plan upgrade
Approval action directly inside drawer
```

---

# 15. Implementation Order

1. Update Profile Screen layout.
2. Remove quick navigation from Profile Screen.
3. Remove company card from Profile Screen.
4. Remove fake membership badge.
5. Update Association card to show only Association and State.
6. Redesign Profile Identity card.
7. Update Sidebar Drawer.
8. Remove bottom-tab items from drawer.
9. Add role-based drawer sections.
10. Add external website behavior for Upgrade Plan.
11. Add loading/error/empty states.
12. Test Guest, Member, Company Admin, and Admin views.

---

# 16. Acceptance Criteria

* Profile screen shows only identity, personal details, association, and state.
* No “Platinum Member” or fake membership label appears.
* Association card shows only association name and state.
* Company details do not appear on Profile Screen.
* Quick navigation does not appear on Profile Screen.
* Drawer does not duplicate bottom navigation.
* Company section appears only for company-linked users.
* Upgrade Plan opens website, not in-app payment.
* Admin Tools appear only for admins.
* Notification Settings appears under Settings.
* Text says `Edit Profile`, not `Edit Profiles`.

```
```

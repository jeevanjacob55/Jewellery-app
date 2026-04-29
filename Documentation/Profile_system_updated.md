````md
# Jewellery Association Platform — Profile & Sidebar (Drawer) Implementation Guide

---

# 1. Overview

## Purpose of Profile Screen
The Profile Screen represents the **user’s identity and context** within the platform. It provides:
- Personal details (name, email, phone, avatar)
- Hierarchical association context (State → Association → District → Unit)
- Company linkage (if applicable)
- Quick access to user-centric data (wishlist, bookmarks)

It is **read-heavy, low-action**, focused on clarity and trust.

---

## Purpose of Sidebar (Drawer)
The Sidebar (Drawer) is the **primary action/navigation hub** of the app. It provides:
- Navigation across core modules (Dashboard, Market, News, Services)
- Access to user activity (wishlist, bookmarks)
- Company management tools
- Admin tools (if applicable)
- Settings and logout

It is **action-heavy and dynamic**, adapting based on user role.

---

## Separation of Concerns

| Component       | Responsibility                  |
|----------------|--------------------------------|
| Profile Screen | Identity, context, personal info |
| Sidebar        | Navigation, actions, system access |

---

# 2. Profile Screen Specification

## 2.1 Layout Structure

```yaml
ProfileScreen:
  Header:
    avatar: true
    name: string
    email: string
    phone: string

  AssociationCard:
    state: string
    association: string
    district: string
    unit: string

  CompanyCard:
    condition: user.hasCompany
    fields:
      name: string
      plan: string
      product_count: number
      max_products: number

  QuickAccess:
    - Wishlist Products
    - Bookmarked News
````

---

## 2.2 UI Behavior

### Company Card Visibility

* Render only if:

```javascript
user.hasCompany === true
```

### Tap Actions

* Wishlist Products → `/wishlist`
* Bookmarked News → `/bookmarks`
* Manage Products → `/company/products`

### Loading State

* Skeleton placeholders for:

  * Header
  * Cards
* Avoid layout shift

### Empty States

* Wishlist empty → "No saved products yet"
* Bookmarks empty → "No bookmarked news"

---

## 2.3 Role-Based Visibility

| Role          | Visible Elements                             |
| ------------- | -------------------------------------------- |
| Guest         | Header (limited), AssociationCard (partial)  |
| Member        | Full Profile + AssociationCard + QuickAccess |
| Company Admin | + CompanyCard                                |
| Admin         | Same as Member (no admin tools here)         |

---

## 2.4 API Requirements

### Endpoint

```
GET /api/me/
```

### Response Structure

```json
{
  "user": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "avatar": "url",
    "role": "string"
  },
  "hierarchy": {
    "state": "string",
    "association": "string",
    "district": "string",
    "unit": "string"
  },
  "company": {
    "name": "string",
    "plan": "string",
    "product_count": 5,
    "max_products": 7
  },
  "preferences": {
    "rate_alerts": true,
    "news_alerts": true,
    "ad_alerts": false,
    "meeting_alerts": true
  }
}
```

---

# 3. Sidebar (Drawer) Specification

## 3.1 Layout Structure

```yaml
DrawerMenu:
  Header:
    avatar: true
    name: string
    role: string

  TopAction:
    type: pending_approvals
    badge: true

  MainNavigation:
    - Dashboard
    - Market
    - News
    - Services

  Sections:
    - title: Your Activity
      items:
        - Wishlist Products
        - Bookmarked News

    - title: Company
      condition: user.hasCompany
      items:
        - My Company Profile
        - Manage Products
        - View Plan
        - Upgrade Plan (Admin Only)

    - title: Admin Tools
      condition: user.isAdmin
      items:
        - Pending Approvals
        - Manage Users

    - title: Settings
      items:
        - Notification Settings
        - Edit Profile
        - Help & Support

  Footer:
    - Logout
```

---

## 3.2 Interaction Behavior

### Drawer Behavior

* Opens from left (swipe or menu button)
* Closes on:

  * Outside tap
  * Navigation selection

### Navigation Routing

| Item      | Route              |
| --------- | ------------------ |
| Dashboard | `/dashboard`       |
| Market    | `/market`          |
| News      | `/news`            |
| Services  | `/services`        |
| Wishlist  | `/wishlist`        |
| Bookmarks | `/bookmarks`       |
| Approvals | `/admin/approvals` |

---

### Badge Updates

* Pending approvals → real-time or periodic refresh
* Wishlist count → fetched on login

---

### Tap Actions

* Section item tap → navigate
* Header tap → open Profile Screen

---

## 3.3 Role-Based Rendering Logic

```javascript
if (user.isAdmin) {
  showAdminSection()
}

if (user.hasCompany) {
  showCompanySection()
}

if (user.role === "COMPANY_ADMIN") {
  showUpgradePlan()
}
```

---

## 3.4 API Mapping

| Feature           | API Endpoint                 |
| ----------------- | ---------------------------- |
| Wishlist          | GET /api/wishlist/           |
| Bookmarks         | GET /api/bookmarks/          |
| Pending Approvals | GET /api/admin/pending-count |
| Notifications     | GET /api/notifications/      |

---

# 4. Wireframes (Human + AI Readable)

## 4.1 ASCII Wireframe

```
------------------------------------------------
| [👤 Avatar]   Jeevan Jacob                  |
|              Company Admin                  |
------------------------------------------------
| 🔴 Pending Approvals (5)                     |
------------------------------------------------
| 🏠 Dashboard                                |
| 🛒 Market                                   |
| 📰 News                                     |
| 🛠 Services                                 |
------------------------------------------------
| ⭐ YOUR ACTIVITY                            |
| ❤️ Wishlist Products (12)                   |
| 🔖 Bookmarked News (5)                      |
------------------------------------------------
| 🏢 COMPANY                                 |
| 🏬 My Company Profile                       |
| 📦 Manage Products                          |
| 📊 View Plan                                |
| 🚀 Upgrade Plan                             |
------------------------------------------------
| 🛠 ADMIN TOOLS                             |
| 📌 Pending Approvals                        |
| 👥 Manage Users                             |
------------------------------------------------
| ⚙️ SETTINGS                                |
| 🔔 Notification Settings                    |
| ✏️ Edit Profile                             |
| ❓ Help & Support                           |
------------------------------------------------
| 🚪 Logout                                  |
------------------------------------------------
```

---

## 4.2 Structured YAML Wireframe

```yaml
DrawerWireframe:
  header:
    avatar: true
    name: dynamic
    role: dynamic

  top_action:
    approvals:
      badge: dynamic

  navigation:
    - Dashboard
    - Market
    - News
    - Services

  sections:
    activity:
      - Wishlist
      - Bookmarks

    company:
      condition: hasCompany

    admin:
      condition: isAdmin

    settings:
      - Notifications
      - EditProfile

  footer:
    - Logout
```

---

# 5. UX & Design Rules

## Spacing

* Section padding: 16px
* Item spacing: 12px
* Touch target: minimum 44px

## Section Grouping

* Logical grouping by intent
* Use dividers between sections

## Badge Usage

* Red badge → critical (approvals)
* Grey badge → passive (wishlist count)

## Empty States

* Always show placeholder text
* Avoid removing sections completely

## Error States

* Show retry button
* Preserve layout

---

# 6. Edge Cases

| Scenario             | Behavior                          |
| -------------------- | --------------------------------- |
| No company           | Hide Company section              |
| No wishlist          | Show empty state                  |
| No admin permissions | Hide Admin section                |
| No internet          | Show cached data + "Offline mode" |

---

# 7. Future Scalability Notes

## Feature Expansion

* Add new sections without breaking layout
* Modular section rendering

## More Roles

* Extend role logic easily
* Add permissions layer

## Additional Sections

* Notifications center
* Analytics dashboard
* Subscription management

---

# FINAL NOTE

This structure ensures:

* Clean separation of concerns
* Role-based dynamic UI
* Scalable architecture
* Codex-friendly implementation

```
```

# News System Implementation Guide (Hierarchy + Visibility + Admin Control)

## 1. Purpose

This document defines how the **News System** should be implemented in the Jewellery Platform.

Goals:

* Only admins can create news
* News visibility must be flexible but controlled
* Hierarchy-based permissions must be enforced
* Prevent misuse (spam, overreach)
* Keep UI simple while backend remains powerful

---

## 2. Who Can Create News

Allowed:

* Super Admin
* Association Admin
* Unit Admin
* Company Admin

Not allowed:

* Members
* Guests
* Company staff (non-admin)

---

## 3. Core Rule (Very Important)

```text
Admins can only publish directly within their scope.
If they try to go beyond → approval required.
```

---

## 4. Scope Definition

| Role              | Scope           |
| ----------------- | --------------- |
| Super Admin       | Entire platform |
| Association Admin | One association |
| Unit Admin        | One unit        |
| Company Admin     | Their company   |

---

## 5. News Lifecycle

```text
draft → pending_approval → published → archived/rejected
```

---

## 6. News Model

```text
News
- id
- title
- description
- created_by
- publisher_type (platform / association / unit / company)
- publisher_id
- status (draft / pending_approval / published / rejected)
- created_at
- updated_at
```

---

## 7. Visibility System (Core Design)

Use **Include - Exclude model**

```text
Final Audience = Included Users - Excluded Users
```

---

## 8. NewsTarget Table

```text
NewsTarget
- id
- news_id
- target_type
  (state / association / unit / company / user)
- target_id
- mode (include / exclude)
```

---

## 9. Visibility Selection Flow (UI)

### Step 1: Choose Audience Type

```text
○ Public
○ Association Based
○ Company Based
○ Custom
```

---

### Step 2: Include Audience

Hierarchical selection:

```text
State
↓
Association
↓
Unit
↓
Company
```

Options:

* Select ALL
* Select specific items

---

### Step 3: Exclude Audience (Optional)

```text
Exclude Companies
Exclude Users
```

Collapsed by default.

---

## 10. Scope Validation Logic

### Function:

```text
can_publish_directly(user, selected_targets)
```

Rules:

```text
If all selected targets are within user's scope → publish
Else → pending approval
```

---

## 11. Examples

### Case 1: Unit Admin → Own Unit

```text
Include: Unit A
→ Allowed → Direct publish
```

---

### Case 2: Unit Admin → Association

```text
Include: Association X
→ Not allowed → Requires approval
```

---

### Case 3: Company Admin → Own Company

```text
Include: Company ABC
→ Allowed → Publish (or optional approval)
```

---

### Case 4: Company Admin → Association-wide

```text
Include: Association X
→ Not allowed → Requires approval
```

---

## 12. Approval Flow

| Sender            | Target Scope         | Approver          |
| ----------------- | -------------------- | ----------------- |
| Unit Admin        | Above unit           | Association Admin |
| Association Admin | Above association    | Super Admin       |
| Company Admin     | Association / public | Association Admin |

---

## 13. Backend Flow

```text
Create News
↓
Store News (status = draft)
↓
Add NewsTarget entries
↓
Check scope
↓
IF within scope:
    status = published
ELSE:
    status = pending_approval
```

---

## 14. Important Constraints

* Do NOT allow manual user selection at scale
* Always prefer hierarchy selection
* Exclusions should be minimal and optional
* Backend must enforce all rules

---

## 15. API Design

### Create News

```text
POST /api/news/
```

### Approve News

```text
POST /api/news/{id}/approve/
```

### Reject News

```text
POST /api/news/{id}/reject/
```

### Get News Feed

```text
GET /api/news/
```

Returns only news visible to the user based on:

```text
Include targets
Exclude targets
User hierarchy
```

---

## 16. Visibility Resolution Logic

```text
1. Get all include targets
2. Expand to users
3. Get all exclude targets
4. Remove excluded users
5. Return final audience
```

---

## 17. UI Guidelines

* Keep selection simple
* Use cascading dropdowns
* Show scope warnings early
* Show approval message clearly

Example:

```text
This audience is outside your permission scope.
Your news will be sent for approval.
```

---

## 18. Final Design Principles

* Simple UI, powerful backend
* Strict hierarchy enforcement
* Flexible targeting (include/exclude)
* Controlled publishing via approval
* No member-level publishing in V1

---

## 19. Future Enhancements (Optional)

* Scheduled news
* Push notifications
* Read tracking
* Analytics
* News categories & tags

---

## 20. Summary

This system ensures:

* Clean admin control
* Flexible targeting
* Safe publishing
* Scalable hierarchy handling

It supports:

* Association-wide news
* Company announcements
* Unit-level alerts
* Controlled cross-scope communication

Without making the UI complex.

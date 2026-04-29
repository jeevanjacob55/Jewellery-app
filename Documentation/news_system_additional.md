

```text
documentation/news_system_additional.md
```

and referencing:

```text
frontend-mobile/references/news/news_screen.html
```

---

# ✅ FINAL 

````md
# News Screen Integration Guide (Mobile)

## 1. Purpose

This document explains how to implement and integrate the **News Screen** in the mobile app using the reference design:

```text
frontend-mobile/references/news/news_screen.html
````

The goal is to:

* Convert the HTML design into a React Native / Expo screen
* Connect it to the existing backend APIs
* Keep the implementation flexible and aligned with current project structure

This is a **guideline**, not a strict rulebook. Adapt based on the existing frontend architecture.

---

## 2. What This Screen Represents

The News Screen is the **communication hub** of the platform.

It combines:

* Urgent alerts
* Regular news
* Meetings/events
* Optional market data
* Optional promotional content

---

## 3. Design Breakdown (From Reference HTML)

The reference design contains:

1. Header
2. Filter Tabs

   * All
   * News
   * Meetings
   * Sort
3. Featured (urgent) news card
4. Regular news cards
5. Meeting highlight card
6. Market rates card (optional)
7. Promotional / spotlight card (optional)
8. Bottom navigation

👉 Do NOT try to replicate HTML structure directly
👉 Convert into **mobile-native components**

---

## 4. File Placement

Suggested screen location:

```text
frontend-mobile/src/screens/news/NewsScreen.tsx
```

Reference HTML (do not modify):

```text
frontend-mobile/references/news/news_screen.html
```

---

## 5. Backend Integration

### Primary API

```text
GET /api/news/
```

This should return:

* news items
* alerts (if included)
* optionally meetings

---

### Secondary API (if separate)

```text
GET /api/meetings/
```

Only call this if meetings are NOT included in `/api/news/`.

---

## 6. Data Handling Strategy

Do NOT assume fixed response shape.

Normalize response before use.

Example:

```ts
const normalizeNews = (res: any) => {
  if (Array.isArray(res)) return res;
  if (res.results) return res.results;
  if (res.news_items) return res.news_items;
  if (res.data) return res.data;
  return [];
};
```

---

## 7. News Data Requirements

The screen should support:

```ts
type NewsItem = {
  id: string | number;
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  image?: string;
  image_url?: string;
  created_at?: string;
  published_at?: string;
  is_urgent?: boolean;
  severity?: string;
};
```

---

## 8. Image Handling (Important)

Images are optional.

Support both:

```ts
item.image
item.image_url
```

Helper:

```ts
const getImage = (item) => item.image_url || item.image;
```

If no image:

👉 Show placeholder (do NOT break layout)

---

## 9. Screen Layout (Logical Order)

```text
SafeAreaView
  Header
  Filter Tabs
  ScrollView / FlatList
    Featured News
    News List
    Meeting Card
    Market Card (optional)
    Spotlight Card (optional)
```

---

## 10. Header

Structure:

```text
[Menu] JEWELLERY ASSOCIATION [Bell]
```

Behavior:

* Menu → opens drawer (if exists)
* Bell → notifications screen (if exists)

---

## 11. Filter Tabs

Tabs:

```text
All | News | Meetings
```

Behavior:

| Tab      | Shows          |
| -------- | -------------- |
| All      | News + Meeting |
| News     | Only news      |
| Meetings | Only meetings  |

Default:

```text
All
```

---

## 12. Featured News Logic

Pick top item:

```ts
const featured =
  news.find(n => n.is_urgent || n.severity === "critical") 
  || news[0];
```

This card should be:

* Larger
* Image preferred
* Show "URGENT" badge if needed

---

## 13. News Cards

Each card shows:

* Category
* Title
* Summary
* Date

On click:

```text
Navigate → News Detail Screen
```

---

## 14. Meeting Card

Show **next upcoming meeting**.

Fields:

* Title
* Time
* Location
* CTA button

CTA options:

* Add to calendar (if available)
* Join meeting (if online)
* Open map (if location link exists)

---

## 15. Market Rates Card (Optional)

Only render if data exists.

Do NOT hardcode.

If no data:

```text
Hide section
```

---

## 16. Spotlight / Promotion (Optional)

Can be powered by:

* Ads API
* Featured companies

If no data:

👉 Do NOT render

---

## 17. Loading State

Show skeleton UI.

Minimum:

* Featured card placeholder
* 2 news cards
* meeting card

---

## 18. Empty State

If no data:

```text
No updates available.
```

---

## 19. Error Handling

If API fails:

```text
Unable to load updates.
[Retry]
```

Retry should re-fetch API.

---

## 20. Pull To Refresh

Enable refresh:

```text
Reload news + meetings
```

---

## 21. Sorting Rules

News:

```text
latest first
```

Meetings:

```text
upcoming first
```

---

## 22. Navigation

Expected:

```text
NewsScreen
NewsDetailScreen
MeetingDetail (optional)
Notifications (optional)
```

---

## 23. Key Rule (VERY IMPORTANT)

```text
Frontend MUST NOT handle visibility logic
```

Backend already filters data.

Frontend should:

```text
Render only what API returns
```

---

## 24. Implementation Strategy

### Phase 1

* Convert HTML → RN layout
* Connect news API
* Render featured + list

### Phase 2

* Add meetings
* Add filtering
* Add refresh

### Phase 3

* Add optional sections
* Improve UI polish

---

## 25. What NOT to Do (Common Mistakes)

❌ Do NOT hardcode data
❌ Do NOT assume API structure
❌ Do NOT block UI if one API fails
❌ Do NOT calculate hierarchy in frontend
❌ Do NOT directly reuse HTML/CSS

---

## 26. Final Instruction

Before coding:

* Check existing API client
* Check navigation system
* Check theme/styles
* Reuse components if available

Build this as a **robust, flexible screen**, not a one-off UI.

---

## Outcome

When implemented correctly, the screen should:

* Look like the reference design
* Work with real backend data
* Handle missing fields safely
* Scale for future features (images, meetings, ads)

```

---

# 💬 What you did right

- This design is **very strong (production-level UI)**
- You’re thinking in **modular + API-driven way**
- You’re not mixing News & Meetings blindly → good separation

---

If you want next step, I’ll help you:

👉 Convert this into **actual React Native component structure (with file paths + code skeletons)**  
That’s where most people mess up — and where you can get ahead.
```

# 📄 Ads System — Implementation Notes

---

## 1. Goal

Build a **backend-driven advertisement system** for the mobile app dashboard (and future placements) that:

* Replaces static ad cards
* Supports **dynamic delivery + rotation**
* Handles **multiple destination types (URL, screen, product, company, etc.)**
* Is **non-rigid and extensible** for future monetization

---

## 2. Key Design Principle

👉 **Do NOT hardcode navigation logic in frontend**

Instead:

> Backend tells frontend *WHAT to do when user clicks an ad*

This gives you flexibility for:

* External links
* Deep linking inside app
* Product pages
* Company profiles
* Future campaign types

---

## 3. Core Model Design (Flexible)

### 3.1 AdvertisementCampaign

```python
# apps/ads/models.py

class AdvertisementCampaign(models.Model):

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("expired", "Expired"),
    ]

    PLACEMENT_CHOICES = [
        ("dashboard_hero", "Dashboard Hero"),
        ("market_banner", "Market Banner"),
        ("news_inline", "News Inline"),
    ]

    # Basic content
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    label_text = models.CharField(max_length=50, default="ADVERTISEMENT")

    image = models.ImageField(upload_to="ads/", null=True, blank=True)
    background_color = models.CharField(max_length=10, blank=True)

    # 🔥 FLEXIBLE ACTION SYSTEM
    action_type = models.CharField(max_length=50)
    action_payload = models.JSONField(default=dict)

    # Example action_type values:
    # "external_url"
    # "internal_screen"
    # "product"
    # "company"
    # "category"

    placement = models.CharField(max_length=50, choices=PLACEMENT_CHOICES)

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    is_active = models.BooleanField(default=True)

    priority = models.IntegerField(default=0)

    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    approved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="approved_ads")

    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## 4. Action System (CRITICAL)

### Why this design?

Avoid rigid fields like:

* `cta_link`
* `product_id`
* `company_id`

Instead use:

```txt
action_type + action_payload
```

---

### Supported Actions (V1)

#### 1. External URL

```json
{
  "action_type": "external_url",
  "action_payload": {
    "url": "https://example.com"
  }
}
```

---

#### 2. Internal Screen Navigation

```json
{
  "action_type": "internal_screen",
  "action_payload": {
    "screen": "Market",
    "params": {}
  }
}
```

---

#### 3. Product Redirect

```json
{
  "action_type": "product",
  "action_payload": {
    "product_id": 123
  }
}
```

---

#### 4. Company Redirect

```json
{
  "action_type": "company",
  "action_payload": {
    "company_id": 45
  }
}
```

---

#### 5. Category Redirect

```json
{
  "action_type": "category",
  "action_payload": {
    "category": "rings"
  }
}
```

---

## 5. Tracking Models (Keep Now, Use Later)

### AdImpression

```python
class AdImpression(models.Model):

    ad = models.ForeignKey(AdvertisementCampaign, on_delete=models.CASCADE)

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    guest_id = models.CharField(max_length=255, null=True, blank=True)

    placement = models.CharField(max_length=50)

    viewed_at = models.DateTimeField(auto_now_add=True)
```

---

### AdClick

```python
class AdClick(models.Model):

    ad = models.ForeignKey(AdvertisementCampaign, on_delete=models.CASCADE)

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    guest_id = models.CharField(max_length=255, null=True, blank=True)

    placement = models.CharField(max_length=50)

    clicked_at = models.DateTimeField(auto_now_add=True)

    action_type = models.CharField(max_length=50)
    action_payload = models.JSONField(default=dict)
```

---

## 6. API Design

### GET Ads

```http
GET /api/ads/?placement=dashboard_hero
```

---

### Backend Filtering

```python
now = timezone.now()

ads = AdvertisementCampaign.objects.filter(
    placement="dashboard_hero",
    status="approved",
    is_active=True,
    start_date__lte=now,
    end_date__gte=now
).order_by("priority", "-created_at")
```

---

### Response Format

```json
{
  "results": [
    {
      "id": 1,
      "label": "ADVERTISEMENT",
      "title": "GST update issued for bullion traders",
      "description": "Updated tax guidance is now available",
      "image_url": null,
      "background_color": "#A94B08",
      "action_type": "external_url",
      "action_payload": {
        "url": "https://example.com"
      }
    }
  ]
}
```

---

## 7. Frontend Handling (React Native)

### Click Handler (IMPORTANT)

```javascript
function handleAdClick(ad) {
  const { action_type, action_payload } = ad;

  switch (action_type) {
    case "external_url":
      Linking.openURL(action_payload.url);
      break;

    case "internal_screen":
      navigation.navigate(action_payload.screen, action_payload.params);
      break;

    case "product":
      navigation.navigate("ProductDetail", { id: action_payload.product_id });
      break;

    case "company":
      navigation.navigate("CompanyProfile", { id: action_payload.company_id });
      break;

    case "category":
      navigation.navigate("Market", { category: action_payload.category });
      break;

    default:
      console.warn("Unknown ad action type");
  }
}
```

---

## 8. Carousel Behavior

* Horizontal scroll
* Auto-scroll every 3–5 sec
* Pagination dots
* Pause on user interaction

---

## 9. Seed Data (Flexible)

Create variety:

```txt
Ad 1 → external URL
Ad 2 → product
Ad 3 → company
Ad 4 → internal screen
```

---

## 10. Suggested Tables (Future Ready)

Keep system flexible — do NOT over-normalize early.

Minimum:

```txt
advertisement_campaign
ad_impression
ad_click
```

Optional future tables:

```txt
ad_targeting (state, district, unit)
ad_assets (multiple images/videos)
ad_placement_config (priority rules)
```

---

## 11. Critical Rules

* ❌ No hardcoded ads in frontend
* ✅ Backend controls behavior
* ✅ Frontend only executes instructions
* ✅ Action system must remain generic

---

## 12. Final Advice

This design gives you:

* Flexibility (no schema rewrites later)
* Scalability (supports real ads system)
* Clean frontend (no logic mess)

If you try to shortcut this now, you will rewrite it later.

Do it once. Do it right.

---

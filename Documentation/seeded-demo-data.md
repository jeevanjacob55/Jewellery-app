# Seeded Demo Data Reference

This file documents the records created by:

```bash
python manage.py seed_demo_data
python manage.py seed_demo_data --reset
```

Source of truth: [backend/apps/admin_ops/demo_seed.py](/d:/Jewellery%20app/Jewellery-app/backend/apps/admin_ops/demo_seed.py)

## Demo Login Credentials

All seeded demo users share the same password:

- Password: `DemoPass123!`

| Username | Role | Name | Email | Notes |
| --- | --- | --- | --- | --- |
| `demo_super_admin` | `super_admin` | Super Admin | `super-admin@demo-jewellery.app` | `is_staff=True`, verified member, onboarding complete |
| `demo_admin` | `admin` | Admin Desk | `admin@demo-jewellery.app` | `is_staff=True`, verified member, onboarding complete |
| `demo_association_admin` | `admin` | Maya Nair | `association-admin@demo-jewellery.app` | Scoped admin seeded at association level |
| `demo_district_admin` | `admin` | Vikram Iyer | `district-admin@demo-jewellery.app` | Scoped admin seeded at district-unit level |
| `demo_unit_admin` | `admin` | Nisha Pillai | `unit-admin@demo-jewellery.app` | Scoped admin seeded at unit level |
| `demo_kgsma_admin` | `admin` | Kiran George | `kgsma-admin@demo-jewellery.app` | KGSMA-scoped admin |
| `demo_akgsma_admin` | `admin` | Aparna Das | `akgsma-admin@demo-jewellery.app` | AKGSMA-scoped admin |
| `demo_member` | `member` | Anika Menon | `member@demo-jewellery.app` | KGSMA member. Corporate email `member@heritagegold.example`, jeweller ID `JWL-DEMO-1001` |
| `demo_akgsma_member` | `member` | Rahul Nambiar | `akgsma-member@demo-jewellery.app` | AKGSMA member. Corporate email `member@malabargoldline.example`, jeweller ID `JWL-DEMO-2001` |
| `demo_supplier` | `supplier` | Rohit Varma | `supplier@demo-jewellery.app` | Verified member, onboarding complete |
| `demo_advertiser` | `advertiser` | Leena Joseph | `advertiser@demo-jewellery.app` | Verified member, onboarding complete |

## Member Profile And Notifications

### `demo_member` profile

- Phone number: `9876543210`
- Company name: `Heritage Gold House`
- State: `Kerala`
- Association: `KGSMA`
- District operational unit: `Ernakulam District Unit`
- Unit: `Kadavanthra Unit`
- Membership tier: `Platinum`

### `demo_akgsma_member` profile

- Phone number: `9876501234`
- Company name: `Malabar Goldline`
- State: `Kerala`
- Association: `AKGSMA`
- District operational unit: `Kozhikode District Unit`
- Unit: `Nadakkavu Unit`
- Membership tier: `Gold`

### Notification preferences

- `demo_member`
  - `rate_alerts=True`
  - `news_alerts=True`
  - `ad_alerts=False`
  - `meeting_alerts=True`
- `demo_super_admin`
  - `rate_alerts=True`
  - `news_alerts=True`
  - `ad_alerts=True`
  - `meeting_alerts=True`
- `demo_admin`
  - `rate_alerts=True`
  - `news_alerts=True`
  - `ad_alerts=True`
  - `meeting_alerts=True`

## Regions

### Kerala

- KGSMA
  - Ernakulam District Unit
    - Kadavanthra Unit
    - Aluva Unit
  - Thrissur District Unit
    - Round North Unit
    - Kodungallur Unit
- AKGSMA
  - Kozhikode District Unit
    - SM Street Unit
    - Nadakkavu Unit

### Tamil Nadu

- Tamil Nadu Jewellers Association
  - Chennai District Unit
    - T Nagar Unit
    - Anna Salai Unit
  - Coimbatore District Unit
    - RS Puram Unit
    - Gandhipuram Unit

### Karnataka

- Karnataka Gold Traders Association
  - Bengaluru Urban District Unit
    - Chickpet Unit
    - Jayanagar Unit
  - Mysuru District Unit
    - Devaraja Unit
    - VV Mohalla Unit

## Directory Data

### Product categories

- Temple Jewellery
- Bridal Sets
- Lightweight Chains
- Diamond Rings

### Companies, verification, and products

#### Heritage Gold House

- Category: `Wholesale`
- Tier: `premium`
- City/State: `Thrissur, Kerala`
- Daily capacity: `15kg`
- Specialization: `Temple jewellery`
- About: `High-volume manufacturing for regional retailers and premium bridal houses.`
- Verification
  - GST registered: `True`
  - BIS hallmarked: `True`
  - Export licensed: `False`
- Products
  - Lakshmi Kasu Mala
    - Category: `Temple Jewellery`
    - Weight: `48.50`
    - Purity: `22K`
    - Description: `Hand-finished temple necklace.`
  - Bridal Mango Haram
    - Category: `Bridal Sets`
    - Weight: `62.00`
    - Purity: `22K`
    - Description: `Layered mango-motif bridal haram.`

#### Coastal Bullion Works

- Category: `Manufacturer`
- Tier: `pro`
- City/State: `Kochi, Kerala`
- Daily capacity: `9kg`
- Specialization: `Lightweight chains`
- About: `Casting and finishing line focused on fast-moving daily wear collections.`
- Verification
  - GST registered: `True`
  - BIS hallmarked: `True`
  - Export licensed: `True`
- Products
  - Singapore Twist Chain
    - Category: `Lightweight Chains`
    - Weight: `14.25`
    - Purity: `22K`
    - Description: `Daily wear Singapore twist chain.`

#### Metro Diamond Studio

- Category: `Retail`
- Tier: `premium`
- City/State: `Chennai, Tamil Nadu`
- Daily capacity: `4kg`
- Specialization: `Diamond rings`
- About: `Premium retail showroom with bridal consultations and custom diamond work.`
- Verification
  - GST registered: `True`
  - BIS hallmarked: `True`
  - Export licensed: `False`
- Products
  - Solitaire Halo Ring
    - Category: `Diamond Rings`
    - Weight: `6.40`
    - Purity: `18K`
    - Description: `Halo-set solitaire ring for bridal collections.`

#### Kaveri Ornament Hub

- Category: `Wholesale`
- Tier: `normal`
- City/State: `Coimbatore, Tamil Nadu`
- Daily capacity: `6kg`
- Specialization: `Bridal sets`
- About: `Regional wholesaler with fast replenishment for family jewellers.`
- Verification
  - GST registered: `True`
  - BIS hallmarked: `False`
  - Export licensed: `False`
- Products
  - Floral Bridal Choker
    - Category: `Bridal Sets`
    - Weight: `38.00`
    - Purity: `22K`
    - Description: `Floral bridal choker with matching studs.`

#### Chickpet Classic Chains

- Category: `Manufacturer`
- Tier: `pro`
- City/State: `Bengaluru, Karnataka`
- Daily capacity: `11kg`
- Specialization: `Machine chains`
- About: `Bulk chain producer with strong daily wear assortments.`
- Verification
  - GST registered: `True`
  - BIS hallmarked: `True`
  - Export licensed: `False`
- Products
  - Box Link Chain
    - Category: `Lightweight Chains`
    - Weight: `10.10`
    - Purity: `22K`
    - Description: `Popular box-link chain for urban storefronts.`

#### Mysuru Heritage Crafts

- Category: `Retail`
- Tier: `normal`
- City/State: `Mysuru, Karnataka`
- Daily capacity: `3kg`
- Specialization: `Antique finish work`
- About: `Traditional handcrafted pieces for festive and temple collections.`
- Verification
  - GST registered: `True`
  - BIS hallmarked: `True`
  - Export licensed: `False`
- Products
  - Antique Vanki
    - Category: `Temple Jewellery`
    - Weight: `24.75`
    - Purity: `22K`
    - Description: `Armlet with antique temple detailing.`

## Media Assets

The seed creates public product and company media, one private ad asset, and one private reverse-search attachment.

Because these keys include runtime database IDs, the exact prefixes vary by database state. The seeded patterns are:

- Company image: `companies/{company.id}/hero.jpg`
- Product images: `products/{company.id}/{product-slug}.jpg`
- Ad asset: `ads/{demo_advertiser.id}/akshaya-tritiya-launch-banner.jpg`
- Reverse-search attachment: `reverse-search/{demo_member.id}/bridal-bangle-reference.jpg`

Shared media defaults:

- MIME type: `image/jpeg`
- Width: `1200`
- Height: `1200`
- File size: `245760`
- Caption: `Demo media asset`
- Sort order: `0`

Visibility and moderation:

- Company images: `public`, `approved`
- Product images: `public`, `approved`
- Ad asset: `private`, `approved`
- Reverse-search attachment: `private`, `pending`

## Rates Data

### Association rates

| Association | Region label | Gold 22K | Gold 24K | Silver | Effective at |
| --- | --- | ---: | ---: | ---: | --- |
| Global board fallback | Association Board Rate - Previous | 6765.00 | 7395.00 | 90.25 | 2026-04-20 09:00 |
| Global board fallback | Association Board Rate - Latest | 6785.00 | 7410.00 | 89.40 | 2026-04-21 09:00 |
| KGSMA | KGSMA Previous | 5440.00 | 5890.00 | 74.25 | 2026-04-20 09:00 |
| KGSMA | KGSMA Latest | 5450.00 | 5900.00 | 75.00 | 2026-04-21 10:30 |
| AKGSMA | AKGSMA Previous | 5415.00 | 5860.00 | 73.80 | 2026-04-20 09:00 |
| AKGSMA | AKGSMA Latest | 5435.00 | 5880.00 | 74.50 | 2026-04-21 10:30 |

### External market rates

| Source | Region | Gold 22K | Gold 24K | Silver | Effective at |
| --- | --- | ---: | ---: | ---: | --- |
| South Zone Association | Kerala | 6778.00 | 7402.00 | 89.65 | 2026-04-21 08:45 |
| Metro Trade Board | Tamil Nadu | 6792.00 | 7418.00 | 89.20 | 2026-04-21 08:30 |
| Bullion Watch | Karnataka | 6769.00 | 7398.00 | 89.85 | 2026-04-21 08:15 |

### Global trends

- USD/INR: `83.22`
- Gold/Oz: `2362.11`
- Silver/Oz: `28.41`

Note: `GlobalTrendSnapshot.captured_at` is an auto timestamp field, so the persisted timestamp reflects when the seed ran.

## Services And Compliance

### Service types

| Service | Average turnaround days | Accuracy metric |
| --- | ---: | --- |
| Calibration | 4 | `98.6%` |
| Compliance Support | 5 | empty |
| Diamond Certification | 3 | empty |
| Hallmarking | 6 | empty |

### Compliance requests

| Service | Business | Due in days | Status |
| --- | --- | ---: | --- |
| Calibration | Heritage Gold House | 5 | `action_required` |
| Compliance Support | Metro Diamond Studio | 0 | `action_required` |
| Hallmarking | Coastal Bullion Works | 2 | `in_review` |

### Compliance reminders

| Title | Due in days | Severity |
| --- | ---: | --- |
| License Renewal | 0 | `action_required` |
| GST Filing Check | 3 | `attention` |

## News, Alerts, And Meetings

### Alerts

- Title: `GST update issued for bullion traders`
- Body: `Updated tax guidance is now available for member businesses.`
- Severity: `urgent`
- Active: `True`

### News items

- Title: `Association onboarding camp expands to new districts`
- Summary: `Regional outreach and member support counters are opening across more association district units this month.`
- Is urgent: `False`

Note: `NewsItem.published_at` is auto-generated at seed time.

### Meeting events

Meeting titles and venues are fixed, but `starts_at` is relative to the day you run the seed:

| Title | Venue | Starts at |
| --- | --- | --- |
| Association Trade Meet | Thrissur Trade Hall | seed run time + 2 days |
| Bullion Compliance Workshop | Kochi Convention Centre | seed run time + 5 days |
| Retail Growth Forum | Chennai Business Centre | seed run time + 9 days |

All meeting calendar links are:

- `https://calendar.google.com`

## Ads And Advertiser Flow

### Advertisement

- Advertiser: `demo_advertiser`
- Title: `Akshaya Tritiya Launch Banner`
- Reach: `state`
- Status: `approved`
- Starts at: current local date when the seed runs
- Ends at: current local date + 14 days

### Ad targeting

- State: `Kerala`
- Association: `KGSMA`
- District operational unit: `Ernakulam District Unit`
- Unit: `Kadavanthra Unit`

### Ad asset

- Placement: `dashboard_hero`
- Filename: `akshaya-tritiya-launch-banner.jpg`
- Visibility: `private`
- Moderation status: `approved`

### Ad approval

- Approved by: `demo_admin`
- Notes: `Creative approved for premium dashboard placement.`
- Approved at: current timestamp when the seed runs

## Reverse Search

### Request

- Created by: `demo_member`
- Notes: `Need a supplier match for an antique bridal bangle with peacock detailing.`
- Status: `supplier_responded`

### Attachment

- Filename: `bridal-bangle-reference.jpg`
- Visibility: `private`
- Moderation status: `pending`

### Response

- Responder: `demo_supplier`
- Message: `Supplier can reproduce the design in 8 working days.`
- Availability label: `Available`

Note: `created_at` timestamps for the request and response are generated at seed time.

## Audit Logs

| Action | Entity type | Entity id | Actor | Metadata |
| --- | --- | --- | --- | --- |
| `member_verified` | `user` | `demo_member` | `demo_admin` | `{"actor_role": "admin", "state": "Kerala", "association": "KGSMA", "district_unit": "Ernakulam District Unit", "unit": "Kadavanthra Unit"}` |
| `rate_updated` | `association_rate` | `board-rate-latest` | `demo_admin` | `{"region": "Association Board Rate - Latest"}` |
| `ad_approved` | `advertisement` | `akshaya-tritiya-launch-banner` | `demo_admin` | `{"placement": "dashboard_hero"}` |

Note: `AuditLog.created_at` is auto-generated at seed time.

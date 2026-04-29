````md
# Product Details Screen Implementation Notes
# Jewellery Association Platform

Reference HTML path:

```text
frontend/references/market/product_screen.html
````

Use the HTML file as a **visual reference only**.
Follow this document for structure, rules, behavior, and what should/should not be implemented.

---

## 1. Purpose

The Product Details screen shows complete product information after a user taps a product from the Market page, company product list, or future collection row.

The screen should help the user quickly understand:

* What the product is
* Which company listed it
* Product specifications
* Price range
* How to contact/request final price
* Product description/craftsmanship

This is a product enquiry screen, not a checkout screen.

---

## 2. Core Phase 1 Decision

This app should NOT support direct buying or online checkout in Phase 1.

Instead, the Product Details screen should support:

```text
Request Final Price
WhatsApp Enquiry
Call Seller
View Company
Wishlist
Share
```

---

## 3. Final Product Details Wireframe

```text
------------------------------------------------
| ←  Product Details                    ♡  Share |
------------------------------------------------

| LARGE PRODUCT IMAGE CAROUSEL                  |
|                                               |
| [ Main Product Image ]                        |
|                                               |
|              ● ○ ○                            |
------------------------------------------------

| Thumbnail Row                                 |
| [img] [img] [img] [video/play optional]       |
------------------------------------------------

| PREMIUM COLLECTION                            |
| Curb Link Chain                               |
| 22K Gold | 42.50g | 18 inch                  |
------------------------------------------------

| COMPANY CARD                                  |
| [Logo]  Aurum Crafts                          |
|         Thrissur, Kerala                      |
|                         [View Company]        |
------------------------------------------------

| Price Range                                   |
| ₹2,30,000 – ₹2,60,000                         |
| Final price may vary based on gold rate,      |
| making charge, and seller confirmation.       |
------------------------------------------------

| [Request Final Price]                         |
| [WhatsApp Enquiry]                            |
| [Call Seller]                                 |
------------------------------------------------

| Product Specifications                        |
------------------------------------------------
| Purity        22K Gold                        |
| Weight        42.50g                          |
| Length        18 inch                         |
| Category      Chain                           |
| Subcategory   Curb                            |
| Availability  In Stock                        |
| Hallmark      BIS Certified (916)             |
------------------------------------------------

| Craftsmanship / Description                   |
------------------------------------------------
| Detailed description text...                  |
------------------------------------------------

| Sticky Bottom Action Bar                      |
------------------------------------------------
| [Final Price]  [WhatsApp]  [Call]             |
------------------------------------------------
```

---

## 4. Screen Sections

### 4.1 Header

The top header must contain:

```text
Back button
Title: Product Details
Wishlist icon
Share icon
```

Rules:

* Back button returns to previous screen.
* Wishlist icon toggles saved state.
* Share icon opens native share sheet.
* Header should stay clean and minimal.

---

### 4.2 Image Carousel

The first visual section must be a large product image carousel.

Rules:

* Show the selected product image in a large card.
* Show pagination dots below the image.
* Show thumbnails below the main image.
* Tapping a thumbnail changes the main image.
* If product has video, show video thumbnail with play icon.
* If no image exists, show a clean placeholder.

Do not stretch or crop jewellery awkwardly. Use a consistent image aspect ratio.

---

### 4.3 Product Title Section

Show:

```text
Collection label
Product name
Short spec line
```

Example:

```text
PREMIUM COLLECTION
Curb Link Chain
22K Gold | 42.50g | 18 inch
```

Rules:

* Collection label is optional.
* Product name must be prominent.
* Short spec line should use only the most important specs.
* Do not show too many details here.

---

### 4.4 Company Card

Show the company that listed the product.

```text
[Company Logo]
Aurum Crafts
Thrissur, Kerala
[View Company]
```

Rules:

* Company card must be clearly separated from product details.
* View Company opens the company profile or company catalog screen.
* If company logo is missing, show initials or fallback icon.
* Location should be short: city/state or district/state.

---

### 4.5 Price Range Section

Show price range if available.

```text
Price Range
₹2,30,000 – ₹2,60,000
```

Add helper text:

```text
Final price may vary based on gold rate, making charge, and seller confirmation.
```

Rules:

* Do not show fixed checkout price unless business confirms it.
* Gold prices fluctuate, so price range is better.
* If price is missing, show:

```text
Price available on request
```

Do not show fake price.

---

### 4.6 Primary Action Buttons

Show three main buttons:

```text
Request Final Price
WhatsApp Enquiry
Call Seller
```

Rules:

* Request Final Price is the primary CTA.
* WhatsApp Enquiry opens WhatsApp with prefilled message.
* Call Seller opens phone dialer.
* Disable Call Seller if phone number is missing.
* Disable WhatsApp if WhatsApp number is missing.
* All actions should also exist in sticky bottom bar.

---

### 4.7 Product Specifications

Use a clean grid/table card.

Fields:

```text
Purity
Weight
Length
Category
Subcategory
Availability
Hallmark
```

Rules:

* Show only fields that exist.
* Do not show empty/null values.
* Availability should be visually clear.
* Hallmark should appear as a separate row if long.
* Keep the layout readable on small phones.

---

### 4.8 Description / Craftsmanship Section

Show product description.

Example title:

```text
Craftsmanship
```

or

```text
Description
```

Rules:

* Use `Craftsmanship` if the content is premium/storytelling.
* Use `Description` for generic product details.
* Text should be readable with proper line height.
* Do not make this section too visually heavy.

---

### 4.9 Sticky Bottom Action Bar

At the bottom of the screen, keep a sticky CTA bar.

```text
[Final Price] [WhatsApp] [Call]
```

Rules:

* Must stay visible while scrolling.
* Must respect safe area bottom padding.
* Should not cover content.
* Actions must match the main action buttons.
* If a contact option is unavailable, disable that button.

---

## 5. Data Requirements

The product details API should provide:

```json
{
  "id": 101,
  "name": "Curb Link Chain",
  "collection_label": "Premium Collection",
  "purity": "22K Gold",
  "weight": "42.50g",
  "length": "18 inch",
  "category": "Chain",
  "subcategory": "Curb",
  "availability": "In Stock",
  "hallmark": "BIS Certified (916)",
  "price_min": 230000,
  "price_max": 260000,
  "description": "Detailed product description...",
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "type": "image"
    }
  ],
  "company": {
    "id": 5,
    "name": "Aurum Crafts",
    "location": "Thrissur, Kerala",
    "logo": "https://example.com/logo.jpg",
    "phone": "+919876543210",
    "whatsapp": "+919876543210"
  },
  "is_wishlisted": false,
  "share_url": "https://example.com/products/101"
}
```

---

## 6. API Endpoints

### Product Details

```http
GET /api/products/{product_id}/
```

Purpose:

```text
Fetch complete product details for Product Details screen.
```

---

### Wishlist Toggle

```http
POST /api/products/{product_id}/wishlist/
```

Purpose:

```text
Add/remove product from wishlist.
```

If wishlist is not implemented in Phase 1, keep the icon UI but disable or hide the action based on current backend support.

---

### Request Final Price

```http
POST /api/products/{product_id}/enquiries/
```

Request body:

```json
{
  "type": "FINAL_PRICE_REQUEST",
  "message": "I would like to know the final price for this product."
}
```

Purpose:

```text
Create an enquiry record for seller/company.
```

---

## 7. Navigation Rules

```text
Back button
→ previous screen

View Company
→ company catalog or company profile

Request Final Price
→ enquiry flow / confirmation modal

WhatsApp Enquiry
→ open WhatsApp

Call Seller
→ open phone dialer

Share
→ native share sheet

Wishlist
→ toggle wishlist state
```

---

## 8. WhatsApp Message Template

When user taps WhatsApp Enquiry, prefill message:

```text
Hello, I am interested in this product:

Product: Curb Link Chain
Purity: 22K Gold
Weight: 42.50g

Please share the final price and availability.
```

Rules:

* Use actual product values.
* Do not include unavailable fields.
* Include product link if available.

---

## 9. Loading State

Show skeleton placeholders for:

```text
Header
Main image
Thumbnail row
Product title
Company card
Price section
Buttons
Specifications card
Description card
```

Do not show a blank white screen.

---

## 10. Empty / Missing Data Rules

```text
No images
→ show product image placeholder

No price range
→ show "Price available on request"

No company logo
→ show company initials

No phone number
→ disable Call Seller

No WhatsApp number
→ disable WhatsApp Enquiry

No description
→ hide description section

No length
→ hide Length field

No hallmark
→ hide Hallmark row
```

---

## 11. Error State

If product cannot be loaded:

```text
Could not load product details.
[Retry]
```

If product was removed/unavailable:

```text
This product is no longer available.
[Back to Market]
```

---

## 12. Design Rules

### Overall Style

* Mobile-first.
* Premium jewellery feel.
* Clean spacing.
* Card-based sections.
* No clutter.
* Product image should dominate the first screen.

### Typography

* Product name should be large and bold.
* Section titles should be small uppercase or semi-bold.
* Helper text should be smaller and muted.
* Price range should be visually prominent.

### Buttons

Use three action priorities:

```text
Primary: Request Final Price
Secondary: WhatsApp Enquiry
Tertiary: Call Seller
```

Rules:

* Request Final Price should stand out most.
* WhatsApp should be visually distinct.
* Call button should be clear and direct.
* Sticky bottom buttons should be compact.

---

## 13. Phase 1 Scope

Implement now:

```text
Product image carousel
Product title/spec summary
Company card
Price range
Request Final Price
WhatsApp Enquiry
Call Seller
Product specifications
Description/craftsmanship
Wishlist icon if backend exists
Share action
Sticky bottom CTA bar
```

Do not implement now:

```text
Checkout
Add to cart
Online payment
Similar products
Reviews
Ratings
Advanced recommendations
EMI
Coupon system
Delivery tracking
```

---

## 14. Future-Ready Notes

This screen must support future Market features such as:

```text
Company collections
Featured product rows
Filtered collections
Hybrid curated collections
Similar products
Related collections
Sponsored product placements
```

Future collection context may pass:

```text
companyId
collectionId
collectionSlug
sourceRowId
```

Product Details screen should work regardless of where the product was opened from:

```text
Market product grid
Company catalog
Featured collection row
Search results
Admin preview
```

---

## 15. Important Codex Instruction

Use this HTML as visual reference:

```text
frontend/references/market/product_screen.html
```

Use it for:

```text
Spacing
Visual hierarchy
Image carousel layout
Company card style
Price section style
CTA button layout
Specification grid
Sticky bottom bar
```

Do not blindly copy:

```text
Hardcoded product data
Hardcoded prices
Hardcoded company names
Static image paths
Unwanted unsupported actions
```

The final React Native implementation must use backend API data.

---

## 16. Acceptance Criteria

* Product details screen matches the reference design closely.
* Product image carousel works.
* Thumbnail selection updates main image.
* Product name/specs render from API.
* Company card opens company screen.
* Price range displays correctly.
* Missing price shows "Price available on request".
* Request Final Price creates enquiry or opens proper flow.
* WhatsApp button opens WhatsApp with prefilled message.
* Call button opens dialer.
* Specifications hide missing fields.
* Description hides if empty.
* Sticky bottom CTA bar remains visible.
* Screen handles loading, error, and missing data states.

```
```

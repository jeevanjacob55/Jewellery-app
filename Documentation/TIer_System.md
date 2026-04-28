Implement a dynamic Company Tier and Market Visibility system for the Jewellery Association Platform.

Context:
The platform has companies that can upload products and appear on the Market page. Companies should not upload unlimited products. Super Admin must control product limits through tiers. The same tier system should also decide which predefined market visibility group the company belongs to.

Important rule:
There should be only ONE tier system. Do not create a separate visibility-tier system.

Requirements:

1. Create/Update CompanyTier model with these fields:
- id
- name
- slug
- description
- max_products
- min_photos_per_product
- max_photos_per_product
- max_companies_allowed
- price
- is_free
- is_active
- display_priority
- visibility_type

visibility_type must only allow:
- featured
- pro
- normal

2. Initial tier seed data:

Prime Signature:
- max_products: 50
- photos: 3 to 5
- max_companies_allowed: 10
- visibility_type: featured

Prime Classic:
- max_products: 25
- photos: 3 to 5
- max_companies_allowed: 25
- visibility_type: featured

Prime Premier:
- max_products: 15
- photos: 3 to 5
- max_companies_allowed: 50
- visibility_type: pro

Prime Elite:
- max_products: 7
- photos: 3 to 5
- max_companies_allowed: 75
- visibility_type: pro

Prime Circle:
- max_products: 3
- photos: 3 to 5
- max_companies_allowed: 100
- visibility_type: normal

Prime Unique:
- max_products: 1
- photos: 3 to 5
- max_companies_allowed: null or on-demand
- visibility_type: normal
- is_free: true

3. Company model:
Each company must have a nullable or required tier_id linked to CompanyTier.
Company should also support admin priority if needed:
- admin_priority
- is_active
- is_approved

4. Product upload validation:
When a company admin uploads a product:
- Get the company tier
- Count active products for that company
- If active product count >= tier.max_products, block upload
- Return clear error message:
  "You have reached your product showcase limit for your current tier."

5. Product image validation:
When uploading images:
- Minimum images must be tier.min_photos_per_product
- Maximum images must be tier.max_photos_per_product
- If too few or too many images, return clear validation error.

6. Company tier assignment validation:
When assigning a tier to a company:
- Count companies already assigned to that tier
- If max_companies_allowed is not null and count >= max_companies_allowed, block assignment
- Return clear error:
  "This tier has reached its company slot limit."

7. Market API:
Create or update endpoint:

GET /api/directory/market/

It should return companies grouped by tier visibility_type:

{
  "featured_companies": [],
  "pro_companies": [],
  "normal_companies": [],
  "latest_products": []
}

Rules:
- featured_companies = companies whose tier.visibility_type is "featured"
- pro_companies = companies whose tier.visibility_type is "pro"
- normal_companies = companies whose tier.visibility_type is "normal"
- Only include active and approved companies
- Sort by tier.display_priority, company.admin_priority, and created_at
- Frontend should not decide visibility grouping. Backend must return grouped data.

8. Super Admin APIs:
Create admin endpoints to:
- List tiers
- Create tier
- Edit tier
- Activate/deactivate tier
- Assign tier to company
- Upgrade/downgrade company tier

9. Important downgrade behavior:
If a company is downgraded to a tier with a lower product limit:
- Do not delete products automatically
- Keep products in database
- If active products exceed the new limit, mark excess products as inactive OR return a warning requiring admin/company admin to choose which products remain active.
Prefer safer implementation: return warning and require explicit selection.

10. Frontend behavior:
There are only 3 predefined UI visibility sections:
- featured = large carousel / big cards
- pro = medium cards
- normal = small cards/list

Do not allow custom UI size per tier.
The tier only stores visibility_type.

11. Security:
All validations must happen in backend.
Frontend warnings are optional but backend must enforce final rules.

12. Tests:
Add tests for:
- Company cannot upload more products than tier limit
- Product image count respects tier rules
- Tier company slot limit works
- Market API groups companies into featured/pro/normal correctly
- Downgrade does not delete products
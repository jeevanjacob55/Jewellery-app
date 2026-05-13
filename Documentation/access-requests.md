
````md
# Implement New Company-First Access Request Flow

## Context

The current app does not have a proper company-first identity model.

Known current issues:

1. `Company` is not properly linked to hierarchy.
   - Company has no real FK to association/district/unit.
   - Company uses plain state string.
   - Some logic matches `MemberProfile.company_name == Company.name`, which is fragile.

2. Current access request flow is too association/member-based.
   - Member access request requires all hierarchy levels.
   - This blocks independent jewellers who only belong to a state.

3. Company admin onboarding does not exist.
   - Companies can currently exist without admins.
   - New business rule: companies should be created through verified company-admin access requests.

4. Association admin onboarding does not exist.
   - Admins are currently assigned directly through `UserRole`.

5. Multiple company admins are partially supported.
   - `UserRole(company_admin)` supports multiple users per company.
   - But some code uses `.first()`, so multi-admin/multi-company assumptions must be reviewed carefully.

---

# Goal

Implement a new company-first access request flow where:

- Every new company/jewellery must select a State.
- Association, District Operational Unit, and Local Unit are optional.
- Independent jewellers are allowed with State-only mapping.
- Association-linked companies must be approved by Association Admin.
- Independent State-only companies must be approved by State Admin or Super Admin.
- On approval, the company is created and the requester becomes Primary Company Admin.
- Company can later approve/add more company users.

---

# Core Business Rules

## Company Hierarchy Rule

Every company must have:

- `state_id` required

Optional:

- `association_id`
- `district_operational_unit_id`
- `unit_id`

Valid examples:

```txt
State only
→ independent jeweller

State + Association
→ association-linked company

State + Association + District
→ association-linked company with district scope

State + Association + District + Unit
→ association-linked company with unit scope
````

Invalid examples:

```txt
Association without State
District without Association
Unit without District
```

---

# Approval Routing

## Independent Company

Condition:

```txt
state_id is present
association_id is null
```

Approval owner:

```txt
State Admin or Super Admin
```

Result after approval:

```txt
company_type = independent
create company
create/activate requester user
attach requester as Primary Company Admin
```

---

## Association-Linked Company

Condition:

```txt
state_id is present
association_id is present
```

Approval owner:

```txt
Association Admin
```

District/local admins may be allowed to view or recommend later, but they are not final approvers in Phase 1.

Result after approval:

```txt
company_type = association_linked
create company
create/activate requester user
attach requester as Primary Company Admin
```

---

# Required Backend Changes

## 1. Update Company Model

Add real hierarchy FK fields to `Company`.

Required:

```txt
state FK required
```

Optional:

```txt
association FK nullable
district_operational_unit FK nullable
unit FK nullable
company_type: independent | association_linked
```

Important:

* Stop relying on plain text `Company.state` for new logic.
* Stop relying on `MemberProfile.company_name == Company.name` for company identity.
* Keep backward compatibility if old data exists.

---

## 2. Add Company Membership Model

Create a first-class company membership model.

Suggested fields:

```txt
CompanyMembership
- id
- user FK
- company FK
- role: primary_admin | admin | manager | staff | viewer
- status: active | pending | suspended | removed
- is_primary_admin boolean
- approved_by nullable FK user
- approved_at nullable datetime
- created_at
- updated_at
```

Rules:

* One company can have multiple admins.
* Each admin must have separate login credentials.
* No shared company credentials.
* A company must have one primary admin after approval.
* Additional company users/admins can be approved by existing company admins.

---

## 3. Add Company Admin Access Request Model

This request creates a new company and gives the requester primary admin access after approval.

Suggested fields:

```txt
CompanyAdminAccessRequest
- id
- requester_name
- requester_phone
- requester_email
- requested_password / invite flow if applicable
- company_name
- business_type
- state FK required
- association FK nullable
- district_operational_unit FK nullable
- unit FK nullable
- company_type: independent | association_linked
- status: pending | approved | rejected
- approval_owner_type: state_admin | association_admin | super_admin
- approved_by nullable FK user
- approved_at nullable datetime
- rejected_by nullable FK user
- rejected_at nullable datetime
- rejection_reason nullable
- notes nullable
- documents JSON/File relation optional
- created_at
- updated_at
```

Validation:

```txt
state is always required

if association is null:
    company_type = independent
    approval_owner_type = state_admin

if association is present:
    company_type = association_linked
    approval_owner_type = association_admin

district requires association
unit requires district
```

---

## 4. Add APIs

### Public/Web Admin Access Request APIs

#### GET `/api/access/company-admin/options/`

Purpose:

Return hierarchy options for company admin access request.

Should include:

* states
* associations under selected state
* districts under selected association
* units under selected district

#### POST `/api/access/company-admin/request/`

Purpose:

Submit company admin access request.

Payload example for independent jeweller:

```json
{
  "requester_name": "Jeevan Jacob",
  "requester_phone": "9999999999",
  "requester_email": "jeevan@example.com",
  "company_name": "ABC Jewellers",
  "business_type": "Retail Jeweller",
  "state_id": 1,
  "association_id": null,
  "district_operational_unit_id": null,
  "unit_id": null,
  "notes": "Independent jeweller requesting company admin access"
}
```

Payload example for association-linked company:

```json
{
  "requester_name": "Jeevan Jacob",
  "requester_phone": "9999999999",
  "requester_email": "jeevan@example.com",
  "company_name": "ABC Jewellers",
  "business_type": "Retail Jeweller",
  "state_id": 1,
  "association_id": 2,
  "district_operational_unit_id": 5,
  "unit_id": 8,
  "notes": "Requesting company admin access under association hierarchy"
}
```

---

### Admin Review APIs

#### GET `/api/admin/access/company-admin-requests/`

Return requests visible to the logged-in admin.

Visibility rules:

```txt
Super Admin:
- can see all requests

State Admin:
- can see independent requests for their state
- can see association-linked requests under their state if allowed read-only
- can approve independent State-only requests

Association Admin:
- can see association-linked requests for their association
- can approve association-linked requests

District/Unit Admin:
- Phase 1: no final approval
- optional read-only visibility only if needed
```

#### POST `/api/admin/access/company-admin-requests/{id}/approve/`

Approval behavior:

If independent:

```txt
only State Admin for that state or Super Admin can approve
```

If association-linked:

```txt
only Association Admin for that association or Super Admin can approve
```

On approval:

```txt
create Company
create or activate User
create CompanyMembership with role=primary_admin
optionally create UserRole with company_admin scope for backward compatibility
mark request approved
```

#### POST `/api/admin/access/company-admin-requests/{id}/reject/`

Payload:

```json
{
  "reason": "Unable to verify business ownership"
}
```

---

# Frontend/Web Admin Requirements

## Company Admin Access Request Form

The user should see:

1. Requester details
2. Company details
3. State dropdown - required
4. Association dropdown - optional
5. District dropdown - optional, only after association selected
6. Unit dropdown - optional, only after district selected
7. Notes/documents if available

Important:

* User must choose hierarchy only from pre-existing records.
* User cannot type custom association/district/unit names.
* State is always required.
* If user selects only state, treat as independent jeweller.
* If user selects association, treat as association-linked company.

---

# Dashboard Behavior

After login:

## Association-linked company user

Show:

* association-specific rate card
* association-scoped news
* association meetings
* company card
* market/product features

## Independent company user

Hide:

* association-specific rate card
* association meetings
* association-only notices

Show:

* company card
* state/global rates if available
* public news
* market/product features
* ads if eligible

Do not show empty/broken association components.

---

# Backward Compatibility Requirements

Because current code uses fragile company-name matching and plain text state:

1. Do not remove old fields immediately.
2. Add new FK fields first.
3. Write safe data migration for existing companies where possible.
4. Keep old APIs working during transition.
5. Update `/api/me/` to prefer `CompanyMembership` and FK-based company identity.
6. Keep fallback only temporarily for legacy users.
7. Replace `.first()` assumptions carefully where they affect company admin access.

---

# Tests Required

Add backend tests for:

1. Independent company admin request creation.
2. Association-linked company admin request creation.
3. Validation: state required.
4. Validation: district requires association.
5. Validation: unit requires district.
6. State admin can approve independent company request.
7. Association admin can approve association-linked company request.
8. District/unit admin cannot final-approve company creation in Phase 1.
9. Approval creates company.
10. Approval creates/activates requester user.
11. Approval creates primary company admin membership.
12. Company supports multiple admin users.
13. Independent company users do not receive association-specific dashboard data.
14. Association-linked company users receive association-scoped dashboard data.
15. Existing legacy users still work through compatibility fallback.

---

# Important Implementation Rule

Do not implement large UI redesign first.

Implementation order should be:

1. Data model migration
2. Company membership model
3. Company admin access request model
4. Approval APIs
5. `/api/me/` identity resolution update
6. Dashboard conditional behavior
7. Web admin form changes
8. Legacy cleanup after verification

```

This prompt is strong enough for Codex because it tells it **what to build, what not to break, and the exact migration risk**.
```
For associations, use a **separate “Association Admin Access Request” flow**.

They should not use the company/jewellery request flow.

Clean model:

```txt
Web Admin Access Request
├── Company Admin Access
│   └── for jewellers/businesses
└── Association Admin Access
    └── for state / association / district / unit admins
```

## Association access request rule

Requester selects:

```txt
State required
Association optional depending on requested scope
District optional
Unit optional
Requested role required
```

Examples:

```txt
State Admin
→ select State only
→ approved by Super Admin

Association Admin
→ select State + Association
→ approved by Super Admin or State Admin

District Operational Admin
→ select State + Association + District
→ approved by Association Admin

Unit Admin
→ select State + Association + District + Unit
→ approved by District Admin or Association Admin
```

## Model

```txt
AssociationAdminAccessRequest
- requester_name
- requester_phone
- requester_email
- state
- association nullable
- district_operational_unit nullable
- unit nullable
- requested_role:
  - state_admin
  - association_admin
  - district_admin
  - unit_admin
  - editor
  - viewer
- status: pending | approved | rejected
- approved_by
- approved_at
- rejection_reason
- notes
```

## Approval routing

```txt
If requested_role = state_admin
→ Super Admin approves

If requested_role = association_admin
→ Super Admin or State Admin approves

If requested_role = district_admin
→ Association Admin approves

If requested_role = unit_admin
→ Association Admin or District Admin approves
```

## After approval

```txt
Create/activate user
Create UserRole with:
- role = requested_role
- scope_type = state / association / district / unit
- scope_id = selected scope
```

Important rule:

```txt
Association admins are not linked through CompanyMembership.
Company admins are linked through CompanyMembership.
```

So your system becomes clean:

```txt
Company admin request → creates/controls company
Association admin request → creates hierarchy-scoped admin role
```

That separation will save you from a lot of future confusion.

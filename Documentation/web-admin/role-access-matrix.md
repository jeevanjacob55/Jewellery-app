# Web Admin Role Access Matrix

## Roles

- `super_admin`
- `state_admin`
- `association_admin`
- `district_admin`
- `unit_admin`
- `company_admin`
- `advertiser`

## Access Strategy

- `super_admin` gets full platform access.
- Scoped regional admins get module access, but only within their branch.
- `company_admin` should use a lighter company operations portal, not the full platform console.
- `advertiser` should use a lighter advertiser portal, not the full platform console.

## Module Visibility Matrix

| Module | Super Admin | State Admin | Association Admin | District Admin | Unit Admin | Company Admin | Advertiser |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Overview | Full | Scoped | Scoped | Scoped | Scoped | Portal only | Portal only |
| Approvals | Full | Scoped | Scoped | Limited | Limited | No | No |
| Analytics | Full | Scoped | Scoped | Limited | Limited | Company only later | Campaign only later |
| Rate System | Full | Scoped | Scoped | Limited | Limited | No | No |
| Advertisements | Full | Scoped review only if allowed | Scoped review only if allowed | No | No | No | Advertiser portal only |
| Market & Products | Full | Scoped | Scoped view | Limited view | Limited view | Company portal only | No |
| Users | Full | Scoped | Scoped | Limited | Limited | No | No |
| News & Meetings | Full | Scoped | Scoped | Scoped if permitted | Scoped if permitted | Company meetings only later | No |
| Hierarchy | Full | Read mostly | Read mostly | Read mostly | Read mostly | No | No |
| Audit Logs | Full | Scoped | Scoped | Limited | Limited | No | No |
| Settings | Full | Personal + limited | Personal + limited | Personal + limited | Personal + limited | Portal settings | Portal settings |

## Role Behavior Detail

## Super Admin

- Can see every module
- Can approve all approval types
- Can create and manage tiers, zones, market rows, placement overrides
- Can manage hierarchy records
- Can assign scoped roles
- Can review all audit logs

## State Admin

- Sees data for companies, members, content, and approvals within assigned state
- Can review scoped access requests, news, meetings, and possibly company operations inside state
- Should not manage global hierarchy or platform-wide settings

## Association Admin

- Sees data for own association and lower branches
- Can review association-scoped requests and content
- Can create association meetings and association-scoped news
- Should not edit platform-wide tiers or placements unless explicitly granted

## District Admin

- Focused on district operational unit workflows
- Limited approvals and content management inside own district branch
- Mostly operational visibility, not platform configuration

## Unit Admin

- Narrowest regional admin scope
- Can manage only unit-level content or tasks allowed by policy
- Usually read-heavy with minimal configuration controls

## Company Admin

- Better served by separate company portal
- Recommended company portal sections
  overview, manage products, company plan, upgrade request, company meetings
- Should not see platform-wide user management, hierarchy, or approvals inbox

## Advertiser

- Better served by separate advertiser portal
- Recommended advertiser portal sections
  campaigns, creatives, performance, billing later
- Should not see platform user management or hierarchy

## Scope Rules

- Every scoped admin page should display the current scope clearly.
- Filters must never allow a scoped admin to escape their own branch.
- Approval actions must validate scope on the backend even if the UI hides restricted records.
- Audit views for scoped admins should only show actions inside their visible scope unless policy says otherwise.


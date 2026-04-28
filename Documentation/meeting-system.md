# Meeting System – Implementation Notes
## Purpose

Add a **Meeting Module** to the Jewellery Platform.

Meetings should help admins create and publish official events such as:

* Association meetings
* Unit-level meetings
* Company/internal meetings
* General platform-level events

This guide is intentionally written as a **suggested implementation direction**, not a strict requirement. Codex can adapt the model names, relationships, serializers, permissions, and endpoint structure to fit the existing codebase.

---

## 1. Product Intent

Meetings should be treated as a separate feature from News.

News is mainly for announcements.
Meetings need structured event data such as:

* Date and time
* Venue
* Google Maps link
* Online meeting link if applicable
* RSVP / response tracking
* Audience targeting
* Organizer information

Suggested principle:

```text
News = information
Meetings = scheduled events with actions
```

---

## 2. Suggested Access Rules

Only admin-type users should be able to create meetings.

Suggested creators:

* Super Admin
* Association Admin
* Unit Admin
* Company Admin

Suggested non-creators:

* Members
* Guests
* Company staff without admin permission

Suggested behavior:

```text
Admins should create meetings only for audiences within their permitted scope.
```

For example:

* Super Admin can create broad platform/state/association meetings
* Association Admin can create meetings for their association or units under it
* Unit Admin can create meetings for their own unit
* Company Admin can create meetings for their own company/internal audience

Codex may implement this using the existing role/scope permission system if one already exists.

---

## 3. Suggested Scope Handling

Meetings should not normally be created outside the creator’s scope.

Suggested approach:

```text
If selected audience is outside the creator’s scope, block creation with a clear message.
```

Suggested message:

```text
You cannot create a meeting for this audience. Please contact a higher-level admin.
```

This is different from News, where outside-scope publishing may go through approval.

Suggested product rule:

```text
News outside scope → approval may be allowed
Meetings outside scope → usually blocked
```

Codex can adapt this based on existing approval workflows.

---

## 4. Suggested Meeting Model

Suggested fields:

```text
Meeting
- id
- title
- description
- created_by
- organizer_type
- organizer_id
- start_datetime
- end_datetime
- venue_name
- venue_address
- google_maps_link
- meeting_mode
- online_meeting_link
- status
- created_at
- updated_at
```

Suggested values:

```text
organizer_type:
- platform
- association
- unit
- company

meeting_mode:
- physical
- online
- hybrid

status:
- draft
- published
- cancelled
- completed
```

Notes:

* If the existing codebase has concrete ForeignKey models for Association, Unit, or Company, Codex can replace `organizer_type + organizer_id` with nullable FK fields.
* If generic relations are already used elsewhere, Codex can reuse that style.
* If the application already has an event/content base model, Meeting can extend or reuse it.

---

## 5. Suggested Audience / Visibility Model

Meetings can reuse the same visibility concept used for News.

Suggested model:

```text
MeetingTarget
- id
- meeting_id
- target_type
- target_id
- mode
```

Suggested target types:

```text
state
association
unit
company
user
```

Suggested modes:

```text
include
exclude
```

For V1, exclusions can be optional. The simplest implementation can start with include-only targets.

Suggested logic:

```text
Final audience = included targets - excluded targets
```

Codex can reuse any existing NewsTarget, AudienceTarget, or VisibilityTarget structure if already present in the project.

---

## 6. Suggested RSVP Model

Meetings should support simple RSVP responses.

Suggested model:

```text
MeetingResponse
- id
- meeting_id
- user_id
- response
- responded_at
```

Suggested response values:

```text
attending
maybe
not_attending
```

Suggested constraints:

```text
One response per user per meeting.
```

Codex can enforce this with a unique constraint such as:

```text
unique(meeting_id, user_id)
```

---

## 7. Suggested Creation Flow

Suggested flow:

```text
Admin opens web portal
↓
Creates meeting details
↓
Selects audience
↓
Backend checks if selected audience is within admin scope
↓
If valid → create/publish meeting
If invalid → return permission error
```

Codex can decide whether newly created meetings default to `draft` or `published` depending on the existing admin flow.

Simple V1 recommendation:

```text
If valid and submitted as publish → status = published
If saved only → status = draft
```

---

## 8. Suggested API Endpoints

Codex may adapt endpoint names to match the existing API style.

Suggested endpoints:

```text
POST /api/meetings/
GET /api/meetings/
GET /api/meetings/{id}/
PATCH /api/meetings/{id}/
POST /api/meetings/{id}/cancel/
POST /api/meetings/{id}/respond/
```

Optional admin endpoints:

```text
GET /api/admin/meetings/
POST /api/admin/meetings/
PATCH /api/admin/meetings/{id}/
```

Suggested behavior:

* Regular users should only see meetings visible to them.
* Admin users should see meetings they created or meetings within their scope.
* RSVP should only be allowed for visible meetings.

---

## 9. Suggested Google Maps Handling

Simplest approach:

```text
Store google_maps_link as a URL field.
```

Frontend can show:

```text
View on Map
```

When tapped:

```text
Open the link in Google Maps app or browser.
```

Optional future improvement:

```text
Store latitude and longitude separately for better map previews.
```

Suggested optional fields:

```text
latitude nullable
longitude nullable
```

---

## 10. Suggested Mobile Meeting Card

Suggested card content:

```text
[Meeting Title]
Date & Time
Venue Name
Venue Address
Organizer
View on Map

[Attend] [Maybe] [Not Attending]
```

For online/hybrid meetings:

```text
Join Online Meeting
```

---

## 11. Suggested Permission Examples

### Unit Admin

Usually allowed:

```text
Own unit meeting
```

Usually blocked:

```text
Association-wide meeting
Other unit meeting
State-level meeting
```

---

### Association Admin

Usually allowed:

```text
Own association meeting
Unit meetings under own association
```

Usually blocked:

```text
Other association meeting
State-wide meeting
```

---

### Company Admin

Usually allowed:

```text
Own company meeting
```

Usually blocked:

```text
Association meeting
Other company meeting
Public meeting
```

---

## 12. Suggested Validation Methods

Codex can implement these as service methods, permission classes, or helper functions.

Suggested methods:

```text
can_create_meeting(user) -> bool
can_manage_meeting(user, meeting) -> bool
is_target_within_user_scope(user, target) -> bool
validate_meeting_targets(user, targets) -> None
get_visible_meetings_for_user(user) -> QuerySet/List
resolve_meeting_audience(meeting) -> users
```

Suggested pseudo-logic:

```text
For each selected target:
    Check whether target belongs inside creator's admin scope
    If any target is outside scope:
        block creation
```

---

## 13. Suggested Feed Logic

When user opens meetings screen:

```text
Return upcoming published meetings visible to that user.
```

Suggested sorting:

```text
start_datetime ASC
```

Suggested filters:

```text
upcoming
past
my_responses
organized_by_me
```

---

## 14. Suggested Notifications

Optional for V1, but useful later.

When meeting is published:

```text
Notify visible users.
```

Before meeting:

```text
Send reminder 1 day before or configurable time before meeting.
```

This can be connected later to the existing notification system.

---

## 15. Suggested Tests

Suggested test cases:

* Super Admin can create meeting for any allowed target
* Association Admin can create meeting within own association
* Association Admin cannot create meeting for another association
* Unit Admin can create meeting for own unit
* Unit Admin cannot create association-wide meeting
* Company Admin can create meeting for own company
* Company Admin cannot create meeting for another company
* User can RSVP only to visible meetings
* One user cannot create duplicate RSVP records for the same meeting
* Cancelled meetings do not appear as active upcoming meetings

---

## 16. Suggested Future Enhancements

* Google Calendar export
* Push reminders
* QR attendance check-in
* Meeting minutes upload
* Attach documents/PDFs
* Attendance report for admins
* Repeat/recurring meetings

---

## 17. Final Implementation Direction

Build the Meeting Module as a separate but connected feature.

Recommended relationship:

```text
News System
Meeting System
Shared Visibility/Audience System
Shared Role/Scope Permission System
Shared Notification System
```

The implementation should stay flexible enough to match the existing codebase while preserving the key product behavior:

```text
Admins can create meetings only within their own scope.
Users only see meetings targeted to them.
Meetings contain structured venue, time, map, and RSVP data.
```

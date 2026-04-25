# 01. Foundation And Environment

This document defines how to start the project from scratch in a clean and repeatable way.

## Goal

Create a stable baseline so backend, mobile, and web work can proceed in parallel without dependency confusion.

## Starting Point

The repository already contains:

- design references in `Proposed design/`
- a backend scaffold in `backend/`
- a mobile scaffold in `frontend-mobile/`
- a hosted web scaffold in `web-admin/`

Treat those as the starting codebase, but this plan is written as if the team is rebuilding the implementation carefully from first principles.

## Step 1. Confirm the monorepo structure

The repo must remain organized as:

```text
backend/
frontend-mobile/
web-admin/
Proposed design/
implementation plan/
README.md
firebase.json
```

Rules:

- `backend/` contains all Django code and Python dependencies.
- `frontend-mobile/` contains only the Android app.
- `web-admin/` contains the Firebase-hosted landing/admin app.
- `Proposed design/` is reference-only.
- `implementation plan/` is documentation-only.

## Step 2. Standardize tool versions

Target baseline:

- Python `3.11+`
- Node `20+`
- npm `10+`
- Expo SDK matching the version in `frontend-mobile/package.json`
- PostgreSQL `15+`

Team rule:

- All developers use the same major versions to reduce environment drift.
- If Docker is later introduced, use the same versions there as well.

## Step 3. Configure local environment files

### Backend

Create `backend/.env` from `backend/.env.example` and fill:

- `DEBUG`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `JWT_ACCESS_MINUTES`
- `JWT_REFRESH_DAYS`
- `GCS_BUCKET_NAME`
- `GCS_PRIVATE_BUCKET_NAME`
- `MEDIA_SIGNED_URL_TTL`

Add later if needed:

- Google OAuth client ids
- Firebase credentials
- error monitoring DSN
- email/SMS configuration

### Frontend Mobile

Add `frontend-mobile/.env` or Expo config values for:

- API base URL
- Firebase app config
- FCM sender id if required by the notification setup
- environment label

### Web Admin

Add `web-admin/.env` for:

- API base URL
- Firebase project config
- app mode

## Step 4. Install dependencies

### Backend commands

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Mobile commands

```powershell
cd frontend-mobile
npm install
```

### Web admin commands

```powershell
cd web-admin
npm install
```

## Step 5. Make the backend boot first

Before starting any serious frontend feature work:

- ensure Django imports cleanly
- ensure `manage.py` commands work
- ensure settings load from `.env`
- ensure the database connection succeeds
- ensure the API health endpoint returns `200`

Required sequence:

1. `python manage.py makemigrations`
2. `python manage.py migrate`
3. `python manage.py createsuperuser`
4. `python manage.py runserver`
5. open `/api/health/`

## Step 6. Add developer conventions

### Git

- feature branches per subsystem
- no direct commits to `main`
- one PR per meaningful unit of work
- migrations must be committed with model changes

### Naming

- Django apps are domain-based, not screen-based
- API paths use plural nouns when listing collections
- frontend component names match product language used in the spec

### Architecture boundaries

- do not put business logic in React screens
- do not put permission logic only in the client
- do not store image binaries in PostgreSQL
- do not hardcode region data in the frontend

## Step 7. Create a delivery board

Track work in these lanes:

- foundation
- backend core
- media pipeline
- mobile core
- admin shell
- testing
- deployment
- release

Each ticket must include:

- owner
- dependency
- acceptance criteria
- linked file or endpoint

## Step 8. Establish initial milestones

### Milestone A. Backend ready for frontend integration

Must include:

- auth
- region hierarchy
- seeded rate dashboard
- company directory
- news feed
- upload-session endpoints

### Milestone B. Mobile alpha

Must include:

- login
- onboarding
- dashboard
- market tiers
- company profile
- product search
- reverse search submit
- profile/preferences

### Milestone C. Admin alpha

Must include:

- hosted landing page
- admin login shell
- member review
- ad review
- manual rate update
- reverse-search queue

### Milestone D. Staging release

Must include:

- deployed API
- deployed database
- configured storage
- Firebase Hosting deployed
- signed Android test build

## Step 9. Prepare seed content early

Do not wait until the end to add data.

Seed at least:

- 3 states
- 6 districts
- 12 local chapters
- 20 companies
- 60 products
- 5 news items
- 3 urgent alerts
- 4 meeting events
- 5 service types
- 4 advertisements

Why this matters:

- the UI cannot be validated properly with empty states only
- region filters must be tested with real hierarchy depth
- ad and media approval flows need sample assets

## Step 10. Define done for the foundation phase

Foundation is complete only when:

- all developers can install and run the backend locally
- both frontend apps install successfully
- environment values are documented
- the repo structure is fixed
- the project board and milestones exist
- the backend health endpoint is live
- the team can start module work without blocking on setup questions

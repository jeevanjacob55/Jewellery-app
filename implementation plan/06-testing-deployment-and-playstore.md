# 06. Testing, Deployment, And Play Store Release

This document defines the last-mile delivery plan from local development to public release.

## Goal

Release a stable Android app and hosted web/admin system with observability, rollback options, and operational confidence.

## Step 1. Define the environment strategy

Use at least:

- local
- staging
- production

Each environment needs:

- API base URL
- database
- storage bucket config
- Firebase config
- secrets management

Keep production secrets outside the repo.

## Step 2. Set up database and backend hosting

Recommended production stack:

- Django app on a managed host
- PostgreSQL managed database
- object storage buckets

Examples of acceptable hosting patterns:

- Cloud Run + Cloud SQL
- Render + managed Postgres
- Railway + Postgres
- any equivalent managed setup with backups and environment secrets

Requirements regardless of provider:

- HTTPS
- environment variable support
- backup strategy
- log access
- health checks

## Step 3. Set up CI checks

At minimum CI should run:

- backend import/compile or tests
- Django test suite
- web-admin build
- mobile type check

Later enhancements:

- linting
- vulnerability scans
- release tagging

## Step 4. Write the backend test suite

Cover:

- authentication
- onboarding and region hierarchy
- dashboard payload
- directory filters
- enquiry creation
- upload-session access
- reverse-search request lifecycle
- ad approval flow
- admin-only access control

Prioritize tests that protect business rules and permissions.

## Step 5. Write frontend validation plans

### Mobile QA plan

Validate:

- splash routing
- login and guest access
- onboarding region selection
- dashboard refresh
- market tiers
- company profile and image rendering
- product search filters
- reverse-search submission and status tracking
- notification preference updates
- push notification deep linking

### Web QA plan

Validate:

- landing layout on mobile and desktop
- admin route protection
- rate update workflow
- ad moderation workflow
- reverse-search queue actions
- Firebase Hosting route rewrites

## Step 6. Add observability

Track at minimum:

- API errors
- slow endpoints
- failed uploads
- failed push notifications
- client crashes
- authentication failures

Add:

- structured server logs
- error monitoring
- release version labels

## Step 7. Create a staging environment

Staging must behave like production closely enough to validate:

- auth
- storage
- uploads
- notifications
- admin workflows
- deployed web app

Do not skip staging for media or notification features.

## Step 8. Perform UAT

Run real scenario tests with member-like and admin-like accounts.

Required UAT flows:

1. member login and onboarding
2. guest browse
3. rate review by region
4. company browse and enquiry
5. product filter use
6. reverse-search upload and supplier/admin response
7. service request review
8. urgent alert publication
9. ad submission and approval
10. member verification by admin

## Step 9. Prepare Android release configuration

Tasks:

- set final application id
- finalize app icon and splash assets
- configure version name and version code
- configure signing key
- verify permissions
- add privacy policy URL
- add support contact info

Double-check:

- camera/gallery permissions if used
- notification permissions for Android versions that require them

## Step 10. Prepare Play Store listing assets

Create:

- app title
- short description
- full description
- feature graphic
- phone screenshots
- privacy policy page
- support email and contact info
- release notes

Also complete:

- content rating questionnaire
- data safety section
- app access instructions if review requires credentials

## Step 11. Run internal and closed testing

Sequence:

1. internal testing build
2. fix blockers
3. closed testing with selected testers
4. collect feedback
5. fix high-priority defects
6. prepare production rollout

Do not push directly to production without at least one closed test cycle.

## Step 12. Deploy production services

Production deployment order:

1. deploy backend
2. run migrations
3. verify health endpoint
4. verify storage config
5. deploy Firebase-hosted web app
6. send a test push notification
7. verify admin login and one safe admin action

## Step 13. Release to production

Release the Android app gradually:

- start with staged rollout if possible
- monitor crash-free rate
- monitor failed login and upload rates
- monitor user support issues

Pause rollout if:

- auth is broken
- uploads fail broadly
- reverse-search privacy is compromised
- rates are incorrect

## Step 14. Prepare rollback procedures

Have a rollback plan for:

- backend deployment
- database migration issue
- broken ad or news publishing
- buggy mobile release

At minimum document:

- who decides rollback
- where logs are checked
- how to disable risky endpoints or features quickly

## Step 15. Post-launch support

During the first 2 weeks after launch:

- review logs daily
- review crash reports daily
- review support tickets daily
- monitor ad approval and reverse-search queues
- verify rate update correctness

Only start new feature work after the app is stable.

## Final Acceptance Checklist

The project is ready for public release when:

- backend is stable and monitored
- uploads work with correct privacy rules
- the web landing/admin app is deployed on Firebase Hosting
- Android builds install and function on target devices
- Play Console requirements are complete
- the team has a rollback and support plan

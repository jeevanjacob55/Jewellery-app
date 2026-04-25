# 05. Web Admin, Firebase Hosting, And Operations

This document defines the hosted web experience for the public landing pages and the internal admin shell.

## Goal

Ship a web surface that serves two jobs:

- public marketing and credibility for the association platform
- admin workflows for internal operations staff

## Step 1. Split the web app into two logical areas

### Public landing

Purpose:

- explain the platform
- build trust
- present the value to members and advertisers
- provide download or contact pathways

### Admin shell

Purpose:

- member verification
- rate updates
- news publishing
- ad review
- reverse-search queue review
- media moderation

These may live in one deployed app, but route groups and permissions must be separate.

## Step 2. Build the public landing pages

Recommended page set:

- home
- about the association/app
- features
- advertiser information
- support/contact
- privacy policy

The current scaffold covers the home/admin starting point, but production should add at least the privacy and support pages before release.

## Step 3. Build the admin app shell

Create a layout with:

- left navigation or top navigation
- authenticated route guard
- page header area
- content cards/grids
- alert banner area

Required admin routes:

- dashboard overview
- user/member verification
- rates management
- news and meetings
- advertisements
- reverse search queue
- media moderation
- audit logs

## Step 4. Connect the web app to the backend API

The admin shell should consume Django APIs for:

- summary metrics
- pending queues
- CRUD forms where needed
- upload sessions for creatives or editorial media

Rules:

- do not duplicate business logic in the web client
- the web client only presents workflows and validates user input
- permission enforcement stays in Django

## Step 5. Define admin roles

At minimum support:

- super admin
- operations admin
- content admin
- advertiser reviewer

Role effects:

- content admins can manage news and meetings
- advertiser reviewers can approve/reject ads
- operations admins can verify members and manage reverse-search queues
- super admins can do everything

## Step 6. Implement operations pages in order

### Admin dashboard overview

Show:

- active members
- verification pending count
- ad approval pending count
- reverse-search pending count
- recent system actions

### Member verification page

Allow:

- search by user/company
- review submitted information
- mark verified or rejected
- write notes

### Rate management page

Allow:

- update gold/silver rates
- record effective time
- compare with previous values
- save changes with audit logging

### News and meetings page

Allow:

- create urgent alerts
- schedule regular news posts
- create and edit meeting entries

### Ad review page

Allow:

- preview uploaded creatives
- inspect targeting
- approve/reject with notes

### Reverse-search queue page

Allow:

- inspect request details
- view private attachments
- assign suppliers if needed
- respond and change status

### Media moderation page

Allow:

- view pending media assets
- approve or reject
- replace or reorder public assets

## Step 7. Configure Firebase Hosting

### Build output

The current config points to:

- `web-admin/dist`

### Deployment flow

1. build the React app
2. confirm `firebase.json`
3. authenticate with Firebase CLI
4. deploy hosting

### Hosting rules

- all app routes must rewrite to `index.html`
- static assets must be cacheable
- no secrets belong in the built bundle

## Step 8. Add Firebase project configuration

Tasks:

- create or select Firebase project
- enable Hosting
- add web app config
- set preview channels for staging if desired

If push notification admin tools later use Firebase services directly, keep credentials server-side where possible.

## Step 9. Integrate Firebase Cloud Messaging

The web admin itself may not need push notifications immediately, but Firebase configuration should be aligned with the Android app project.

Use FCM for:

- Android member notifications
- possible future browser notifications for admins if needed

## Step 10. Secure the admin experience

Security rules:

- all admin routes require authentication
- all admin actions require backend authorization
- do not trust role claims only in frontend state
- protect sensitive pages from being indexed
- use audit logging for privileged actions

## Step 11. Add operational runbooks

Document how admins should handle:

- rate update mistakes
- accidental ad approval
- inappropriate uploads
- reverse-search privacy complaints
- urgent government-policy alerts

Operational docs can later live in a separate folder, but the workflows should already be reflected in the admin UI design.

## Step 12. Add staging validation for the web app

Before production:

- validate all route guards
- confirm API base URLs
- confirm upload session flow
- confirm Firebase deploy works from CI or local release process
- confirm privacy policy and support pages are published

## Definition Of Done

Web admin and hosting are complete when:

- the public landing is deployed on Firebase Hosting
- the admin shell connects to real APIs
- admins can complete core workflows without using Django admin only
- permissions are enforced by the backend
- the hosted frontend can be built and deployed reproducibly

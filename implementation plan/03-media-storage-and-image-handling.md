# 03. Media Storage And Image Handling

This document explains exactly how images and uploaded files will be stored and managed.

## Goal

Support fast, secure, and scalable handling of:

- company logos
- company gallery images
- product catalog images
- ad creatives
- reverse-search reference uploads
- response attachments if needed later

## Storage Principle

Do not store binary image files in PostgreSQL.

Instead:

- store binaries in object storage
- store metadata and permissions in Django
- use signed upload and download flows for protected content

## Step 1. Create storage buckets

Recommended setup:

- one public or semi-public bucket for approved display assets
- one private bucket for protected uploads

Suggested buckets:

- `jewellery-association-media`
- `jewellery-association-private-media`

If bucket separation is not possible, use prefixes with strict IAM and signing rules, but separate buckets are safer and easier to reason about.

## Step 2. Standardize object key design

Use deterministic, segmented paths:

- `companies/{company_id}/logo/{uuid}-{filename}`
- `companies/{company_id}/gallery/{uuid}-{filename}`
- `products/{company_id}/{product_id}/{uuid}-{filename}`
- `ads/{advertiser_id}/{campaign_id}/{uuid}-{filename}`
- `reverse-search/{request_id}/original/{uuid}-{filename}`
- `reverse-search/{request_id}/responses/{uuid}-{filename}`

Rules:

- always include a UUID to prevent collisions
- preserve a cleaned version of the original filename for easier debugging
- never expose sensitive identity data in object keys

## Step 3. Define visibility policy

### Public-readable after approval

- company logos
- approved company gallery images
- approved product images
- approved ad creatives that are active

### Private only

- reverse-search uploads
- admin evidence documents
- rejected or pending ad creatives
- unreviewed company or product uploads if moderation is required

## Step 4. Implement upload authorization flow

The upload flow must be:

1. client asks Django for an upload session
2. Django validates the actor, target entity, file type, and size
3. Django returns:
   - bucket name
   - object key
   - expiry
   - signed upload URL or upload token
4. client uploads directly to cloud storage
5. client calls Django finalize endpoint
6. Django stores `MediaAsset` metadata and attaches it to the owning domain object

Why this design:

- the backend stays in control of permissions
- large files do not pass through the application server
- upload failures are easier to retry

## Step 5. Validate files before granting upload sessions

Validation rules must include:

- allowed mime types
- max file size
- max image dimensions if needed
- target entity ownership
- per-role permissions

Recommended v1 rules:

- logos: max `2 MB`
- company/product images: max `5 MB`
- ad creatives: max `5 MB` with required aspect ratios
- reverse-search uploads: max `8 MB` per file and max file count per request

Allowed types:

- `image/jpeg`
- `image/png`
- `image/webp`

Avoid SVG uploads in v1 unless sanitization is added.

## Step 6. Finalize metadata persistence

After upload completes, store:

- uploader user id
- target domain object id
- bucket
- object key
- original filename
- mime type
- size
- width
- height
- visibility
- moderation status
- alt text
- caption
- sort order
- timestamps

Finalization must fail if:

- the uploaded object does not exist
- the file metadata does not match the requested session
- the actor is not authorized

## Step 7. Implement image processing

For public-facing images, generate:

- thumbnail
- list/card size
- detail size

Keep the original.

Processing pipeline:

1. original upload stored
2. background job or synchronous worker creates derivative sizes
3. derivative object keys are saved in metadata or in a variant table
4. frontend receives correct URLs per use case

If asynchronous processing is introduced later, mark assets as:

- `processing`
- `ready`
- `failed`

## Step 8. Add moderation rules

### Company and product images

Recommended v1:

- allow direct publication only for trusted admin-managed uploads
- require approval for member-submitted or advertiser-submitted uploads

### Ad creatives

Always require review.

### Reverse-search uploads

No visual moderation is needed for publication, but strict privacy is mandatory.

## Step 9. Deliver public assets efficiently

For approved public assets:

- serve through CDN
- use long cache headers
- use versioned object keys
- avoid changing content in place without changing the key

For image URLs:

- the API can return direct CDN URLs
- or return API-computed URLs based on variant and visibility

Preferred v1 behavior:

- backend returns explicit URLs so client logic stays simple

## Step 10. Deliver private assets safely

For protected assets:

- never expose open bucket URLs
- use short-lived signed download URLs or backend streaming endpoints
- log privileged access where appropriate

Suggested expiry:

- `5 to 15 minutes`

Reverse-search rule:

- only the request owner, assigned suppliers, and admins can access attachments

## Step 11. Add cleanup and lifecycle rules

Lifecycle rules should eventually archive or delete:

- abandoned draft uploads not finalized within a time window
- rejected creatives older than a retention threshold
- duplicate processing artifacts

Do not automatically delete:

- active ads
- approved company/product images
- reverse-search uploads still tied to open requests

## Step 12. Add admin media operations

Admin capabilities must include:

- review pending uploads
- approve/reject assets
- replace a company logo
- reorder gallery images
- remove invalid or duplicate images
- inspect upload metadata

## Step 13. Add tests for media workflows

Test:

- upload session creation permissions
- invalid file type rejection
- oversize file rejection
- finalize success
- finalize failure for missing object
- private asset access denial
- signed URL expiry behavior
- ad moderation flow

## Definition Of Done

Media implementation is complete when:

- all image classes have a clear storage path
- upload sessions are backend-authorized
- binaries never touch PostgreSQL
- public and private delivery rules are enforced
- ad and reverse-search assets follow different privacy rules
- image variants are generated or a clear placeholder strategy exists

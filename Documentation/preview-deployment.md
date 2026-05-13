# Preview Deployment

## Repo files prepared for Render preview

- `render.yaml`
- `backend/.env.render.preview.example`
- `web-admin/.env.render.preview.example`
- `frontend-mobile/.env.render.preview.example`

## Mobile preview

- Install Expo EAS CLI and log in.
- Copy `frontend-mobile/.env.render.preview.example` to `frontend-mobile/.env`.
- Replace `preview-api.yourdomain.com` with your real preview API hostname.
- Build an Android preview APK:

```bash
cd frontend-mobile
eas build --platform android --profile preview
```

- Share the generated internal-distribution link with the client.

## Backend preview

- Use the root `render.yaml` blueprint for the Django API and PostgreSQL preview database.
- Copy `backend/.env.render.preview.example` values into Render env vars.
- In Cloudflare R2, create:
  - one public bucket for images the client should load directly
  - one private bucket for restricted uploads like reverse-search attachments
  - an R2 access key pair with read/write access to those buckets
  - a public delivery URL for the public bucket, either an `r2.dev` URL or a custom domain
- Replace these placeholders with your real values:
  - `preview-api.yourdomain.com`
  - `admin.yourdomain.com`
  - PostgreSQL connection string
  - public/private R2 bucket names
  - public media base URL
  - Cloudflare account ID
  - R2 access key ID
  - R2 secret access key
- Set these Render environment variables before the first deploy:
  - `MEDIA_PUBLIC_BUCKET_NAME`
  - `MEDIA_PRIVATE_BUCKET_NAME`
  - `MEDIA_PUBLIC_BASE_URL`
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
- Point your preview API hostname to the Render service.
- Keep `MEDIA_STORAGE_PROVIDER=r2` for preview if you want cloud-backed uploads.
- If you leave `R2_ENDPOINT_URL` blank, the app will derive it from `R2_ACCOUNT_ID`.

## Web admin preview

- Copy `web-admin/.env.render.preview.example` to `web-admin/.env`.
- Replace `preview-api.yourdomain.com` with your real preview API hostname.
- Build and deploy the static site to Firebase Hosting.

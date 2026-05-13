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
- Replace these placeholders with your real values:
  - `preview-api.yourdomain.com`
  - `admin.yourdomain.com`
  - PostgreSQL connection string
  - public/private GCS bucket names
  - service-account JSON
- Set these Render environment variables before the first deploy:
  - `GCS_BUCKET_NAME`
  - `GCS_PRIVATE_BUCKET_NAME`
  - `GCS_SERVICE_ACCOUNT_JSON`
- Point your preview API hostname to the Render service.
- Keep `MEDIA_STORAGE_PROVIDER=gcs` for preview if you want cloud-backed uploads.

## Web admin preview

- Copy `web-admin/.env.render.preview.example` to `web-admin/.env`.
- Replace `preview-api.yourdomain.com` with your real preview API hostname.
- Build and deploy the static site to Firebase Hosting.

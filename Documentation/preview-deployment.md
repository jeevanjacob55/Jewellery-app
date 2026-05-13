# Preview Deployment

## Mobile preview

- Install Expo EAS CLI and log in.
- Set `frontend-mobile/.env` with:
  - `EXPO_PUBLIC_API_BASE_URL=https://preview-api.yourdomain.com/api`
- Build an Android preview APK:

```bash
cd frontend-mobile
eas build --platform android --profile preview
```

- Share the generated internal-distribution link with the client.

## Backend preview

- Use the root `render.yaml` blueprint for the Django API and PostgreSQL preview database.
- Set these Render environment variables before the first deploy:
  - `GCS_BUCKET_NAME`
  - `GCS_PRIVATE_BUCKET_NAME`
  - `GCS_SERVICE_ACCOUNT_JSON`
- Point your preview API hostname to the Render service.

## Web admin preview

- Set `web-admin/.env` with:
  - `VITE_API_BASE_URL=https://preview-api.yourdomain.com/api`
- Build and deploy the static site to Firebase Hosting.

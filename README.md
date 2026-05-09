# Jewellery Association App
## First read the [Developer_Guide.docx](./jewellery_app_developer_guide.docx)
Monorepo scaffold for a jewellery association platform with:

- `backend/`: Django + Django REST Framework API
- `frontend-mobile/`: Expo React Native Android app
- `web-admin/`: React + Firebase Hosting landing/admin shell

## Project Structure

```text
backend/
frontend-mobile/
web-admin/
firebase.json
```

## Backend

1. Create a Python virtual environment.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Copy `backend/.env.example` to `backend/.env` and adjust values.
4. Run migrations:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo_data --reset
python manage.py runserver
```

5. Seed deterministic local demo data when you want realistic mobile-facing records:

```bash
cd backend
python manage.py seed_demo_data
python manage.py seed_demo_data --reset
```

6. Run the backend test suite with the explicit app-label command:

```bash
cd ..
backend\venv\Scripts\python.exe backend\manage.py test apps.accounts apps.regions apps.rates apps.directory apps.reverse_search apps.services_app apps.news apps.ads apps.admin_ops
```

## Mobile App

1. Install dependencies:

```bash
cd frontend-mobile
npm install
```

2. Start the Expo app:

```bash
npm run start
```

## Web Admin / Landing

1. Install dependencies:

```bash
cd web-admin
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for Firebase Hosting:

```bash
npm run build
```

## Firebase Hosting

- `web-admin/dist` is configured as the hosting target.
- The hosted app is intended for the landing site and web admin shell.
- The mobile app is distributed through the Google Play Store, not Firebase Hosting.

## Media Storage

- Binary files should live in Google Cloud Storage or Firebase Storage.
- Django stores metadata, ownership, moderation state, and signed-upload flow details.
- Reverse-search images remain private by default.

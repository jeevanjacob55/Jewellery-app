# Developer Setup Guide

## Purpose
This guide helps a new developer:

- clone the repository
- install backend, mobile, and web admin dependencies
- configure local environment files
- run the backend
- run the mobile app
- run the web admin

## Repository Layout

- `backend/`
  Django + Django REST Framework API
- `frontend-mobile/`
  Expo React Native mobile app
- `web-admin/`
  React + Vite web admin app

## Prerequisites

- `git`
- `Python 3.12+` recommended
- `Node.js 18+`
- `npm`
- Android Studio or Expo Go for mobile testing

## 1. Clone The Repository

```powershell
git clone <your-repo-url>
cd Jewellery-app
```

If your cloned folder has a different name, use that folder instead.

## 2. Backend Setup

### Create a virtual environment

From the repository root:

```powershell
python -m venv backend\venv
```

### Activate the virtual environment

```powershell
backend\venv\Scripts\Activate.ps1
```

### Install backend dependencies

```powershell
pip install -r backend\requirements.txt
```

### Configure backend environment

Copy the example file:

```powershell
Copy-Item backend\.env.example backend\.env
```

The default local setup already uses SQLite and allows:

- `http://localhost:5173` for `web-admin`
- `http://localhost:8081` for Expo/mobile development

### Run migrations

```powershell
cd backend
python manage.py migrate
```

Optional useful setup:

```powershell
python manage.py createsuperuser
python manage.py seed_demo_data --reset
```

### Start the backend server

```powershell
python manage.py runserver
```

Backend will be available at:

```text
http://127.0.0.1:8000
```

Leave this terminal running.

## 3. Mobile App Setup

Open a new terminal from the repository root.

### Install mobile dependencies

```powershell
cd frontend-mobile
npm install
```

### Configure mobile environment

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Default values in `frontend-mobile/.env.example` already show the right API base URL patterns for:

- Android Studio emulator: `http://10.0.2.2:8000/api`
- physical Android on Wi-Fi: your machine LAN IP
- physical Android over USB with `adb reverse`: `http://127.0.0.1:8000/api`

### Start the mobile app

```powershell
npm run start
```

Other useful mobile commands:

```powershell
npm run start:clear
npm run start:tunnel
npm run android
npm run android:device
```

## 4. Web Admin Setup

Open another new terminal from the repository root.

### Install web admin dependencies

```powershell
cd web-admin
npm install
```

### Configure web admin environment

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Default local API base:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### Start the web admin

```powershell
npm run dev
```

The Vite dev server usually runs at:

```text
http://localhost:5173
```

Common routes:

- `http://localhost:5173/login`
- `http://localhost:5173/admin`
- `http://localhost:5173/admin/overview`

## Recommended Startup Order

1. Start `backend`
2. Start `frontend-mobile`
3. Start `web-admin`

This avoids frontend errors like `Failed to fetch` when the API is not running yet.

## Useful Build Commands

### Web admin production build

```powershell
cd web-admin
npm run build
```

### Backend tests

From the repository root:

```powershell
backend\venv\Scripts\python.exe backend\manage.py test apps.accounts apps.regions apps.rates apps.directory apps.reverse_search apps.services_app apps.news apps.ads apps.admin_ops
```

## Troubleshooting

### Web admin says `can't reach this page`

- make sure `npm run dev` is running in `web-admin`
- confirm the browser URL matches the Vite port shown in the terminal

### Web admin says `Failed to fetch`

- make sure Django is running on port `8000`
- verify `web-admin/.env` points to `http://127.0.0.1:8000/api`

### Mobile app cannot reach backend

- check `frontend-mobile/.env`
- use the correct API host for your device/emulator type

### Backend import or migration issues

- make sure the backend virtual environment is activated
- rerun:

```powershell
pip install -r backend\requirements.txt
python backend\manage.py migrate
```

## Quick Start Summary

Terminal 1:

```powershell
cd backend
..\backend\venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver
```

Terminal 2:

```powershell
cd frontend-mobile
npm install
npm run start
```

Terminal 3:

```powershell
cd web-admin
npm install
npm run dev
```

# Run the Mobile App on Android with USB

This guide explains how to run `frontend-mobile/` on a physical Android phone connected by USB.

## 1. Prerequisites

Install these tools on your computer:

- Node.js 18+ and `npm`
- Python and the backend dependencies from `backend/requirements.txt`
- Android Studio
- Android SDK and Platform Tools (`adb`)

If `adb` is not available in PowerShell, add your Android SDK `platform-tools` folder to `PATH`.

Example Windows path:

```powershell
C:\Users\<your-user>\AppData\Local\Android\Sdk\platform-tools
```

## 2. Enable USB debugging on the phone

On the Android device:

1. Open `Settings > About phone`.
2. Tap `Build number` 7 times to enable developer options.
3. Open `Settings > Developer options`.
4. Enable `USB debugging`.
5. Connect the phone to the computer with a USB cable.
6. Accept the `Allow USB debugging` prompt on the phone.

Verify the connection:

```powershell
adb devices
```

You should see your device listed as `device`. If it shows `unauthorized`, unlock the phone and accept the prompt again.

## 3. Install project dependencies

From the repository root:

```powershell
pip install -r backend/requirements.txt
cd frontend-mobile
npm install
cd ..
```

## 4. Point the mobile app to the local backend

For a real Android device over USB, use `adb reverse` and set the mobile API URL to localhost.

Update `frontend-mobile/.env` to:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

Notes:

- `10.0.2.2` is for the Android emulator, not a physical phone.
- If you change `.env`, restart Expo and rebuild the app.

## 5. Start the backend

Open a terminal in the repo root and run:

```powershell
cd backend
python manage.py migrate
python manage.py seed_demo_data --reset
python manage.py runserver 0.0.0.0:8000
```

`seed_demo_data --reset` is optional, but useful for local testing.

## 6. Forward the backend port over USB

In a second terminal:

```powershell
adb reverse tcp:8000 tcp:8000
```

If your backend uses a different port, change both sides of that command and update `.env` to match.

If you have more than one Android device connected:

```powershell
adb devices
adb -s <device-serial> reverse tcp:8000 tcp:8000
```

## 7. Build and run the Android app

In a third terminal:

```powershell
cd frontend-mobile
npm run android -- --device
```

What to expect:

- Expo will build and install the development app on the connected phone.
- The first build can take several minutes.
- If no native `android/` folder exists yet, Expo may generate it during the run.

## 8. Useful follow-up commands

Restart the Metro bundler:

```powershell
cd frontend-mobile
npx expo start --clear
```

Re-check USB connection:

```powershell
adb devices
```

Remove port forwarding:

```powershell
adb reverse --remove tcp:8000
```

## 9. Troubleshooting

### Device not detected

- Try a different USB cable.
- Change the phone's USB mode to `File Transfer`.
- Install the device OEM USB driver if Windows does not recognize the phone.

### `adb` command not found

- Confirm Android SDK Platform Tools are installed.
- Add the `platform-tools` directory to `PATH`.
- Restart PowerShell after updating `PATH`.

### App opens but cannot reach the backend

- Confirm the backend is running on port `8000`.
- Confirm `frontend-mobile/.env` uses `http://127.0.0.1:8000/api`.
- Re-run `adb reverse tcp:8000 tcp:8000`.
- Restart the Expo build after changing environment variables.

### Phone still shows an old build

- Re-run:

```powershell
cd frontend-mobile
npx expo start --clear
npm run android -- --device
```

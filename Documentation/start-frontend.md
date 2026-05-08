For Expo Go over Wi‑Fi:

.env should use your laptop’s current Wi‑Fi IP, like EXPO_PUBLIC_API_BASE_URL=http://10.226.44.83:8000/api
Run npm.cmd run start:clear
Scan the QR in Expo Go
If that still doesn’t open, run npm.cmd run start:tunnel

Notes:
- Expo Go should show an `exp://` QR/session, not `exp+jewellery-association://expo-development-client/...`
- If you see `expo-development-client`, you are starting the custom development build flow instead of Expo Go
- Use `npm.cmd run start:dev-client` only when you want the installed development build on the device to open

For USB:

Do not use Expo Go QR as the main launch path
Set .env to EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
Run npm.cmd run usb:prepare
Then run npm.cmd run android:device

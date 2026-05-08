param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$adbCommand = Get-Command adb -ErrorAction SilentlyContinue

if (-not $adbCommand) {
  throw "adb was not found in PATH. Install Android SDK Platform Tools and add platform-tools to PATH."
}

Write-Host "Using adb:" $adbCommand.Source

$deviceOutput = & adb devices
$deviceLines = @(
  $deviceOutput |
    Select-Object -Skip 1 |
    Where-Object { $_.Trim() }
)

if ($deviceLines.Count -eq 0) {
  throw "No Android devices detected. Connect your phone by USB, enable USB debugging, and accept the trust prompt."
}

$unauthorizedDevices = @($deviceLines | Where-Object { $_ -match "\sunauthorized$" })
if ($unauthorizedDevices.Count -gt 0) {
  throw "A connected device is unauthorized. Unlock the phone and accept the USB debugging prompt, then rerun the script."
}

$readyDevices = @($deviceLines | Where-Object { $_ -match "\sdevice$" })
if ($readyDevices.Count -eq 0) {
  throw "No authorized Android device is ready. Current adb output:`n$($deviceLines -join "`n")"
}

foreach ($line in $readyDevices) {
  $serial = ($line -split "\s+")[0]
  Write-Host "Applying adb reverse on $serial for tcp:$Port ..."
  & adb -s $serial reverse "tcp:$Port" "tcp:$Port" | Out-Host
}

Write-Host ""
Write-Host "USB reverse is ready."
Write-Host "Set frontend-mobile/.env to EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:$Port/api"
Write-Host "Then run:"
Write-Host "  cd frontend-mobile"
Write-Host "  npm.cmd run android:device"

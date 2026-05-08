param(
  [switch]$Clear
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-metro.ps1")

$arguments = @("expo", "start", "--go", "--lan")
if ($Clear) {
  $arguments += "--clear"
}

Write-Host "Starting Expo in LAN mode for Expo Go..."
Push-Location $projectRoot
try {
  & npx.cmd @arguments
} finally {
  Pop-Location
}

param(
  [switch]$Clear
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-metro.ps1")

$arguments = @("expo", "start", "--go", "--tunnel")
if ($Clear) {
  $arguments += "--clear"
}

Write-Host "Starting Expo in tunnel mode for Expo Go..."
Push-Location $projectRoot
try {
  & npx.cmd @arguments
} finally {
  Pop-Location
}

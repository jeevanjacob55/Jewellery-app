param(
  [int[]]$Ports = @(8081, 8082, 19000, 19001, 19002)
)

$ErrorActionPreference = "Stop"

$listeners = foreach ($port in $Ports) {
  netstat -ano |
    Select-String ":$port" |
    ForEach-Object {
      $parts = ($_ -replace "\s+", " ").Trim().Split(" ")
      if ($parts.Length -ge 5 -and $parts[3] -eq "LISTENING") {
        [pscustomobject]@{
          Port = $port
          Pid = [int]$parts[4]
        }
      }
    }
}

$targets = @($listeners | Sort-Object Pid -Unique)

if ($targets.Count -eq 0) {
  Write-Host "No Metro or Expo listeners found on the common development ports."
  exit 0
}

foreach ($target in $targets) {
  try {
    $process = Get-Process -Id $target.Pid -ErrorAction Stop
    Write-Host "Stopping PID $($target.Pid) ($($process.ProcessName)) on port $($target.Port)..."
    Stop-Process -Id $target.Pid -Force
  } catch {
    Write-Warning "Unable to stop PID $($target.Pid) on port $($target.Port): $($_.Exception.Message)"
  }
}

Write-Host "Metro cleanup finished."

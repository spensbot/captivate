# Tails the unified Captivate verbose log (always on; no env vars required).
# Live file: %APPDATA%\captivate2\logs\captivate-verbose.ndjson (Windows)
$logDir = Join-Path $env:APPDATA 'captivate2\logs'
$path = Join-Path $logDir 'captivate-verbose.ndjson'
if (-not (Test-Path $path)) {
  Write-Host "File not found: $path"
  Write-Host "Start Captivate and reproduce the issue, then re-run."
  exit 1
}
Write-Host "Tailing $path (Ctrl+C to stop)..."
Get-Content -LiteralPath $path -Tail 50 -Wait

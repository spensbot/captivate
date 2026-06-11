# Tails the unified Captivate verbose log (see docs/DEBUG_TELEMETRY.md).
$logDir = Join-Path $env:APPDATA 'captivate2\logs'
$path = Join-Path $logDir 'captivate-verbose.ndjson'
if (-not (Test-Path $path)) {
  Write-Host "File not found: $path"
  Write-Host "Start Captivate, then re-run."
  exit 1
}
Write-Host "Tailing $path (Ctrl+C to stop)..."
Get-Content -LiteralPath $path -Tail 40 -Wait

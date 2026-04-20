# Tails Lighting 3D telemetry marks written by the main process when
# CAPTIVATE_TELEMETRY_LIVE_LOG=1 is set (see docs/DEBUG_TELEMETRY.md).
$path = Join-Path $env:TEMP 'captivate-telemetry-lighting3d-live.ndjson'
if (-not (Test-Path $path)) {
  Write-Host "File not found: $path"
  Write-Host "Start Captivate with env CAPTIVATE_TELEMETRY_LIVE_LOG=1, open Lighting 3D, then re-run."
  exit 1
}
Write-Host "Tailing $path (Ctrl+C to stop)..."
Get-Content -LiteralPath $path -Tail 40 -Wait

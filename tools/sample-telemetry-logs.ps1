Start-Sleep -Seconds 28
$nd = Join-Path $env:TEMP 'captivate-telemetry-lighting3d-live.ndjson'
$diag = Join-Path $env:APPDATA 'captivate2\logs\captivate-diagnostics.log'
Write-Host '--- NDJSON (last 15 lines) ---'
if (Test-Path -LiteralPath $nd) {
  Get-Content -LiteralPath $nd -Tail 15
} else {
  Write-Host '(missing — packaged build may predate live log, or Lighting 3D not open yet)'
}
Write-Host '--- diagnostics (last 10 lines) ---'
if (Test-Path -LiteralPath $diag) {
  Get-Content -LiteralPath $diag -Tail 10
}

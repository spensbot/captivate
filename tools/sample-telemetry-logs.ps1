Start-Sleep -Seconds 28
$verbose = Join-Path $env:APPDATA 'captivate2\logs\captivate-verbose.ndjson'
Write-Host '--- Unified verbose log (last 20 lines) ---'
if (Test-Path -LiteralPath $verbose) {
  Get-Content -LiteralPath $verbose -Tail 20
} else {
  Write-Host '(missing — start Captivate and reproduce the issue first)'
}

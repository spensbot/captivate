param(
  [int]$DurationSec = 300,
  [switch]$LaunchInstalledApp
)

$ErrorActionPreference = 'Continue'

$diagPath = Join-Path $env:APPDATA 'captivate2\logs\captivate-diagnostics.log'
$installedExe = Join-Path $env:LOCALAPPDATA 'Programs\captivate2\Captivate 2.exe'

if (!(Test-Path $diagPath)) {
  New-Item -ItemType File -Force -Path $diagPath | Out-Null
}

if ($LaunchInstalledApp) {
  if (Test-Path $installedExe) {
    Start-Process -FilePath $installedExe | Out-Null
    Write-Host "Launched: $installedExe"
  } else {
    Write-Warning "Installed app executable not found at: $installedExe"
  }
}

Write-Host "Watching diagnostics log: $diagPath"
Write-Host "Duration: $DurationSec seconds"

$start = Get-Date
$lineCursor = (Get-Content -Path $diagPath -ErrorAction SilentlyContinue).Count
$lastProcAt = Get-Date

while (((Get-Date) - $start).TotalSeconds -lt $DurationSec) {
  Start-Sleep -Milliseconds 1200

  if (((Get-Date) - $lastProcAt).TotalSeconds -ge 10) {
    $procs = Get-Process | Where-Object {
      $_.ProcessName -like 'Captivate*' -or $_.Path -like '*captivate2*'
    }
    if ($procs) {
      foreach ($p in $procs) {
        $cpu = if ($null -ne $p.CPU) { [math]::Round($p.CPU, 2) } else { 0 }
        $ws = [math]::Round($p.WorkingSet64 / 1MB, 1)
        Write-Host ("[proc] {0} pid={1} ws={2}MB cpu={3}" -f $p.ProcessName, $p.Id, $ws, $cpu)
      }
    } else {
      Write-Host "[proc] no Captivate process"
    }
    $lastProcAt = Get-Date
  }

  $lines = Get-Content -Path $diagPath -ErrorAction SilentlyContinue
  if ($lines.Count -le $lineCursor) {
    continue
  }

  $newLines = $lines[$lineCursor..($lines.Count - 1)]
  $lineCursor = $lines.Count
  foreach ($line in $newLines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    try {
      $obj = $line | ConvertFrom-Json
      $area = [string]$obj.area
      $event = [string]$obj.event
      $level = [string]$obj.level
      $msg = [string]$obj.message
      if ($area -match 'visualizer|renderer|window|process|engine' -or $level -in @('warn', 'error')) {
        Write-Host ("[diag] {0} {1}/{2}: {3}" -f $level.ToUpper(), $area, $event, $msg)
      }
    } catch {
      if ($line -match 'visualizer|warn|error|stall|freeze|fps|lag') {
        Write-Host "[diag-raw] $line"
      }
    }
  }
}

Write-Host 'Telemetry watch complete.'

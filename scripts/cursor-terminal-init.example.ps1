# Optional local helper (copy to cursor-terminal-init.ps1 via `npm run setup:local-cursor-node`).
# Prepends a Node install that satisfies .node-version to PATH so integrated terminals
# do not pick an editor-bundled Node first.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$minFile = Join-Path $repoRoot '.node-version'
$minStr = '25.9.0'
if (Test-Path $minFile) {
  $line = ((Get-Content $minFile -Raw) -split "`n")[0]
  $minStr = (($line -replace '#.*$', '').Trim()).TrimStart('v')
}
$minVer = [version]$minStr

function Get-NodeVersionFromExe {
  param([string]$NodeExe)
  try {
    $out = & $NodeExe -p "process.version.slice(1)" 2>$null
    if (-not $out) { return $null }
    return [version]($out.Trim())
  } catch {
    return $null
  }
}

function Test-NodeDir {
  param([string]$Dir)
  if (-not $Dir) { return $null }
  $exe = Join-Path $Dir 'node.exe'
  if (-not (Test-Path $exe)) { return $null }
  $v = Get-NodeVersionFromExe $exe
  if ($null -eq $v -or $v -lt $minVer) { return $null }
  return @{ Dir = $Dir; Version = $v }
}

$hits = New-Object System.Collections.ArrayList

if ($env:CAPTIVATE_NODE_BIN) {
  $t = Test-NodeDir $env:CAPTIVATE_NODE_BIN
  if ($t) { [void]$hits.Add($t) }
}

foreach ($base in @(
    (Join-Path $env:ProgramFiles 'nodejs'),
    (Join-Path ${env:ProgramFiles(x86)} 'nodejs')
  )) {
  $t = Test-NodeDir $base
  if ($t) { [void]$hits.Add($t) }
}

$wingetRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
if (Test-Path $wingetRoot) {
  Get-ChildItem $wingetRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'OpenJS.NodeJS*' } |
    ForEach-Object {
      Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'node-*-win-x64' } |
        ForEach-Object {
          $t = Test-NodeDir $_.FullName
          if ($t) { [void]$hits.Add($t) }
        }
    }
}

foreach ($sym in @($env:NVM_SYMLINK, $env:NVM4W_SYMLINK)) {
  $t = Test-NodeDir $sym
  if ($t) { [void]$hits.Add($t) }
}

if ($hits.Count -eq 0) {
  $hint = if (Test-Path $minFile) { (Get-Content $minFile -Raw).Trim() } else { $minStr }
  Write-Host "Captivate: No Node $minStr+ on this machine. Install Node $hint (see .node-version) or set CAPTIVATE_NODE_BIN to the folder that contains node.exe." -ForegroundColor Yellow
} else {
  $best = $hits | Sort-Object -Property { $_.Version } -Descending | Select-Object -First 1
  $env:PATH = "$($best.Dir);$env:PATH"
}

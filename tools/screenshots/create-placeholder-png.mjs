/**
 * Create a dark placeholder PNG with a title label.
 *
 * Usage:
 *   node tools/screenshots/create-placeholder-png.mjs out.png "Label text"
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const outPath = process.argv[2]
const label = process.argv[3] || 'PLACEHOLDER'

if (!outPath) {
  console.error('Usage: node create-placeholder-png.mjs <out.png> [label]')
  process.exit(1)
}

const absOut = path.resolve(outPath)
fs.mkdirSync(path.dirname(absOut), { recursive: true })

if (process.platform === 'win32') {
  const scriptPath = absOut + '.ps1'
  const ps = `
Add-Type -AssemblyName System.Drawing
$w = 1440; $h = 900
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(255, 28, 30, 34))
$font = New-Object System.Drawing.Font 'Segoe UI', 36, [System.Drawing.FontStyle]::Bold
$sub = New-Object System.Drawing.Font 'Segoe UI', 18
$white = [System.Drawing.Brushes]::White
$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 160, 170, 180))
$g.DrawString('SCREENSHOT PLACEHOLDER', $sub, $muted, 48, 48)
$g.DrawString(${JSON.stringify(label)}, $font, $white, 48, 120)
$g.DrawString('Re-run npm run screenshots:capture to replace.', $sub, $muted, 48, 220)
$bmp.Save(${JSON.stringify(absOut)}, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
`
  fs.writeFileSync(scriptPath, ps, 'utf8')
  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-File', scriptPath],
    { encoding: 'utf8' }
  )
  fs.unlinkSync(scriptPath)
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status || 1)
  }
  console.log(`Wrote ${absOut}`)
  process.exit(0)
}

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  'base64'
)
fs.writeFileSync(absOut, png)
console.log(`Wrote minimal placeholder ${absOut}`)

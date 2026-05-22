/**
 * Windows packaging often fails with:
 *   remove ...\win-unpacked\resources\app.asar: The process cannot access the file
 * because another process still has the archive open. Common holders:
 *   - IDE / search indexing the repo (e.g. ripgrep watching `release/**`)
 *   - Explorer preview or an old Captivate/Electron instance
 *   - Real-time antivirus scanning a freshly written asar
 *
 * Default on Windows: write to a fresh `release/build-installer-<timestamp>/` so
 * electron-builder never has to delete a locked `app.asar` from `release/build`.
 *
 * Override output directory (fixed path, may hit locks):
 *   set CAPTIVATE_EBUILDER_OUTPUT=release/build
 *
 * Usage:
 *   node tools/run-electron-builder-installer.cjs
 *   node tools/run-electron-builder-installer.cjs --win
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const repoRoot = path.join(__dirname, '..')
process.chdir(repoRoot)

const extraArgs = process.argv.slice(2).filter((a) => a.startsWith('--'))

const envOut = process.env.CAPTIVATE_EBUILDER_OUTPUT?.trim()
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
const useTimestampedOutput =
  process.platform === 'win32' && (!envOut || envOut.length === 0)
const outputDir =
  envOut && envOut.length > 0
    ? envOut
    : useTimestampedOutput
      ? path.join('release', `build-installer-${stamp}`)
      : path.join('release', 'build')

const ebCli = path.join(repoRoot, 'node_modules', 'electron-builder', 'cli.js')
const args = [
  ebCli,
  'build',
  '--publish',
  'never',
  `--config.directories.output=${outputDir}`,
  ...extraArgs,
]

console.log(`[captivate] electron-builder output: ${outputDir}`)
if (useTimestampedOutput) {
  console.log(
    '[captivate] Using a timestamped output folder to avoid locked release/build/app.asar.'
  )
}

const r = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  cwd: repoRoot,
  env: process.env,
})

const code = r.status === null ? 1 : r.status
if (code === 0) {
  const winUnpacked = path.join(repoRoot, outputDir, 'win-unpacked')
  const setupExe = path.join(repoRoot, outputDir, 'Captivate 2 Setup 1.0.0.exe')
  console.log(`[captivate] Unpacked app: ${path.join(winUnpacked, 'Captivate 2.exe')}`)
  console.log(`[captivate] Installer: ${setupExe}`)

  const latestMeta = {
    outputDir,
    setupExe: setupExe,
    unpackedExe: path.join(winUnpacked, 'Captivate 2.exe'),
    builtAt: new Date().toISOString(),
  }
  const latestPath = path.join(repoRoot, 'release', 'latest-windows-installer.json')
  try {
    fs.writeFileSync(latestPath, JSON.stringify(latestMeta, null, 2), 'utf8')
    console.log(`[captivate] Wrote ${latestPath}`)
  } catch (err) {
    console.warn(`[captivate] Could not write ${latestPath}:`, err)
  }
}
process.exit(code)

/**
 * Windows packaging often fails with:
 *   remove ...\win-unpacked\resources\app.asar: The process cannot access the file
 * because another process still has the archive open. Common holders:
 *   - IDE / search indexing the repo (e.g. Cursor ripgrep on `release/**`)
 *   - Explorer preview or an old Captivate/Electron instance
 *   - Real-time antivirus scanning a freshly written asar
 *
 * Default: write to a fresh `release/build-installer-<timestamp>/` so electron-builder
 * never has to delete a locked `app.asar` from a prior run.
 *
 * Override output directory (fixed path, may hit locks):
 *   set CAPTIVATE_EBUILDER_OUTPUT=release/build-installer
 */
const { spawnSync } = require('child_process')
const path = require('path')

const repoRoot = path.join(__dirname, '..')
process.chdir(repoRoot)

const envOut = process.env.CAPTIVATE_EBUILDER_OUTPUT?.trim()
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
const outputDir =
  envOut && envOut.length > 0
    ? envOut
    : path.join('release', `build-installer-${stamp}`)

const ebCli = path.join(repoRoot, 'node_modules', 'electron-builder', 'cli.js')
const args = [
  ebCli,
  'build',
  '--publish',
  'never',
  `--config.directories.output=${outputDir}`,
]

console.log(`[captivate] electron-builder output: ${outputDir}`)
const r = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  cwd: repoRoot,
  env: process.env,
})

const code = r.status === null ? 1 : r.status
if (code === 0) {
  const winUnpacked = path.join(repoRoot, outputDir, 'win-unpacked')
  console.log(`[captivate] Unpacked app: ${path.join(winUnpacked, 'Captivate 2.exe')}`)
}
process.exit(code)

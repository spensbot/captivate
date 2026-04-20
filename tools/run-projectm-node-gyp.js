/**
 * Dev helper: node-gyp rebuild for projectm-bridge (system Node ABI, not Electron).
 * Uses the same MSBuild parallelism defaults as prepare_projectm_bridge.js on Windows.
 */
const path = require('path')
const { spawnSync } = require('child_process')

const repoRoot = path.join(__dirname, '..')
if (process.platform === 'win32' && process.env.JOBS === undefined) {
  process.env.JOBS = '1'
}
if (process.platform === 'win32' && process.env.CL === undefined) {
  process.env.CL = '/MP1'
}

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = ['node-gyp', 'rebuild', '--directory', 'native/projectm-bridge']
const r = spawnSync(cmd, args, {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
})
process.exit(r.status === null ? 1 : r.status)

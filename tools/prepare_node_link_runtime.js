const { spawnSync } = require('child_process')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const nodeLinkDir = path.join(repoRoot, 'release', 'app', 'node-link')
const npmExecPath = process.env.npm_execpath

if (!npmExecPath) {
  console.error(
    'prepare_node_link_runtime: npm_execpath is unavailable; cannot prepare node-link runtime dependencies.'
  )
  process.exit(1)
}

const result = spawnSync(
  process.execPath,
  [npmExecPath, '--prefix', nodeLinkDir, 'install', '--omit=dev', '--ignore-scripts'],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  }
)

if (result.error || result.status !== 0) {
  const reason =
    result.error?.message ??
    `npm install exited with status ${result.status ?? 'unknown'}`
  console.error(`prepare_node_link_runtime failed: ${reason}`)
  process.exit(1)
}

console.log('Node-Link runtime dependencies prepared.')

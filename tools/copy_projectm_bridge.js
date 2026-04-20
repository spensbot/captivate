const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const sourceCandidates = [
  path.join(
    repoRoot,
    'native',
    'projectm-bridge',
    'build',
    'Release',
    'projectm_bridge.node'
  ),
  path.join(
    repoRoot,
    'native',
    'projectm-bridge',
    'build',
    'Debug',
    'projectm_bridge.node'
  ),
]

const sourcePath = sourceCandidates.find((candidate) => fs.existsSync(candidate))
if (!sourcePath) {
  console.error(
    'projectM bridge build output was not found. Expected projectm_bridge.node in native/projectm-bridge/build/(Release|Debug).'
  )
  process.exit(1)
}

const destinationDir = path.join(repoRoot, 'assets', 'projectm-bridge')
const destinationPath = path.join(destinationDir, 'projectm_bridge.node')
fs.mkdirSync(destinationDir, { recursive: true })
fs.copyFileSync(sourcePath, destinationPath)

console.log(`Copied projectm_bridge.node to ${destinationPath}`)

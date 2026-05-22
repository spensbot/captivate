/**
 * Validates Node/npm against package.json `engines` before native Electron packaging.
 * Native modules (midi, serialport, projectm-bridge) require matching Node ABI headers
 * and must not be built with an editor-embedded Node (e.g. some IDE-bundled runtimes).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const repoRoot = path.join(__dirname, '..')

function readPackageJson() {
  const raw = fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
  return JSON.parse(raw)
}

function parseMinSemverRange(range) {
  if (typeof range !== 'string') return null
  const m = range.trim().match(/>=\s*(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1
    if (a[i] < b[i]) return -1
  }
  return 0
}

function parseVersionString(s) {
  const m = String(s).trim().match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function npmVersion() {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['-v'], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  })
  if (r.error || r.status !== 0 || !r.stdout) {
    return null
  }
  return parseVersionString(r.stdout)
}

function main() {
  if (
    process.env.CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK === '1' ||
    process.env.CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK === 'true' ||
    process.env.CAPTIVATE_SKIP_ELECTRON_REBUILD === '1' ||
    process.env.CAPTIVATE_SKIP_ELECTRON_REBUILD === 'true'
  ) {
    console.warn(
      '[captivate] Warning: CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK or CAPTIVATE_SKIP_ELECTRON_REBUILD is set. Unset these in System Environment Variables for full native builds.'
    )
  }

  const pkg = readPackageJson()
  const engines = pkg.engines || {}

  const minNode = parseMinSemverRange(engines.node) || [25, 9, 0]
  const curNode = parseVersionString(process.version)
  if (!curNode) {
    console.error(`[captivate] Unrecognized Node version: ${process.version}`)
    process.exit(1)
  }
  if (compareSemver(curNode, minNode) < 0) {
    console.error(
      `[captivate] Node ${process.version} does not satisfy engines.node (${engines.node}).`
    )
    console.error(
      `[captivate] Install Node ${minNode.join('.')}+ (see .node-version), e.g. nvm/nvs, then run npm install again.`
    )
    console.error(
      '[captivate] Do not run packaging with an IDE-bundled Node; use the same Node as `where node` / `which node` in a normal shell.'
    )
    process.exit(1)
  }

  const minNpm = parseMinSemverRange(engines.npm)
  if (minNpm) {
    const curNpm = npmVersion()
    if (curNpm && compareSemver(curNpm, minNpm) < 0) {
      console.error(
        `[captivate] npm version does not satisfy engines.npm (${engines.npm}). Update npm (bundled with Node 25+) and retry.`
      )
      process.exit(1)
    }
  }

  const execPath = process.execPath.toLowerCase()
  if (
    execPath.includes('cursor') ||
    execPath.includes('code\\resources\\app') ||
    execPath.includes('vscode')
  ) {
    console.warn(
      '[captivate] Warning: Node appears to be editor-bundled. Native builds often fail; use standalone Node 25.9+ from PATH.'
    )
  }

  if (process.platform === 'win32') {
    const cwd = process.cwd()
    if (cwd.startsWith('\\\\')) {
      console.warn(
        '[captivate] Warning: UNC paths can trigger MSBuild instability; clone to a local drive (e.g. C:\\dev\\captivate) if builds crash.'
      )
    }
  }

  console.log(`[captivate] Build environment OK (Node ${process.version}).`)
}

main()

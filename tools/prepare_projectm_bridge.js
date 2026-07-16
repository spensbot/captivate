const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Serial MSBuild (/m:1) avoids intermittent access-violation crashes (exit 3221225477) on some VS installs.
if (process.platform === 'win32' && process.env.JOBS === undefined) {
  process.env.JOBS = '1'
}
if (process.platform === 'win32' && process.env.CL === undefined) {
  process.env.CL = '/MP1'
}

const repoRoot = path.resolve(__dirname, '..')
const copyScriptPath = path.join(repoRoot, 'tools', 'copy_projectm_bridge.js')
const supportedNativePlatforms = new Set(['win32', 'linux', 'darwin'])
const runNativeBridgeBuild =
  process.env.CAPTIVATE_BUILD_PROJECTM_BRIDGE === '1' ||
  process.env.CAPTIVATE_BUILD_PROJECTM_BRIDGE === 'true' ||
  supportedNativePlatforms.has(process.platform)
const allowFallback =
  process.env.CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK === '1' ||
  process.env.CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK === 'true'

if (!runNativeBridgeBuild) {
  console.log(
    `Skipping native projectM bridge build on ${process.platform}/${process.arch}; compatibility bridge remains available.`
  )
  process.exit(0)
}

const electronVersion = resolveElectronVersion()
if (!electronVersion) {
  console.error(
    'Unable to resolve Electron version for native projectM bridge build.'
  )
  process.exit(1)
}

const nodeGypBin = resolveNodeGypBin(repoRoot)
if (!nodeGypBin) {
  console.error(
    'Unable to locate node-gyp binary. Run npm install and retry packaging.'
  )
  process.exit(1)
}

const buildDarwinUniversal =
  process.platform === 'darwin' &&
  (process.env.CAPTIVATE_DARWIN_UNIVERSAL_NATIVE === '1' ||
    process.env.CAPTIVATE_DARWIN_UNIVERSAL_NATIVE === 'true' ||
    process.env.CI === 'true')

if (buildDarwinUniversal) {
  const stagingRoot = path.join(repoRoot, '.captivate-projectm-universal-staging')
  fs.rmSync(stagingRoot, { recursive: true, force: true })
  fs.mkdirSync(stagingRoot, { recursive: true })

  const arm64Node = buildProjectmForArch(nodeGypBin, electronVersion, 'arm64')
  if (!arm64Node) {
    handleBuildFailure('arm64 projectM bridge build produced no .node output')
  }
  const stagedArm64Node = path.join(stagingRoot, 'arm64', 'projectm_bridge.node')
  fs.mkdirSync(path.dirname(stagedArm64Node), { recursive: true })
  fs.copyFileSync(arm64Node, stagedArm64Node)

  const x64Node = buildProjectmForArch(nodeGypBin, electronVersion, 'x64')
  if (!x64Node) {
    handleBuildFailure('x64 projectM bridge build produced no .node output')
  }
  const destinationDir = path.join(repoRoot, 'assets', 'projectm-bridge')
  const destinationPath = path.join(destinationDir, 'projectm_bridge.node')
  fs.mkdirSync(destinationDir, { recursive: true })
  const lipo = spawnSync(
    'lipo',
    ['-create', stagedArm64Node, x64Node, '-output', destinationPath],
    { encoding: 'utf8' }
  )
  fs.rmSync(stagingRoot, { recursive: true, force: true })
  if (lipo.status !== 0) {
    handleBuildFailure(
      `lipo projectM bridge failed: ${lipo.stderr || lipo.stdout || lipo.status}`
    )
  }
  console.log(`Created universal projectm_bridge.node at ${destinationPath}`)
  // Do not run copy_projectm_bridge.js after lipo: it would overwrite the fat
  // binary with the last single-arch Release build (usually x64).
  console.log('Native projectM bridge prepared.')
  process.exit(0)
}

const buildResult = runProjectmGyp(nodeGypBin, electronVersion, process.arch)
if (buildResult.error || buildResult.status !== 0) {
  const reason =
    buildResult.error?.message ??
    `node-gyp exited with status ${buildResult.status ?? 'unknown'}`
  handleBuildFailure(reason)
}

const copyResult = spawnSync(process.execPath, [copyScriptPath], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: false,
})

if (copyResult.error || copyResult.status !== 0) {
  const reason =
    copyResult.error?.message ??
    `copy script exited with status ${copyResult.status ?? 'unknown'}`
  if (allowFallback) {
    console.warn(
      `Native projectM bridge copy failed (${reason}). Continuing with compatibility bridge due to CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK.`
    )
    process.exit(0)
  }
  console.error(
    `Native projectM bridge copy failed (${reason}). Set CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK=1 only if you intentionally want compatibility mode.`
  )
  process.exit(1)
}

console.log('Native projectM bridge prepared.')

function handleBuildFailure(reason) {
  if (allowFallback) {
    console.warn(
      `Native projectM bridge build failed (${reason}). Continuing with compatibility bridge due to CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK.`
    )
    process.exit(0)
  }
  console.error(
    `Native projectM bridge build failed (${reason}). Set CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK=1 only if you intentionally want compatibility mode.`
  )
  process.exit(1)
}

function runProjectmGyp(nodeGypBin, electronVersion, arch) {
  const buildArgs = [
    nodeGypBin,
    'rebuild',
    '--directory',
    'native/projectm-bridge',
    '--runtime=electron',
    `--target=${electronVersion}`,
    '--dist-url=https://electronjs.org/headers',
    `--arch=${arch}`,
  ]
  if (process.platform === 'win32') {
    buildArgs.push('--msvs_version=2022', '--', '-Dclang=0')
  }
  return spawnSync(process.execPath, buildArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...(process.platform === 'win32' ? { GYP_MSVS_VERSION: '2022' } : {}),
    },
  })
}

function findProjectmNodeOutput() {
  const candidates = [
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
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

function buildProjectmForArch(nodeGypBin, electronVersion, arch) {
  console.log(`[captivate] Building projectM bridge for ${arch}...`)
  const buildResult = runProjectmGyp(nodeGypBin, electronVersion, arch)
  if (buildResult.error || buildResult.status !== 0) {
    return null
  }
  return findProjectmNodeOutput()
}

function resolveNodeGypBin(root) {
  const candidates = [
    path.join(root, 'node_modules', 'node-gyp', 'bin', 'node-gyp.js'),
    path.join(root, 'node_modules', 'npm', 'node_modules', 'node-gyp', 'bin', 'node-gyp.js'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

function resolveElectronVersion() {
  const candidates = [
    path.join(repoRoot, 'node_modules', 'electron', 'package.json'),
    path.join(repoRoot, 'release', 'app', 'node_modules', 'electron', 'package.json'),
    path.join(repoRoot, 'package.json'),
  ]
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      if (candidate.endsWith('electron\\package.json') || candidate.endsWith('electron/package.json')) {
        const version = normalizeSemver(parsed.version)
        if (version) return version
      }
      const fromDep = normalizeSemver(parsed?.devDependencies?.electron)
      if (fromDep) return fromDep
      const fromDepProd = normalizeSemver(parsed?.dependencies?.electron)
      if (fromDepProd) return fromDepProd
    } catch (_error) {}
  }
  return null
}

function normalizeSemver(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/(\d+\.\d+\.\d+)/)
  if (!match) return null
  return match[1]
}

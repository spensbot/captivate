/**
 * Rebuild release/app native modules for arm64 and x64, then lipo each node-gyp
 * build/Release|Debug .node into a universal binary.
 *
 * Required when packaging macOS from a single host arch: a lone host rebuild leaves
 * the other arch (or Rosetta) loading the wrong .node files. electron-builder may
 * also rebuild per-DMG, but fat binaries keep CI resilient when that step is skipped.
 *
 * Do NOT wipe or lipo vendor multi-arch layouts:
 * - koffi ships prebuilds under build/koffi/<platform>_<arch>/ (cnoke, not node-gyp)
 * - usb / @serialport/bindings-cpp ship prebuilds/darwin-x64+arm64 (already fat)
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const appPath = path.join(repoRoot, 'release', 'app')

function shouldRun() {
  if (process.platform !== 'darwin') {
    return false
  }
  if (
    process.env.CAPTIVATE_SKIP_DARWIN_UNIVERSAL_NATIVE === '1' ||
    process.env.CAPTIVATE_SKIP_DARWIN_UNIVERSAL_NATIVE === 'true'
  ) {
    return false
  }
  return (
    process.env.CAPTIVATE_DARWIN_UNIVERSAL_NATIVE === '1' ||
    process.env.CAPTIVATE_DARWIN_UNIVERSAL_NATIVE === 'true' ||
    process.env.CI === 'true'
  )
}

function resolveElectronVersion() {
  const electronPkg = path.join(
    repoRoot,
    'node_modules',
    'electron',
    'package.json'
  )
  if (!fs.existsSync(electronPkg)) {
    return null
  }
  const parsed = JSON.parse(fs.readFileSync(electronPkg, 'utf8'))
  const match = String(parsed.version || '').match(/(\d+\.\d+\.\d+)/)
  return match ? match[1] : null
}

/** Top-level and @scope/package roots under node_modules. */
function listPackageRoots(nodeModulesRoot) {
  const roots = []
  if (!fs.existsSync(nodeModulesRoot)) {
    return roots
  }
  for (const entry of fs.readdirSync(nodeModulesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin') {
      continue
    }
    const full = path.join(nodeModulesRoot, entry.name)
    if (entry.name.startsWith('@')) {
      for (const pkg of fs.readdirSync(full, { withFileTypes: true })) {
        if (pkg.isDirectory()) {
          roots.push(path.join(full, pkg.name))
        }
      }
      continue
    }
    roots.push(full)
  }
  return roots
}

function packageHasUniversalDarwinPrebuild(pkgRoot) {
  return fs.existsSync(path.join(pkgRoot, 'prebuilds', 'darwin-x64+arm64'))
}

function isKoffiPackage(pkgRoot) {
  return path.basename(pkgRoot) === 'koffi'
}

/**
 * Only lipo node-gyp outputs. Never prebuilds/ or koffi cnoke trees.
 */
function isLipoCandidateNodeBinary(filePath, rootDir) {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/')
  if (!rel.endsWith('.node')) {
    return false
  }
  if (rel === 'koffi' || rel.startsWith('koffi/')) {
    return false
  }
  if (rel.includes('/prebuilds/') || rel.startsWith('prebuilds/')) {
    return false
  }
  return /\/build\/(Release|Debug)\//.test(`/${rel}`)
}

function collectNodeBinaries(rootDir) {
  const results = []
  if (!fs.existsSync(rootDir)) {
    return results
  }
  const stack = [rootDir]
  while (stack.length > 0) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.bin') {
          continue
        }
        stack.push(full)
        continue
      }
      if (
        entry.isFile() &&
        isLipoCandidateNodeBinary(full, rootDir)
      ) {
        results.push(full)
      }
    }
  }
  return results
}

function copyTree(filePaths, destRoot, rootDir) {
  for (const filePath of filePaths) {
    const rel = path.relative(rootDir, filePath)
    const dest = path.join(destRoot, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(filePath, dest)
  }
}

/**
 * Wipe only node-gyp outputs. Never delete entire build/ (koffi and similar).
 * Walks scoped packages (@serialport/bindings-cpp, etc.).
 */
function clearPackageBuildDirs(nodeModulesRoot) {
  for (const pkgRoot of listPackageRoots(nodeModulesRoot)) {
    if (isKoffiPackage(pkgRoot)) {
      continue
    }
    const buildDir = path.join(pkgRoot, 'build')
    for (const sub of ['Release', 'Debug']) {
      const outDir = path.join(buildDir, sub)
      if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true })
      }
    }
  }
}

/**
 * Prefer vendor fat prebuilds over a rebuilt single-arch build/Release.
 * node-gyp-build loads Release first; leaving a thin binary would break the other arch.
 */
function preferUniversalDarwinPrebuilds(nodeModulesRoot) {
  let cleared = 0
  for (const pkgRoot of listPackageRoots(nodeModulesRoot)) {
    if (!packageHasUniversalDarwinPrebuild(pkgRoot)) {
      continue
    }
    for (const sub of ['Release', 'Debug']) {
      const outDir = path.join(pkgRoot, 'build', sub)
      if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true })
        cleared += 1
      }
    }
    console.log(
      `[captivate] Using vendor universal prebuild for ${path.relative(nodeModulesRoot, pkgRoot)}`
    )
  }
  return cleared
}

function assertCriticalNativesPresent(nodeModulesRoot) {
  const errors = []
  const koffiArm = path.join(
    nodeModulesRoot,
    'koffi',
    'build',
    'koffi',
    'darwin_arm64',
    'koffi.node'
  )
  const koffiX64 = path.join(
    nodeModulesRoot,
    'koffi',
    'build',
    'koffi',
    'darwin_x64',
    'koffi.node'
  )
  if (!fs.existsSync(koffiArm) || !fs.existsSync(koffiX64)) {
    errors.push(
      'koffi darwin prebuilds missing after universal rebuild (build/koffi/darwin_{arm64,x64}/koffi.node)'
    )
  }

  const midiRelease = path.join(nodeModulesRoot, 'midi', 'build', 'Release', 'midi.node')
  const midiPreArm = path.join(
    nodeModulesRoot,
    'midi',
    'prebuilds',
    'midi-darwin-arm64',
    'node-napi-v7.node'
  )
  const midiPreX64 = path.join(
    nodeModulesRoot,
    'midi',
    'prebuilds',
    'midi-darwin-x64',
    'node-napi-v7.node'
  )
  if (!fs.existsSync(midiRelease) && (!fs.existsSync(midiPreArm) || !fs.existsSync(midiPreX64))) {
    errors.push('midi native missing (need build/Release/midi.node or both darwin prebuilds)')
  }

  const usbUniv = path.join(
    nodeModulesRoot,
    'usb',
    'prebuilds',
    'darwin-x64+arm64',
    'node.napi.node'
  )
  if (!fs.existsSync(usbUniv)) {
    errors.push('usb universal darwin prebuild missing')
  }

  const serialUniv = path.join(
    nodeModulesRoot,
    '@serialport',
    'bindings-cpp',
    'prebuilds',
    'darwin-x64+arm64',
    'node.napi.node'
  )
  if (!fs.existsSync(serialUniv)) {
    errors.push('@serialport/bindings-cpp universal darwin prebuild missing')
  }

  const nodeLink = path.join(
    nodeModulesRoot,
    'node-link',
    'build',
    'Release',
    'node-link-native.node'
  )
  if (!fs.existsSync(nodeLink)) {
    errors.push('node-link build/Release/node-link-native.node missing')
  }

  if (errors.length > 0) {
    throw new Error(
      `Darwin universal native verification failed:\n  - ${errors.join('\n  - ')}`
    )
  }
}

function readArchitectures(filePath) {
  const result = spawnSync('lipo', ['-info', filePath], { encoding: 'utf8' })
  if (result.status !== 0) {
    return null
  }
  const text = `${result.stdout || ''} ${result.stderr || ''}`
  const nonFat = text.match(/Non-fat file:\s+\S+\s+is architecture:\s+(\S+)/)
  if (nonFat) {
    return [nonFat[1]]
  }
  const fat = text.match(/Architectures in the fat file:[\s\S]*?:\s+(.+)/)
  if (fat) {
    return fat[1].trim().split(/\s+/)
  }
  return null
}

function lipoCreate(outputPath, inputs) {
  const existing = inputs.filter((p) => fs.existsSync(p))
  if (existing.length === 0) {
    return false
  }
  if (existing.length === 1) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.copyFileSync(existing[0], outputPath)
    return true
  }
  const archLists = existing.map((inputPath) => readArchitectures(inputPath))
  if (
    archLists.every(Boolean) &&
    archLists[0].join(',') === archLists[1].join(',')
  ) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.copyFileSync(existing[0], outputPath)
    console.warn(
      `[captivate] Skipping lipo for ${outputPath}: inputs share architectures (${archLists[0].join(', ')})`
    )
    return true
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  const args = ['-create', ...existing, '-output', outputPath]
  const r = spawnSync('lipo', args, { encoding: 'utf8' })
  if (r.status !== 0) {
    throw new Error(
      `lipo failed for ${outputPath}: ${r.stderr || r.stdout || r.status}`
    )
  }
  return true
}

async function rebuildForArch(arch) {
  const { rebuild } = require('@electron/rebuild')
  const electronVersion = resolveElectronVersion()
  if (!electronVersion) {
    throw new Error('Unable to resolve Electron version for darwin universal rebuild')
  }
  clearPackageBuildDirs(path.join(appPath, 'node_modules'))
  console.log(`[captivate] Rebuilding release/app native modules for ${arch}...`)
  await rebuild({
    buildPath: appPath,
    electronVersion,
    force: true,
    arch,
    types: ['prod', 'dev', 'optional'],
    mode: 'sequential',
  })
}

async function main() {
  if (!shouldRun()) {
    return
  }
  if (!fs.existsSync(path.join(appPath, 'node_modules'))) {
    console.warn(
      '[captivate] Skipping darwin universal native rebuild: release/app/node_modules missing'
    )
    return
  }

  const stagingRoot = path.join(repoRoot, '.captivate-darwin-universal-staging')
  const arm64Staging = path.join(stagingRoot, 'arm64')
  fs.rmSync(stagingRoot, { recursive: true, force: true })

  await rebuildForArch('arm64')
  const arm64Nodes = collectNodeBinaries(path.join(appPath, 'node_modules'))
  copyTree(arm64Nodes, arm64Staging, path.join(appPath, 'node_modules'))

  await rebuildForArch('x64')
  const x64Nodes = collectNodeBinaries(path.join(appPath, 'node_modules'))
  let lipoCount = 0
  for (const x64Path of x64Nodes) {
    const rel = path.relative(path.join(appPath, 'node_modules'), x64Path)
    const arm64Path = path.join(arm64Staging, rel)
    if (fs.existsSync(arm64Path)) {
      lipoCreate(x64Path, [arm64Path, x64Path])
      lipoCount += 1
    }
  }

  preferUniversalDarwinPrebuilds(path.join(appPath, 'node_modules'))
  assertCriticalNativesPresent(path.join(appPath, 'node_modules'))

  fs.rmSync(stagingRoot, { recursive: true, force: true })
  console.log(
    `[captivate] Darwin universal native rebuild complete (${lipoCount} fat .node binaries).`
  )
}

main().catch((error) => {
  console.error(
    `[captivate] Darwin universal native rebuild failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  )
  process.exit(1)
})

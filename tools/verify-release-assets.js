const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const bridgePath = path.join(repoRoot, 'assets', 'projectm-bridge', 'projectm_bridge.node')
const runtimeDir = path.join(repoRoot, 'assets', 'projectm-runtime')
const appNodeModules = path.join(repoRoot, 'release', 'app', 'node_modules')

const requireBridge =
  process.env.CAPTIVATE_BUILD_PROJECTM_BRIDGE === '1' ||
    process.env.CAPTIVATE_BUILD_PROJECTM_BRIDGE === 'true' ||
    process.env.CI === 'true'

const requireRuntime =
  process.env.CAPTIVATE_BUILD_PROJECTM_RUNTIME === '1' ||
    process.env.CAPTIVATE_BUILD_PROJECTM_RUNTIME === 'true' ||
    process.env.CI === 'true'

const allowBridgeFallback =
  process.env.CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK === '1' ||
  process.env.CAPTIVATE_ALLOW_PROJECTM_BRIDGE_FALLBACK === 'true'

const allowRuntimeFallback =
  process.env.CAPTIVATE_ALLOW_PROJECTM_RUNTIME_FALLBACK === '1' ||
  process.env.CAPTIVATE_ALLOW_PROJECTM_RUNTIME_FALLBACK === 'true'

const skipRuntime =
  process.env.CAPTIVATE_SKIP_PROJECTM_RUNTIME === '1' ||
  process.env.CAPTIVATE_SKIP_PROJECTM_RUNTIME === 'true'

function findRuntimeLibrary(root) {
  if (!fs.existsSync(root)) {
    return null
  }
  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch (_error) {
      continue
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      if (entry.isFile()) {
        const lower = entry.name.toLowerCase()
        if (
          lower.includes('projectm') &&
          (lower.endsWith('.dll') ||
            lower.endsWith('.dylib') ||
            lower.includes('.so'))
        ) {
          return entryPath
        }
      }
      if (entry.isDirectory()) {
        stack.push(entryPath)
      }
    }
  }
  return null
}

function koffiTriplet() {
  const platform = process.platform
  const arch =
    process.arch === 'arm' ? 'arm32hf' : process.arch === 'ia32' ? 'ia32' : process.arch
  return `${platform}_${arch}`
}

const errors = []

function assertExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    errors.push(message || `Missing ${filePath}`)
  }
}

function assertKoffiNativePresent() {
  const koffiRoot = path.join(appNodeModules, 'koffi')
  if (!fs.existsSync(koffiRoot)) {
    errors.push(`Missing koffi package at ${koffiRoot}`)
    return
  }
  const triplets =
    process.platform === 'darwin'
      ? ['darwin_arm64', 'darwin_x64']
      : [koffiTriplet()]
  for (const triplet of triplets) {
    const nodePath = path.join(koffiRoot, 'build', 'koffi', triplet, 'koffi.node')
    if (!fs.existsSync(nodePath)) {
      errors.push(
        `Missing koffi native binary at ${nodePath} (macOS packaging must not delete koffi/build)`
      )
    }
  }
}

function assertReleaseAppNatives() {
  if (!fs.existsSync(appNodeModules)) {
    errors.push(`Missing release/app/node_modules at ${appNodeModules}`)
    return
  }

  assertKoffiNativePresent()

  // midi: node-gyp Release and/or arch prebuilds
  const midiRelease = path.join(appNodeModules, 'midi', 'build', 'Release', 'midi.node')
  const midiPrebuilds = path.join(appNodeModules, 'midi', 'prebuilds')
  if (!fs.existsSync(midiRelease) && !fs.existsSync(midiPrebuilds)) {
    errors.push('Missing midi native (build/Release/midi.node or prebuilds/)')
  }

  // usb + serialport: vendor universal darwin prebuilds (must not be deleted)
  if (process.platform === 'darwin' || process.env.CI === 'true') {
    assertExists(
      path.join(
        appNodeModules,
        'usb',
        'prebuilds',
        'darwin-x64+arm64',
        'node.napi.node'
      ),
      'Missing usb prebuilds/darwin-x64+arm64 (do not wipe usb/prebuilds)'
    )
    assertExists(
      path.join(
        appNodeModules,
        '@serialport',
        'bindings-cpp',
        'prebuilds',
        'darwin-x64+arm64',
        'node.napi.node'
      ),
      'Missing @serialport/bindings-cpp prebuilds/darwin-x64+arm64'
    )
  }

  const nodeLinkRelease = path.join(
    appNodeModules,
    'node-link',
    'build',
    'Release',
    'node-link-native.node'
  )
  // On Windows CI / local Windows, node-link is rebuilt for win32; on darwin for darwin.
  if (fs.existsSync(path.join(appNodeModules, 'node-link'))) {
    const hasNode =
      fs.existsSync(nodeLinkRelease) ||
      fs.existsSync(path.join(appNodeModules, 'node-link', 'bin'))
    if (!hasNode) {
      errors.push('Missing node-link native binary under build/Release or bin/')
    }
  }

  // ffmpeg-static: host binary present after npm install (per-arch fix happens in mac afterPack)
  const ffmpegName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const ffmpegPath = path.join(appNodeModules, 'ffmpeg-static', ffmpegName)
  if (!fs.existsSync(ffmpegPath)) {
    errors.push(`Missing ffmpeg-static binary at ${ffmpegPath}`)
  }
}

assertReleaseAppNatives()

if (requireBridge && !allowBridgeFallback && !fs.existsSync(bridgePath)) {
  errors.push(`Missing native projectM bridge at ${bridgePath}`)
}

if (requireRuntime && !allowRuntimeFallback && !skipRuntime) {
  const runtimeLibrary = findRuntimeLibrary(runtimeDir)
  if (runtimeLibrary === null) {
    errors.push(`Missing bundled projectM runtime library under ${runtimeDir}`)
  }
}

if (errors.length > 0) {
  console.error('[captivate] Release asset verification failed:')
  for (const error of errors) {
    console.error(`  - ${error}`)
  }
  process.exit(1)
}

console.log('[captivate] Release asset verification OK.')

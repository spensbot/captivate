const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const bridgePath = path.join(repoRoot, 'assets', 'projectm-bridge', 'projectm_bridge.node')
const runtimeDir = path.join(repoRoot, 'assets', 'projectm-runtime')

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

const errors = []

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

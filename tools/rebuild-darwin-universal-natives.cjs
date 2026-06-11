/**
 * Rebuild release/app native modules for arm64 and x64, then lipo each .node into a
 * universal binary. Required when packaging a fat macOS app: a single host-arch rebuild
 * (arm64 on GitHub macos-latest) leaves x86_64/Rosetta processes loading arm64-only .node files.
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

function isDarwinNativeNodeBinary(filePath, rootDir) {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/')
  if (!rel.includes('/prebuilds/')) {
    return true
  }
  return /\/prebuilds\/darwin-(arm64|x64)\//.test(rel)
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
        entry.name.endsWith('.node') &&
        isDarwinNativeNodeBinary(full, rootDir)
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

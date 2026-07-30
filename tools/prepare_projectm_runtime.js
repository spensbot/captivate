const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const repoRoot = path.resolve(__dirname, '..')
const destinationDir = path.join(repoRoot, 'assets', 'projectm-runtime')
const darwinStagingRoot = path.join(
  repoRoot,
  '.captivate-darwin-runtime-staging'
)

const shouldBuild =
  process.env.CAPTIVATE_BUILD_PROJECTM_RUNTIME === '1' ||
  process.env.CAPTIVATE_BUILD_PROJECTM_RUNTIME === 'true' ||
  process.env.CI === 'true'

const allowSkip =
  process.env.CAPTIVATE_SKIP_PROJECTM_RUNTIME === '1' ||
  process.env.CAPTIVATE_SKIP_PROJECTM_RUNTIME === 'true'

const allowFallback =
  process.env.CAPTIVATE_ALLOW_PROJECTM_RUNTIME_FALLBACK === '1' ||
  process.env.CAPTIVATE_ALLOW_PROJECTM_RUNTIME_FALLBACK === 'true'

const stageDarwinBoth =
  process.platform === 'darwin' &&
  (process.env.CAPTIVATE_DARWIN_UNIVERSAL_NATIVE === '1' ||
    process.env.CAPTIVATE_DARWIN_UNIVERSAL_NATIVE === 'true' ||
    process.env.CI === 'true')

if (allowSkip) {
  console.log(
    '[captivate] Skipping projectM runtime staging (CAPTIVATE_SKIP_PROJECTM_RUNTIME).'
  )
  process.exit(0)
}

if (!shouldBuild) {
  console.log(
    '[captivate] Skipping projectM runtime staging. Set CAPTIVATE_BUILD_PROJECTM_RUNTIME=1 for release bundles.'
  )
  process.exit(0)
}

async function stageOne(arch, dest) {
  process.env.CAPTIVATE_PROJECTM_RUNTIME_ARCH = arch
  const { stageProjectMRuntime } = await import(
    pathToFileURL(path.join(repoRoot, 'tools', 'projectm_runtime_fetch.mjs')).href
  )
  const result = await stageProjectMRuntime(dest)
  console.log(
    `[captivate] projectM runtime (${arch}) prepared from ${result.assetName} (${result.releaseTag}).`
  )
  return result
}

function copyDirSync(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
}

async function main() {
  if (stageDarwinBoth) {
    fs.rmSync(darwinStagingRoot, { recursive: true, force: true })
    fs.mkdirSync(darwinStagingRoot, { recursive: true })
    const armDest = path.join(darwinStagingRoot, 'arm64')
    const x64Dest = path.join(darwinStagingRoot, 'x64')
    await stageOne('arm64', armDest)
    await stageOne('x64', x64Dest)
    // Default assets path = host arch for local runs / verify.
    const hostArch = process.arch === 'x64' ? 'x64' : 'arm64'
    copyDirSync(path.join(darwinStagingRoot, hostArch), destinationDir)
    console.log(
      `[captivate] Staged darwin projectM runtimes for arm64+x64 (default assets = ${hostArch}).`
    )
    return
  }

  delete process.env.CAPTIVATE_PROJECTM_RUNTIME_ARCH
  await stageOne(process.arch, destinationDir)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  if (allowFallback) {
    console.warn(
      `[captivate] projectM runtime staging failed (${message}). Continuing without bundled runtime due to CAPTIVATE_ALLOW_PROJECTM_RUNTIME_FALLBACK.`
    )
    process.exit(0)
  }
  console.error(`[captivate] projectM runtime staging failed: ${message}`)
  process.exit(1)
})

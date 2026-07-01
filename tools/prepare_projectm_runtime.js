const path = require('path')
const { pathToFileURL } = require('url')

const repoRoot = path.resolve(__dirname, '..')
const destinationDir = path.join(repoRoot, 'assets', 'projectm-runtime')

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

import(pathToFileURL(path.join(repoRoot, 'tools', 'projectm_runtime_fetch.mjs')).href)
  .then(({ stageProjectMRuntime }) => stageProjectMRuntime(destinationDir))
  .then((result) => {
    console.log(
      `[captivate] projectM runtime prepared from ${result.assetName} (${result.releaseTag}).`
    )
  })
  .catch((error) => {
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

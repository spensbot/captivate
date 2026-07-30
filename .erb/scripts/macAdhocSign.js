/**
 * Deep ad-hoc sign macOS .app bundles for distribution without Apple Developer ID.
 * Fixes DYLD "different Team IDs" when the main binary and Electron Framework
 * were signed inconsistently by the prebuilt Electron binaries.
 *
 * Also re-downloads ffmpeg-static for the target DMG arch (npm install only
 * fetches the CI host arch, which breaks the other macOS DMG).
 */
const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function shouldAdhocSign() {
  if (process.env.CSC_LINK) {
    return false
  }
  if (
    process.env.CSC_IDENTITY &&
    process.env.CSC_IDENTITY !== '-' &&
    process.env.CSC_IDENTITY !== 'null'
  ) {
    return false
  }
  return (
    process.env.CAPTIVATE_MAC_ADHOC_SIGN === '1' ||
    process.env.CSC_IDENTITY === '-'
  )
}

function archToString(arch) {
  // electron-builder Arch enum: ia32=0, x64=1, armv7l=2, arm64=3
  if (arch === 3 || arch === 'arm64') {
    return 'arm64'
  }
  if (arch === 1 || arch === 'x64') {
    return 'x64'
  }
  if (typeof arch === 'string' && arch.length > 0) {
    return arch
  }
  return process.arch
}

function ensureFfmpegStaticForArch(appPath, arch) {
  const ffmpegDir = path.join(
    appPath,
    'Contents',
    'Resources',
    'app.asar.unpacked',
    'node_modules',
    'ffmpeg-static'
  )
  const installJs = path.join(ffmpegDir, 'install.js')
  const binaryPath = path.join(ffmpegDir, 'ffmpeg')
  if (!fs.existsSync(installJs)) {
    console.warn(
      `[captivate] ffmpeg-static not unpacked at ${ffmpegDir}; skipping arch fix`
    )
    return
  }

  fs.rmSync(binaryPath, { force: true })
  console.log(`[captivate] Installing ffmpeg-static for darwin/${arch}...`)
  const result = spawnSync(process.execPath, [installJs], {
    cwd: ffmpegDir,
    env: {
      ...process.env,
      npm_config_arch: arch,
      npm_config_platform: 'darwin',
    },
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg-static install failed for darwin/${arch}: ${
        result.stderr || result.stdout || result.status
      }`
    )
  }
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `ffmpeg-static did not produce ${binaryPath} for darwin/${arch}`
    )
  }
}

function ensureProjectMRuntimeForArch(appPath, arch, projectDir) {
  const staged = path.join(
    projectDir,
    '.captivate-darwin-runtime-staging',
    arch
  )
  if (!fs.existsSync(staged)) {
    console.warn(
      `[captivate] No staged projectM runtime for ${arch} at ${staged}; keeping bundled assets copy`
    )
    return
  }
  const dest = path.join(
    appPath,
    'Contents',
    'Resources',
    'assets',
    'projectm-runtime'
  )
  console.log(`[captivate] Installing projectM runtime for darwin/${arch}...`)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(staged, dest, { recursive: true })
}

function codesign(target, entitlements) {
  if (!fs.existsSync(target)) {
    return
  }
  const args = ['--force', '--sign', '-', '--timestamp=none']
  if (entitlements) {
    args.push('--entitlements', entitlements)
  }
  args.push(target)
  execFileSync('codesign', args, { stdio: 'inherit' })
}

function isSignableFile(fullPath, fileName) {
  if (
    fileName.endsWith('.dylib') ||
    fileName.endsWith('.node') ||
    fileName.endsWith('.so') ||
    fileName === 'Electron Framework' ||
    fileName.endsWith('.exe') ||
    fileName === 'ffmpeg'
  ) {
    return true
  }
  if (fullPath.includes(`${path.sep}Helpers${path.sep}`)) {
    return true
  }
  return false
}

function collectNestedBinaries(dir, out) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.framework') || entry.name.endsWith('.app')) {
        out.push(full)
      }
      collectNestedBinaries(full, out)
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    if (isSignableFile(full, entry.name)) {
      out.push(full)
    }
  }
}

function signDepth(target) {
  return target.split(path.sep).length
}

exports.default = async function macAdhocSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)
  if (!fs.existsSync(appPath)) {
    throw new Error(`[captivate] mac afterPack: app not found at ${appPath}`)
  }

  const arch = archToString(context.arch)
  ensureFfmpegStaticForArch(appPath, arch)
  ensureProjectMRuntimeForArch(appPath, arch, context.packager.projectDir)

  if (!shouldAdhocSign()) {
    return
  }

  const entitlements = path.join(
    context.packager.projectDir,
    'assets/entitlements.mac.plist'
  )
  const hasEntitlements = fs.existsSync(entitlements)

  console.log(`[captivate] Deep ad-hoc signing ${appPath}...`)

  const nested = []
  collectNestedBinaries(path.join(appPath, 'Contents'), nested)
  nested.sort((a, b) => signDepth(b) - signDepth(a))
  for (const target of nested) {
    try {
      codesign(target, null)
    } catch (error) {
      console.warn(`[captivate] codesign skipped ${target}: ${error.message}`)
    }
  }

  codesign(appPath, hasEntitlements ? entitlements : null)

  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  })
  console.log('[captivate] macOS ad-hoc sign verify OK')
}

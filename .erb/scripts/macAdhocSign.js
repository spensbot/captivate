/**
 * Deep ad-hoc sign macOS .app bundles for distribution without Apple Developer ID.
 * Fixes DYLD "different Team IDs" when the main binary and Electron Framework
 * were signed inconsistently by the prebuilt Electron binaries.
 */
const { execFileSync } = require('child_process')
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
    if (
      entry.name.endsWith('.dylib') ||
      entry.name.endsWith('.node') ||
      entry.name.endsWith('.so') ||
      entry.name === 'Electron Framework' ||
      entry.name.endsWith('.exe')
    ) {
      out.push(full)
    }
  }
}

exports.default = async function macAdhocSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }
  if (!shouldAdhocSign()) {
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)
  if (!fs.existsSync(appPath)) {
    throw new Error(`[captivate] mac ad-hoc sign: app not found at ${appPath}`)
  }

  const entitlements = path.join(
    context.packager.projectDir,
    'assets/entitlements.mac.plist'
  )
  const hasEntitlements = fs.existsSync(entitlements)

  console.log(`[captivate] Deep ad-hoc signing ${appPath}...`)

  const electronFrameworkBinary = path.join(
    appPath,
    'Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework'
  )
  const electronFrameworkBundle = path.join(
    appPath,
    'Contents/Frameworks/Electron Framework.framework'
  )
  codesign(electronFrameworkBinary, null)
  codesign(electronFrameworkBundle, null)

  const nested = []
  collectNestedBinaries(path.join(appPath, 'Contents'), nested)
  nested.sort((a, b) => b.length - a.length)
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

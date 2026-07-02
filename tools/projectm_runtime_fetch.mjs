/**
 * Build-time and tooling helper for downloading projectM runtime archives.
 * Mirrors the selection logic in src/main/engine/projectmInstaller.ts.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import https from 'https'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const GLEW_WINDOWS_ZIP_URL =
  'https://sourceforge.net/projects/glew/files/glew/2.2.0/glew-2.2.0-win32.zip/download'

export function describeCurrentPlatform() {
  return `${process.platform}/${process.arch}`
}

export function getPlatformTokens() {
  if (process.platform === 'win32') {
    return ['win32', 'windows', 'win']
  }
  if (process.platform === 'darwin') {
    return ['darwin', 'macos', 'mac', 'osx']
  }
  return ['linux']
}

export function getArchTokens() {
  if (process.arch === 'x64') {
    return ['x64', 'amd64', 'x86_64', 'x86-64', 'x84_64']
  }
  if (process.arch === 'arm64') {
    return ['arm64', 'aarch64']
  }
  return [process.arch.toLowerCase()]
}

function allPlatformTokens() {
  return ['win32', 'windows', 'win', 'darwin', 'macos', 'mac', 'osx', 'linux']
}

function looksLikeSourceArchive(name) {
  return (
    /^libprojectm-\d+\.\d+\.\d+(\.\d+)?(\.zip|\.tar\.gz|\.tgz)$/.test(name) ||
    /^projectm-\d+\.\d+\.\d+(\.\d+)?(\.zip|\.tar\.gz|\.tgz)$/.test(name) ||
    /^projectm-src-\d+\.\d+\.\d+(\.\d+)?(\.zip|\.tar\.gz|\.tgz)$/.test(name)
  )
}

function isExcludedRuntimeBundle(name) {
  const lower = name.toLowerCase()
  return (
    lower.includes('itunes-plugin') ||
    lower.includes('music.app-plugin') ||
    lower.includes('projectm-sdl') ||
    lower.includes('projectm_sdl') ||
    lower.endsWith('.pkg')
  )
}

function isRuntimeArchiveAsset(name) {
  const lower = name.toLowerCase()
  if (
    !lower.endsWith('.zip') &&
    !lower.endsWith('.tar.gz') &&
    !lower.endsWith('.tgz')
  ) {
    return false
  }
  if (!lower.includes('projectm')) {
    return false
  }
  if (looksLikeSourceArchive(lower)) {
    return false
  }
  if (lower.includes('source') || lower.includes('-src') || lower.includes('src-')) {
    return false
  }
  if (isExcludedRuntimeBundle(lower)) {
    return false
  }
  return true
}

function matchesAnyToken(name, tokens) {
  const lower = name.toLowerCase()
  return tokens.some((token) => lower.includes(token))
}

function scoreRuntimeAssetName(name, platformTokens, archTokens) {
  const lower = name.toLowerCase()
  let score = 0
  if (matchesAnyToken(lower, platformTokens)) score += 250
  if (matchesAnyToken(lower, archTokens)) score += 200
  if (lower.includes('shared')) score += 120
  if (lower.includes('runtime')) score += 60
  if (lower.includes('static')) score -= 180
  if (lower.includes('sdl')) score -= 80
  if (lower.includes('plugin') || lower.includes('itunes')) score -= 220
  if (looksLikeSourceArchive(lower)) score -= 350
  return score
}

export function pickReleaseRuntimeAsset(assets) {
  const platformTokens = getPlatformTokens()
  const archTokens = getArchTokens()

  const runtimeAssets = assets.filter((asset) => isRuntimeArchiveAsset(asset.name))
  if (runtimeAssets.length === 0) {
    return null
  }

  const hasPlatformTaggedAsset = runtimeAssets.some((asset) =>
    matchesAnyToken(asset.name, allPlatformTokens())
  )

  let candidates = runtimeAssets
  if (hasPlatformTaggedAsset) {
    const byPlatform = candidates.filter((asset) =>
      matchesAnyToken(asset.name, platformTokens)
    )
    if (byPlatform.length === 0) {
      return null
    }
    candidates = byPlatform
  }

  const byArch = candidates.filter((asset) => matchesAnyToken(asset.name, archTokens))
  if (byArch.length > 0) {
    candidates = byArch
  }

  const sharedCandidates = candidates.filter((asset) =>
    asset.name.toLowerCase().includes('shared')
  )
  if (sharedCandidates.length > 0) {
    candidates = sharedCandidates
  }

  const nonStatic = candidates.filter(
    (asset) => !asset.name.toLowerCase().includes('static')
  )
  if (nonStatic.length > 0) {
    candidates = nonStatic
  }

  const ranked = [...candidates].sort(
    (a, b) =>
      scoreRuntimeAssetName(b.name, platformTokens, archTokens) -
      scoreRuntimeAssetName(a.name, platformTokens, archTokens)
  )
  return ranked[0] ?? null
}

async function downloadToBuffer(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers }, (response) => {
      const statusCode = response.statusCode ?? 0
      const redirect = response.headers.location
      if (
        statusCode >= 300 &&
        statusCode < 400 &&
        typeof redirect === 'string' &&
        redirect.length > 0
      ) {
        response.resume()
        downloadToBuffer(new URL(redirect, url).toString(), headers)
          .then(resolve)
          .catch(reject)
        return
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume()
        reject(new Error(`HTTP ${statusCode} while requesting ${url}`))
        return
      }
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.once('error', reject)
      response.once('end', () => resolve(Buffer.concat(chunks)))
    })
    request.once('error', reject)
  })
}

async function downloadToFile(url, destination) {
  const data = await downloadToBuffer(url, {
    Accept: 'application/octet-stream',
    'User-Agent': 'Captivate-build/1.0',
  })
  await fs.promises.writeFile(destination, data)
}

async function fetchReleaseManifest() {
  const configuredUrl = process.env.CAPTIVATE_PROJECTM_RELEASE_MANIFEST_URL?.trim()
  const finalUrl =
    configuredUrl && configuredUrl.length > 0
      ? configuredUrl
      : 'https://api.github.com/repos/projectM-visualizer/projectm/releases/latest'
  const body = await downloadToBuffer(finalUrl, {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Captivate-build/1.0',
  })
  return {
    release: JSON.parse(body.toString('utf8')),
    manifestUrl: finalUrl,
  }
}

async function fetchReleaseCandidates() {
  const configuredUrl = process.env.CAPTIVATE_PROJECTM_RELEASE_MANIFEST_URL?.trim()
  if (configuredUrl && configuredUrl.length > 0) {
    const body = await downloadToBuffer(configuredUrl, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Captivate-build/1.0',
    })
    const parsed = JSON.parse(body.toString('utf8'))
    return {
      releases: Array.isArray(parsed) ? parsed : [parsed],
      manifestUrl: configuredUrl,
    }
  }

  const latest = await fetchReleaseManifest()
  const taggedCandidatesUrl =
    'https://api.github.com/repos/projectM-visualizer/projectm/releases?per_page=100'
  try {
    const body = await downloadToBuffer(taggedCandidatesUrl, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Captivate-build/1.0',
    })
    const parsed = JSON.parse(body.toString('utf8'))
    if (Array.isArray(parsed) && parsed.length > 0) {
      const nonDraft = parsed.filter((release) => release.draft !== true)
      return {
        releases: nonDraft.length > 0 ? nonDraft : parsed,
        manifestUrl: taggedCandidatesUrl,
      }
    }
  } catch (_error) {
    // Fall back to latest endpoint response.
  }

  return {
    releases: [latest.release],
    manifestUrl: latest.manifestUrl,
  }
}

function findBestRuntimeAsset(releases) {
  for (const release of releases) {
    const selected = pickReleaseRuntimeAsset(release.assets ?? [])
    if (selected !== null) {
      return { release, asset: selected }
    }
  }
  return null
}

function escapeForPowerShell(value) {
  return value.replace(/'/g, "''")
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: 'ignore',
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function runFirstSuccessfulCommand(commands) {
  let lastError = null
  for (const item of commands) {
    try {
      await runCommand(item.command, item.args)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw lastError ?? new Error('No extraction command succeeded.')
}

async function extractArchive(archivePath, destination) {
  await fs.promises.mkdir(destination, { recursive: true })
  const lowerArchivePath = archivePath.toLowerCase()

  if (lowerArchivePath.endsWith('.zip')) {
    if (process.platform === 'win32') {
      await runCommand('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Expand-Archive -LiteralPath '${escapeForPowerShell(archivePath)}' -DestinationPath '${escapeForPowerShell(destination)}' -Force`,
      ])
      return
    }
    await runFirstSuccessfulCommand([
      { command: 'unzip', args: ['-oq', archivePath, '-d', destination] },
      { command: 'tar', args: ['-xf', archivePath, '-C', destination] },
    ])
    return
  }

  if (lowerArchivePath.endsWith('.tar.gz') || lowerArchivePath.endsWith('.tgz')) {
    await runCommand('tar', ['-xzf', archivePath, '-C', destination])
    return
  }

  throw new Error(`Unsupported runtime archive format: ${path.basename(archivePath)}`)
}

async function findMatchingFiles(root, matcher) {
  const matches = []
  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    let entries
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true })
    } catch (_error) {
      continue
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      if (entry.isFile() && matcher(entry.name.toLowerCase())) {
        matches.push(entryPath)
      }
      if (entry.isDirectory()) {
        stack.push(entryPath)
      }
    }
  }
  return matches
}

function isProjectMLibraryFilename(lowerName) {
  if (!lowerName.includes('projectm')) {
    return false
  }
  if (lowerName.includes('playlist')) {
    return false
  }
  if (
    lowerName.includes('plugin') ||
    lowerName.includes('itunes') ||
    lowerName.includes('music.app') ||
    lowerName.includes('touchdesigner')
  ) {
    return false
  }
  if (process.platform === 'win32') {
    return lowerName.endsWith('.dll')
  }
  if (process.platform === 'darwin') {
    return lowerName.endsWith('.dylib')
  }
  return lowerName.includes('.so')
}

function pickBestProjectMLibraryFile(candidates) {
  if (candidates.length === 0) {
    return null
  }
  const score = (candidate) => {
    const fileName = path.basename(candidate).toLowerCase()
    let value = 0
    if (fileName.startsWith('libprojectm')) value += 100
    if (fileName.startsWith('projectm')) value += 70
    if (fileName.includes('runtime')) value += 25
    if (fileName.includes('playlist')) value -= 120
    if (fileName.includes('sdl')) value -= 30
    if (fileName.includes('plugin')) value -= 60
    if (fileName.includes('debug')) value -= 20
    const full = candidate.toLowerCase()
    if (full.includes(`${path.sep}bin${path.sep}`)) value += 15
    if (full.includes(`${path.sep}lib${path.sep}`)) value += 10
    return value
  }
  const sorted = [...candidates].sort((a, b) => score(b) - score(a))
  return sorted[0] ?? null
}

function determineRuntimePackageRoot(runtimeBinaryPath, extractRoot) {
  const normalizedExtractRoot = path.resolve(extractRoot)
  const normalizedBinary = path.resolve(runtimeBinaryPath)
  const relative = path.relative(normalizedExtractRoot, normalizedBinary)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.dirname(normalizedBinary)
  }

  const parts = relative.split(path.sep)
  const pivotIndex = parts.findIndex((part) => {
    const lower = part.toLowerCase()
    return lower === 'bin' || lower === 'lib'
  })

  if (pivotIndex > 0) {
    return path.join(normalizedExtractRoot, ...parts.slice(0, pivotIndex))
  }

  if (pivotIndex === 0) {
    return normalizedExtractRoot
  }

  return path.dirname(normalizedBinary)
}

async function ensureProjectMRuntimeDependencies(
  runtimeInstallDir,
  runtimeBinaryPath,
  temporaryRoot
) {
  if (process.platform !== 'win32') {
    return
  }

  const runtimeDirectory = path.dirname(runtimeBinaryPath)
  const bundledGlewPath = path.join(runtimeDirectory, 'glew32.dll')
  try {
    await fs.promises.access(bundledGlewPath)
    return
  } catch (_error) {
    // Keep resolving below.
  }

  const existingGlewCandidates = await findMatchingFiles(
    runtimeInstallDir,
    (name) => name === 'glew32.dll'
  )
  if (existingGlewCandidates.length > 0) {
    await fs.promises.copyFile(existingGlewCandidates[0], bundledGlewPath)
    return
  }

  const glewZipPath = path.join(temporaryRoot, 'glew-win.zip')
  const glewExtractDir = path.join(temporaryRoot, 'glew-win')
  await downloadToFile(
    process.env.CAPTIVATE_GLEW_WINDOWS_ZIP_URL?.trim() || GLEW_WINDOWS_ZIP_URL,
    glewZipPath
  )
  await extractArchive(glewZipPath, glewExtractDir)
  const glewCandidates = await findMatchingFiles(
    glewExtractDir,
    (name) => name === 'glew32.dll'
  )
  if (glewCandidates.length === 0) {
    throw new Error('Downloaded GLEW package did not contain glew32.dll.')
  }
  const preferredArchToken =
    process.arch === 'x64' ? `${path.sep}x64${path.sep}` : `${path.sep}win32${path.sep}`
  const preferredCandidate =
    glewCandidates.find((candidate) =>
      candidate.toLowerCase().includes(preferredArchToken)
    ) ?? glewCandidates[0]
  await fs.promises.copyFile(preferredCandidate, bundledGlewPath)
}

/**
 * Download and stage projectM runtime files into destinationDir.
 */
export async function stageProjectMRuntime(destinationDir) {
  const temporaryRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'captivate-projectm-stage-')
  )
  try {
    const { releases } = await fetchReleaseCandidates()
    const selectedAsset = findBestRuntimeAsset(releases)
    if (selectedAsset === null) {
      const releaseLabels = releases
        .map((release) => release.tag_name ?? release.html_url)
        .filter((value) => typeof value === 'string' && value.length > 0)
      throw new Error(
        `No projectM runtime package found for ${describeCurrentPlatform()} in releases (${releaseLabels.slice(0, 6).join(', ') || 'none'}).`
      )
    }

    const runtimeArchive = path.join(temporaryRoot, selectedAsset.asset.name)
    const runtimeExtractDir = path.join(temporaryRoot, 'runtime')
    await downloadToFile(selectedAsset.asset.browser_download_url, runtimeArchive)
    await extractArchive(runtimeArchive, runtimeExtractDir)

    const runtimeLibraries = await findMatchingFiles(runtimeExtractDir, (name) =>
      isProjectMLibraryFilename(name)
    )
    const runtimeBinary = pickBestProjectMLibraryFile(runtimeLibraries)
    if (runtimeBinary === null) {
      throw new Error(
        `Runtime archive ${selectedAsset.asset.name} did not contain a projectM library for ${describeCurrentPlatform()}.`
      )
    }

    await fs.promises.rm(destinationDir, { recursive: true, force: true })
    await fs.promises.mkdir(destinationDir, { recursive: true })

    const runtimeSourceRoot = determineRuntimePackageRoot(
      runtimeBinary,
      runtimeExtractDir
    )
    await fs.promises.cp(runtimeSourceRoot, destinationDir, {
      recursive: true,
      force: true,
    })
    const stagedBinary = path.join(
      destinationDir,
      path.relative(runtimeSourceRoot, runtimeBinary)
    )
    await ensureProjectMRuntimeDependencies(destinationDir, stagedBinary, temporaryRoot)
    await fs.promises.writeFile(
      path.join(destinationDir, '.captivate-bundled-runtime'),
      `${selectedAsset.release.tag_name ?? 'release'}\n${selectedAsset.asset.name}\n`,
      'utf8'
    )

    return {
      destinationDir,
      releaseTag: selectedAsset.release.tag_name ?? 'release',
      assetName: selectedAsset.asset.name,
      libraryPath: stagedBinary,
    }
  } finally {
    try {
      await fs.promises.rm(temporaryRoot, { recursive: true, force: true })
    } catch (_error) {
      // Ignore temp cleanup failures.
    }
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  const destination =
    process.argv[2] ??
    path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'assets', 'projectm-runtime')
  stageProjectMRuntime(destination)
    .then((result) => {
      console.log(
        `[captivate] Staged projectM runtime from ${result.assetName} (${result.releaseTag}) to ${result.destinationDir}`
      )
    })
    .catch((error) => {
      console.error(
        `[captivate] Failed to stage projectM runtime: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      process.exit(1)
    })
}

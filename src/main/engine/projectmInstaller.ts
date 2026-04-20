import { app } from 'electron'
import { promises as fs } from 'fs'
import https from 'https'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { ProjectMInstallResult, getProjectMRuntimeDownloadUrl } from '../../shared/projectm'
import { detectProjectMRuntime } from './projectmRuntime'

interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
}

interface GitHubReleasePayload {
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
  assets?: GitHubReleaseAsset[]
}

const PROJECTM_RUNTIME_DIR = 'projectm-runtime'
const GLEW_WINDOWS_ZIP_URL =
  'https://sourceforge.net/projects/glew/files/glew/2.2.0/glew-2.2.0-win32.zip/download'

export async function installProjectMBinaries(): Promise<ProjectMInstallResult> {
  const downloadUrl = getProjectMRuntimeDownloadUrl()
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'captivate-projectm-install-')
  )
  let runtimePath: string | null = null
  let bridgePath: string | null = null
  try {
    const { releases, manifestUrl } = await fetchReleaseCandidates()
    const selectedAsset = findBestRuntimeAsset(releases)
    if (selectedAsset === null) {
      const releaseLabels = releases
        .map((release) => release.tag_name ?? release.html_url)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
      const assetsPreview = releases
        .flatMap((release) => release.assets ?? [])
        .map((asset) => asset.name)
        .slice(0, 12)
        .join(', ')
      return {
        ok: false,
        message: `Could not find a projectM runtime package for ${describeCurrentPlatform()} in releases (${releaseLabels.slice(0, 6).join(', ') || manifestUrl}). Found assets: ${assetsPreview || 'none'}.`,
        runtimePath: null,
        bridgePath: null,
        downloadUrl,
      }
    }

    const runtimeArchive = path.join(temporaryRoot, selectedAsset.asset.name)
    const runtimeExtractDir = path.join(temporaryRoot, 'runtime')

    await downloadToFile(selectedAsset.asset.browser_download_url, runtimeArchive)
    await extractArchive(runtimeArchive, runtimeExtractDir)

    const runtimeLibraries = await findMatchingFiles(
      runtimeExtractDir,
      (name) => isProjectMLibraryFilename(name)
    )
    const runtimeBinary = pickBestProjectMLibraryFile(runtimeLibraries)
    if (runtimeBinary === null) {
      return {
        ok: false,
        message: `Runtime archive ${selectedAsset.asset.name} downloaded, but no projectM runtime library was found for ${describeCurrentPlatform()}.`,
        runtimePath: null,
        bridgePath: null,
        downloadUrl,
      }
    }

    const installBasePath = await resolveWritableInstallBase()
    const runtimeInstallDir = path.join(installBasePath, PROJECTM_RUNTIME_DIR)

    await clearDirectory(runtimeInstallDir)

    const runtimeSourceRoot = determineRuntimePackageRoot(
      runtimeBinary,
      runtimeExtractDir
    )
    await copyDirectory(runtimeSourceRoot, runtimeInstallDir)
    runtimePath = path.join(
      runtimeInstallDir,
      path.relative(runtimeSourceRoot, runtimeBinary)
    )
    await ensureProjectMRuntimeDependencies(runtimeInstallDir, runtimePath, temporaryRoot)
    bridgePath = null

    const runtimeDetection = detectProjectMRuntime()
    if (!runtimeDetection.available) {
      return {
        ok: false,
        message: `Runtime files were installed from ${selectedAsset.asset.name}, but the runtime could not be loaded. ${runtimeDetection.message}`,
        runtimePath,
        bridgePath,
        downloadUrl,
      }
    }

    return {
      ok: true,
      message: `projectM runtime installed successfully for ${describeCurrentPlatform()} from ${selectedAsset.release.tag_name ?? 'release'} (${selectedAsset.asset.name}).`,
      runtimePath,
      bridgePath,
      downloadUrl,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      message: `Failed to install projectM binaries: ${message}`,
      runtimePath,
      bridgePath,
      downloadUrl,
    }
  } finally {
    try {
      await fs.rm(temporaryRoot, { recursive: true, force: true })
    } catch (_error) {
      // Ignore temp cleanup failures.
    }
  }
}

async function fetchReleaseManifest(): Promise<{
  release: GitHubReleasePayload
  manifestUrl: string
}> {
  const url = process.env.CAPTIVATE_PROJECTM_RELEASE_MANIFEST_URL?.trim()
  const finalUrl =
    url && url.length > 0
      ? url
      : 'https://api.github.com/repos/projectM-visualizer/projectm/releases/latest'

  const body = await downloadToBuffer(finalUrl, {
    Accept: 'application/vnd.github+json',
    'User-Agent': `Captivate/${app.getVersion()}`,
  })
  return {
    release: JSON.parse(body.toString('utf8')) as GitHubReleasePayload,
    manifestUrl: finalUrl,
  }
}

async function fetchReleaseCandidates(): Promise<{
  releases: GitHubReleasePayload[]
  manifestUrl: string
}> {
  const configuredUrl = process.env.CAPTIVATE_PROJECTM_RELEASE_MANIFEST_URL?.trim()

  if (configuredUrl && configuredUrl.length > 0) {
    const body = await downloadToBuffer(configuredUrl, {
      Accept: 'application/vnd.github+json',
      'User-Agent': `Captivate/${app.getVersion()}`,
    })
    const parsed = JSON.parse(body.toString('utf8')) as
      | GitHubReleasePayload
      | GitHubReleasePayload[]
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
      'User-Agent': `Captivate/${app.getVersion()}`,
    })
    const parsed = JSON.parse(body.toString('utf8')) as GitHubReleasePayload[]
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

function findBestRuntimeAsset(releases: GitHubReleasePayload[]) {
  for (const release of releases) {
    const selected = pickReleaseRuntimeAsset(release.assets ?? [])
    if (selected !== null) {
      return {
        release,
        asset: selected,
      }
    }
  }
  return null
}

function pickReleaseRuntimeAsset(assets: GitHubReleaseAsset[]): GitHubReleaseAsset | null {
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

  const ranked = [...candidates].sort((a, b) => {
    return scoreRuntimeAssetName(b.name, platformTokens, archTokens) -
      scoreRuntimeAssetName(a.name, platformTokens, archTokens)
  })
  return ranked[0] ?? null
}

function isRuntimeArchiveAsset(name: string) {
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
  if (
    lower.includes('itunes-plugin') ||
    lower.includes('music.app-plugin') ||
    lower.includes('projectm-sdl')
  ) {
    return false
  }
  return true
}

function looksLikeSourceArchive(name: string) {
  return (
    /^libprojectm-\d+\.\d+\.\d+(\.\d+)?(\.zip|\.tar\.gz|\.tgz)$/.test(name) ||
    /^projectm-\d+\.\d+\.\d+(\.\d+)?(\.zip|\.tar\.gz|\.tgz)$/.test(name) ||
    /^projectm-src-\d+\.\d+\.\d+(\.\d+)?(\.zip|\.tar\.gz|\.tgz)$/.test(name)
  )
}

function matchesAnyToken(name: string, tokens: string[]) {
  const lower = name.toLowerCase()
  return tokens.some((token) => lower.includes(token))
}

function allPlatformTokens() {
  return ['win32', 'windows', 'win', 'darwin', 'macos', 'mac', 'osx', 'linux']
}

function describeCurrentPlatform() {
  return `${process.platform}/${process.arch}`
}

function getPlatformTokens() {
  if (process.platform === 'win32') {
    return ['win32', 'windows', 'win']
  }
  if (process.platform === 'darwin') {
    return ['darwin', 'macos', 'mac', 'osx']
  }
  return ['linux']
}

function getArchTokens() {
  if (process.arch === 'x64') return ['x64', 'amd64', 'x86_64', 'x86-64', 'x84_64']
  if (process.arch === 'arm64') return ['arm64', 'aarch64']
  return [process.arch.toLowerCase()]
}

async function resolveWritableInstallBase() {
  const resourceAssetsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  const fallbackUserPath = path.join(app.getPath('userData'), 'projectm')
  // Prefer userData so runtime installs survive app reinstalls/upgrades.
  const candidates = [fallbackUserPath, resourceAssetsPath]

  for (const candidate of candidates) {
    if (await ensureDirectoryWritable(candidate)) {
      return candidate
    }
  }

  throw new Error('No writable install location was found for projectM binaries.')
}

async function ensureDirectoryWritable(directory: string) {
  try {
    await fs.mkdir(directory, { recursive: true })
    const probePath = path.join(directory, `.writable-${Date.now()}.tmp`)
    await fs.writeFile(probePath, 'ok', 'utf8')
    await fs.rm(probePath, { force: true })
    return true
  } catch (_error) {
    return false
  }
}

async function clearDirectory(directory: string) {
  await fs.rm(directory, { recursive: true, force: true })
  await fs.mkdir(directory, { recursive: true })
}

async function copyDirectory(source: string, destination: string) {
  await fs.cp(source, destination, { recursive: true, force: true })
}

async function extractArchive(archivePath: string, destination: string) {
  await fs.mkdir(destination, { recursive: true })
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

function escapeForPowerShell(value: string) {
  return value.replace(/'/g, "''")
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
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

async function runFirstSuccessfulCommand(
  commands: Array<{ command: string; args: string[] }>
) {
  let lastError: Error | null = null
  for (const item of commands) {
    try {
      await runCommand(item.command, item.args)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw (
    lastError ??
    new Error('No extraction command succeeded for this archive format.')
  )
}

function downloadToBuffer(url: string, headers: Record<string, string>) {
  return new Promise<Buffer>((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers,
      },
      (response) => {
        const statusCode = response.statusCode ?? 0
        const redirect = response.headers.location
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          typeof redirect === 'string' &&
          redirect.length > 0
        ) {
          response.resume()
          const redirectUrl = new URL(redirect, url).toString()
          downloadToBuffer(redirectUrl, headers).then(resolve).catch(reject)
          return
        }
        if (statusCode < 200 || statusCode >= 300) {
          response.resume()
          reject(new Error(`HTTP ${statusCode} while requesting ${url}`))
          return
        }

        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        response.once('error', reject)
        response.once('end', () => {
          resolve(Buffer.concat(chunks))
        })
      }
    )
    request.once('error', reject)
  })
}

async function downloadToFile(url: string, destination: string) {
  const data = await downloadToBuffer(url, {
    Accept: 'application/octet-stream',
    'User-Agent': `Captivate/${app.getVersion()}`,
  })
  await fs.writeFile(destination, data)
}

async function findMatchingFiles(
  root: string,
  matcher: (lowerFileName: string) => boolean
) {
  const matches: string[] = []
  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    let entries: Array<{
      name: string
      path: string
      isDirectory: () => boolean
      isFile: () => boolean
    }>
    try {
      entries = await fs.readdir(current, { withFileTypes: true }).then((list) =>
        list.map((entry) => ({
          name: entry.name,
          path: path.join(current, entry.name),
          isDirectory: () => entry.isDirectory(),
          isFile: () => entry.isFile(),
        }))
      )
    } catch (_error) {
      continue
    }

    for (const entry of entries) {
      if (entry.isFile() && matcher(entry.name.toLowerCase())) {
        matches.push(entry.path)
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(entry.path)
      }
    }
  }
  return matches
}

function isProjectMLibraryFilename(lowerName: string) {
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

function pickBestProjectMLibraryFile(candidates: string[]) {
  if (candidates.length === 0) {
    return null
  }
  const score = (candidate: string) => {
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

async function ensureProjectMRuntimeDependencies(
  runtimeInstallDir: string,
  runtimeBinaryPath: string,
  temporaryRoot: string
) {
  if (process.platform !== 'win32') {
    return
  }

  const runtimeDirectory = path.dirname(runtimeBinaryPath)
  const bundledGlewPath = path.join(runtimeDirectory, 'glew32.dll')
  try {
    await fs.access(bundledGlewPath)
    return
  } catch (_error) {
    // Keep resolving below.
  }

  const existingGlewCandidates = await findMatchingFiles(
    runtimeInstallDir,
    (name) => name === 'glew32.dll'
  )
  if (existingGlewCandidates.length > 0) {
    await fs.copyFile(existingGlewCandidates[0], bundledGlewPath)
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
  await fs.copyFile(preferredCandidate, bundledGlewPath)
}

function determineRuntimePackageRoot(runtimeBinaryPath: string, extractRoot: string) {
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

function scoreRuntimeAssetName(
  name: string,
  platformTokens: string[],
  archTokens: string[]
) {
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

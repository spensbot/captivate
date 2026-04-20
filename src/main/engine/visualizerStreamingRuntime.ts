import { app } from 'electron'
import ffmpegStaticPath from 'ffmpeg-static'
import path from 'path'
import { existsSync } from 'fs'
import { spawn, spawnSync } from 'child_process'
import { NdiSourceList, VisStreamHealth } from 'shared/visualizerStreaming'

const NDI_RUNTIME_DIR = 'ndi-runtime'
const NDI_DOWNLOAD_URL = 'https://ndi.video/tools/ndi-runtime/'

export function resolveFfmpegPath(
  requestedPath: string,
  defaultPath: string = 'auto'
) {
  const trimmed = requestedPath.trim()
  const trimmedDefault = defaultPath.trim()

  if (trimmed.length > 0 && trimmed.toLowerCase() !== 'auto') {
    return normalizePackagedExecutablePath(trimmed)
  }

  if (trimmedDefault.length > 0 && trimmedDefault.toLowerCase() !== 'auto') {
    return normalizePackagedExecutablePath(trimmedDefault)
  }

  for (const candidate of getBundledFfmpegCandidates()) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return 'ffmpeg'
}

export function getNdiRuntimeDownloadUrl() {
  return NDI_DOWNLOAD_URL
}

export function getNdiRuntimeSearchPaths(configuredRuntimePath: string = '') {
  const runtimePath = getNdiRuntimePath()
  const configuredPath = configuredRuntimePath.trim()
  const existingPath = process.env.PATH || ''
  const paths = existingPath.split(path.delimiter).filter((p) => p.length > 0)
  const detectedPaths = findSystemNdiRuntimePaths()
  const all = [
    runtimePath,
    ...expandRuntimePathCandidates(configuredPath),
    ...detectedPaths,
    ...paths,
  ]
  return Array.from(new Set(all))
}

export function findSystemNdiRuntimePaths() {
  const candidates = getNdiRuntimeCandidatesFromSystem()
  return findRuntimePathsContainingLibraries(candidates)
}

export function detectNdiRuntimePaths(configuredRuntimePath: string = '') {
  const configured = configuredRuntimePath.trim()
  const configuredCandidates = expandRuntimePathCandidates(configured)
  const configuredFound = findRuntimePathsContainingLibraries(configuredCandidates)
  if (configuredFound.length > 0) {
    return configuredFound
  }

  return findSystemNdiRuntimePaths()
}

export function resolveNdiRuntimeLibrary(configuredRuntimePath: string = '') {
  const runtimeLibrariesFound = findNdiRuntimeLibraries(
    getNdiRuntimeSearchPaths(configuredRuntimePath)
  )
  if (runtimeLibrariesFound.length === 0) {
    return null
  }

  if (process.platform === 'win32') {
    const preferred = runtimeLibrariesFound.find((value) =>
      value.toLowerCase().endsWith('processing.ndi.lib.x64.dll')
    )
    if (preferred) {
      return preferred
    }
  }

  return runtimeLibrariesFound[0]
}

export function buildFfmpegEnv(configuredRuntimePath: string = '') {
  const runtimePaths = getNdiRuntimeSearchPaths(configuredRuntimePath)
  const env = { ...process.env }
  env.PATH = joinPathsEnv(env.PATH, runtimePaths)

  if (process.platform === 'darwin') {
    env.DYLD_LIBRARY_PATH = joinPathsEnv(
      env.DYLD_LIBRARY_PATH,
      runtimePaths
    )
  } else if (process.platform === 'linux') {
    env.LD_LIBRARY_PATH = joinPathsEnv(env.LD_LIBRARY_PATH, runtimePaths)
  }

  return env
}

export function applyNdiRuntimeEnv(configuredRuntimePath: string = '') {
  const env = buildFfmpegEnv(configuredRuntimePath)
  if (env.PATH !== undefined) {
    process.env.PATH = env.PATH
  }
  if (env.DYLD_LIBRARY_PATH !== undefined) {
    process.env.DYLD_LIBRARY_PATH = env.DYLD_LIBRARY_PATH
  }
  if (env.LD_LIBRARY_PATH !== undefined) {
    process.env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH
  }
}

/** Probe bundled/system FFmpeg and NDI runtime for stream-out / relay. */
export function visStreamHealth(
  requestedFfmpegPath: string,
  requestedNdiMuxer: string,
  configuredRuntimePath: string = '',
  defaultFfmpegPath: string = 'auto'
): VisStreamHealth {
  const resolvedPath = resolveFfmpegPath(requestedFfmpegPath, defaultFfmpegPath)
  const versionRes = spawnSync(resolvedPath, ['-version'], {
    encoding: 'utf8',
    windowsHide: true,
    env: buildFfmpegEnv(configuredRuntimePath),
  })

  const exists = !versionRes.error
  const version = exists
    ? (versionRes.stdout || '').split('\n')[0].trim() || null
    : null

  const muxerRes = exists
    ? spawnSync(resolvedPath, ['-hide_banner', '-muxers'], {
        encoding: 'utf8',
        windowsHide: true,
        env: buildFfmpegEnv(configuredRuntimePath),
      })
    : null
  const supportedMuxers = muxerRes ? parseMuxers(muxerRes.stdout || '') : []
  const ffmpegMuxerSupported = supportedMuxers.includes(requestedNdiMuxer)

  const autoDetectedRuntimePaths = detectNdiRuntimePaths(configuredRuntimePath)
  const runtimeSearchPaths = getNdiRuntimeSearchPaths(configuredRuntimePath)
  const runtimeLibrariesFound = findNdiRuntimeLibraries(runtimeSearchPaths)
  const runtimeReady = runtimeLibrariesFound.length > 0
  const nativeLibraryPath = runtimeReady ? runtimeLibrariesFound[0] : null
  const nativeSdkSupported = runtimeReady

  const delivery = nativeSdkSupported
    ? 'native_sdk'
    : ffmpegMuxerSupported && runtimeReady
    ? 'ffmpeg_muxer'
    : 'none'
  const ndiSupported = delivery !== 'none'

  let ndiMessage = 'NDI output is available via native NDI SDK'
  if (delivery === 'native_sdk') {
    ndiMessage = 'NDI output is available via native NDI SDK'
  } else if (delivery === 'ffmpeg_muxer') {
    ndiMessage = 'NDI output is available via FFmpeg muxer'
  } else if (!ffmpegMuxerSupported && !nativeSdkSupported) {
    ndiMessage = 'NDI output unavailable: FFmpeg muxer missing and NDI runtime not found'
  } else if (!ffmpegMuxerSupported) {
    ndiMessage = `FFmpeg muxer "${requestedNdiMuxer}" not found`
  } else if (!runtimeReady) {
    ndiMessage = 'NDI runtime libraries not found'
  }

  return {
    checkedAt: new Date().toISOString(),
    ffmpeg: {
      requestedPath: requestedFfmpegPath,
      resolvedPath,
      exists,
      version,
      error: versionRes.error ? versionRes.error.message : null,
    },
    ndi: {
      requestedMuxer: requestedNdiMuxer,
      supportedMuxers,
      ffmpegMuxerSupported,
      nativeSdkSupported,
      delivery,
      nativeLibraryPath,
      configuredRuntimePath:
        configuredRuntimePath.trim().length > 0
          ? configuredRuntimePath.trim()
          : null,
      autoDetectedRuntimePaths,
      runtimeSearchPaths,
      runtimeLibrariesFound,
      runtimeReady,
      supported: ndiSupported,
      downloadUrl: getNdiRuntimeDownloadUrl(),
      message: ndiMessage,
    },
  }
}

function getNdiRuntimePath() {
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  return path.join(resourcesPath, NDI_RUNTIME_DIR)
}

function parseMuxers(output: string) {
  const lines = output.split('\n')
  const muxers: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue

    const cols = trimmed.split(/\s+/)
    if (cols.length < 2) continue

    const maybeName = cols[1]
    if (maybeName === '=' || maybeName === 'File') continue
    if (/^[A-Za-z0-9_.-]+$/.test(maybeName)) {
      muxers.push(maybeName)
    }
  }

  return Array.from(new Set(muxers))
}

function findNdiRuntimeLibraries(searchPaths: string[]) {
  const expectedNames =
    process.platform === 'win32'
      ? ['Processing.NDI.Lib.x64.dll', 'Processing.NDI.Lib.x86.dll']
      : process.platform === 'darwin'
      ? ['libndi.dylib']
      : ['libndi.so', 'libndi.so.6', 'libndi.so.5']

  const found = new Set<string>()
  for (const searchPath of searchPaths) {
    for (const expectedName of expectedNames) {
      const libPath = path.join(searchPath, expectedName)
      if (existsSync(libPath)) {
        found.add(libPath)
      }
    }
  }
  return Array.from(found)
}

function findRuntimePathsContainingLibraries(candidates: string[]) {
  const deduped = Array.from(
    new Set(candidates.map((candidate) => candidate.trim()).filter(Boolean))
  )
  const foundPaths = new Set<string>()
  for (const candidate of deduped) {
    const libs = findNdiRuntimeLibraries([candidate])
    if (libs.length > 0) {
      foundPaths.add(candidate)
    }
  }
  return Array.from(foundPaths)
}

function getNdiRuntimeCandidatesFromSystem() {
  const candidates: string[] = []
  const fromEnv = [
    process.env.NDI_RUNTIME_DIR,
    process.env.NDI_SDK_DIR,
    process.env.NDI_RUNTIME_PATH,
  ]
  for (const envPath of fromEnv) {
    if (envPath && envPath.trim().length > 0) {
      candidates.push(...expandRuntimePathCandidates(envPath.trim()))
    }
  }

  if (process.platform === 'win32') {
    const baseDirs = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]
      .filter((value): value is string => Boolean(value))
      .map((value) => path.join(value, 'NDI'))

    for (const baseDir of baseDirs) {
      candidates.push(
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 6 Runtime')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 6 Runtime', 'v6')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 6 Tools')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 6 Tools', 'Runtime')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 6 Tools', 'v6')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 5 Runtime')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 5 Runtime', 'v5')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 5 Tools')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI 5 Tools', 'Runtime')),
        ...expandRuntimePathCandidates(path.join(baseDir, 'NDI Runtime'))
      )
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/usr/local/lib',
      '/Library/NDI SDK for Apple/lib/macOS',
      '/Library/Application Support/NewTek/NDI/lib/macOS'
    )
  } else {
    candidates.push('/usr/lib', '/usr/local/lib', '/opt/ndi', '/opt/ndi/lib')
  }

  return candidates
}

function expandRuntimePathCandidates(basePath: string) {
  if (basePath.trim().length === 0) {
    return []
  }

  const candidates = [
    basePath,
    path.join(basePath, 'bin'),
    path.join(basePath, 'Bin'),
    path.join(basePath, 'lib'),
    path.join(basePath, 'Lib'),
    path.join(basePath, 'x64'),
    path.join(basePath, 'amd64'),
    path.join(basePath, 'v5'),
    path.join(basePath, 'v6'),
  ]

  return candidates.filter((candidate) => existsSync(candidate))
}

function joinPathsEnv(existing: string | undefined, pathsToPrepend: string[]) {
  const current = existing && existing.length > 0 ? existing.split(path.delimiter) : []
  const normalized = new Set(current)
  const next: string[] = []

  for (const runtimePath of pathsToPrepend) {
    if (!runtimePath || runtimePath.length === 0) continue
    if (normalized.has(runtimePath)) continue
    normalized.add(runtimePath)
    next.push(runtimePath)
  }

  if (next.length === 0) {
    return existing || ''
  }

  if (current.length === 0) {
    return next.join(path.delimiter)
  }

  return `${next.join(path.delimiter)}${path.delimiter}${existing}`
}

function getBundledFfmpegCandidates() {
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const candidates: string[] = []

  if (ffmpegStaticPath) {
    candidates.push(normalizePackagedExecutablePath(ffmpegStaticPath))
    candidates.push(ffmpegStaticPath)
  }

  if (app.isPackaged) {
    candidates.push(
      path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        'ffmpeg-static',
        binaryName
      )
    )
    candidates.push(
      path.join(
        process.resourcesPath,
        'app.asar',
        'node_modules',
        'ffmpeg-static',
        binaryName
      )
    )
  }

  return Array.from(new Set(candidates.filter((value) => value.trim().length > 0)))
}

function normalizePackagedExecutablePath(executablePath: string) {
  return executablePath.replace(/([\\/])app\.asar([\\/])/i, '$1app.asar.unpacked$2')
}

const NDI_FIND_SOURCES_TIMEOUT_MS = 15000

/**
 * Runs FFmpeg in libndi_newtek "find_sources" mode and parses discovered source names.
 * Requires an FFmpeg build with libndi_newtek and a working NDI runtime on PATH / library path.
 */
/** Run FFmpeg libndi find_sources and parse the source name list. */
export async function ndiFfmpegList(
  requestedFfmpegPath: string,
  configuredRuntimePath: string,
  defaultFfmpegPath: string = 'auto'
): Promise<NdiSourceList> {
  const resolvedPath = resolveFfmpegPath(requestedFfmpegPath, defaultFfmpegPath)
  const env = buildFfmpegEnv(configuredRuntimePath)
  let combined: string
  try {
    combined = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []
      const proc = spawn(
        resolvedPath,
        [
          '-hide_banner',
          '-loglevel',
          'info',
          '-f',
          'libndi_newtek',
          '-find_sources',
          '1',
          '-i',
          'dummy',
        ],
        { windowsHide: true, env }
      )
      const onData = (c: Buffer) => {
        chunks.push(c)
      }
      proc.stderr?.on('data', onData)
      proc.stdout?.on('data', onData)
      let settled = false
      const done = (action: () => void) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        action()
      }
      const timer = setTimeout(() => {
        try {
          proc.kill('SIGTERM')
        } catch (_err) {}
        done(() => resolve(Buffer.concat(chunks).toString('utf8')))
      }, NDI_FIND_SOURCES_TIMEOUT_MS)
      proc.on('error', (err) => {
        done(() => reject(err))
      })
      proc.on('close', () => {
        done(() => resolve(Buffer.concat(chunks).toString('utf8')))
      })
    })
  } catch (err) {
    return {
      sources: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const sources = parseNdiListOut(combined)
  const lower = combined.toLowerCase()
  if (
    sources.length === 0 &&
    (lower.includes('unknown input format') ||
      lower.includes('invalid argument') ||
      lower.includes('libndi_newtek') && lower.includes('not found'))
  ) {
    return {
      sources: [],
      error:
        'NDI input is not available in this FFmpeg build, or the NDI runtime is missing.',
    }
  }
  return { sources, error: '' }
}

/** Pull quoted NDI names from FFmpeg stderr (e.g. `0: 'My Source'`). */
function parseNdiListOut(text: string): string[] {
  const ordered: string[] = []
  const seen = new Set<string>()
  const numbered = /\b(\d+)\s*:\s*'((?:\\'|[^'])*)'/g
  let match: RegExpExecArray | null
  while ((match = numbered.exec(text)) !== null) {
    const name = match[2].replace(/\\'/g, "'").trim()
    if (name.length > 0 && !seen.has(name)) {
      seen.add(name)
      ordered.push(name)
    }
  }
  if (ordered.length > 0) {
    return ordered
  }
  return []
}

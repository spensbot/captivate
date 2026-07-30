import { app } from 'electron'
import { Dirent, existsSync, promises as fsPromises, readdirSync } from 'fs'
import path from 'path'
import { getKoffi } from './koffiNative'
import {
  getProjectMRuntimeDownloadUrl,
  initProjectMRuntimeDetection,
  ProjectMPresetCatalog,
  ProjectMPresetOption,
  ProjectMRuntimeDetection,
} from '../../shared/projectm'

const PROJECTM_RUNTIME_DIR = 'projectm-runtime'
const PROJECTM_PRESET_SCAN_TIMEOUT_MS = 6500
const PROJECTM_PRESET_SCAN_MAX_DEPTH = 8
const PROJECTM_PRESET_SCAN_MAX_COUNT = 8000
const PROJECTM_RUNTIME_DETECTION_CACHE_MS = 3000

type RuntimeDetectionOptions = {
  forceRefresh?: boolean
  allowUnsafeProbe?: boolean
}

let runtimeDetectionCache:
  | {
      cacheKey: string
      ts: number
      value: ProjectMRuntimeDetection
    }
  | null = null

type GetVersionComponentsFn = (
  major: Buffer,
  minor: Buffer,
  patch: Buffer
) => void

export function detectProjectMRuntime(
  options?: RuntimeDetectionOptions
): ProjectMRuntimeDetection {
  const cacheKey = buildRuntimeDetectionCacheKey()
  const now = Date.now()
  const forceRefresh = options?.forceRefresh === true
  if (
    !forceRefresh &&
    runtimeDetectionCache !== null &&
    runtimeDetectionCache.cacheKey === cacheKey &&
    now - runtimeDetectionCache.ts <= PROJECTM_RUNTIME_DETECTION_CACHE_MS
  ) {
    return runtimeDetectionCache.value
  }

  const defaults = initProjectMRuntimeDetection()

  const configuredPath = process.env.CAPTIVATE_PROJECTM_RUNTIME_PATH?.trim() ?? ''
  const configuredCandidates = expandRuntimePathCandidates(configuredPath)
  const configuredLibraries = findProjectMRuntimeLibraries(configuredCandidates)
  const searchPaths = getProjectMRuntimeSearchPaths(configuredPath)
  const autoLibraries = findProjectMRuntimeLibraries(searchPaths)

  const source: ProjectMRuntimeDetection['source'] =
    configuredLibraries.length > 0
      ? 'configured'
      : configuredPath.length > 0
      ? 'configured'
      : 'auto'
  const candidateLibraries = Array.from(
    new Set([...configuredLibraries, ...autoLibraries])
  )
  if (candidateLibraries.length === 0) {
    const result: ProjectMRuntimeDetection = {
      ...defaults,
      searchPaths,
      source: source === 'configured' ? 'configured' : 'none',
      message:
        source === 'configured'
          ? 'Configured projectM runtime path does not contain libprojectM.'
          : defaults.message,
    }
    runtimeDetectionCache = {
      cacheKey,
      ts: now,
      value: result,
    }
    return result
  }

  ensureRuntimeSearchPathsOnPath(searchPaths)
  const firstCandidateLibraryPath = candidateLibraries[0] ?? null
  const shouldProbeUnsafely =
    options?.allowUnsafeProbe === true ||
    process.env.CAPTIVATE_PROJECTM_UNSAFE_PROBE?.trim() === '1'

  if (!shouldProbeUnsafely) {
    const result: ProjectMRuntimeDetection = {
      available: true,
      libraryPath: firstCandidateLibraryPath,
      version: null,
      searchPaths,
      source,
      message:
        'projectM runtime library files found. Native load is verified when bridge session starts.',
      downloadUrl: getProjectMRuntimeDownloadUrl(),
    }
    runtimeDetectionCache = {
      cacheKey,
      ts: now,
      value: result,
    }
    return result
  }

  let selectedLibraryPath: string | null = null
  let selectedProbe: { loaded: boolean; version: string | null } | null = null
  let lastLoadError: string | null = null
  for (const candidate of candidateLibraries) {
    const probe = probeProjectMRuntimeLibrary(candidate)
    if (probe.loaded) {
      selectedLibraryPath = candidate
      selectedProbe = probe
      break
    }
    if (probe.loadError) {
      lastLoadError = `${path.basename(candidate)}: ${probe.loadError}`
    }
  }

  if (selectedLibraryPath === null || selectedProbe === null) {
    const result: ProjectMRuntimeDetection = {
      ...defaults,
      searchPaths,
      source,
      libraryPath: candidateLibraries[0] ?? null,
      message:
        lastLoadError !== null
          ? `projectM runtime library found but failed to load (${lastLoadError}).`
          : 'projectM runtime library found but failed to load.',
    }
    runtimeDetectionCache = {
      cacheKey,
      ts: now,
      value: result,
    }
    return result
  }

  const result: ProjectMRuntimeDetection = {
    available: true,
    libraryPath: selectedLibraryPath,
    version: selectedProbe.version,
    searchPaths,
    source,
    message:
      selectedProbe.version !== null
        ? `projectM runtime available (${selectedProbe.version}).`
        : 'projectM runtime library found.',
    downloadUrl: getProjectMRuntimeDownloadUrl(),
  }
  runtimeDetectionCache = {
    cacheKey,
    ts: now,
    value: result,
  }
  return result
}

export async function listProjectMPresets(
  directory?: string
): Promise<ProjectMPresetCatalog> {
  const requestedDirectory =
    typeof directory === 'string' ? directory.trim() : ''

  // When the user explicitly selects a directory, skip runtime auto-detection.
  // Runtime probing can touch many system paths synchronously and stall scans.
  const roots =
    requestedDirectory.length > 0
      ? existsSync(requestedDirectory)
        ? [requestedDirectory]
        : []
      : getProjectMPresetRoots(detectProjectMRuntime())
  if (requestedDirectory.length > 0 && roots.length === 0) {
    return {
      presets: [],
      roots: [],
      message: `Preset directory not found: ${requestedDirectory}`,
      textureDirectories: [],
      scanTimedOut: false,
    }
  }

  const scan = await findProjectMPresetFiles(roots, {
    maxDepth: PROJECTM_PRESET_SCAN_MAX_DEPTH,
    maxCount: PROJECTM_PRESET_SCAN_MAX_COUNT,
    timeoutMs: PROJECTM_PRESET_SCAN_TIMEOUT_MS,
  })

  const presets = toPresetOptions(scan.presetPaths)
  let message =
    presets.length > 0
      ? `${presets.length} preset${presets.length === 1 ? '' : 's'} found.`
      : 'No projectM preset files were found. Select a preset directory to scan.'
  if (scan.scanTimedOut) {
    message += ` Scan timed out after ${Math.round(
      PROJECTM_PRESET_SCAN_TIMEOUT_MS / 1000
    )}s. Try selecting a smaller preset folder.`
  }
  if (scan.textureDirectories.length > 0) {
    message += ` ${scan.textureDirectories.length} texture folder${
      scan.textureDirectories.length === 1 ? '' : 's'
    } detected.`
  }

  return {
    presets,
    roots,
    textureDirectories: scan.textureDirectories,
    scanTimedOut: scan.scanTimedOut,
    message,
  }
}

function probeProjectMRuntimeLibrary(libraryPath: string) {
  let lib: ReturnType<ReturnType<typeof getKoffi>['load']>
  try {
    lib = getKoffi().load(libraryPath)
  } catch (err) {
    return {
      loaded: false,
      version: null,
      loadError: err instanceof Error ? err.message : String(err),
    }
  }

  try {
    const getVersionComponents = lib.func(
      'void projectm_get_version_components(int* major, int* minor, int* patch)'
    ) as GetVersionComponentsFn

    const major = Buffer.alloc(4)
    const minor = Buffer.alloc(4)
    const patch = Buffer.alloc(4)
    getVersionComponents(major, minor, patch)

    const majorValue = major.readInt32LE(0)
    const minorValue = minor.readInt32LE(0)
    const patchValue = patch.readInt32LE(0)
    if (
      !Number.isFinite(majorValue) ||
      !Number.isFinite(minorValue) ||
      !Number.isFinite(patchValue)
    ) {
      return { loaded: true, version: null }
    }

    return {
      loaded: true,
      version: `${majorValue}.${minorValue}.${patchValue}`,
      loadError: null,
    }
  } catch (_err) {
    // Some runtime builds don't expose version symbols consistently.
    // If library loading succeeded, accept runtime as available.
    return { loaded: true, version: null, loadError: null }
  }
}

function getProjectMRuntimeSearchPaths(configuredRuntimePath: string = '') {
  const configuredPath = configuredRuntimePath.trim()
  const envPathEntries = (process.env.PATH || '')
    .split(path.delimiter)
    .filter((value) => value.length > 0)
  const all = [
    ...expandRuntimePathCandidates(configuredPath),
    ...getBundledProjectMRuntimeCandidates(),
    ...getProjectMRuntimeCandidatesFromSystem(),
    ...envPathEntries,
  ]
  return Array.from(new Set(all))
}

function getProjectMPresetRoots(runtime: ProjectMRuntimeDetection) {
  const roots = new Set<string>()
  const configuredPresetDirs = (process.env.CAPTIVATE_PROJECTM_PRESET_DIR ?? '')
    .split(path.delimiter)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  configuredPresetDirs.forEach((entry) => {
    if (existsSync(entry)) roots.add(entry)
  })

  if (runtime.libraryPath && runtime.libraryPath.trim().length > 0) {
    const libPath = path.resolve(runtime.libraryPath)
    const libDir = path.dirname(libPath)
    const runtimeRoot = path.dirname(libDir)
    ;[
      libDir,
      path.join(libDir, 'presets'),
      runtimeRoot,
      path.join(runtimeRoot, 'presets'),
      path.join(runtimeRoot, 'share', 'projectM', 'presets'),
      path.join(runtimeRoot, 'share', 'projectm', 'presets'),
    ].forEach((candidate) => {
      if (existsSync(candidate)) roots.add(candidate)
    })
  }

  const userDataPresets = path.join(app.getPath('userData'), 'projectm', 'presets')
  if (existsSync(userDataPresets)) {
    roots.add(userDataPresets)
  }

  return Array.from(roots)
}

function getBundledProjectMRuntimeCandidates() {
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  const userDataPath = path.join(app.getPath('userData'), 'projectm')
  // Prefer userData runtime first so persisted installs are used before app-bundled paths.
  const candidates = [
    path.join(userDataPath, PROJECTM_RUNTIME_DIR),
    path.join(resourcesPath, PROJECTM_RUNTIME_DIR),
  ]
  return candidates.flatMap((candidate) => expandRuntimePathCandidates(candidate))
}

function getProjectMRuntimeCandidatesFromSystem() {
  const candidates: string[] = []
  const fromEnv = [
    process.env.PROJECTM_RUNTIME_DIR,
    process.env.PROJECTM_RUNTIME_PATH,
    process.env.PROJECTM_SDK_DIR,
  ]

  for (const envValue of fromEnv) {
    if (envValue && envValue.trim().length > 0) {
      candidates.push(...expandRuntimePathCandidates(envValue.trim()))
    }
  }

  if (process.platform === 'win32') {
    const baseDirs = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]
      .filter((value): value is string => Boolean(value))
      .map((value) => path.join(value, 'projectM'))
    for (const baseDir of baseDirs) {
      candidates.push(...expandRuntimePathCandidates(baseDir))
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/usr/local/lib',
      '/opt/homebrew/lib',
      '/Library/Frameworks',
      '/usr/local/opt/projectm/lib',
      '/opt/homebrew/opt/projectm/lib'
    )
  } else {
    candidates.push(
      '/usr/lib',
      '/usr/local/lib',
      '/usr/lib64',
      '/usr/local/lib64',
      '/usr/lib/x86_64-linux-gnu',
      '/lib'
    )
  }

  return Array.from(new Set(candidates))
}

function expandRuntimePathCandidates(basePath: string) {
  if (basePath.length === 0) {
    return []
  }

  if (existsSync(basePath) && isProjectMLibraryFilename(path.basename(basePath))) {
    return [path.dirname(basePath)]
  }

  const candidates = [
    basePath,
    path.join(basePath, 'bin'),
    path.join(basePath, 'lib'),
    path.join(basePath, 'Lib'),
    path.join(basePath, 'x64'),
    path.join(basePath, 'amd64'),
    ...discoverRuntimeSupportDirs(basePath, 4),
  ]

  return Array.from(new Set(candidates.filter((candidate) => existsSync(candidate))))
}

function discoverRuntimeSupportDirs(basePath: string, maxDepth: number) {
  const discovered: string[] = []
  if (!existsSync(basePath)) {
    return discovered
  }

  const queue: Array<{ directory: string; depth: number }> = [
    { directory: basePath, depth: 0 },
  ]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue

    let entries: Dirent<string>[]
    try {
      entries = readdirSync(current.directory, {
        withFileTypes: true,
        encoding: 'utf8',
      })
    } catch (_error) {
      continue
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const fullPath = path.join(current.directory, entry.name)
      const lower = entry.name.toLowerCase()
      if (
        lower === 'bin' ||
        lower === 'lib' ||
        lower === 'lib64' ||
        lower === 'x64' ||
        lower === 'amd64' ||
        lower === 'x86' ||
        lower === 'arm64' ||
        lower.includes('runtime')
      ) {
        discovered.push(fullPath)
      }
      if (current.depth < maxDepth) {
        queue.push({ directory: fullPath, depth: current.depth + 1 })
      }
    }
  }

  return discovered
}

function findProjectMRuntimeLibraries(searchPaths: string[]) {
  const found = new Set<string>()

  for (const searchPath of searchPaths) {
    if (!existsSync(searchPath)) {
      continue
    }

    try {
      const entries = readdirSync(searchPath, {
        withFileTypes: true,
        encoding: 'utf8',
      })
      for (const entry of entries) {
        if (entry.isFile() && isProjectMLibraryFilename(entry.name)) {
          found.add(path.join(searchPath, entry.name))
        }

        if (
          entry.isDirectory() &&
          process.platform === 'darwin' &&
          entry.name.toLowerCase().endsWith('.framework')
        ) {
          const frameworkBinaryPath = path.join(
            searchPath,
            entry.name,
            path.parse(entry.name).name
          )
          if (existsSync(frameworkBinaryPath)) {
            found.add(frameworkBinaryPath)
          }
        }
      }
    } catch (_error) {
      continue
    }
  }

  return sortProjectMLibraryCandidates(Array.from(found))
}

type PresetScanOptions = {
  maxDepth: number
  maxCount: number
  timeoutMs: number
}

type PresetScanResult = {
  presetPaths: string[]
  textureDirectories: string[]
  scanTimedOut: boolean
}

const PRESET_SCAN_TIMEOUT = Symbol('preset-scan-timeout')

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T | typeof PRESET_SCAN_TIMEOUT> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return PRESET_SCAN_TIMEOUT
  }
  let timer: NodeJS.Timeout | null = null
  try {
    return await Promise.race([
      operation,
      new Promise<typeof PRESET_SCAN_TIMEOUT>((resolve) => {
        timer = setTimeout(() => resolve(PRESET_SCAN_TIMEOUT), timeoutMs)
      }),
    ])
  } finally {
    if (timer !== null) {
      clearTimeout(timer)
    }
  }
}

async function findProjectMPresetFiles(
  roots: string[],
  options: PresetScanOptions
): Promise<PresetScanResult> {
  const found = new Set<string>()
  const textureDirectories = new Set<string>()
  const exts = new Set(['.milk', '.prjm', '.preset'])
  const deadlineMs = Date.now() + Math.max(250, Math.round(options.timeoutMs))
  let scanTimedOut = false
  const queue: Array<{ dir: string; depth: number }> = roots
    .filter((root) => existsSync(root))
    .map((root) => ({ dir: root, depth: 0 }))

  while (queue.length > 0 && found.size < options.maxCount) {
    if (Date.now() >= deadlineMs) {
      scanTimedOut = true
      break
    }

    const current = queue.shift()
    if (!current) continue
    const remainingMs = Math.max(1, deadlineMs - Date.now())
    let readResult: Dirent<string>[] | typeof PRESET_SCAN_TIMEOUT
    try {
      readResult = await withTimeout(
        fsPromises.readdir(current.dir, {
          withFileTypes: true,
          encoding: 'utf8',
        }),
        remainingMs
      )
    } catch (_error) {
      continue
    }
    if (readResult === PRESET_SCAN_TIMEOUT) {
      scanTimedOut = true
      break
    }

    const entries = readResult
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (exts.has(ext)) {
          found.add(path.join(current.dir, entry.name))
          if (found.size >= options.maxCount) {
            break
          }
        }
      }
    }
    if (found.size >= options.maxCount) {
      break
    }

    if (current.depth >= options.maxDepth) {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      const lower = entry.name.toLowerCase()
      if (
        lower === 'node_modules' ||
        lower === '.git' ||
        lower === 'cmake' ||
        lower === 'include' ||
        lower === 'lib' ||
        lower === 'obj' ||
        lower === 'build'
      ) {
        continue
      }
      const nextDir = path.join(current.dir, entry.name)
      if (lower.includes('texture')) {
        textureDirectories.add(nextDir)
      }
      queue.push({
        dir: nextDir,
        depth: current.depth + 1,
      })
    }
  }

  return {
    presetPaths: Array.from(found).sort((a, b) => a.localeCompare(b)),
    textureDirectories: Array.from(textureDirectories).sort((a, b) =>
      a.localeCompare(b)
    ),
    scanTimedOut,
  }
}

function toPresetOptions(paths: string[]): ProjectMPresetOption[] {
  const labels = new Map<string, number>()
  const options = paths.map((presetPath) => {
    const label = path.basename(presetPath, path.extname(presetPath))
    labels.set(label, (labels.get(label) ?? 0) + 1)
    return {
      path: presetPath,
      label,
    }
  })
  return options.map((entry) => {
    const duplicateCount = labels.get(entry.label) ?? 0
    if (duplicateCount <= 1) {
      return entry
    }
    return {
      path: entry.path,
      label: `${entry.label} (${path.basename(path.dirname(entry.path))})`,
    }
  })
}

function buildRuntimeDetectionCacheKey() {
  const configuredPath = process.env.CAPTIVATE_PROJECTM_RUNTIME_PATH?.trim() ?? ''
  const bundledRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  return `${process.platform}|${process.arch}|${configuredPath}|${bundledRoot}`
}

function isProjectMLibraryFilename(fileName: string) {
  const normalized = fileName.toLowerCase()
  if (!normalized.includes('projectm')) {
    return false
  }
  if (normalized.includes('playlist')) {
    return false
  }
  if (
    normalized.includes('plugin') ||
    normalized.includes('itunes') ||
    normalized.includes('music.app') ||
    normalized.includes('touchdesigner')
  ) {
    return false
  }
  if (process.platform === 'win32') {
    return normalized.endsWith('.dll')
  }
  if (process.platform === 'darwin') {
    return normalized.endsWith('.dylib')
  }
  return normalized.includes('.so')
}

function sortProjectMLibraryCandidates(candidates: string[]) {
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

  return [...candidates].sort((a, b) => score(b) - score(a))
}

function ensureRuntimeSearchPathsOnPath(pathsToPrepend: string[]) {
  prependPathsToEnvVar('PATH', pathsToPrepend)
  if (process.platform === 'linux') {
    prependPathsToEnvVar('LD_LIBRARY_PATH', pathsToPrepend)
  } else if (process.platform === 'darwin') {
    prependPathsToEnvVar('DYLD_LIBRARY_PATH', pathsToPrepend)
    prependPathsToEnvVar('DYLD_FALLBACK_LIBRARY_PATH', pathsToPrepend)
  }
}

function prependPathsToEnvVar(envKey: string, pathsToPrepend: string[]) {
  const currentValue = process.env[envKey] ?? ''
  const existing = new Set(
    currentValue
      .split(path.delimiter)
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  )
  const next: string[] = []
  for (const candidate of pathsToPrepend) {
    const trimmed = candidate.trim()
    if (trimmed.length === 0) continue
    if (!existsSync(trimmed)) continue
    const key = trimmed.toLowerCase()
    if (existing.has(key)) continue
    existing.add(key)
    next.push(trimmed)
  }
  if (next.length > 0) {
    process.env[envKey] = `${next.join(path.delimiter)}${path.delimiter}${currentValue}`
  }
}

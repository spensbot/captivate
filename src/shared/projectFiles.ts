import type { SaveConfig } from './save'
import { saveTypes } from './save'

/** Current Captivate project file extension (short). */
export const PROJECT_FILE_EXT = 'cap'
/** Current fixture library extension paired with a project file. */
export const FIXTURE_LIBRARY_FILE_EXT = 'cfx'

/** Legacy extensions accepted when loading / migrating. */
export const LEGACY_PROJECT_FILE_EXT = 'captivate'
export const LEGACY_FIXTURE_LIBRARY_FILE_EXT = 'captivate-fixtures'

export const projectFileFilters: Electron.FileFilter = {
  name: 'Captivate Project',
  extensions: [PROJECT_FILE_EXT, LEGACY_PROJECT_FILE_EXT],
}

export const fixtureLibraryFileFilters: Electron.FileFilter = {
  name: 'Captivate Fixture Library',
  extensions: [
    FIXTURE_LIBRARY_FILE_EXT,
    LEGACY_FIXTURE_LIBRARY_FILE_EXT,
    'json',
  ],
}

export const allProjectLoadFilters: Electron.FileFilter = {
  name: 'Captivate Project',
  extensions: [PROJECT_FILE_EXT, LEGACY_PROJECT_FILE_EXT],
}

function fileExtension(filePath: string): string {
  const base = filePath.split(/[/\\]/).pop() ?? filePath
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ''
}

function parseFileStem(filePath: string): { dir: string; name: string } {
  const normalized = filePath.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  const dir = slash >= 0 ? normalized.slice(0, slash) : ''
  const base = slash >= 0 ? normalized.slice(slash + 1) : normalized
  const dot = base.lastIndexOf('.')
  const name = dot >= 0 ? base.slice(0, dot) : base
  return { dir, name }
}

function joinPath(dir: string, fileName: string): string {
  if (dir.length === 0) {
    return fileName
  }
  const sep = filePathUsesBackslash(dir) ? '\\' : '/'
  const trimmed = dir.endsWith('/') || dir.endsWith('\\') ? dir.slice(0, -1) : dir
  return `${trimmed}${sep}${fileName}`
}

function filePathUsesBackslash(filePath: string): boolean {
  return filePath.includes('\\')
}

/** Save every project section by default (load is the only selective step). */
export function createFullSaveConfig(): SaveConfig {
  const config = {} as SaveConfig
  for (const key of saveTypes) {
    config[key] = true
  }
  return config
}

export function isProjectFilePath(filePath: string): boolean {
  const ext = fileExtension(filePath)
  return ext === PROJECT_FILE_EXT || ext === LEGACY_PROJECT_FILE_EXT
}

export function isFixtureLibraryFilePath(filePath: string): boolean {
  const ext = fileExtension(filePath)
  return (
    ext === FIXTURE_LIBRARY_FILE_EXT ||
    ext === LEGACY_FIXTURE_LIBRARY_FILE_EXT ||
    ext === 'json'
  )
}

/** Sibling fixture DB path for a project file (`show.cap` → `show.cfx`). */
export function siblingFixtureLibraryPath(projectFilePath: string): string {
  const { dir, name } = parseFileStem(projectFilePath)
  return joinPath(dir, `${name}.${FIXTURE_LIBRARY_FILE_EXT}`)
}

/** Default fixture DB path for a workspace (explicit path or project sibling). */
export function resolveWorkspaceFixtureLibraryPath(
  projectFilePath: string | null,
  fixtureLibraryFilePath: string | null
): string | null {
  if (
    fixtureLibraryFilePath !== null &&
    fixtureLibraryFilePath.trim().length > 0
  ) {
    return normalizeFixtureLibrarySavePath(fixtureLibraryFilePath)
  }
  if (projectFilePath !== null && projectFilePath.trim().length > 0) {
    return siblingFixtureLibraryPath(normalizeProjectSavePath(projectFilePath))
  }
  return null
}

/** Ensure saved project paths use the modern `.cap` extension. */
export function normalizeProjectSavePath(filePath: string): string {
  const ext = fileExtension(filePath)
  const { dir, name } = parseFileStem(filePath)
  if (ext === PROJECT_FILE_EXT) {
    return filePath
  }
  return joinPath(dir, `${name}.${PROJECT_FILE_EXT}`)
}

/** Ensure saved fixture library paths use the modern `.cfx` extension. */
export function normalizeFixtureLibrarySavePath(filePath: string): string {
  const ext = fileExtension(filePath)
  const { dir, name } = parseFileStem(filePath)
  if (ext === FIXTURE_LIBRARY_FILE_EXT) {
    return filePath
  }
  return joinPath(dir, `${name}.${FIXTURE_LIBRARY_FILE_EXT}`)
}

export function isLegacyProjectFilePath(filePath: string): boolean {
  return fileExtension(filePath) === LEGACY_PROJECT_FILE_EXT
}

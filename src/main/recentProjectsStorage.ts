import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import {
  RECENT_PROJECTS_MAX,
  type RecentProjectEntry,
} from '../shared/recentProjects'

const DIRNAME = 'app-data'
const FILENAME = 'recent-projects.json'

type StoredRecentProjects = {
  version: 1
  entries: RecentProjectEntry[]
}

function storagePath(): string {
  const dir = path.join(app.getPath('userData'), DIRNAME)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, FILENAME)
}

function readRaw(): StoredRecentProjects {
  const filePath = storagePath()
  if (!existsSync(filePath)) {
    return { version: 1, entries: [] }
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<StoredRecentProjects>
    const entries = Array.isArray(parsed.entries) ? parsed.entries : []
    return {
      version: 1,
      entries: entries.filter(
        (entry): entry is RecentProjectEntry =>
          entry !== null &&
          typeof entry === 'object' &&
          typeof (entry as RecentProjectEntry).path === 'string' &&
          (entry as RecentProjectEntry).path.length > 0 &&
          typeof (entry as RecentProjectEntry).savedAt === 'number'
      ),
    }
  } catch {
    return { version: 1, entries: [] }
  }
}

function writeRaw(data: StoredRecentProjects) {
  writeFileSync(storagePath(), JSON.stringify(data, null, 2), 'utf8')
}

function normalizePath(filePath: string): string {
  return path.normalize(filePath.trim())
}

/** Drops missing files and caps list length. */
export function getRecentProjects(): RecentProjectEntry[] {
  const raw = readRaw()
  const entries = raw.entries
    .filter((entry) => existsSync(entry.path))
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, RECENT_PROJECTS_MAX)
  if (
    entries.length !== raw.entries.length ||
    entries.some((entry, index) => entry.path !== raw.entries[index]?.path)
  ) {
    writeRaw({ version: 1, entries })
  }
  return entries
}

export function recordRecentProject(filePath: string): RecentProjectEntry[] {
  const normalized = normalizePath(filePath)
  if (normalized.length === 0) {
    return getRecentProjects()
  }
  const now = Date.now()
  const existing = readRaw().entries.filter(
    (entry) => normalizePath(entry.path) !== normalized
  )
  const next: RecentProjectEntry[] = [
    { path: normalized, savedAt: now },
    ...existing,
  ].slice(0, RECENT_PROJECTS_MAX)
  writeRaw({ version: 1, entries: next })
  return getRecentProjects()
}

export function clearRecentProjects(): RecentProjectEntry[] {
  writeRaw({ version: 1, entries: [] })
  return []
}

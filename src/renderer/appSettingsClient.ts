import ipcChannels from '../shared/ipc_channels'
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  type AppSettings,
} from '../shared/appSettings'
import type { RecentProjectEntry } from '../shared/recentProjects'

type FileIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

const maybeWindow =
  typeof window !== 'undefined'
    ? (window as Window & { electron?: { ipcRenderer?: FileIpcRenderer } })
    : undefined

function getFileIpcRenderer(): FileIpcRenderer {
  const ipcRenderer = maybeWindow?.electron?.ipcRenderer
  if (!ipcRenderer) {
    throw new Error(
      'File dialogs are unavailable outside the Captivate desktop app.'
    )
  }
  return ipcRenderer
}

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const raw = await getFileIpcRenderer().invoke(ipcChannels.get_app_settings)
    return normalizeAppSettings(raw)
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export async function persistAppSettings(
  settings: AppSettings
): Promise<AppSettings> {
  const raw = await getFileIpcRenderer().invoke(
    ipcChannels.set_app_settings,
    settings
  )
  return normalizeAppSettings(raw)
}

export async function recordRecentProjectPath(filePath: string): Promise<void> {
  if (filePath.trim().length === 0) {
    return
  }
  await getFileIpcRenderer().invoke(
    ipcChannels.record_recent_project,
    filePath
  )
}

export async function clearRecentProjectPaths(): Promise<void> {
  await getFileIpcRenderer().invoke(ipcChannels.clear_recent_projects)
}

export async function fetchRecentProjects(): Promise<RecentProjectEntry[]> {
  const raw = await getFileIpcRenderer().invoke(ipcChannels.get_recent_projects)
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (entry): entry is RecentProjectEntry =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as RecentProjectEntry).path === 'string' &&
      typeof (entry as RecentProjectEntry).savedAt === 'number'
  )
}

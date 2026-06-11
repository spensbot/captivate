import {
  ReduxStore,
  CleanReduxState,
  resetState,
  getCleanReduxState,
  store,
} from './redux/store'
import ipcChannels from '../shared/ipc_channels'
import AutoSavedVal, { printTimePassed } from './AutoSavedVal'
import defaultState from './redux/defaultState'
import { migrateLegacyFixturePersistedJson } from '../shared/dmxFixtures'
import { countProjectContent } from '../shared/projectPersistenceSummary'
import {
  logProjectPersistence,
  snapshotCurrentProjectCounts,
} from './telemetry/projectPersistenceTelemetry'
import {
  fixtureLibraryFileFilters,
  normalizeFixtureLibrarySavePath,
  normalizeProjectSavePath,
  projectFileFilters,
  resolveWorkspaceFixtureLibraryPath,
} from '../shared/projectFiles'
import { createFullSaveConfig } from '../shared/projectFiles'
import {
  loadFile as loadFileFromDisk,
  readTextFile as readTextFileFromDisk,
  saveFile as saveFileToDisk,
  writeTextFile as writeTextFileToDisk,
} from './project/fileIO'
import { writeProjectToPath } from './project/projectFileWriter'
import { runPersistenceBusy } from './project/projectPersistenceBusy'
import { setProjectWorkspace } from './redux/guiSlice'

const AUTOSAVE_SCHEMA = 'captivate.autosave'
const AUTOSAVE_VERSION = 4
const MIN_SUPPORTED_AUTOSAVE_VERSION = 3
const FILE_AUTOSAVE_INTERVAL_MS = 15000

interface VersionedAutoSaveState {
  schema: string
  version: number
  savedAt: number
  state: CleanReduxState
}

export type AutoSaveRestoreStatus = 'restored' | 'empty' | 'incompatible'

let autoSavedVal: AutoSavedVal<VersionedAutoSaveState> | null = null
let lastRestoreStatus: AutoSaveRestoreStatus = 'empty'
let fileAutosaveTimer: ReturnType<typeof setInterval> | null = null
let fileAutosaveEnabled = false
let fileAutosaveProjectPath: string | null = null
let fileAutosaveFixturePath: string | null = null
let fileAutosaveWriteInFlight = false
let lastFileAutosaveFingerprint: string | null = null

interface SaveSlot {
  timePassed: string
  apply: () => void
}

export function stopAutoSave() {
  if (autoSavedVal !== null) {
    autoSavedVal.stop()
  }
  stopFileAutosave()
}

export function startAutoSave() {
  if (autoSavedVal !== null) {
    autoSavedVal.start()
  }
  if (fileAutosaveEnabled && fileAutosaveProjectPath !== null) {
    startFileAutosave()
  }
}

export function setFileAutosaveEnabled(
  enabled: boolean,
  projectFilePath?: string | null,
  fixtureLibraryFilePath?: string | null
) {
  fileAutosaveEnabled = enabled
  if (projectFilePath !== undefined) {
    fileAutosaveProjectPath = projectFilePath
  }
  if (fixtureLibraryFilePath !== undefined) {
    fileAutosaveFixturePath = fixtureLibraryFilePath
  }
  if (!enabled) {
    stopFileAutosave()
    autoSavedVal?.resumePeriodicWrites()
    return
  }
  if (fileAutosaveProjectPath !== null) {
    startFileAutosave()
  }
}

function startFileAutosave() {
  stopFileAutosave()
  autoSavedVal?.pausePeriodicWrites()
  fileAutosaveTimer = setInterval(() => {
    void flushFileAutosave()
  }, FILE_AUTOSAVE_INTERVAL_MS)
}

function stopFileAutosave() {
  if (fileAutosaveTimer !== null) {
    clearInterval(fileAutosaveTimer)
    fileAutosaveTimer = null
  }
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function waitForFileAutosaveIdle() {
  while (fileAutosaveWriteInFlight) {
    await waitMs(25)
  }
}

function syncWorkspaceFixturePathAfterWrite(
  projectFilePath: string,
  fixtureLibraryFilePath: string
) {
  const normalizedProject = normalizeProjectSavePath(projectFilePath)
  const normalizedFixture = normalizeFixtureLibrarySavePath(fixtureLibraryFilePath)
  fileAutosaveFixturePath = normalizedFixture
  const workspace = store.getState().gui.projectWorkspace
  if (
    workspace.projectFilePath !== normalizedProject ||
    workspace.fixtureLibraryFilePath !== normalizedFixture
  ) {
    store.dispatch(
      setProjectWorkspace({
        projectFilePath: normalizedProject,
        fixtureLibraryFilePath: normalizedFixture,
      })
    )
  }
}

async function writeWorkspaceFilesSilent(
  projectFilePath: string,
  fixtureLibraryFilePath: string | null,
  source: 'autosave' | 'quit',
  onProgress?: (progress: number, message: string) => void
) {
  await waitForFileAutosaveIdle()
  if (fileAutosaveWriteInFlight) {
    return
  }
  fileAutosaveWriteInFlight = true
  try {
    const normalizedProject = normalizeProjectSavePath(projectFilePath)
    const workspace = store.getState().gui.projectWorkspace
    const resolvedFixturePath = resolveWorkspaceFixtureLibraryPath(
      normalizedProject,
      fixtureLibraryFilePath ?? workspace.fixtureLibraryFilePath
    )
    if (resolvedFixturePath === null) {
      throw new Error('Cannot autosave fixture database without a project path')
    }

    let fixtureExisted = false
    try {
      await readTextFileFromDisk(resolvedFixturePath)
      fixtureExisted = true
    } catch {
      fixtureExisted = false
    }

    const config = createFullSaveConfig()
    const result = await writeProjectToPath(normalizedProject, config, {
      fixtureLibraryFilePath: resolvedFixturePath,
      onProgress: (progress, message) => onProgress?.(progress, message),
    })
    syncWorkspaceFixturePathAfterWrite(normalizedProject, result.fixturePath)

    logProjectPersistence({
      phase: source === 'quit' ? 'quit_save_complete' : 'autosave_write',
      filePath: normalizedProject,
      extra: {
        source: source === 'quit' ? 'quit_flush' : 'project_file',
        fixtureLibraryPath: result.fixturePath,
        fixtureLibraryCreated: !fixtureExisted,
      },
    })
  } catch (err) {
    logProjectPersistence({
      phase: source === 'quit' ? 'quit_save_failed' : 'autosave_write_failed',
      level: 'error',
      error: err,
      filePath: projectFilePath,
      extra: { source: source === 'quit' ? 'quit_flush' : 'project_file' },
    })
    throw err
  } finally {
    fileAutosaveWriteInFlight = false
  }
}

async function flushFileAutosave() {
  if (
    !fileAutosaveEnabled ||
    fileAutosaveProjectPath === null ||
    fileAutosaveWriteInFlight
  ) {
    return
  }
  const snapshot = JSON.stringify(getCleanReduxState(store.getState()))
  if (snapshot === lastFileAutosaveFingerprint) {
    return
  }
  const workspace = store.getState().gui.projectWorkspace
  const fixturePath = resolveWorkspaceFixtureLibraryPath(
    fileAutosaveProjectPath,
    fileAutosaveFixturePath ?? workspace.fixtureLibraryFilePath
  )
  try {
    await writeWorkspaceFilesSilent(
      fileAutosaveProjectPath,
      fixturePath,
      'autosave'
    )
    lastFileAutosaveFingerprint = snapshot
  } catch {
    // Background autosave failures are logged in writeWorkspaceFilesSilent.
  }
}

export function getSaveSlots(): SaveSlot[] {
  if (autoSavedVal === null) {
    return []
  }
  return autoSavedVal
    .loadAll()
    .slice(2)
    .map((datedSave) => {
      const parsed = parseVersionedAutoSaveState(datedSave.data)
      if (!parsed.compatible || parsed.state === null) {
        return null
      }
      const slotState = parsed.state
      return {
        timePassed: printTimePassed(datedSave),
        apply: () => {
          logProjectPersistence({
            phase: 'autosave_restore_start',
            extra: { source: 'save_slot_history' },
          })
          store.dispatch(resetState(slotState))
          logProjectPersistence({
            phase: 'autosave_restore_complete',
            restoreStatus: 'restored',
            after: countProjectContent({
              dmx: slotState.dmx,
              control: slotState.control,
              laser: slotState.laser,
            }),
            extra: { source: 'save_slot_history' },
          })
        },
      }
    })
    .filter((slot): slot is SaveSlot => slot !== null)
}

function restoreLastState(
  reduxStore: ReduxStore,
  asv: AutoSavedVal<VersionedAutoSaveState>
): AutoSaveRestoreStatus {
  const startedAt = performance.now()
  logProjectPersistence({ phase: 'autosave_restore_start' })

  let latest: VersionedAutoSaveState | null = null
  try {
    latest = asv.loadLatest()
  } catch (err) {
    console.warn('Ignoring corrupt autosave snapshot.', err)
    logProjectPersistence({
      phase: 'autosave_restore_failed',
      level: 'error',
      restoreStatus: 'incompatible',
      error: err,
      durationMs: performance.now() - startedAt,
    })
    reduxStore.dispatch(resetState(defaultState()))
    return 'incompatible'
  }
  if (latest === null) {
    logProjectPersistence({
      phase: 'autosave_restore_complete',
      restoreStatus: 'empty',
      durationMs: performance.now() - startedAt,
    })
    reduxStore.dispatch(resetState(defaultState()))
    return 'empty'
  }

  const parsed = parseVersionedAutoSaveState(latest)
  if (!parsed.compatible || parsed.state === null) {
    logProjectPersistence({
      phase: 'autosave_restore_failed',
      level: 'error',
      restoreStatus: 'incompatible',
      schema: typeof latest.schema === 'string' ? latest.schema : undefined,
      version: Number.isFinite(Number(latest.version))
        ? Number(latest.version)
        : undefined,
      durationMs: performance.now() - startedAt,
    })
    reduxStore.dispatch(resetState(defaultState()))
    return 'incompatible'
  }

  const after = countProjectContent({
    dmx: parsed.state.dmx,
    control: parsed.state.control,
    laser: parsed.state.laser,
  })
  reduxStore.dispatch(resetState(parsed.state))
  logProjectPersistence({
    phase: 'autosave_restore_complete',
    restoreStatus: 'restored',
    schema: latest.schema,
    version: latest.version,
    after,
    durationMs: performance.now() - startedAt,
  })
  return 'restored'
}

export const autoSave = (reduxStore: ReduxStore) => {
  autoSavedVal = new AutoSavedVal('state', () =>
    createVersionedAutoSaveState(getCleanReduxState(reduxStore.getState()))
  )

  lastRestoreStatus = restoreLastState(reduxStore, autoSavedVal)
  return lastRestoreStatus
}

export function getAutoSaveRestoreStatus() {
  return lastRestoreStatus
}

/** Await a final workspace write when the app is closing. */
export async function flushAutoSaveForQuit(): Promise<void> {
  stopFileAutosave()
  const workspace = store.getState().gui.projectWorkspace

  await runPersistenceBusy(
    {
      title: 'Closing Captivate',
      message:
        workspace.projectFilePath !== null
          ? 'Saving project before exit...'
          : 'Finishing up...',
      progress: 0.05,
    },
    async (update) => {
      if (workspace.projectFilePath !== null) {
        try {
          await writeWorkspaceFilesSilent(
            workspace.projectFilePath,
            workspace.fixtureLibraryFilePath,
            'quit',
            (progress, message) => update({ progress, message })
          )
        } catch {
          // Best-effort on quit; errors are logged.
        }
      } else {
        update({ progress: 0.45, message: 'Saving session...' })
      }

      autoSavedVal?.flush()
      update({ progress: 1, message: 'Closing...' })
      logProjectPersistence({
        phase: 'quit_save_flush',
        filePath: workspace.projectFilePath ?? undefined,
      })
    }
  )
}

/** Write the current project state to disk (or localStorage fallback). */
export function flushAutoSave() {
  const before = snapshotCurrentProjectCounts(store.getState())
  const workspace = store.getState().gui.projectWorkspace
  lastFileAutosaveFingerprint = null
  if (
    fileAutosaveEnabled &&
    workspace.projectFilePath !== null &&
    store.getState().gui.appSettings.autosaveEnabled === true
  ) {
    setFileAutosaveEnabled(
      true,
      workspace.projectFilePath,
      workspace.fixtureLibraryFilePath
    )
    void flushFileAutosave()
  } else {
    autoSavedVal?.flush()
  }
  logProjectPersistence({
    phase: 'autosave_flush',
    before,
    after: snapshotCurrentProjectCounts(store.getState()),
    filePath: workspace.projectFilePath ?? undefined,
  })
}

export const captivateFileFilters = {
  captivate: projectFileFilters,
  captivateFixtures: fixtureLibraryFileFilters,
  qlcFixtures: {
    name: 'QLC+ Fixture Definition',
    extensions: ['qxf'],
  },
}

export const loadFile = loadFileFromDisk
export const saveFile = saveFileToDisk
export const readTextFile = readTextFileFromDisk
export const writeTextFile = writeTextFileToDisk

const maybeWindow =
  typeof window !== 'undefined'
    ? (window as Window & {
        electron?: { ipcRenderer?: { invoke: (c: string, ...a: unknown[]) => Promise<unknown> } }
      })
    : undefined

function getFileIpcRendererForFixture() {
  const ipcRenderer = maybeWindow?.electron?.ipcRenderer
  if (!ipcRenderer) {
    throw new Error(
      'File dialogs are unavailable outside the Captivate desktop app.'
    )
  }
  return ipcRenderer
}

export async function loadFixtureLibraryFromDefaultPath(): Promise<string | null> {
  return getFileIpcRendererForFixture().invoke(
    ipcChannels.load_fixture_library_default
  ) as Promise<string | null>
}

export async function saveFixtureLibraryToDefaultPath(
  serializedFixtureLibrary: string
): Promise<string> {
  return getFileIpcRendererForFixture().invoke(
    ipcChannels.save_fixture_library_default,
    serializedFixtureLibrary
  ) as Promise<string>
}

export async function getDefaultFixtureLibraryPath(): Promise<string> {
  return getFileIpcRendererForFixture().invoke(
    ipcChannels.get_fixture_library_default_path
  ) as Promise<string>
}

function createVersionedAutoSaveState(
  state: CleanReduxState
): VersionedAutoSaveState {
  return {
    schema: AUTOSAVE_SCHEMA,
    version: AUTOSAVE_VERSION,
    savedAt: Date.now(),
    state,
  }
}

function parseVersionedAutoSaveState(raw: unknown): {
  compatible: boolean
  state: CleanReduxState | null
} {
  if (raw === null || typeof raw !== 'object') {
    return { compatible: false, state: null }
  }

  const source = raw as {
    schema?: unknown
    version?: unknown
    state?: unknown
  }

  if (
    typeof source.schema !== 'string' ||
    !Number.isFinite(Number(source.version))
  ) {
    return { compatible: false, state: null }
  }

  const version = Number(source.version)
  if (
    source.schema !== AUTOSAVE_SCHEMA ||
    version < MIN_SUPPORTED_AUTOSAVE_VERSION ||
    version > AUTOSAVE_VERSION
  ) {
    return { compatible: false, state: null }
  }

  if (source.state === null || typeof source.state !== 'object') {
    return { compatible: false, state: null }
  }

  const state = JSON.parse(JSON.stringify(source.state)) as CleanReduxState
  if (state.dmx) {
    state.dmx = JSON.parse(
      migrateLegacyFixturePersistedJson(JSON.stringify(state.dmx))
    ) as CleanReduxState['dmx']
  }

  return {
    compatible: true,
    state,
  }
}

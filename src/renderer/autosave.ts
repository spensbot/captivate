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

const AUTOSAVE_SCHEMA = 'captivate.autosave'
const AUTOSAVE_VERSION = 4
const MIN_SUPPORTED_AUTOSAVE_VERSION = 3

interface VersionedAutoSaveState {
  schema: string
  version: number
  savedAt: number
  state: CleanReduxState
}

export type AutoSaveRestoreStatus = 'restored' | 'empty' | 'incompatible'

let autoSavedVal: AutoSavedVal<VersionedAutoSaveState> | null = null
let lastRestoreStatus: AutoSaveRestoreStatus = 'empty'

interface SaveSlot {
  timePassed: string
  apply: () => void
}

export function stopAutoSave() {
  if (autoSavedVal !== null) {
    autoSavedVal.stop()
  }
}

export function startAutoSave() {
  if (autoSavedVal !== null) {
    autoSavedVal.start()
  }
}

export function getSaveSlots(): SaveSlot[] {
  if (autoSavedVal === null) {
    return []
  } else {
    return autoSavedVal
      .loadAll()
      .slice(2)
      .map((datedSave) => {
        const parsed = parseVersionedAutoSaveState(datedSave.data)
        if (!parsed.compatible || parsed.state === null) {
          return null
        }
        return {
          timePassed: printTimePassed(datedSave),
          apply: () => {
            store.dispatch(resetState(parsed.state as CleanReduxState))
          },
        }
      })
      .filter((slot): slot is SaveSlot => slot !== null)
  }
}

function restoreLastState(
  store: ReduxStore,
  asv: AutoSavedVal<VersionedAutoSaveState>
): AutoSaveRestoreStatus {
  let latest: VersionedAutoSaveState | null = null
  try {
    latest = asv.loadLatest()
  } catch (err) {
    console.warn('Ignoring corrupt autosave snapshot.', err)
    store.dispatch(resetState(defaultState()))
    return 'incompatible'
  }
  if (latest === null) {
    store.dispatch(resetState(defaultState()))
    return 'empty'
  } else {
    const parsed = parseVersionedAutoSaveState(latest)
    if (!parsed.compatible || parsed.state === null) {
      store.dispatch(resetState(defaultState()))
      return 'incompatible'
    }
    store.dispatch(resetState(parsed.state))
    return 'restored'
  }
}

export const autoSave = (store: ReduxStore) => {
  autoSavedVal = new AutoSavedVal('state', () =>
    createVersionedAutoSaveState(getCleanReduxState(store.getState()))
  )

  lastRestoreStatus = restoreLastState(store, autoSavedVal)
  return lastRestoreStatus
}

export function getAutoSaveRestoreStatus() {
  return lastRestoreStatus
}

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

export const captivateFileFilters = {
  captivate: { name: 'Captivate 2', extensions: ['captivate'] },
  captivateFixtures: {
    name: 'Captivate 2 Fixture Library',
    extensions: ['captivate-fixtures', 'json', 'db'],
  },
  qlcFixtures: {
    name: 'QLC+ Fixture Definition',
    extensions: ['qxf'],
  },
}

/** Resolves to `null` when the user dismisses the open dialog (not an error). */
export async function loadFile(
  title: string,
  fileFilters: Electron.FileFilter[]
): Promise<string | null> {
  return getFileIpcRenderer().invoke(
    ipcChannels.load_file,
    title,
    fileFilters
  ) as Promise<string | null>
}

/** Resolves to `null` when the user dismisses the save dialog (not an error). */
export async function saveFile(
  title: string,
  data: string,
  fileFilters: Electron.FileFilter[]
): Promise<void | null> {
  return getFileIpcRenderer().invoke(
    ipcChannels.save_file,
    title,
    data,
    fileFilters
  ) as Promise<void | null>
}

export async function loadFixtureLibraryFromDefaultPath(): Promise<string | null> {
  return getFileIpcRenderer().invoke(
    ipcChannels.load_fixture_library_default
  ) as Promise<string | null>
}

export async function saveFixtureLibraryToDefaultPath(
  serializedFixtureLibrary: string
): Promise<string> {
  return getFileIpcRenderer().invoke(
    ipcChannels.save_fixture_library_default,
    serializedFixtureLibrary
  ) as Promise<string>
}

export async function getDefaultFixtureLibraryPath(): Promise<string> {
  return getFileIpcRenderer().invoke(
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

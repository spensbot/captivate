import { SaveConfig, createVersionedProjectSave } from 'shared/save'
import {
  createFullSaveConfig,
  fixtureLibraryFileFilters,
  normalizeFixtureLibrarySavePath,
  normalizeProjectSavePath,
  projectFileFilters,
  resolveWorkspaceFixtureLibraryPath,
  siblingFixtureLibraryPath,
} from '../../shared/projectFiles'
import { describeLegacyProjectMigration } from '../../shared/projectFileMigration'
import { store } from '../redux/store'
import { flushAutoSave, setFileAutosaveEnabled } from '../autosave'
import { loadFile, readTextFile, saveFile } from '../project/fileIO'
import { recordRecentProjectPath, persistAppSettings } from '../appSettingsClient'
import { addFixtureType, updateFixtureType } from '../redux/dmxSlice'
import { cloneFixtureType, parseFixtureLibrary } from '../../shared/fixtureLibrary'
import { openAppConfirm } from 'renderer/overlays/appDialogService'
import { logProjectPersistence } from '../telemetry/projectPersistenceTelemetry'
import { setAppSettings, setProjectWorkspace } from '../redux/guiSlice'
import {
  buildProjectSaveState,
  serializeFixtureLibraryFromStore,
  writeFixtureLibraryToPath,
  writeProjectToPath,
} from '../project/projectFileWriter'
import { runPersistenceBusy } from '../project/projectPersistenceBusy'

export function isIncompatibleSaveError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('legacy save format') ||
    lower.includes('unsupported save version') ||
    lower.includes('unsupported save schema') ||
    lower.includes('incompatible')
  )
}

async function persistWorkspaceToAppSettings(
  projectFilePath: string,
  fixtureLibraryFilePath: string
) {
  const current = store.getState().gui.appSettings
  const saved = await persistAppSettings({
    ...current,
    lastProjectFilePath: projectFilePath,
    lastFixtureLibraryFilePath: fixtureLibraryFilePath,
  })
  store.dispatch(setAppSettings(saved))
}

export function applyWorkspacePaths(projectFilePath: string) {
  const normalized = normalizeProjectSavePath(projectFilePath)
  const fixturePath = siblingFixtureLibraryPath(normalized)
  store.dispatch(
    setProjectWorkspace({
      projectFilePath: normalized,
      fixtureLibraryFilePath: fixturePath,
    })
  )
  setFileAutosaveEnabled(
    store.getState().gui.appSettings.autosaveEnabled === true,
    normalized,
    fixturePath
  )
  void persistWorkspaceToAppSettings(normalized, fixturePath)
}

async function persistFixtureLibraryPathToAppSettings(
  fixtureLibraryFilePath: string
) {
  const current = store.getState().gui.appSettings
  const saved = await persistAppSettings({
    ...current,
    lastFixtureLibraryFilePath: fixtureLibraryFilePath,
  })
  store.dispatch(setAppSettings(saved))
}

/** Default fixture DB path for open/save dialogs (project working directory). */
export function getDefaultFixtureLibraryDialogPath(): string | undefined {
  const workspace = store.getState().gui.projectWorkspace
  if (workspace.fixtureLibraryFilePath !== null) {
    return workspace.fixtureLibraryFilePath
  }
  if (workspace.projectFilePath !== null) {
    return siblingFixtureLibraryPath(workspace.projectFilePath)
  }
  const last = store.getState().gui.appSettings.lastFixtureLibraryFilePath
  return last ?? undefined
}

function resolveWorkspaceFixtureSavePath(): string | null {
  const workspace = store.getState().gui.projectWorkspace
  return resolveWorkspaceFixtureLibraryPath(
    workspace.projectFilePath,
    workspace.fixtureLibraryFilePath
  )
}

export function applyFixtureLibraryPath(fixtureLibraryFilePath: string) {
  const workspace = store.getState().gui.projectWorkspace
  const normalized = normalizeFixtureLibrarySavePath(fixtureLibraryFilePath)
  store.dispatch(
    setProjectWorkspace({
      projectFilePath: workspace.projectFilePath,
      fixtureLibraryFilePath: normalized,
    })
  )
  setFileAutosaveEnabled(
    store.getState().gui.appSettings.autosaveEnabled === true,
    workspace.projectFilePath,
    normalized
  )
  void persistFixtureLibraryPathToAppSettings(normalized)
}

async function writeProjectWithOptionalBusy(
  projectFilePath: string,
  config: SaveConfig,
  showBusy: boolean
) {
  const write = async (
    onProgress?: (progress: number, message: string) => void
  ) => {
    return writeProjectToPath(projectFilePath, config, {
      onProgress: (progress, message) => onProgress?.(progress, message),
    })
  }

  if (!showBusy) {
    return write()
  }

  return runPersistenceBusy(
    {
      title: 'Save Project',
      message: 'Preparing project data...',
      progress: 0.05,
    },
    async (update) =>
      write((progress, message) => {
        update({ progress, message })
      })
  )
}

export async function saveProject(options?: {
  saveAs?: boolean
  /** Skip the progress overlay (background autosave / quit flush). */
  silent?: boolean
}) {
  const config = createFullSaveConfig()
  const workspace = store.getState().gui.projectWorkspace
  const saveAs = options?.saveAs === true
  const showBusy = options?.silent !== true

  if (!saveAs && workspace.projectFilePath !== null) {
    await writeProjectWithOptionalBusy(
      workspace.projectFilePath,
      config,
      showBusy
    )
    applyWorkspacePaths(workspace.projectFilePath)
    await recordRecentProjectPath(workspace.projectFilePath)
    flushAutoSave()
    return workspace.projectFilePath
  }

  const saveState = await buildProjectSaveState(config)
  const serializedSaveState = JSON.stringify(
    createVersionedProjectSave(saveState)
  )
  const defaultPath = workspace.projectFilePath ?? undefined

  const savedPath = await saveFile(
    'Save Project As',
    serializedSaveState,
    [projectFileFilters],
    defaultPath !== undefined ? { defaultPath } : undefined
  )
  if (savedPath === null) {
    logProjectPersistence({ phase: 'project_save_cancelled', saveConfig: config })
    return null
  }

  const { normalizedPath } = await writeProjectWithOptionalBusy(
    savedPath,
    config,
    showBusy
  )
  applyWorkspacePaths(normalizedPath)
  await recordRecentProjectPath(normalizedPath)

  const migration = describeLegacyProjectMigration(savedPath)
  if (migration !== null && normalizedPath !== savedPath) {
    logProjectPersistence({
      phase: 'project_save_complete',
      level: 'info',
      message: `Migrated legacy ${migration.fromExtension} save to ${migration.toExtension}.`,
      filePath: normalizedPath,
      extra: { migration },
    })
  }

  flushAutoSave()
  return normalizedPath
}

export async function mergeFixtureLibraryFromPath(filePath: string) {
  const serialized = await readTextFile(filePath)
  if (serialized.trim().length === 0) {
    return
  }
  const fixtures = parseFixtureLibrary(serialized)
  for (const fixture of fixtures) {
    const existing = store.getState().dmx.present.fixtureTypesByID[fixture.id]
    if (existing === undefined) {
      store.dispatch(addFixtureType(cloneFixtureType(fixture, { keepId: true })))
    } else if (JSON.stringify(existing) !== JSON.stringify(fixture)) {
      store.dispatch(updateFixtureType(cloneFixtureType(fixture, { keepId: true })))
    }
  }
}

export async function loadFixtureDatabase() {
  const defaultPath = getDefaultFixtureLibraryDialogPath()
  const loaded = await loadFile(
    'Load Fixture Database',
    [fixtureLibraryFileFilters],
    defaultPath !== undefined ? { defaultPath } : undefined
  )
  if (loaded === null) {
    logProjectPersistence({ phase: 'fixture_db_load_cancelled' })
    return
  }

  await runPersistenceBusy(
    {
      title: 'Load Fixture Database',
      message: 'Reading fixture database...',
      progress: 0.25,
    },
    async (update) => {
      update({ progress: 0.55, message: 'Merging fixture types...' })
      await mergeFixtureLibraryFromPath(loaded.filePath)
      applyFixtureLibraryPath(loaded.filePath)
      update({ progress: 1, message: 'Fixture database loaded' })
      logProjectPersistence({
        phase: 'fixture_db_load_complete',
        filePath: loaded.filePath,
      })
    }
  )
}

async function writeFixtureDatabaseWithBusy(filePath: string) {
  await runPersistenceBusy(
    {
      title: 'Save Fixture Database',
      message: 'Preparing fixture database...',
      progress: 0.15,
    },
    async (update) => {
      update({ progress: 0.45, message: 'Writing fixture database...' })
      await writeFixtureLibraryToPath(filePath)
      update({ progress: 1, message: 'Save complete' })
    }
  )
}

export async function saveFixtureDatabase(options?: { saveAs?: boolean }) {
  const saveAs = options?.saveAs === true
  const workspacePath = resolveWorkspaceFixtureSavePath()

  if (!saveAs && workspacePath !== null) {
    await writeFixtureDatabaseWithBusy(workspacePath)
    applyFixtureLibraryPath(workspacePath)
    logProjectPersistence({
      phase: 'fixture_db_save_complete',
      filePath: workspacePath,
    })
    return workspacePath
  }

  const serialized = serializeFixtureLibraryFromStore()
  const defaultPath = getDefaultFixtureLibraryDialogPath()
  const savedPath = await saveFile(
    'Save Fixture Database As',
    serialized,
    [fixtureLibraryFileFilters],
    defaultPath !== undefined ? { defaultPath } : undefined
  )
  if (savedPath === null) {
    logProjectPersistence({ phase: 'fixture_db_save_cancelled' })
    return null
  }

  const normalizedPath = normalizeFixtureLibrarySavePath(savedPath)
  await writeFixtureDatabaseWithBusy(normalizedPath)
  applyFixtureLibraryPath(normalizedPath)
  logProjectPersistence({
    phase: 'fixture_db_save_complete',
    filePath: normalizedPath,
    extra: savedPath !== normalizedPath ? { migratedFrom: savedPath } : undefined,
  })
  return normalizedPath
}

/** @deprecated Use loadFixtureDatabase(). */
export async function loadFixtureDatabaseFromDialog() {
  return loadFixtureDatabase()
}

/** @deprecated Use saveFixtureDatabase(). */
export async function saveFixtureDatabaseToDialog() {
  return saveFixtureDatabase()
}

export async function loadSiblingFixtureLibraryIfPresent(projectFilePath: string) {
  const fixturePath = siblingFixtureLibraryPath(
    normalizeProjectSavePath(projectFilePath)
  )
  try {
    await mergeFixtureLibraryFromPath(fixturePath)
  } catch {
    // Optional on legacy projects.
  }
}

export async function offerFixtureDatabaseImport() {
  const shouldImport = await openAppConfirm({
    title: 'Import Fixture Database',
    message:
      'This project format is incompatible and a new project was started. Import your saved fixture database now?',
    confirmLabel: 'Import',
    cancelLabel: 'Skip',
  })
  if (!shouldImport) {
    return
  }

  const workspace = store.getState().gui.projectWorkspace
  if (workspace.fixtureLibraryFilePath !== null) {
    try {
      await mergeFixtureLibraryFromPath(workspace.fixtureLibraryFilePath)
      return
    } catch {
      // fall through
    }
  }

  await loadFixtureDatabase()
}

export async function createNewProjectAtPath(
  projectFilePath: string,
  options?: { silent?: boolean }
) {
  const config = createFullSaveConfig()
  const showBusy = options?.silent !== true
  const { normalizedPath } = showBusy
    ? await runPersistenceBusy(
        {
          title: 'Creating Project',
          message: 'Writing project files...',
          progress: 0.05,
        },
        async (update) =>
          writeProjectToPath(projectFilePath, config, {
            onProgress: (progress, message) => update({ progress, message }),
          })
      )
    : await writeProjectToPath(projectFilePath, config)
  applyWorkspacePaths(normalizedPath)
  await recordRecentProjectPath(normalizedPath)
  flushAutoSave()
  return normalizedPath
}

/** @deprecated Use saveProject(). */
export async function saveProjectToFile(config: SaveConfig) {
  if (store.getState().gui.projectWorkspace.projectFilePath !== null) {
    await writeProjectToPath(store.getState().gui.projectWorkspace.projectFilePath!, config)
    return
  }
  await saveProject({ saveAs: true })
}

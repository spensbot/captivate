import {
  ProfileGuiState,
  SaveConfig,
  SaveState,
  createVersionedProjectSave,
} from 'shared/save'
import {
  createFullSaveConfig,
  normalizeFixtureLibrarySavePath,
  normalizeProjectSavePath,
  siblingFixtureLibraryPath,
} from '../../shared/projectFiles'
import { store } from '../redux/store'
import { writeTextFile } from './fileIO'
import { getVisualizerStreamingSettings } from '../ipcHandler'
import { FixtureType } from '../../shared/dmxFixtures'
import { serializeFixtureLibrary } from '../../shared/fixtureLibrary'
import {
  logProjectPersistence,
  snapshotCurrentProjectCounts,
} from '../telemetry/projectPersistenceTelemetry'
import { countProjectContent } from '../../shared/projectPersistenceSummary'

export async function buildProjectSaveState(
  config: SaveConfig = createFullSaveConfig()
): Promise<SaveState> {
  const state = store.getState()
  const control = state.control.present
  const dmx = state.dmx.present

  const guiProfile: ProfileGuiState = {
    activePage: state.gui.activePage,
    blackout: state.gui.blackout,
    ledEnabled: state.gui.ledEnabled,
    videoEnabled: state.gui.videoEnabled,
    fxtrDepthOn: state.gui.fxtrDepthOn,
    ledSidebarEnabled: state.gui.ledSidebarEnabled,
  }

  const visualizerStreamingSettings =
    config.visualizerStreaming === true
      ? await getVisualizerStreamingSettings().catch((err) => {
          console.warn('Failed to read visualizer streaming settings:', err)
          return null
        })
      : null

  return {
    light: config.light ? control.light : undefined,
    visual: config.visual ? control.visual : undefined,
    visualizerStreaming:
      config.visualizerStreaming && visualizerStreamingSettings !== null
        ? visualizerStreamingSettings
        : undefined,
    dmx: config.dmx ? dmx : undefined,
    device: config.device ? control.device : undefined,
    gui: config.gui ? guiProfile : undefined,
    mixer: config.mixer ? state.mixer : undefined,
    laser: config.laser ? state.laser : undefined,
  }
}

export function serializeFixtureLibraryFromStore(): string {
  const dmx = store.getState().dmx.present
  const fixtureTypes = dmx.fixtureTypes
    .map((id) => dmx.fixtureTypesByID[id])
    .filter((fixture): fixture is FixtureType => fixture !== undefined)
  return serializeFixtureLibrary(fixtureTypes)
}

export async function writeFixtureLibraryToPath(filePath: string) {
  const serialized = serializeFixtureLibraryFromStore()
  await writeTextFile(filePath, serialized)
}

export async function writeProjectToPath(
  projectFilePath: string,
  config: SaveConfig = createFullSaveConfig(),
  options?: {
    onProgress?: (progress: number, message: string) => void
    /** Defaults to sibling `.cfx` next to the project file. */
    fixtureLibraryFilePath?: string
  }
) {
  const report = (progress: number, message: string) => {
    options?.onProgress?.(progress, message)
  }
  const startedAt = performance.now()
  const before = snapshotCurrentProjectCounts(store.getState())
  const normalizedPath = normalizeProjectSavePath(projectFilePath)
  const fixturePath = normalizeFixtureLibrarySavePath(
    options?.fixtureLibraryFilePath ?? siblingFixtureLibraryPath(normalizedPath)
  )

  report(0.12, 'Preparing project data...')
  const saveState = await buildProjectSaveState(config)
  report(0.45, 'Serializing project...')
  const serializedSaveState = JSON.stringify(
    createVersionedProjectSave(saveState)
  )

  logProjectPersistence({
    phase: 'project_save_start',
    before,
    saveConfig: config,
    filePath: normalizedPath,
  })

  report(0.72, 'Writing project file...')
  await writeTextFile(normalizedPath, serializedSaveState)
  report(0.88, 'Writing fixture database...')
  await writeFixtureLibraryToPath(fixturePath)
  report(1, 'Save complete')

  logProjectPersistence({
    phase: 'project_save_complete',
    filePath: normalizedPath,
    saveConfig: config,
    file: countProjectContent(saveState),
    serializedBytes: serializedSaveState.length,
    after: snapshotCurrentProjectCounts(store.getState()),
    durationMs: performance.now() - startedAt,
    extra: { fixtureLibraryPath: fixturePath },
  })

  return { normalizedPath, fixturePath, serializedSaveState }
}

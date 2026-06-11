import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import LoadIcon from '@mui/icons-material/FileOpen'
import IconButton from '@mui/material/IconButton'
import { store, resetState } from '../redux/store'
import { loadFile, captivateFileFilters, readTextFile } from '../autosave'
import { recordRecentProjectPath } from '../appSettingsClient'
import {
  SaveState,
  parseVersionedProjectSave,
  getSaveConfig,
} from 'shared/save'
import { useDispatch } from 'react-redux'
import { setLoading } from 'renderer/redux/guiSlice'
import defaultState from '../redux/defaultState'
import { reportProjectLoadError } from './ProjectSaveLoadDialogs'
import { send_reconcile_video_enabled } from '../ipcHandler'
import {
  isIncompatibleSaveError,
  offerFixtureDatabaseImport,
  saveProject,
} from './projectSaveLoadActions'
import {
  logProjectPersistence,
} from '../telemetry/projectPersistenceTelemetry'
import { runPersistenceBusy } from '../project/projectPersistenceBusy'
import { countProjectContent } from '../../shared/projectPersistenceSummary'
import { PROJECT_SAVE_SCHEMA, PROJECT_SAVE_VERSION } from 'shared/save'
import { statusBarMuiIconButtonSx } from './statusBarUi'

export function parseProjectSaveFromJson(
  serializedSaveState: string,
  filePath?: string
): SaveState {
  const startedAt = performance.now()
  try {
    const parsed = parseVersionedProjectSave(JSON.parse(serializedSaveState))
    if (!parsed.compatible || parsed.save === null) {
      throw new Error(
        parsed.reason ??
          'Save file is incompatible with this Captivate version. Start a new project and import your fixture database.'
      )
    }
    const save = parsed.save as SaveState
    logProjectPersistence({
      phase: 'project_load_parse_complete',
      filePath,
      file: countProjectContent(save),
      saveState: save,
      schema: PROJECT_SAVE_SCHEMA,
      version: PROJECT_SAVE_VERSION,
      serializedBytes: serializedSaveState.length,
      durationMs: performance.now() - startedAt,
      extra:
        parsed.normalization !== undefined
          ? { normalization: parsed.normalization }
          : undefined,
    })
    return save
  } catch (err) {
    logProjectPersistence({
      phase: 'project_load_parse_failed',
      level: 'error',
      filePath,
      serializedBytes: serializedSaveState.length,
      error: err,
      durationMs: performance.now() - startedAt,
    })
    throw err
  }
}

async function loadProjectFromSerialized(
  serializedSaveState: string,
  filePath: string,
  update?: (patch: { progress?: number; message?: string }) => void
): Promise<{ state: SaveState; filePath: string } | null> {
  if (serializedSaveState.trim().length === 0) {
    logProjectPersistence({
      phase: 'project_load_file_read',
      level: 'warn',
      filePath,
      message: 'Load file read returned empty content.',
    })
    return null
  }
  logProjectPersistence({
    phase: 'project_load_file_read',
    filePath,
    serializedBytes: serializedSaveState.length,
  })
  update?.({ progress: 0.55, message: 'Parsing project data...' })
  await recordRecentProjectPath(filePath)
  const state = parseProjectSaveFromJson(serializedSaveState, filePath)
  update?.({ progress: 0.85, message: 'Project file ready' })
  return { state, filePath }
}

export async function loadFromPath(
  filePath: string
): Promise<{ state: SaveState; filePath: string } | null> {
  return runPersistenceBusy(
    {
      title: 'Load Project',
      message: 'Reading project file...',
      progress: 0.15,
    },
    async (update) => {
      const serializedSaveState = await readTextFile(filePath)
      update({ progress: 0.4, message: 'Project file read' })
      return loadProjectFromSerialized(serializedSaveState, filePath, update)
    }
  )
}

export async function load(): Promise<{ state: SaveState; filePath: string } | null> {
  const picked = await loadFile('Load Project', [captivateFileFilters.captivate])
  if (picked === null) {
    logProjectPersistence({ phase: 'project_load_dialog_cancelled' })
    return null
  }
  return runPersistenceBusy(
    {
      title: 'Load Project',
      message: 'Parsing project data...',
      progress: 0.45,
    },
    async (update) =>
      loadProjectFromSerialized(picked.content, picked.filePath, update)
  )
}

function onLoadErr(err: unknown) {
  logProjectPersistence({
    phase: 'project_load_apply_failed',
    level: 'error',
    error: err,
  })
  reportProjectLoadError(err)
  const message = err instanceof Error ? err.message : 'Unknown load error.'
  if (isIncompatibleSaveError(message)) {
    store.dispatch(resetState(defaultState()))
    send_reconcile_video_enabled()
    void offerFixtureDatabaseImport()
  }
}

interface Props {}

export default function SaveLoad({}: Props) {
  const dispatch = useDispatch()

  return (
    <Root>
      <IconButton
        title="Save project (.cap)"
        onClick={() => void saveProject()}
        size="small"
        sx={statusBarMuiIconButtonSx}
      >
        <SaveIcon fontSize="small" />
      </IconButton>
      <IconButton
        title="Load project (.cap)"
        size="small"
        sx={statusBarMuiIconButtonSx}
        onClick={() =>
          load()
            .then((loaded) => {
              if (loaded === null) {
                return
              }
              logProjectPersistence({
                phase: 'project_load_dialog_opened',
                saveState: loaded.state,
                file: countProjectContent(loaded.state),
                filePath: loaded.filePath,
              })
              dispatch(
                setLoading({
                  state: loaded.state,
                  config: getSaveConfig(loaded.state),
                  filePath: loaded.filePath,
                })
              )
            })
            .catch(onLoadErr)
        }
      >
        <LoadIcon fontSize="small" />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
`

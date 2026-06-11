import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { Checkbox } from '@mui/material'
import {
  store,
  applySave,
  resetState,
  useTypedSelector,
} from '../redux/store'
import { flushAutoSave } from '../autosave'
import {
  SaveConfig,
  SaveInfo,
  saveTypes,
  displaySaveType,
  getSaveConfig,
  summarizeProjectSave,
} from 'shared/save'
import { setLoading } from 'renderer/redux/guiSlice'
import defaultState from '../redux/defaultState'
import {
  isIncompatibleSaveError,
  offerFixtureDatabaseImport,
  applyWorkspacePaths,
  loadSiblingFixtureLibraryIfPresent,
} from './projectSaveLoadActions'
import {
  saveVisualizerStreamingSettings,
  send_reconcile_video_enabled,
} from '../ipcHandler'
import BusyModal from 'renderer/overlays/BusyModal'
import { openAppAlert } from 'renderer/overlays/appDialogService'
import AppModal from 'renderer/overlays/AppModal'
import {
  runPersistenceBusy,
  subscribePersistenceBusy,
  type PersistenceBusyState,
} from '../project/projectPersistenceBusy'
import { useEffect, useState } from 'react'
import {
  logProjectPersistence,
  snapshotCurrentProjectCounts,
} from '../telemetry/projectPersistenceTelemetry'
import { countProjectContent } from '../../shared/projectPersistenceSummary'
import { describeLegacyProjectMigration } from '../../shared/projectFileMigration'

export function reportProjectLoadError(err: unknown) {
  logProjectPersistence({
    phase: 'project_load_apply_failed',
    level: 'error',
    error: err,
  })
  console.warn(err)
  const message = err instanceof Error ? err.message : 'Unknown load error.'
  if (isIncompatibleSaveError(message)) {
    store.dispatch(resetState(defaultState()))
    send_reconcile_video_enabled()
    void offerFixtureDatabaseImport()
  }
  void openAppAlert({
    title: 'Load Failed',
    message: `Load failed: ${message}`,
    level: 'error',
    source: 'SaveLoad',
  })
}

function LoadConfigPanel({
  config,
  valid,
  onChange,
}: {
  config: SaveConfig
  valid?: SaveConfig
  onChange: (newConfig: SaveConfig) => void
}) {
  return (
    <>
      {saveTypes.map((saveType) => {
        const isValid = valid ? valid[saveType] : true
        return (
          <CheckItem key={saveType} $isValid={isValid}>
            <Checkbox
              checked={config[saveType]}
              onChange={(e) =>
                onChange({
                  ...config,
                  [saveType]: e.target.checked,
                })
              }
              disabled={!isValid}
              size="small"
            />
            {displaySaveType(saveType)}
          </CheckItem>
        )
      })}
    </>
  )
}

export function applyProjectLoad(info: SaveInfo) {
  const startedAt = performance.now()
  const before = snapshotCurrentProjectCounts(store.getState())
  const fileSummary = summarizeProjectSave(info.state)
  const fileCounts = countProjectContent(info.state)
  const requestedLight = info.config.light && info.state.light !== undefined
  const requestedDmx = info.config.dmx && info.state.dmx !== undefined

  logProjectPersistence({
    phase: 'project_load_apply_start',
    before,
    file: fileCounts,
    saveConfig: info.config,
    saveState: info.state,
    filePath: info.filePath,
  })

  if (
    requestedLight &&
    requestedDmx &&
    fileSummary.lightScenes === 0 &&
    fileSummary.universeFixtures === 0 &&
    fileSummary.fixtureTypes === 0
  ) {
    logProjectPersistence({
      phase: 'project_load_empty_file',
      level: 'warn',
      file: fileCounts,
      saveConfig: info.config,
      saveState: info.state,
      filePath: info.filePath,
    })
    void openAppAlert({
      title: 'Empty Project File',
      message:
        'This project file does not contain any light scenes, fixture types, or patched fixtures.',
      level: 'warn',
      source: 'SaveLoad',
    })
  }

  store.dispatch(applySave(info))
  const after = snapshotCurrentProjectCounts(store.getState())

  if (info.filePath !== undefined) {
    applyWorkspacePaths(info.filePath)
    const migration = describeLegacyProjectMigration(info.filePath)
    if (migration !== null) {
      logProjectPersistence({
        phase: 'project_load_parse_complete',
        level: 'info',
        message: `Loaded legacy ${migration.fromExtension} project; will migrate to ${migration.toExtension} on next save.`,
        filePath: info.filePath,
        extra: { migration },
      })
    }
    void loadSiblingFixtureLibraryIfPresent(info.filePath)
  }

  const lightMissing =
    requestedLight && fileSummary.lightScenes > 0 && after.lightScenes === 0
  const fixturesMissing =
    requestedDmx &&
    fileSummary.universeFixtures > 0 &&
    after.universeFixtures === 0

  if (lightMissing || fixturesMissing) {
    logProjectPersistence({
      phase: 'project_load_content_mismatch',
      level: 'warn',
      before,
      after,
      file: fileCounts,
      saveConfig: info.config,
      saveState: info.state,
      extra: { lightMissing, fixturesMissing },
    })
    void openAppAlert({
      title: 'Load Warning',
      message:
        'The project file contains saved data, but part of it could not be applied. ' +
        `File: ${fileSummary.lightScenes} light scene(s), ${fileSummary.universeFixtures} patched fixture(s). ` +
        `Loaded: ${after.lightScenes} light scene(s), ${after.universeFixtures} patched fixture(s).`,
      level: 'warn',
      source: 'SaveLoad',
    })
  }

  flushAutoSave()
  send_reconcile_video_enabled()
  logProjectPersistence({
    phase: 'project_load_apply_complete',
    before,
    after,
    file: fileCounts,
    saveConfig: info.config,
    durationMs: performance.now() - startedAt,
    filePath: info.filePath,
  })
}

export default function ProjectSaveLoadDialogs() {
  const loading = useTypedSelector((state) => state.gui.loading)
  const dispatch = useDispatch()
  const [persistenceBusy, setPersistenceBusy] =
    useState<PersistenceBusyState | null>(null)

  useEffect(() => subscribePersistenceBusy(setPersistenceBusy), [])

  const applyLoadedConfig = async (pendingLoad: SaveInfo) => {
    await runPersistenceBusy(
      {
        title: 'Load Project',
        message: 'Applying loaded settings...',
        progress: 0.2,
      },
      async (update) => {
        if (
          pendingLoad.config.visualizerStreaming &&
          pendingLoad.state.visualizerStreaming !== undefined
        ) {
          update({
            progress: 0.35,
            message: 'Applying visualizer streaming settings...',
          })
          try {
            await saveVisualizerStreamingSettings(
              pendingLoad.state.visualizerStreaming
            )
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : 'Unknown streaming settings error.'
            void openAppAlert({
              title: 'Load Warning',
              message: `Failed to apply visualizer streaming defaults: ${message}`,
              level: 'warn',
              source: 'SaveLoad',
            })
          }
        }

        update({ progress: 0.65, message: 'Applying project state...' })
        applyProjectLoad(pendingLoad)
        update({ progress: 1, message: 'Load complete' })
      }
    )
  }

  return (
    <>
      {loading !== null && (
        <AppModal
          open={true}
          title="Load Project"
          onClose={() => {
            logProjectPersistence({ phase: 'project_load_dialog_cancelled' })
            dispatch(setLoading(null))
          }}
          actions={[
            {
              label: 'Cancel',
              onClick: () => dispatch(setLoading(null)),
            },
            {
              label: 'Load',
              onClick: () => {
                const pendingLoad = store.getState().gui.loading
                dispatch(setLoading(null))
                if (pendingLoad !== null) {
                  void applyLoadedConfig(pendingLoad)
                }
              },
            },
          ]}
        >
          <LoadConfigPanel
            config={loading.config}
            valid={getSaveConfig(loading.state)}
            onChange={(newConfig) => {
              const current = store.getState().gui.loading
              if (current === null) {
                return
              }
              dispatch(
                setLoading({
                  ...current,
                  config: newConfig,
                })
              )
            }}
          />
        </AppModal>
      )}
      <BusyModal
        open={persistenceBusy !== null}
        title={persistenceBusy?.title ?? 'Working...'}
        message={persistenceBusy?.message}
        progress={persistenceBusy?.progress}
      />
    </>
  )
}

const CheckItem = styled.div<{ $isValid: boolean }>`
  display: flex;
  align-items: center;
  font-size: 1rem;
  opacity: ${(props) => (props.$isValid ? 1.0 : 0.5)};
`

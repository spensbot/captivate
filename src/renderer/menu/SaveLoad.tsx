import { useState } from 'react'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import LoadIcon from '@mui/icons-material/FileOpen'
import IconButton from '@mui/material/IconButton'
import { store, applySave, resetState, useTypedSelector } from '../redux/store'
import {
  saveFile,
  loadFile,
  captivateFileFilters,
  loadFixtureLibraryFromDefaultPath,
  getDefaultFixtureLibraryPath,
} from '../autosave'
import { Checkbox } from '@mui/material'
import {
  ProfileGuiState,
  SaveState,
  createVersionedProjectSave,
  parseVersionedProjectSave,
  SaveConfig,
  saveTypes,
  displaySaveType,
  getSaveConfig,
} from 'shared/save'
import { useDispatch } from 'react-redux'
import { setSaving, setLoading } from 'renderer/redux/guiSlice'
import defaultState from '../redux/defaultState'
import { addFixtureType, updateFixtureType } from '../redux/dmxSlice'
import { cloneFixtureType, parseFixtureLibrary } from '../../shared/fixtureLibrary'
import {
  getVisualizerStreamingSettings,
  saveVisualizerStreamingSettings,
  send_reconcile_video_enabled,
} from '../ipcHandler'
import BusyModal from 'renderer/overlays/BusyModal'
import { openAppAlert, openAppConfirm } from 'renderer/overlays/appDialogService'
import AppModal from 'renderer/overlays/AppModal'
import useStandardBusy from 'renderer/hooks/useStandardBusy'

export async function load(): Promise<SaveState | null> {
  const serializedSaveState = await loadFile('Load Scenes', [
    captivateFileFilters.captivate,
  ])
  if (serializedSaveState === null) {
    return null
  }
  const parsed = parseVersionedProjectSave(JSON.parse(serializedSaveState))
  if (!parsed.compatible || parsed.save === null) {
    throw new Error(
      parsed.reason ??
        'Save file is incompatible with this Captivate version. Start a new project and import your fixture database.'
    )
  }
  return parsed.save as SaveState
}

async function save(config: SaveConfig) {
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

  const saveState: SaveState = {
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

  const serializedSaveState = JSON.stringify(
    createVersionedProjectSave(saveState)
  )
  const result = await saveFile('Save Scenes', serializedSaveState, [
    captivateFileFilters.captivate,
  ])
  if (result === null) {
    return
  }
}

function isIncompatibleSaveError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('legacy save format') ||
    lower.includes('unsupported save version') ||
    lower.includes('unsupported save schema') ||
    lower.includes('incompatible')
  )
}

async function offerFixtureDatabaseImport() {
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

  try {
    const serialized = await loadFixtureLibraryFromDefaultPath()
    if (serialized === null || serialized.trim().length === 0) {
      const defaultPath = await getDefaultFixtureLibraryPath().catch(() => null)
      await openAppAlert({
        title: 'Fixture Database',
        message: defaultPath
          ? `No saved fixture database found at:\n${defaultPath}`
          : 'No saved fixture database found.',
        level: 'warn',
        source: 'SaveLoad',
      })
      return
    }

    const importedFixtures = parseFixtureLibrary(serialized)
    for (const fixture of importedFixtures) {
      const existing = store.getState().dmx.present.fixtureTypesByID[fixture.id]
      if (existing === undefined) {
        store.dispatch(addFixtureType(cloneFixtureType(fixture, { keepId: true })))
      } else if (JSON.stringify(existing) !== JSON.stringify(fixture)) {
        store.dispatch(updateFixtureType(cloneFixtureType(fixture, { keepId: true })))
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown fixture database error.'
    await openAppAlert({
      title: 'Fixture Database',
      message: `Fixture database import failed: ${message}`,
      level: 'error',
      source: 'SaveLoad',
    })
  }
}

interface Props {}

export default function SaveLoad({}: Props) {
  return (
    <>
      <Save />
      <Load />
    </>
  )
}

function Save() {
  const isSaving = useTypedSelector((state) => state.gui.saving)
  const dispatch = useDispatch()
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()
  const [saveConfig, setSaveConfig] = useState<SaveConfig>({
    light: true,
    visual: true,
    visualizerStreaming: true,
    dmx: true,
    device: true,
    gui: true,
    mixer: true,
    laser: true,
  })

  const onSave = async () => {
    startBusy({
      title: 'Saving Profile',
      message: 'Writing project data to disk...',
    })
    try {
      await save(saveConfig)
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Unknown save error.'
      void openAppAlert({
        title: 'Save Failed',
        message: `Save failed: ${message}`,
        level: 'error',
        source: 'SaveLoad',
      })
    } finally {
      stopBusy()
    }
  }

  return (
    <Root>
      <IconButton onClick={() => dispatch(setSaving(true))}>
        <SaveIcon />
      </IconButton>
      {isSaving && (
        <AppModal
          open={true}
          title="Save Configuration"
          onClose={() => dispatch(setSaving(false))}
          actions={[
            {
              label: 'Cancel',
              onClick: () => dispatch(setSaving(false)),
            },
            {
              label: 'Save',
              onClick: () => {
                dispatch(setSaving(false))
                void onSave()
              },
            },
          ]}
        >
          <SaveConfig
            config={saveConfig}
            onChange={(newConfig) => setSaveConfig(newConfig)}
          />
        </AppModal>
      )}
      <BusyModal
        open={busy !== null}
        title={busy?.title ?? 'Working...'}
        message={busyMessage}
        progress={busy?.progress}
      />
    </Root>
  )
}

function Load() {
  const loading = useTypedSelector((state) => state.gui.loading)
  const dispatch = useDispatch()
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()

  const applyLoadedConfig = async (pendingLoad: NonNullable<typeof loading>) => {
    startBusy({
      title: 'Applying Profile',
      message: 'Applying loaded settings...',
    })

    try {
      if (
        pendingLoad.config.visualizerStreaming &&
        pendingLoad.state.visualizerStreaming !== undefined
      ) {
        try {
          await saveVisualizerStreamingSettings(
            pendingLoad.state.visualizerStreaming
          )
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unknown streaming settings error.'
          void openAppAlert({
            title: 'Load Warning',
            message: `Failed to apply visualizer streaming defaults: ${message}`,
            level: 'warn',
            source: 'SaveLoad',
          })
        }
      }

      dispatch(applySave(pendingLoad))
      send_reconcile_video_enabled()
    } finally {
      stopBusy()
    }
  }

  const onLoad = (state: SaveState) =>
    dispatch(
      setLoading({
        state,
        config: getSaveConfig(state),
      })
    )

  const onLoadErr = (err: any) => {
    console.warn(err)
    const message = err instanceof Error ? err.message : 'Unknown load error.'
    if (isIncompatibleSaveError(message)) {
      dispatch(resetState(defaultState()))
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

  return (
    <Root>
      <IconButton
        onClick={() =>
          load()
            .then((state) => {
              if (state !== null) {
                onLoad(state)
              }
            })
            .catch(onLoadErr)
        }
      >
        <LoadIcon />
      </IconButton>
      {loading !== null && (
        <AppModal
          open={true}
          title="Load Configuration"
          onClose={() => dispatch(setLoading(null))}
          actions={[
            {
              label: 'Cancel',
              onClick: () => dispatch(setLoading(null)),
            },
            {
              label: 'Load',
              onClick: () => {
                const pendingLoad = loading
                dispatch(setLoading(null))
                if (pendingLoad !== null) {
                  void applyLoadedConfig(pendingLoad)
                }
              },
            },
          ]}
        >
          <SaveConfig
            config={loading.config}
            valid={getSaveConfig(loading.state)}
            onChange={(newConfig) =>
              dispatch(
                setLoading({
                  ...loading,
                  config: newConfig,
                })
              )
            }
          />
        </AppModal>
      )}
      <BusyModal
        open={busy !== null}
        title={busy?.title ?? 'Working...'}
        message={busyMessage}
        progress={busy?.progress}
      />
    </Root>
  )
}

function SaveConfig({
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
          <CheckItem key={saveType} isValid={isValid}>
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

const Root = styled.div`
  position: relative;
`

const CheckItem = styled.div<{ isValid: boolean }>`
  display: flex;
  align-items: center;
  font-size: 1rem;
  opacity: ${(props) => (props.isValid ? 1.0 : 0.5)};
`

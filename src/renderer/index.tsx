import { createRoot } from 'react-dom/client'
import GlobalStyle from './GlobalStyle'
import App from './App'
import AppThemeShell from './AppThemeShell'
import { Provider } from 'react-redux'
import {
  store,
  getCleanReduxState,
  resetState,
  resetRemoteState,
  type CleanReduxState,
} from './redux/store'
import {
  setDmx,
  setMidi,
  setSaving,
  setLoading,
  setNewProjectDialog,
  setActivePage,
  setAboutOpen,
  setSettingsOpen,
  setAppSettings,
  hideAppDialog,
  setConnectionsMenu,
  setStatusLogOpen,
  setLedSidebarEnabled,
} from './redux/guiSlice'
import type { Page } from '../shared/pages'
import type { Lighting3dRealtimeTick } from '../shared/lighting3dPreviewTransport'
import {
  realtimeStore,
  realtimeContext,
  initRealtimeState,
  update as updateRealtimeStore,
  updateTime as updateRealtimeTime,
} from './redux/realtimeStore'
import {
  ipc_setup,
  requestAppQuit,
  requestWindowClose,
  send_dispatch_to_main,
  send_control_state,
  send_sync_led_sidebar_menu,
  send_sync_autosave_menu,
} from './ipcHandler'
import { registerHostTransport } from '../shared/hostTransport'
import ipc_channels from '../shared/ipc_channels'
import { lighting3dPreviewRuntimeManager } from './lighting3d/Lighting3dPreviewRuntimeManager'
import {
  fetchAppSettings,
  clearRecentProjectPaths,
  persistAppSettings,
} from './appSettingsClient'
import {
  autoSave,
  type AutoSaveRestoreStatus,
  setFileAutosaveEnabled,
  flushAutoSaveForQuit,
} from './autosave'
import { loadFixtureLibraryFromDefaultPath, getDefaultFixtureLibraryPath } from './autosave'
import { getUndoGroup, undoAction, redoAction } from './controls/UndoRedo'
import { load, loadFromPath } from './menu/SaveLoad'
import { reportProjectLoadError } from './menu/ProjectSaveLoadDialogs'
import {
  applyWorkspacePaths,
  isIncompatibleSaveError,
  loadFixtureDatabase,
  saveFixtureDatabase,
  saveProject,
} from './menu/projectSaveLoadActions'
import { getSaveConfig } from 'shared/save'
import { countProjectContent } from '../shared/projectPersistenceSummary'
import {
  logProjectPersistence,
} from './telemetry/projectPersistenceTelemetry'
import { addFixtureType, updateFixtureType } from './redux/dmxSlice'
import {
  cloneFixtureType,
  parseFixtureLibrary,
} from '../shared/fixtureLibrary'
import AudioInputEngine from './audio/AudioInputEngine'
import defaultState from './redux/defaultState'
import RendererTelemetry from './telemetry/RendererTelemetry'
import {
  closeAllAppDialogs,
  openAppAlert,
  openAppConfirm,
} from './overlays/appDialogService'
import { runGenerateScenesFromMenu } from './sceneGeneration/runGenerateScenesFromMenu'
import type { TimeState } from '../shared/TimeState'
import {
  createTimeExtrapolationAnchor,
  engineConnectionTimeChanged,
  extrapolateTimeState,
  mergeEngineConnectionTime,
  resyncTimeExtrapolationAnchor,
  timeStatesVisuallyEqual,
  type TimeExtrapolationAnchor,
} from '../shared/timeExtrapolation'
import {
  flushDmxMixerOutputSync,
  startDmxMixerOutputSync,
  stopDmxMixerOutputSync,
} from './dmx/dmxMixerOutputSync'
import {
  flushBeatMeterEngineSync,
  startBeatMeterEngineSync,
  stopBeatMeterEngineSync,
} from './menu/beatMeterDisplay'

let _frequentlyUpdatedRealtimeState = initRealtimeState()
let _timeExtrapolationAnchor: TimeExtrapolationAnchor = createTimeExtrapolationAnchor(
  _frequentlyUpdatedRealtimeState.time
)
let _isApplyingRemoteState = false
let _isApplyingRemoteDispatch = false
const _audioInputEngine = new AudioInputEngine()
let _appClosePromptOpen = false
let _detachedClosePromptOpen = false
const pageFromLocation = parsePageFromLocation()
const isDetachedPageWindow = pageFromLocation !== null
const isPrimaryWindow = pageFromLocation === null
let _canPublishControlState = !isDetachedPageWindow
let _lastPublishedControlStateSerialized: string | null = null
let _lastReceivedControlStateSerialized: string | null = null
/** Detached windows: coalesce rapid full-state IPC to one Redux replace per frame. */
let _pendingRemoteCleanState: CleanReduxState | null = null
let _pendingRemoteStateRaf: number | null = null

function flushPendingRemoteState() {
  _pendingRemoteStateRaf = null
  if (_pendingRemoteCleanState === null) {
    return
  }
  const next = _pendingRemoteCleanState
  _pendingRemoteCleanState = null
  _isApplyingRemoteState = true
  try {
    store.dispatch(resetRemoteState(next))
  } finally {
    _isApplyingRemoteState = false
  }
  if (_pendingRemoteCleanState !== null) {
    scheduleRemoteStateApply()
  }
}

function scheduleRemoteStateApply() {
  if (_pendingRemoteStateRaf !== null) {
    return
  }
  _pendingRemoteStateRaf = requestAnimationFrame(flushPendingRemoteState)
}

const LOCAL_ONLY_ACTION_TYPES = new Set<string>([
  'gui/setActivePage',
  'gui/setConnectionsMenu',
  'gui/setMidi',
  'gui/setDmx',
  'gui/setSaving',
  'gui/setLoading',
  'gui/setNewProjectDialog',
  'gui/toggleLedEnabled',
  'gui/toggleVideoEnabled',
  'gui/setMoverCalibrationOverride',
  'gui/clearMoverCalibrationOverride',
  'gui/setColorMapCalibrationOverride',
  'gui/clearColorMapCalibrationOverride',
  'gui/setGoboMapCalibrationOverride',
  'gui/clearGoboMapCalibrationOverride',
  'gui/setPrismMapCalibrationOverride',
  'gui/clearPrismMapCalibrationOverride',
  'gui/pushStatusMessage',
  'gui/clearStatusMessages',
  'gui/setStatusLogOpen',
  'gui/showAppDialog',
  'gui/hideAppDialog',
  'gui/setAboutOpen',
  'gui/clearAtmosManualTriggers',
  'gui/setLedSidebarEnabled',
  'reset-state',
  'reset-remote-state',
  'reset-universe',
  'reset-control',
  'apply-save',
])

const SHARED_GUI_ACTION_TYPES = new Set<string>([
  'gui/setBlackout',
  'gui/setFxtrDepthOn',
  'gui/setMoverFollowOverrideEnabled',
  'gui/toggleMoverFollowOverrideEnabled',
  'gui/setMoverFollowOverridePan',
  'gui/setMoverFollowOverrideTilt',
  'gui/setMoverFollowOverrideUseAllGroups',
  'gui/setMoverFollowOverrideGroups',
  'gui/toggleMoverFollowOverrideGroup',
  'gui/fireAtmosManualTrigger',
])

const SHARED_MIXER_ACTION_TYPES = new Set<string>([
  'mixer/setPageIndex',
  'mixer/setChannelsPerPage',
  'mixer/setActiveMixerUniverse',
  'mixer/setOverwrite',
  'mixer/clearOverwrites',
  'mixer/setMixerShowAllChannels',
])

/** Publish to the engine on the next frame — no debounce — so live controls hit DMX immediately. */
const IMMEDIATE_DMX_PUBLISH_ACTION_TYPES = new Set<string>([
  ...SHARED_GUI_ACTION_TYPES,
  ...SHARED_MIXER_ACTION_TYPES,
  'gui/setMoverCalibrationOverride',
  'gui/clearMoverCalibrationOverride',
  'gui/setColorMapCalibrationOverride',
  'gui/clearColorMapCalibrationOverride',
])

function controlPublishAffectsLiveDmx(actionType: string | null): boolean {
  if (actionType === null) {
    return false
  }
  if (actionType.startsWith('control/')) {
    return true
  }
  return IMMEDIATE_DMX_PUBLISH_ACTION_TYPES.has(actionType)
}

let _lastDispatchActionType: string | null = null

function shouldForwardActionToPrimary(action: unknown) {
  if (isPrimaryWindow) return false
  if (_isApplyingRemoteDispatch) return false
  if (!action || typeof action !== 'object') return false
  const type = (action as { type?: unknown }).type
  if (typeof type !== 'string' || type.length <= 0) return false
  if (type.startsWith('@@')) return false
  if (LOCAL_ONLY_ACTION_TYPES.has(type)) return false
  if (type.startsWith('dmx/')) return true
  if (type.startsWith('scenes/')) return true
  if (type.startsWith('laser/')) return true
  if (SHARED_GUI_ACTION_TYPES.has(type)) return true
  if (SHARED_MIXER_ACTION_TYPES.has(type)) return true
  return false
}

const rawDispatch = store.dispatch.bind(store)
;(store as { dispatch: typeof store.dispatch }).dispatch = ((action: unknown) => {
  if (action && typeof action === 'object' && 'type' in action) {
    const type = (action as { type?: unknown }).type
    if (typeof type === 'string') {
      _lastDispatchActionType = type
    }
  }
  if (shouldForwardActionToPrimary(action)) {
    const result = rawDispatch(action as any)
    send_dispatch_to_main(action as any)
    return result
  }
  return rawDispatch(action as any)
}) as typeof store.dispatch

function parsePageFromLocation(): Page | null {
  const page = new URLSearchParams(window.location.search).get('page')
  const validPages: Page[] = [
    'Universe',
    'Movers',
    'Lighting3D',
    'Atmospherics',
    'Laser',
    'Modulation',
    'Video',
    'VideoViewport',
    'Streaming',
    'Share',
    'Mixer',
    'Led',
  ]
  if (page && validPages.includes(page as Page)) {
    return page as Page
  }
  return null
}

let autoSaveRestoreStatus: AutoSaveRestoreStatus = 'empty'
try {
  autoSaveRestoreStatus = autoSave(store)
} catch (err) {
  console.warn('Autosave restore failed; starting from defaults.', err)
  logProjectPersistence({
    phase: 'autosave_restore_failed',
    level: 'error',
    restoreStatus: 'incompatible',
    error: err,
  })
  store.dispatch(resetState(defaultState()))
}

const _telemetry = new RendererTelemetry(
  pageFromLocation !== null ? 'renderer-page' : 'renderer-main'
)
if (pageFromLocation) {
  store.dispatch(setActivePage(pageFromLocation))
}

async function autoLoadFixtureLibrary(promptForImport: boolean) {
  // Only the primary window should perform startup fixture-library sync.
  if (pageFromLocation !== null) {
    return
  }

  if (promptForImport) {
    const shouldImport = await openAppConfirm({
      title: 'Import Fixture Database',
      message:
        'An incompatible project/autosave format was detected and a new project was started. Import your saved fixture database now?',
      confirmLabel: 'Import',
      cancelLabel: 'Skip',
    })
    if (!shouldImport) {
      return
    }
  }

  try {
    const serialized = await loadFixtureLibraryFromDefaultPath()
    if (serialized === null || serialized.trim().length === 0) {
      if (promptForImport) {
        const defaultPath = await getDefaultFixtureLibraryPath().catch(() => null)
        await openAppAlert({
          title: 'Fixture Database',
          message: defaultPath
            ? `No saved fixture database found at:\n${defaultPath}`
            : 'No saved fixture database found.',
          level: 'warn',
          source: 'Startup',
        })
      }
      return
    }

    const fixtures = parseFixtureLibrary(serialized)
    for (const fixture of fixtures) {
      const existing =
        store.getState().dmx.present.fixtureTypesByID[fixture.id]

      if (existing === undefined) {
        store.dispatch(addFixtureType(cloneFixtureType(fixture, { keepId: true })))
        continue
      }

      if (JSON.stringify(existing) !== JSON.stringify(fixture)) {
        store.dispatch(
          updateFixtureType(cloneFixtureType(fixture, { keepId: true }))
        )
      }
    }
  } catch (err) {
    console.warn('Failed to auto-load fixture library:', err)
  }
}

void autoLoadFixtureLibrary(autoSaveRestoreStatus === 'incompatible')

registerHostTransport({
  sendDispatch: (action) => {
    const ipcRenderer = (window as { electron?: { ipcRenderer?: { send: (c: string, a: unknown) => void } } })
      .electron?.ipcRenderer
    ipcRenderer?.send(ipc_channels.dispatch_to_main, action)
  },
  sendUserCommand: (command) => {
    const ipcRenderer = (window as { electron?: { ipcRenderer?: { send: (c: string, a: unknown) => void } } })
      .electron?.ipcRenderer
    ipcRenderer?.send(ipc_channels.user_command, command)
  },
})

ipc_setup({
  on_dmx_connection_update: (payload) => {
    store.dispatch(setDmx(payload))
  },
  on_midi_connection_update: (payload) => {
    store.dispatch(setMidi(payload))
  },
  on_time_state: (newRealtimeState) => {
    _frequentlyUpdatedRealtimeState = newRealtimeState
    if (newRealtimeState.time.isPlaying === true) {
      _timeExtrapolationAnchor = resyncTimeExtrapolationAnchor(
        _timeExtrapolationAnchor,
        newRealtimeState.time
      )
    } else {
      _timeExtrapolationAnchor = createTimeExtrapolationAnchor(
        newRealtimeState.time
      )
    }
    if (isDetachedPageWindow) {
      applyTransportRealtimeToStore(newRealtimeState)
      return
    }
    _ipcRealtimeDirty = true
  },
  on_dispatch: (action) => {
    // Detached mirrors receive full state via new_control_state; applying broadcast
    // dispatches here would duplicate scene/control mutations on the host.
    if (isDetachedPageWindow) {
      return
    }
    _isApplyingRemoteDispatch = true
    try {
      store.dispatch(action)
    } finally {
      _isApplyingRemoteDispatch = false
    }
  },
  on_main_command: (command) => {
    if (command.type === 'undo') {
      const group = getUndoGroup(store.getState())
      if (group !== null) {
        store.dispatch(undoAction(group))
      }
    } else if (command.type === 'redo') {
      const group = getUndoGroup(store.getState())
      if (group !== null) {
        store.dispatch(redoAction(group))
      }
    } else if (command.type === 'load') {
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
            extra: { source: 'menu_load' },
          })
          store.dispatch(
            setLoading({
              state: loaded.state,
              config: getSaveConfig(loaded.state),
              filePath: loaded.filePath,
            })
          )
        })
        .catch((err) => {
          logProjectPersistence({
            phase: 'project_load_apply_failed',
            level: 'error',
            error: err,
            extra: { source: 'menu_load' },
          })
          reportProjectLoadError(err)
          const message = err instanceof Error ? err.message : 'Unknown load error.'
          if (isIncompatibleSaveError(message)) {
            void autoLoadFixtureLibrary(true)
          }
        })
    } else if (command.type === 'save') {
      void saveProject()
    } else if (command.type === 'save-as') {
      void saveProject({ saveAs: true })
    } else if (command.type === 'toggle-autosave') {
      const current = store.getState().gui.appSettings
      const nextEnabled = !current.autosaveEnabled
      void persistAppSettings({ ...current, autosaveEnabled: nextEnabled }).then(
        (saved) => {
          store.dispatch(setAppSettings(saved))
          const workspace = store.getState().gui.projectWorkspace
          setFileAutosaveEnabled(
            saved.autosaveEnabled,
            workspace.projectFilePath,
            workspace.fixtureLibraryFilePath
          )
          send_sync_autosave_menu(saved.autosaveEnabled)
        }
      )
    } else if (command.type === 'load-fixture-database') {
      void loadFixtureDatabase()
    } else if (command.type === 'save-fixture-database') {
      void saveFixtureDatabase()
    } else if (command.type === 'save-fixture-database-as') {
      void saveFixtureDatabase({ saveAs: true })
    } else if (command.type === 'new-project') {
      store.dispatch(setNewProjectDialog(true))
    } else if (command.type === 'about') {
      if (typeof document === 'undefined' || document.hasFocus()) {
        store.dispatch(setAboutOpen(true))
      }
    } else if (command.type === 'set-led-sidebar-enabled') {
      store.dispatch(setLedSidebarEnabled(command.enabled === true))
    } else if (command.type === 'open-settings') {
      if (typeof document === 'undefined' || document.hasFocus()) {
        store.dispatch(setSettingsOpen(true))
      }
    } else if (command.type === 'generate-scenes') {
      if (typeof document === 'undefined' || document.hasFocus()) {
        void runGenerateScenesFromMenu()
      }
    } else if (command.type === 'load-recent-project') {
      if (typeof command.path !== 'string' || command.path.length === 0) {
        return
      }
      loadFromPath(command.path)
        .then((loaded) => {
          if (loaded === null) {
            return
          }
          logProjectPersistence({
            phase: 'project_load_dialog_opened',
            saveState: loaded.state,
            file: countProjectContent(loaded.state),
            filePath: loaded.filePath,
            extra: { source: 'menu_load_recent' },
          })
          store.dispatch(
            setLoading({
              state: loaded.state,
              config: getSaveConfig(loaded.state),
              filePath: loaded.filePath,
            })
          )
        })
        .catch((err) => {
          logProjectPersistence({
            phase: 'project_load_apply_failed',
            level: 'error',
            error: err,
            filePath: command.path,
            extra: { source: 'menu_load_recent' },
          })
          reportProjectLoadError(err)
          const message = err instanceof Error ? err.message : 'Unknown load error.'
          if (isIncompatibleSaveError(message)) {
            void autoLoadFixtureLibrary(true)
          }
        })
    } else if (command.type === 'clear-recent-projects') {
      void clearRecentProjectPaths()
    }
  },
  on_app_close_prompt: () => {
    if (_appClosePromptOpen && store.getState().gui.appDialog === null) {
      _appClosePromptOpen = false
    }
    if (_appClosePromptOpen) {
      return
    }
    _appClosePromptOpen = true
    void openAppConfirm({
      title: 'Are you sure?',
      message: 'Closing the app will stop all lighting and video output.',
      confirmLabel: 'Stop!',
      cancelLabel: 'Dont Stop',
      danger: true,
      critical: true,
    })
      .then(async (shouldQuit) => {
        if (shouldQuit) {
          await flushAutoSaveForQuit()
          await requestAppQuit()
        }
      })
      .finally(() => {
        _appClosePromptOpen = false
      })
  },
  on_detached_window_close_prompt: () => {
    if (_detachedClosePromptOpen && store.getState().gui.appDialog === null) {
      _detachedClosePromptOpen = false
    }
    if (_detachedClosePromptOpen) {
      return
    }
    _detachedClosePromptOpen = true
    void openAppConfirm({
      title: 'Close Window?',
      message: 'Closing this window will not close the main window.',
      confirmLabel: 'Close',
      cancelLabel: 'Dont close',
    })
      .then(async (shouldClose) => {
        if (shouldClose) {
          const didClose = await requestWindowClose().catch(() => false)
          if (!didClose) {
            await openAppAlert({
              title: 'Close Window',
              message: 'Unable to close this window from the modal action.',
              level: 'warn',
              source: 'Window',
            })
          }
        }
      })
      .finally(() => {
        _detachedClosePromptOpen = false
      })
  },
  on_control_state: (newState) => {
    if (pageFromLocation === 'Lighting3D') {
      return
    }
    const serialized = JSON.stringify(newState)
    if (serialized === _lastReceivedControlStateSerialized) {
      return
    }
    _lastReceivedControlStateSerialized = serialized
    if (isDetachedPageWindow) {
      _pendingRemoteCleanState = newState
      scheduleRemoteStateApply()
      return
    }
    // The main window owns project state; do not replace it from engine snapshots.
    if (isPrimaryWindow) {
      return
    }
    _isApplyingRemoteState = true
    store.dispatch(resetRemoteState(newState))
    _isApplyingRemoteState = false
    if (_canPublishControlState) {
      _lastPublishedControlStateSerialized = JSON.stringify(
        getCleanReduxState(store.getState())
      )
    }
  },
  ...(pageFromLocation === 'Lighting3D'
    ? {
        on_lighting3d_preview_bootstrap: (newState: CleanReduxState) => {
          _isApplyingRemoteState = true
          try {
            store.dispatch(resetRemoteState(newState))
          } finally {
            _isApplyingRemoteState = false
          }
        },
        on_lighting3d_realtime_tick: (tick: Lighting3dRealtimeTick) => {
          lighting3dPreviewRuntimeManager.applyTick(tick)
        },
      }
    : {}),
})

if (isPrimaryWindow) {
  let lastLedSidebarMenu = store.getState().gui.ledSidebarEnabled
  store.subscribe(() => {
    const next = store.getState().gui.ledSidebarEnabled
    if (next !== lastLedSidebarMenu) {
      lastLedSidebarMenu = next
      send_sync_led_sidebar_menu(next)
    }
  })
  queueMicrotask(() => {
    send_sync_led_sidebar_menu(store.getState().gui.ledSidebarEnabled)
  })
}

let realtimeFrameHandle: number | null = null
/** Latest engine snapshot; applied at most once per display frame on the primary window. */
let _ipcRealtimeDirty = false
let _lastAppliedIpcRealtimeState = initRealtimeState()
let _stoppedTransportFrameLocked = false

function stoppedTransportConnectionTimeChanged(
  prev: TimeState,
  next: TimeState
): boolean {
  return engineConnectionTimeChanged(prev, next)
}

function mergeStoppedTransportLiveFields(
  frozen: ReturnType<typeof initRealtimeState>,
  anchor: ReturnType<typeof initRealtimeState>
): ReturnType<typeof initRealtimeState> {
  return {
    ...frozen,
    time: mergeEngineConnectionTime(frozen.time, anchor.time),
    audio: anchor.audio,
    dmxOutByUniverse: anchor.dmxOutByUniverse,
    dmxOut: anchor.dmxOut,
  }
}

function applyTransportRealtimeToStore(anchor: ReturnType<typeof initRealtimeState>) {
  if (document.visibilityState !== 'visible') {
    return
  }

  const playing = anchor.time.isPlaying === true
  if (!playing) {
    if (_stoppedTransportFrameLocked) {
      const prev = _lastAppliedIpcRealtimeState
      const audioChanged = prev.audio !== anchor.audio
      const dmxChanged =
        prev.dmxOutByUniverse !== anchor.dmxOutByUniverse ||
        prev.dmxOut !== anchor.dmxOut
      const linkChanged = stoppedTransportConnectionTimeChanged(
        prev.time,
        anchor.time
      )
      if (!audioChanged && !dmxChanged && !linkChanged) {
        return
      }
      const merged = mergeStoppedTransportLiveFields(prev, anchor)
      _lastAppliedIpcRealtimeState = merged
      realtimeStore.dispatch(updateRealtimeStore(merged))
      if (dmxChanged) {
        flushDmxMixerOutputSync()
      }
      return
    }
    _stoppedTransportFrameLocked = true
    _ipcRealtimeDirty = false
    _lastAppliedIpcRealtimeState = anchor
    realtimeStore.dispatch(updateRealtimeStore(anchor))
    flushDmxMixerOutputSync()
    flushBeatMeterEngineSync()
    return
  }

  _stoppedTransportFrameLocked = false
  _lastAppliedIpcRealtimeState = anchor
  realtimeStore.dispatch(updateRealtimeStore(anchor))
  flushDmxMixerOutputSync()
  flushBeatMeterEngineSync()
}

function publishRealtimeStateFromIpc() {
  const anchor = _frequentlyUpdatedRealtimeState
  _ipcRealtimeDirty = false
  applyTransportRealtimeToStore(anchor)
}

function realtimeModulationChanged(
  prev: ReturnType<typeof initRealtimeState>,
  next: ReturnType<typeof initRealtimeState>
): boolean {
  return (
    prev.splitStates !== next.splitStates ||
    prev.dmxOutByUniverse !== next.dmxOutByUniverse ||
    prev.dmxOut !== next.dmxOut ||
    prev.audio !== next.audio ||
    prev.atmos !== next.atmos
  )
}

function dispatchDisplayRealtimeFrame() {
  if (!isPrimaryWindow || document.visibilityState !== 'visible') {
    return
  }

  const anchor = _frequentlyUpdatedRealtimeState
  const playing = anchor.time.isPlaying === true

  if (!playing) {
    if (_ipcRealtimeDirty) {
      _ipcRealtimeDirty = false
    }
    applyTransportRealtimeToStore(anchor)
    return
  }

  _stoppedTransportFrameLocked = false
  const extrapolatedTime = extrapolateTimeState(_timeExtrapolationAnchor)
  const displayTime = mergeEngineConnectionTime(extrapolatedTime, anchor.time)
  const ipcDirty = _ipcRealtimeDirty

  if (ipcDirty) {
    _ipcRealtimeDirty = false
    const modulationChanged = realtimeModulationChanged(
      _lastAppliedIpcRealtimeState,
      anchor
    )
    _lastAppliedIpcRealtimeState = anchor

    if (modulationChanged) {
      realtimeStore.dispatch(
        updateRealtimeStore({ ...anchor, time: displayTime })
      )
      return
    }

    const currentTime = realtimeStore.getState().time
    if (engineConnectionTimeChanged(currentTime, displayTime)) {
      realtimeStore.dispatch(updateRealtimeTime(displayTime))
      return
    }
  }

  const currentTime = realtimeStore.getState().time
  if (
    timeStatesVisuallyEqual(currentTime, displayTime) &&
    !engineConnectionTimeChanged(currentTime, displayTime)
  ) {
    return
  }
  realtimeStore.dispatch(updateRealtimeTime(displayTime))
}

function animateTelemetryFrame() {
  _telemetry.onAnimationFrame(performance.now())
  dispatchDisplayRealtimeFrame()
  realtimeFrameHandle = requestAnimationFrame(animateTelemetryFrame)
}

function startTelemetryFrameLoop() {
  if (realtimeFrameHandle !== null) {
    return
  }
  realtimeFrameHandle = requestAnimationFrame(animateTelemetryFrame)
}

function stopTelemetryFrameLoop() {
  if (realtimeFrameHandle === null) {
    return
  }
  cancelAnimationFrame(realtimeFrameHandle)
  realtimeFrameHandle = null
}

function ensureDmxMixerOutputSync() {
  startDmxMixerOutputSync({
    readSnapshot: () => ({
      dmxOutByUniverse: _frequentlyUpdatedRealtimeState.dmxOutByUniverse,
    }),
    readDeviceState: () => store.getState().control.present.device,
  })
}

function ensureBeatMeterEngineSync() {
  startBeatMeterEngineSync(() => _frequentlyUpdatedRealtimeState.time)
}

const handleVisibilityChange = () => {
  const isVisible = document.visibilityState === 'visible'
  if (isVisible) {
    _stoppedTransportFrameLocked = false
    publishRealtimeStateFromIpc()
    ensureDmxMixerOutputSync()
    flushDmxMixerOutputSync()
    ensureBeatMeterEngineSync()
    flushBeatMeterEngineSync()
    startTelemetryFrameLoop()
  } else {
    stopDmxMixerOutputSync()
    stopBeatMeterEngineSync()
    stopTelemetryFrameLoop()
  }
}

window.addEventListener('visibilitychange', handleVisibilityChange)
if (document.visibilityState === 'visible') {
  ensureDmxMixerOutputSync()
  ensureBeatMeterEngineSync()
  startTelemetryFrameLoop()
}

if (_canPublishControlState) {
  const cleanState = getCleanReduxState(store.getState())
  _lastPublishedControlStateSerialized = JSON.stringify(cleanState)
  send_control_state(cleanState)
}
if (isPrimaryWindow) {
  _audioInputEngine.start()
}
void fetchAppSettings().then((settings) => {
  store.dispatch(setAppSettings(settings))
  send_sync_autosave_menu(settings.autosaveEnabled)
  if (settings.lastProjectFilePath !== null) {
    applyWorkspacePaths(settings.lastProjectFilePath)
    setFileAutosaveEnabled(
      settings.autosaveEnabled,
      settings.lastProjectFilePath,
      settings.lastFixtureLibraryFilePath
    )
  }
})
_telemetry.start()

window.addEventListener('beforeunload', () => {
  window.removeEventListener('visibilitychange', handleVisibilityChange)
  stopTelemetryFrameLoop()
  stopDmxMixerOutputSync()
  stopBeatMeterEngineSync()
  if (_pendingControlStatePublishRaf !== null) {
    cancelAnimationFrame(_pendingControlStatePublishRaf)
    _pendingControlStatePublishRaf = null
  }
  if (_controlStatePublishDebounceTimer !== null) {
    clearTimeout(_controlStatePublishDebounceTimer)
    _controlStatePublishDebounceTimer = null
  }
  publishControlStateIfChanged()
  closeAllAppDialogs(false)
  store.dispatch(setConnectionsMenu(false))
  store.dispatch(setSaving(false))
  store.dispatch(setLoading(null))
  store.dispatch(setNewProjectDialog(false))
  store.dispatch(setStatusLogOpen(false))
  store.dispatch(setAboutOpen(false))
  store.dispatch(setSettingsOpen(false))
  store.dispatch(hideAppDialog())
  if (isPrimaryWindow) {
    _audioInputEngine.stop()
  }
  _telemetry.stop()
})

let _pendingControlStatePublishRaf: number | null = null
let _immediateControlStatePublishQueued = false
let _controlStatePublishDebounceTimer: ReturnType<typeof setTimeout> | null =
  null
const CONTROL_STATE_PUBLISH_DEBOUNCE_MS = 64

function publishControlStateIfChanged() {
  _pendingControlStatePublishRaf = null
  if (_controlStatePublishDebounceTimer !== null) {
    clearTimeout(_controlStatePublishDebounceTimer)
    _controlStatePublishDebounceTimer = null
  }
  if (_isApplyingRemoteState || !_canPublishControlState) {
    return
  }
  const cleanState = getCleanReduxState(store.getState())
  const serialized = JSON.stringify(cleanState)
  if (serialized === _lastPublishedControlStateSerialized) {
    return
  }
  _lastPublishedControlStateSerialized = serialized
  send_control_state(cleanState)
}

function scheduleControlStatePublish() {
  const immediate = controlPublishAffectsLiveDmx(_lastDispatchActionType)
  if (_controlStatePublishDebounceTimer !== null) {
    clearTimeout(_controlStatePublishDebounceTimer)
    _controlStatePublishDebounceTimer = null
  }

  if (immediate) {
    if (!_immediateControlStatePublishQueued) {
      _immediateControlStatePublishQueued = true
      queueMicrotask(() => {
        _immediateControlStatePublishQueued = false
        publishControlStateIfChanged()
      })
    }
    return
  }

  _controlStatePublishDebounceTimer = setTimeout(() => {
    _controlStatePublishDebounceTimer = null
    if (_pendingControlStatePublishRaf !== null) {
      return
    }
    _pendingControlStatePublishRaf = requestAnimationFrame(
      publishControlStateIfChanged
    )
  }, CONTROL_STATE_PUBLISH_DEBOUNCE_MS)
}

store.subscribe(() => {
  scheduleControlStatePublish()
})

const appRoot = document.getElementById('root')
if (appRoot === null) {
  throw new Error('Renderer root element (#root) was not found.')
}

createRoot(appRoot).render(
  <Provider store={store}>
    <Provider store={realtimeStore} context={realtimeContext}>
      <AppThemeShell>
        <GlobalStyle />
        <App />
      </AppThemeShell>
    </Provider>
  </Provider>
)





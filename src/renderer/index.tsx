import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from './GlobalStyle'
import App from './App'
import * as themes from './theme'
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
} from './redux/realtimeStore'
import {
  ipc_setup,
  requestAppQuit,
  requestWindowClose,
  send_dispatch_to_main,
  send_control_state,
  send_sync_led_sidebar_menu,
} from './ipcHandler'
import { registerHostTransport } from '../shared/hostTransport'
import ipc_channels from '../shared/ipc_channels'
import { lighting3dPreviewRuntimeManager } from './lighting3d/Lighting3dPreviewRuntimeManager'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material/styles'
import { autoSave } from './autosave'
import { loadFixtureLibraryFromDefaultPath, getDefaultFixtureLibraryPath } from './autosave'
import { getUndoGroup, undoAction, redoAction } from './controls/UndoRedo'
import { load } from './menu/SaveLoad'
import { getSaveConfig } from 'shared/save'
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

const theme = themes.dark()
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  zIndex: {
    tooltip: 20001,
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
        },
        input: {
          color: '#ffffff',
          '&::placeholder': {
            color: 'rgba(255,255,255,0.45)',
            opacity: 1,
          },
        },
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.28)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            backgroundColor: '#0a0a0a',
          },
        },
        input: {
          '&.Mui-disabled': {
            color: 'rgba(255,255,255,0.38)',
            WebkitTextFillColor: 'rgba(255,255,255,0.38)',
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          '&:hover': {
            backgroundColor: '#0a0a0a',
          },
          '&.Mui-focused': {
            backgroundColor: '#000000',
          },
        },
        input: {
          color: '#ffffff',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.7)',
        },
      },
    },
  },
})
let _frequentlyUpdatedRealtimeState = initRealtimeState()
let _isApplyingRemoteState = false
let _isApplyingRemoteDispatch = false
const _audioInputEngine = new AudioInputEngine()
let _appClosePromptOpen = false
let _detachedClosePromptOpen = false
const pageFromLocation = parsePageFromLocation()
const isDetachedPageWindow = pageFromLocation !== null
const isPrimaryWindow = pageFromLocation === null
const useFrameDrivenRealtimeDispatch = isPrimaryWindow
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
  'gui/setPageIndex',
  'gui/setChannelsPerPage',
  'gui/setActiveMixerUniverse',
  'gui/setOverwrite',
  'gui/clearOverwrites',
])

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
  if (SHARED_GUI_ACTION_TYPES.has(type)) return true
  if (SHARED_MIXER_ACTION_TYPES.has(type)) return true
  return false
}

const rawDispatch = store.dispatch.bind(store)
;(store as { dispatch: typeof store.dispatch }).dispatch = ((action: unknown) => {
  if (shouldForwardActionToPrimary(action)) {
    send_dispatch_to_main(action as any)
    return action as any
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

function isIncompatibleSaveError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('legacy save format') ||
    lower.includes('unsupported save version') ||
    lower.includes('unsupported save schema') ||
    lower.includes('incompatible')
  )
}

const autoSaveRestoreStatus = autoSave(store)

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
    if (
      !useFrameDrivenRealtimeDispatch &&
      document.visibilityState === 'visible'
    ) {
      realtimeStore.dispatch(updateRealtimeStore(_frequentlyUpdatedRealtimeState))
    }
  },
  on_dispatch: (action) => {
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
        .then((state) => {
          if (state === null) {
            return
          }
          store.dispatch(
            setLoading({
              state,
              config: getSaveConfig(state),
            })
          )
        })
        .catch((err) => {
          console.warn(err)
          const message = err instanceof Error ? err.message : 'Unknown load error.'
          if (isIncompatibleSaveError(message)) {
            store.dispatch(resetState(defaultState()))
            void autoLoadFixtureLibrary(true)
          }
        })
    } else if (command.type === 'save') {
      store.dispatch(setSaving(true))
    } else if (command.type === 'new-project') {
      store.dispatch(setNewProjectDialog(true))
    } else if (command.type === 'about') {
      if (typeof document === 'undefined' || document.hasFocus()) {
        store.dispatch(setAboutOpen(true))
      }
    } else if (command.type === 'set-led-sidebar-enabled') {
      store.dispatch(setLedSidebarEnabled(command.enabled === true))
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
    })
      .then((shouldQuit) => {
        if (shouldQuit) {
          void requestAppQuit()
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
    _isApplyingRemoteState = true
    store.dispatch(resetRemoteState(newState))
    _isApplyingRemoteState = false
    if (isPrimaryWindow) {
      _canPublishControlState = true
    }
    _lastPublishedControlStateSerialized = JSON.stringify(
      getCleanReduxState(store.getState())
    )
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

function animateRealtimeState() {
  _telemetry.onAnimationFrame(performance.now())
  realtimeStore.dispatch(updateRealtimeStore(_frequentlyUpdatedRealtimeState))
  realtimeFrameHandle = requestAnimationFrame(animateRealtimeState)
}

function startRealtimeLoop() {
  if (!useFrameDrivenRealtimeDispatch || realtimeFrameHandle !== null) {
    return
  }
  realtimeFrameHandle = requestAnimationFrame(animateRealtimeState)
}

function stopRealtimeLoop() {
  if (realtimeFrameHandle === null) {
    return
  }
  cancelAnimationFrame(realtimeFrameHandle)
  realtimeFrameHandle = null
}

const handleVisibilityChange = () => {
  const isVisible = document.visibilityState === 'visible'
  if (useFrameDrivenRealtimeDispatch) {
    if (isVisible) {
      startRealtimeLoop()
    } else {
      stopRealtimeLoop()
    }
    return
  }
  if (isVisible) {
    realtimeStore.dispatch(updateRealtimeStore(_frequentlyUpdatedRealtimeState))
  }
}

window.addEventListener('visibilitychange', handleVisibilityChange)
if (useFrameDrivenRealtimeDispatch && document.visibilityState === 'visible') {
  startRealtimeLoop()
}

if (_canPublishControlState) {
  const cleanState = getCleanReduxState(store.getState())
  _lastPublishedControlStateSerialized = JSON.stringify(cleanState)
  send_control_state(cleanState)
}
if (isPrimaryWindow) {
  _audioInputEngine.start()
}
_telemetry.start()

window.addEventListener('beforeunload', () => {
  window.removeEventListener('visibilitychange', handleVisibilityChange)
  stopRealtimeLoop()
  closeAllAppDialogs(false)
  store.dispatch(setConnectionsMenu(false))
  store.dispatch(setSaving(false))
  store.dispatch(setLoading(null))
  store.dispatch(setNewProjectDialog(false))
  store.dispatch(setStatusLogOpen(false))
  store.dispatch(setAboutOpen(false))
  store.dispatch(hideAppDialog())
  if (isPrimaryWindow) {
    _audioInputEngine.stop()
  }
  _telemetry.stop()
})

store.subscribe(() => {
  if (_isApplyingRemoteState || !_canPublishControlState) return
  const cleanState = getCleanReduxState(store.getState())
  const serialized = JSON.stringify(cleanState)
  if (serialized === _lastPublishedControlStateSerialized) {
    return
  }
  _lastPublishedControlStateSerialized = serialized
  send_control_state(cleanState)
})

const appRoot = document.getElementById('root')
if (appRoot === null) {
  throw new Error('Renderer root element (#root) was not found.')
}

createRoot(appRoot).render(
  <Provider store={store}>
    <Provider store={realtimeStore} context={realtimeContext}>
      <ThemeProvider theme={theme}>
        <MuiThemeProvider theme={muiTheme}>
          <GlobalStyle />
          <App />
        </MuiThemeProvider>
      </ThemeProvider>
    </Provider>
  </Provider>
)





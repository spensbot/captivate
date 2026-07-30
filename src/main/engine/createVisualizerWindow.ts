import path from 'path'
import { app, BrowserWindow } from 'electron'
import { resolveHtmlPath } from './util'
import { reportDiagnostic } from '../diagnostics'
import { telemetryCounter, telemetryHealth } from '../telemetry'
import {
  buildWindowConstructorOptions,
  captureWindowPlacement,
  WindowPlacement,
} from '../windowStateStorage'

export interface VisualizerContainer {
  visualizer: BrowserWindow | null
  visualizerState?: WindowPlacement | null
  onVisualizerWindowStateChanged?: (
    state: {
      isOpen: boolean
      placement: WindowPlacement | null
    }
  ) => void
}

export default function createVisualizerWindow(
  visualizerContainer: VisualizerContainer
) {
  if (visualizerContainer.visualizer) {
    console.warn('Tried to open a visualizer twice')
    telemetryCounter('visualizer.window', 'duplicate_open_attempt')
    return
  }
  telemetryCounter('visualizer.window', 'open_attempt')

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths)
  }

  const initialBounds = buildWindowConstructorOptions(
    visualizerContainer.visualizerState ?? null,
    1300,
    900
  )
  const shouldStartMaximized =
    visualizerContainer.visualizerState?.isMaximized === true
  const shouldStartFullScreen =
    visualizerContainer.visualizerState?.isFullScreen === true

  visualizerContainer.visualizer = new BrowserWindow({
    show: false,
    ...initialBounds,
    icon: getAssetPath('icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'visualizer_preload.js'),
      webSecurity: false,
      nodeIntegration: false,
      backgroundThrottling: true,
    },
  })
  visualizerContainer.visualizer.setMenuBarVisibility(false)
  visualizerContainer.visualizer.setMenu(null)
  telemetryHealth('visualizer.window', 'ok', 'Visualizer window created')

  void visualizerContainer.visualizer
    .loadURL(resolveHtmlPath('index.html'))
    .catch((err) => {
      console.error('Failed to load visualizer window URL', err)
    })
  // visualizerContainer.visualizer.loadURL(`data:text/html;charset=utf-8,${html}`)

  visualizerContainer.visualizer.on('ready-to-show', () => {
    const visualizer = visualizerContainer.visualizer
    if (visualizer === null || visualizer.isDestroyed()) {
      return
    }
    if (shouldStartFullScreen) {
      visualizer.show()
      visualizer.setFullScreen(true)
    } else {
      if (shouldStartMaximized && !visualizer.isMaximized()) {
        visualizer.maximize()
      }
      visualizer.show()
    }
    telemetryCounter('visualizer.window', 'ready_to_show')
    notifyVisualizerWindowState(visualizerContainer, visualizer, true)
  })

  visualizerContainer.visualizer.webContents.on(
    'render-process-gone',
    (_event, details) => {
      console.error('Visualizer render process exited', details)
      telemetryCounter('visualizer.window', 'render_process_gone')
      telemetryHealth(
        'visualizer.window',
        'error',
        'Visualizer renderer process exited',
        details
      )
      reportDiagnostic({
        source: 'visualizer-window',
        area: 'webcontents',
        event: 'render-process-gone',
        level: 'error',
        data: details,
      })
    }
  )

  visualizerContainer.visualizer.on('unresponsive', () => {
    telemetryCounter('visualizer.window', 'unresponsive')
    telemetryHealth('visualizer.window', 'error', 'Visualizer window unresponsive')
    reportDiagnostic({
      source: 'visualizer-window',
      area: 'window',
      event: 'unresponsive',
      level: 'error',
      data: {
        id: visualizerContainer.visualizer?.id ?? null,
      },
    })
  })

  visualizerContainer.visualizer.on('responsive', () => {
    telemetryCounter('visualizer.window', 'responsive')
    telemetryHealth('visualizer.window', 'ok', 'Visualizer window responsive')
    reportDiagnostic({
      source: 'visualizer-window',
      area: 'window',
      event: 'responsive',
      level: 'info',
      data: {
        id: visualizerContainer.visualizer?.id ?? null,
      },
    })
  })

  const onWindowGeometryMaybeChanged = () => {
    try {
      const visualizer = visualizerContainer.visualizer
      if (visualizer === null || visualizer.isDestroyed()) {
        return
      }
      notifyVisualizerWindowState(visualizerContainer, visualizer, true)
    } catch {
      // Geometry events can race with window destruction on close.
    }
  }
  visualizerContainer.visualizer.on('move', onWindowGeometryMaybeChanged)
  visualizerContainer.visualizer.on('resize', onWindowGeometryMaybeChanged)
  visualizerContainer.visualizer.on('maximize', onWindowGeometryMaybeChanged)
  visualizerContainer.visualizer.on('unmaximize', onWindowGeometryMaybeChanged)
  visualizerContainer.visualizer.on(
    'enter-full-screen',
    onWindowGeometryMaybeChanged
  )
  visualizerContainer.visualizer.on(
    'leave-full-screen',
    onWindowGeometryMaybeChanged
  )

  visualizerContainer.visualizer.on('closed', () => {
    telemetryCounter('visualizer.window', 'closed')
    telemetryHealth('visualizer.window', 'warn', 'Visualizer window closed')
    notifyVisualizerWindowState(visualizerContainer, null, false)
    visualizerContainer.visualizer = null
  })
}

function captureVisualizerPlacementSafe(
  window: BrowserWindow
): WindowPlacement | null {
  if (window.isDestroyed()) {
    return null
  }
  try {
    return captureWindowPlacement(window)
  } catch {
    return null
  }
}

function notifyVisualizerWindowState(
  visualizerContainer: VisualizerContainer,
  window: BrowserWindow | null,
  isOpen: boolean
) {
  const placement =
    window !== null
      ? captureVisualizerPlacementSafe(window) ??
        visualizerContainer.visualizerState ??
        null
      : visualizerContainer.visualizerState ?? null
  if (placement !== null) {
    visualizerContainer.visualizerState = placement
  }
  visualizerContainer.onVisualizerWindowStateChanged?.({
    isOpen,
    placement: placement ?? null,
  })
}

/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path'
import {
  app,
  BrowserWindow,
  shell,
  dialog,
  desktopCapturer,
  session,
  ipcMain,
  screen,
  type WebContents,
} from 'electron'
import ipcChannels from '../shared/ipc_channels'
import MenuBuilder from './menu'
import {
  clearRecentProjects,
  getRecentProjects,
  recordRecentProject,
} from './recentProjectsStorage'
import { readAppSettings, writeAppSettings } from './appSettingsStorage'
import { resolveHtmlPath } from './util'
import * as engine from './engine/engine'
import { laserDacDisconnect } from './engine/laserDacSession'
import {
  bootstrapRemoteControlIpc,
  registerLighting3dPreviewPage,
  seedLighting3dBootstrapDedupe,
} from './engine/ipcHandler'
import { stopLighting3dUtilityWorker } from './engine/lighting3dUtilityWorkerHost'
import { VisualizerContainer } from './engine/createVisualizerWindow'
import type { Page } from '../shared/pages'
import type { OpenPageWindowOptions } from '../shared/screenDisplays'
import type { FixtureType } from '../shared/dmxFixtures'
import { serializeFixtureLibrary } from '../shared/fixtureLibrary'
import {
  readDefaultFixtureLibrary,
  saveDefaultFixtureLibrary,
} from './fixtureLibraryStorage'
import './prevent_sleep'
import { reportDiagnostic } from './diagnostics'
import {
  startMainTelemetry,
  stopMainTelemetry,
  telemetryCounter,
  telemetryDuration,
  telemetryEvent,
  telemetryGauge,
  telemetryHealth,
} from './telemetry'
import {
  buildWindowConstructorOptions,
  captureWindowPlacement,
  DetachedWindowPlacement,
  initWindowLayout,
  PersistedWindowLayout,
  WindowPlacement,
  writeWindowLayout,
  readWindowLayout,
} from './windowStateStorage'
import {
  setActivePage,
  setLaserWindowOpen,
  setVideoEnabled,
} from '../renderer/redux/guiSlice'

// Monkey-patch showErrorBox to avoid error modals at runtime
// See https://stackoverflow.com/questions/35620764/how-to-disable-alert-dialogs-when-errors-occur-in-atom-electron
dialog.showErrorBox = (title: string, content: string) => {
  console.error(`Top-level error: ${title}\n${content}`)
  reportDiagnostic({
    source: 'main',
    area: 'dialog',
    event: 'showErrorBox',
    level: 'error',
    message: `${title}: ${content}`,
  })
}

let mainWindow: BrowserWindow | null = null
const detachedWindows = new Set<BrowserWindow>()
const detachedCloseApprovedWebContentsIds = new Set<number>()
const detachedWindowPagesById = new Map<number, Page | undefined>()
let detachedVisualizerFullscreenIpcRegistered = false
let isClosing = false
let visualizerContainer: VisualizerContainer = {
  visualizer: null,
  visualizerState: null,
  onVisualizerWindowStateChanged,
}
let fixtureLibraryCacheLoaded = false
let cachedFixtureLibrarySerialized: string | null = null
let persistedWindowLayout: PersistedWindowLayout = initWindowLayout()
let persistedWindowLayoutDirty = false
let persistWindowLayoutTimer: NodeJS.Timeout | null = null

function schedulePersistWindowLayout() {
  persistedWindowLayoutDirty = true
  if (persistWindowLayoutTimer !== null) {
    clearTimeout(persistWindowLayoutTimer)
  }
  persistWindowLayoutTimer = setTimeout(() => {
    persistWindowLayoutTimer = null
    flushPersistedWindowLayout()
  }, 220)
}

function flushPersistedWindowLayout() {
  if (!persistedWindowLayoutDirty) {
    return
  }
  persistedWindowLayout = writeWindowLayout(persistedWindowLayout)
  persistedWindowLayoutDirty = false
}

function captureWindowPlacementSafe(
  window: BrowserWindow
): WindowPlacement | null {
  if (window.isDestroyed()) {
    return null
  }
  try {
    return captureWindowPlacement(window)
  } catch (_error) {
    if (window.isDestroyed()) {
      return null
    }
    try {
      const fallbackBounds = window.getBounds()
      return {
        x: fallbackBounds.x,
        y: fallbackBounds.y,
        width: fallbackBounds.width,
        height: fallbackBounds.height,
        isMaximized: window.isMaximized(),
        isFullScreen: window.isFullScreen(),
      }
    } catch {
      // Window can be destroyed between the check and getBounds during close.
      return null
    }
  }
}

function syncDetachedWindowLayoutSnapshot() {
  if (isClosing) {
    return
  }
  const detached: DetachedWindowPlacement[] = []
  for (const window of detachedWindows) {
    if (window.isDestroyed()) continue
    let page: Page | undefined
    try {
      page = detachedWindowPagesById.get(window.webContents.id)
    } catch {
      continue
    }
    if (page === undefined) continue
    const placement = captureWindowPlacementSafe(window)
    if (placement === null) continue
    detached.push({
      page,
      ...placement,
    })
  }
  persistedWindowLayout.detached = detached
  schedulePersistWindowLayout()
}

function findDetachedWindowByPage(page: Page): BrowserWindow | null {
  for (const window of detachedWindows) {
    if (window.isDestroyed()) continue
    let windowPage: Page | undefined
    try {
      windowPage = detachedWindowPagesById.get(window.webContents.id)
    } catch {
      continue
    }
    if (windowPage === page) {
      return window
    }
  }
  return null
}

function isVisualizerDetachedPage(page: Page | undefined): boolean {
  return page === 'Video' || page === 'VideoViewport' || page === 'Streaming'
}

function isDetachedVisualizerWebContents(wc: WebContents): boolean {
  const page = detachedWindowPagesById.get(wc.id)
  return isVisualizerDetachedPage(page)
}

function registerDetachedVisualizerFullscreenIpcOnce() {
  if (detachedVisualizerFullscreenIpcRegistered) {
    return
  }
  detachedVisualizerFullscreenIpcRegistered = true
  ipcMain.handle(
    ipcChannels.visualizer_detached_fullscreen,
    (
      event,
      payload?: { query?: boolean; next?: boolean }
    ): { full: boolean } => {
      if (!isDetachedVisualizerWebContents(event.sender)) {
        return { full: false }
      }
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win === null || win.isDestroyed()) {
        return { full: false }
      }
      if (payload?.query === true) {
        return { full: win.isFullScreen() }
      }
      const target =
        payload?.next !== undefined ? payload.next : !win.isFullScreen()
      if (target !== win.isFullScreen()) {
        win.setFullScreen(target)
      }
      return { full: win.isFullScreen() }
    }
  )
}

function countDetachedVisualizerWindows(): number {
  let n = 0
  for (const w of detachedWindows) {
    if (w.isDestroyed()) continue
    let page: Page | undefined
    try {
      page = detachedWindowPagesById.get(w.webContents.id)
    } catch {
      continue
    }
    if (isVisualizerDetachedPage(page)) {
      n += 1
    }
  }
  return n
}

function syncVideoEnabledToDetachedVisualizerCount() {
  if (isClosing) {
    return
  }
  engine.getIpcCallbacks()?.send_dispatch(
    setVideoEnabled(countDetachedVisualizerWindows() > 0)
  )
}

function countDetachedLaserWindows(): number {
  let n = 0
  for (const w of detachedWindows) {
    if (w.isDestroyed()) continue
    let page: Page | undefined
    try {
      page = detachedWindowPagesById.get(w.webContents.id)
    } catch {
      continue
    }
    if (page === 'Laser') {
      n += 1
    }
  }
  return n
}

function syncLaserWindowOpenToDetachedCount() {
  if (isClosing) {
    return
  }
  engine.getIpcCallbacks()?.send_dispatch(
    setLaserWindowOpen(countDetachedLaserWindows() > 0)
  )
}

function reconcileDetachedGuiFlags() {
  syncVideoEnabledToDetachedVisualizerCount()
  syncLaserWindowOpenToDetachedCount()
}

function focusWindow(window: BrowserWindow) {
  if (window.isDestroyed()) return
  if (window.isMinimized()) {
    window.restore()
  }
  window.show()
  window.focus()
}

function focusMainApplicationWindow() {
  if (mainWindow !== null && !mainWindow.isDestroyed()) {
    focusWindow(mainWindow)
  }
}

/** Set when a second app launch arrives before the main window exists. */
let focusMainOnReady = false

function videoViewportPlacementOnDisplay(displayId: number): WindowPlacement | null {
  const target = screen.getAllDisplays().find((d) => d.id === displayId)
  if (target === undefined) {
    return null
  }
  const wa = target.workArea
  const width = Math.min(1300, Math.max(320, wa.width))
  const height = Math.min(900, Math.max(240, wa.height))
  const x = wa.x + Math.max(0, Math.floor((wa.width - width) / 2))
  const y = wa.y + Math.max(0, Math.floor((wa.height - height) / 2))
  return { x, y, width, height }
}

function openOrFocusDetachedPage(page: Page, options?: OpenPageWindowOptions) {
  if (page === 'Atmospherics') {
    if (mainWindow !== null) {
      focusWindow(mainWindow)
    }
    engine.getIpcCallbacks()?.send_dispatch(setActivePage('Atmospherics'))
    return
  }

  // Heavy pages are intentionally single-instance and process-isolated.
  if (
    page === 'Lighting3D' ||
    page === 'Laser' ||
    page === 'Video' ||
    page === 'VideoViewport' ||
    page === 'Streaming'
  ) {
    const existing = findDetachedWindowByPage(page)
    if (existing !== null) {
      focusWindow(existing)
      return
    }
  }

    const initialPlacementForVideoViewport =
      page === 'VideoViewport' &&
      options?.displayId !== undefined &&
      Number.isFinite(options.displayId)
        ? videoViewportPlacementOnDisplay(Math.trunc(options.displayId))
        : null

    createAppWindow({
      isMain: false,
      defaultPage: page,
      maximizeOnFirstShow: page === 'VideoViewport',
      initialPlacement: initialPlacementForVideoViewport ?? undefined,
    })
}

function onVisualizerWindowStateChanged(state: {
  isOpen: boolean
  placement: WindowPlacement | null
}) {
  if (isClosing && state.isOpen === false) {
    return
  }
  persistedWindowLayout.visualizer = {
    isOpen: state.isOpen,
    placement: state.placement,
  }
  visualizerContainer.visualizerState = state.placement
  schedulePersistWindowLayout()
}

function bindVisualizerContainerWindow(window: BrowserWindow | null) {
  const nextWindow =
    window !== null && !window.isDestroyed()
      ? window
      : null
  visualizerContainer.visualizer = nextWindow
  const placement =
    nextWindow !== null
      ? captureWindowPlacementSafe(nextWindow) ??
        visualizerContainer.visualizerState ??
        null
      : visualizerContainer.visualizerState ?? null
  if (placement !== null) {
    visualizerContainer.visualizerState = placement
  }
  visualizerContainer.onVisualizerWindowStateChanged?.({
    isOpen: nextWindow !== null,
    placement: placement ?? null,
  })
}

function findFallbackVisualizerWindow(excludeWebContentsId?: number): BrowserWindow | null {
  const viewportWindow = findDetachedWindowByPage('VideoViewport')
  if (
    viewportWindow !== null &&
    (excludeWebContentsId === undefined ||
      viewportWindow.webContents.id !== excludeWebContentsId)
  ) {
    return viewportWindow
  }
  const videoWindow = findDetachedWindowByPage('Video')
  if (
    videoWindow !== null &&
    (excludeWebContentsId === undefined ||
      videoWindow.webContents.id !== excludeWebContentsId)
  ) {
    return videoWindow
  }
  const streamingWindow = findDetachedWindowByPage('Streaming')
  if (
    streamingWindow !== null &&
    (excludeWebContentsId === undefined ||
      streamingWindow.webContents.id !== excludeWebContentsId)
  ) {
    return streamingWindow
  }
  return null
}

function setupDesktopLoopbackCapture() {
  const defaultSession: {
    setDisplayMediaRequestHandler?: (
      handler: (
        request: unknown,
        callback: (streams: {
          video?: Electron.DesktopCapturerSource
          audio?: 'loopback' | 'loopbackWithMute'
        }) => void
      ) => void | Promise<void>
    ) => void
  } = session.defaultSession as any

  if (typeof defaultSession.setDisplayMediaRequestHandler !== 'function') {
    console.warn(
      'Display media request handler is unavailable; desktop loopback audio may require manual screen-share selection.'
    )
    return
  }

  defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 },
      })
      const source = sources[0]

      if (source === undefined) {
        callback({})
        return
      }

      callback({
        video: source,
        audio: 'loopback',
      })
    } catch (error) {
      console.error('Failed to configure desktop loopback capture', error)
      callback({})
    }
  })
}

ipcMain.handle(ipcChannels.request_window_close, (event) => {
  const targetWindow = BrowserWindow.fromWebContents(event.sender)
  if (
    targetWindow === null ||
    targetWindow === undefined ||
    targetWindow.isDestroyed() ||
    targetWindow === mainWindow
  ) {
    return false
  }

  detachedCloseApprovedWebContentsIds.add(targetWindow.webContents.id)
  targetWindow.close()
  return true
})

ipcMain.handle(
  ipcChannels.get_page_window_media_source_id,
  (_event, page: Page) => {
    if (typeof page !== 'string' || page.length <= 0) {
      return null
    }
    const targetWindow = findDetachedWindowByPage(page)
    if (targetWindow === null || targetWindow.isDestroyed()) {
      return null
    }
    try {
      return targetWindow.getMediaSourceId()
    } catch (_error) {
      return null
    }
  }
)

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

if (isDevelopment) {
  require('electron-debug')({ showDevTools: false })
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  // These add all sorts of weird console warnings. So turn them on when needed I guess
  const extensions: string[] = [] // ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log)
}

function createAppWindow({
  isMain,
  defaultPage,
  initialPlacement,
  maximizeOnFirstShow = false,
}: {
  isMain: boolean
  defaultPage?: Page
  initialPlacement?: WindowPlacement | null
  maximizeOnFirstShow?: boolean
}) {
  const createStartedAt = performance.now()
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths)
  }

  const initialBounds = buildWindowConstructorOptions(
    initialPlacement ?? null,
    1300,
    900
  )
  const hideNativeMenuBar =
    !isMain &&
    (defaultPage === 'Lighting3D' ||
      defaultPage === 'Video' ||
      defaultPage === 'VideoViewport' ||
      defaultPage === 'Streaming')
  const shouldStartMaximized =
    initialPlacement?.isMaximized === true || maximizeOnFirstShow
  const detachedPartition =
    !isMain && defaultPage === 'Lighting3D'
      ? 'persist:captivate-lighting3d'
      : !isMain && defaultPage === 'Atmospherics'
      ? 'persist:captivate-atmos'
      : !isMain && defaultPage === 'Laser'
      ? 'persist:captivate-laser'
      : !isMain &&
        (defaultPage === 'Video' ||
          defaultPage === 'VideoViewport' ||
          defaultPage === 'Streaming')
      ? 'persist:captivate-visualizer'
      : undefined
  const webPreferences: Electron.BrowserWindowConstructorOptions['webPreferences'] = {
    preload: path.join(__dirname, 'preload.js'),
    // These are disabled to allow Captivate to display local media
    // This should be safe since Captivate doesn't run anything remote
    webSecurity: false,
    nodeIntegration: false,
  }
  if (detachedPartition !== undefined) {
    webPreferences.partition = detachedPartition
  }

  const window = new BrowserWindow({
    show: false,
    ...initialBounds,
    icon: getAssetPath('icon.png'),
    autoHideMenuBar: hideNativeMenuBar,
    webPreferences,
  })
  if (hideNativeMenuBar) {
    window.setMenuBarVisibility(false)
    window.setMenu(null)
  }
  telemetryCounter(isMain ? 'window.main' : 'window.detached', 'created')

  const baseUrl = resolveHtmlPath('index.html')
  const pageQuery = defaultPage
    ? `${baseUrl.includes('?') ? '&' : '?'}page=${encodeURIComponent(defaultPage)}`
    : ''
  window.loadURL(`${baseUrl}${pageQuery}`)
  telemetryDuration(
    isMain ? 'window.main' : 'window.detached',
    'load_url_ms',
    performance.now() - createStartedAt
  )

  let recoveringRenderer = false
  let lastRecoveryAttemptAt = 0
  const attemptRendererRecovery = (reason: string) => {
    if (!isMain || isClosing || window.isDestroyed()) {
      return
    }
    const now = Date.now()
    if (recoveringRenderer || now - lastRecoveryAttemptAt < 5000) {
      return
    }
    recoveringRenderer = true
    lastRecoveryAttemptAt = now
    telemetryCounter(
      isMain ? 'window.main' : 'window.detached',
      'renderer_recovery_attempts'
    )
    telemetryEvent(
      isMain ? 'window.main' : 'window.detached',
      'renderer-recovery-attempt',
      'warn',
      `Renderer recovery triggered by ${reason}`
    )
    reportDiagnostic({
      source: 'main-window',
      area: 'webcontents',
      event: 'recover-attempt',
      level: 'warn',
      message: `Attempting renderer recovery after ${reason}`,
      data: {
        id: window.id,
        url: window.webContents.getURL(),
      },
    })
    setTimeout(() => {
      try {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.reloadIgnoringCache()
        }
      } catch (error) {
        telemetryCounter(
          isMain ? 'window.main' : 'window.detached',
          'renderer_recovery_failures'
        )
        telemetryHealth(
          isMain ? 'window.main' : 'window.detached',
          'warn',
          'Renderer recovery failed'
        )
        reportDiagnostic({
          source: 'main-window',
          area: 'webcontents',
          event: 'recover-failed',
          level: 'error',
          message: 'Failed to reload renderer during recovery attempt',
          data: {
            id: window.id,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      } finally {
        setTimeout(() => {
          recoveringRenderer = false
        }, 4000)
      }
    }, 250)
  }

  window.on('ready-to-show', () => {
    telemetryCounter(isMain ? 'window.main' : 'window.detached', 'ready_to_show')
    if (isDevelopment && isMain && process.env.START_MINIMIZED) {
      window.minimize()
    } else {
      const shouldStartFullScreen =
        !isMain &&
        isVisualizerDetachedPage(defaultPage) &&
        initialPlacement?.isFullScreen === true
      if (shouldStartFullScreen) {
        window.show()
        window.setFullScreen(true)
      } else {
        if (shouldStartMaximized && !window.isMaximized()) {
          window.maximize()
        }
        window.show()
      }
    }
  })

  window.webContents.on('did-finish-load', () => {
    const snapshot = engine.getControlStateSnapshot()
    if (snapshot !== null && !window.webContents.isDestroyed()) {
      if (defaultPage === 'Lighting3D') {
        registerLighting3dPreviewPage(window.webContents)
        window.webContents.send(
          ipcChannels.lighting3d_preview_bootstrap,
          snapshot
        )
        seedLighting3dBootstrapDedupe(snapshot)
      } else {
        window.webContents.send(ipcChannels.new_control_state, snapshot)
      }
    }
  })

  const onWindowGeometryMaybeChanged = () => {
    try {
      if (window.isDestroyed()) {
        return
      }
      if (isMain) {
        const placement = captureWindowPlacementSafe(window)
        if (placement !== null) {
          persistedWindowLayout.main = placement
          schedulePersistWindowLayout()
        }
      } else {
        syncDetachedWindowLayoutSnapshot()
        if (window === visualizerContainer.visualizer) {
          bindVisualizerContainerWindow(window)
        }
      }
    } catch {
      // Geometry events can race with window destruction on close.
    }
  }
  window.on('move', onWindowGeometryMaybeChanged)
  window.on('resize', onWindowGeometryMaybeChanged)
  window.on('maximize', onWindowGeometryMaybeChanged)
  window.on('unmaximize', onWindowGeometryMaybeChanged)
  window.on('enter-full-screen', onWindowGeometryMaybeChanged)
  window.on('leave-full-screen', onWindowGeometryMaybeChanged)

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.on('unresponsive', () => {
    telemetryCounter(isMain ? 'window.main' : 'window.detached', 'unresponsive')
    telemetryHealth(
      isMain ? 'window.main' : 'window.detached',
      'error',
      'Window reported unresponsive'
    )
    reportDiagnostic({
      source: isMain ? 'main-window' : 'page-window',
      area: 'window',
      event: 'unresponsive',
      level: 'error',
      data: {
        id: window.id,
        url: window.webContents.getURL(),
      },
    })
    attemptRendererRecovery('window-unresponsive')
  })

  window.on('responsive', () => {
    telemetryCounter(isMain ? 'window.main' : 'window.detached', 'responsive')
    telemetryHealth(
      isMain ? 'window.main' : 'window.detached',
      'ok',
      'Window responsive'
    )
    reportDiagnostic({
      source: isMain ? 'main-window' : 'page-window',
      area: 'window',
      event: 'responsive',
      level: 'info',
      data: {
        id: window.id,
      },
    })
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    telemetryCounter(
      isMain ? 'window.main' : 'window.detached',
      'render_process_gone'
    )
    telemetryHealth(
      isMain ? 'window.main' : 'window.detached',
      'error',
      'Renderer process exited unexpectedly',
      details
    )
    reportDiagnostic({
      source: isMain ? 'main-window' : 'page-window',
      area: 'webcontents',
      event: 'render-process-gone',
      level: 'error',
      data: {
        id: window.id,
        details,
      },
    })
    attemptRendererRecovery('render-process-gone')
  })

  if (!isMain) {
    const webContentsId = window.webContents.id
    detachedWindows.add(window)
    detachedWindowPagesById.set(webContentsId, defaultPage)
    if (
      defaultPage === 'Video' ||
      defaultPage === 'VideoViewport' ||
      defaultPage === 'Streaming'
    ) {
      bindVisualizerContainerWindow(window)
    }
    syncDetachedWindowLayoutSnapshot()
    if (isVisualizerDetachedPage(defaultPage)) {
      syncVideoEnabledToDetachedVisualizerCount()
    }
    if (defaultPage === 'Laser') {
      syncLaserWindowOpenToDetachedCount()
    }
    window.on('close', (event) => {
      if (isClosing) {
        detachedCloseApprovedWebContentsIds.delete(webContentsId)
        return
      }
      if (detachedCloseApprovedWebContentsIds.has(webContentsId)) {
        detachedCloseApprovedWebContentsIds.delete(webContentsId)
        return
      }

      event.preventDefault()
      try {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send(ipcChannels.detached_window_close_prompt)
        }
      } catch {
        // Window can be mid-destroy while the close prompt is requested.
      }
    })

    window.on('closed', () => {
      try {
        telemetryCounter('window.detached', 'closed')
        const wasVisualizerDetached = isVisualizerDetachedPage(defaultPage)
        const wasLaserDetached = defaultPage === 'Laser'
        detachedWindows.delete(window)
        detachedCloseApprovedWebContentsIds.delete(webContentsId)
        detachedWindowPagesById.delete(webContentsId)
        if (window === visualizerContainer.visualizer) {
          bindVisualizerContainerWindow(
            findFallbackVisualizerWindow(webContentsId)
          )
        }
        syncDetachedWindowLayoutSnapshot()
        if (wasVisualizerDetached) {
          syncVideoEnabledToDetachedVisualizerCount()
        }
        if (wasLaserDetached) {
          syncLaserWindowOpenToDetachedCount()
        }
      } catch (error) {
        console.error('Error while cleaning up detached window:', error)
      }
    })
  }

  engine.getIpcCallbacks()?.register_renderer(window.webContents)

  if (isMain) {
    const initialMainPlacement = captureWindowPlacementSafe(window)
    if (initialMainPlacement !== null) {
      persistedWindowLayout.main = initialMainPlacement
      schedulePersistWindowLayout()
    }
    window.on('close', (e) => {
      if (!isClosing) {
        e.preventDefault()
        if (!window.webContents.isDestroyed()) {
          window.webContents.send(ipcChannels.app_close_prompt)
        }
      } else {
        const placement = captureWindowPlacementSafe(window)
        if (placement !== null) {
          persistedWindowLayout.main = placement
          schedulePersistWindowLayout()
        }
      }
    })
  }

  return window
}

function getCurrentFixtureTypes(): FixtureType[] {
  const controlState = engine.getControlStateSnapshot()
  if (controlState === null) {
    return []
  }

  const dmx = controlState.dmx
  return dmx.fixtureTypes
    .map((fixtureTypeId) => dmx.fixtureTypesByID[fixtureTypeId])
    .filter((fixtureType): fixtureType is FixtureType => fixtureType !== undefined)
}

async function saveFixtureLibraryIfDirty(): Promise<void> {
  await primeFixtureLibraryCache()
  const serialized = serializeFixtureLibrary(getCurrentFixtureTypes())
  if (cachedFixtureLibrarySerialized === serialized) {
    return
  }

  await saveDefaultFixtureLibrary(serialized)
  cachedFixtureLibrarySerialized = serialized
}

async function primeFixtureLibraryCache(): Promise<void> {
  if (fixtureLibraryCacheLoaded) {
    return
  }
  fixtureLibraryCacheLoaded = true
  try {
    cachedFixtureLibrarySerialized = await readDefaultFixtureLibrary()
  } catch (error) {
    console.warn('Failed to prime fixture library cache:', error)
    cachedFixtureLibrarySerialized = null
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let appShutdownCleanupPromise: Promise<void> | null = null

function runAppShutdownCleanup(): Promise<void> {
  if (appShutdownCleanupPromise) return appShutdownCleanupPromise
  appShutdownCleanupPromise = (async () => {
    try {
      await Promise.race([laserDacDisconnect(), wait(1500)])
    } catch {
      /* ignore */
    }
  })()
  return appShutdownCleanupPromise
}

async function requestMainWindowQuit(window: BrowserWindow): Promise<void> {
  try {
    const saveAttempt = saveFixtureLibraryIfDirty().catch((error) => {
      console.error('Failed to save fixture library on quit:', error)
    })
    await Promise.race([saveAttempt, wait(800)])
  } catch (err) {
    console.error('Failed to save fixture library on quit:', err)
  }

  const mainPlacement = captureWindowPlacementSafe(window)
  if (mainPlacement !== null) {
    persistedWindowLayout.main = mainPlacement
  }
  syncDetachedWindowLayoutSnapshot()
  if (
    visualizerContainer.visualizer !== null &&
    !visualizerContainer.visualizer.isDestroyed()
  ) {
    const visualizerPlacement = captureWindowPlacementSafe(
      visualizerContainer.visualizer
    )
    if (visualizerPlacement !== null) {
      persistedWindowLayout.visualizer = {
        isOpen: true,
        placement: visualizerPlacement,
      }
    }
  }

  isClosing = true
  flushPersistedWindowLayout()
  await runAppShutdownCleanup()
  engine.stop()
  mainWindow = null
  if (!window.isDestroyed()) {
    window.close()
  }
  app.quit()
}

const createWindow = async () => {
  registerDetachedVisualizerFullscreenIpcOnce()
  if (isDevelopment) {
    await installExtensions()
  }

  persistedWindowLayout = readWindowLayout()
  visualizerContainer.visualizerState = persistedWindowLayout.visualizer.placement

  const mainPlacement =
    persistedWindowLayout.main ??
    (() => {
      const area = screen.getPrimaryDisplay().workArea
      return {
        width: area.width,
        height: area.height,
      } as WindowPlacement
    })()

  mainWindow = createAppWindow({
    isMain: true,
    initialPlacement: mainPlacement,
    maximizeOnFirstShow: persistedWindowLayout.main === null,
  })

  if (focusMainOnReady) {
    focusMainOnReady = false
    focusMainApplicationWindow()
  }

  const requestAppQuit = () => {
    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      void requestMainWindowQuit(mainWindow)
    } else {
      void (async () => {
        isClosing = true
        await runAppShutdownCleanup()
        engine.stop()
        app.quit()
      })()
    }
  }

  const ipcCallbacks = engine.start(
    mainWindow.webContents,
    visualizerContainer,
    (page, opts) => {
      openOrFocusDetachedPage(page, opts)
    },
    requestAppQuit,
    reconcileDetachedGuiFlags
  )
  void bootstrapRemoteControlIpc()

  const menuBuilder = new MenuBuilder(mainWindow, {
    ipcCallbacks,
    openPageWindow: (page) => openOrFocusDetachedPage(page),
    requestAppQuit,
  })
  menuBuilder.setRecentProjects(getRecentProjects())
  menuBuilder.buildMenu()

  const refreshApplicationMenu = () => {
    menuBuilder.setRecentProjects(getRecentProjects())
    menuBuilder.buildMenu()
  }

  ipcMain.handle(ipcChannels.get_recent_projects, () => getRecentProjects())
  ipcMain.handle(ipcChannels.record_recent_project, (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return getRecentProjects()
    }
    recordRecentProject(filePath)
    refreshApplicationMenu()
    return getRecentProjects()
  })
  ipcMain.handle(ipcChannels.clear_recent_projects, () => {
    clearRecentProjects()
    refreshApplicationMenu()
    return []
  })
  ipcMain.handle(ipcChannels.get_app_settings, () => readAppSettings())
  ipcMain.handle(ipcChannels.set_app_settings, (_event, settings: unknown) =>
    writeAppSettings(settings as import('../shared/appSettings').AppSettings)
  )
  ipcMain.on(
    ipcChannels.sync_led_sidebar_menu,
    (_event, enabled: unknown) => {
      if (typeof enabled !== 'boolean') {
        return
      }
      menuBuilder.setLedSidebarMenuChecked(enabled)
      menuBuilder.buildMenu()
    }
  )
  ipcMain.on(ipcChannels.sync_autosave_menu, (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') {
      return
    }
    menuBuilder.setAutosaveMenuChecked(enabled)
    menuBuilder.buildMenu()
  })

  const detachedToRestore = persistedWindowLayout.detached
    .filter((state) => state.page !== 'Atmospherics')
    .slice(0, 12)
  for (const detachedState of detachedToRestore) {
    createAppWindow({
      isMain: false,
      defaultPage: detachedState.page,
      initialPlacement: detachedState,
    })
  }
  reconcileDetachedGuiFlags()

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line

  // Uncomment this next line if we ever want auto-updates again.
  // new AppUpdater()
}

/**
 * Add event listeners...
 */
// We instead quit the app when mainWindow is closed
// app.on('window-all-closed', () => {
//   // Respect the OSX convention of having the application in memory even
//   // after all windows have been closed
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  console.info('Captivate is already running; exiting duplicate instance.')
  app.quit()
} else {
  app.on('second-instance', () => {
    telemetryCounter('app', 'second_instance')
    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      focusMainApplicationWindow()
    } else {
      focusMainOnReady = true
    }
  })

  app
    .whenReady()
    .then(() => {
      startMainTelemetry()
      telemetryHealth('app', 'ok', 'App process initialized')
      telemetryGauge('app', 'pid', process.pid, 'pid')
      telemetryCounter('app', 'ready')
      reportDiagnostic({
        source: 'main',
        area: 'app',
        event: 'ready',
        level: 'info',
        data: {
          appVersion: app.getVersion(),
          isPackaged: app.isPackaged,
        },
      })
      app.on('child-process-gone', (_event, details) => {
        telemetryCounter('app', 'child_process_gone')
        telemetryHealth('app', 'warn', 'Child process exited', details)
        reportDiagnostic({
          source: 'main',
          area: 'app',
          event: 'child-process-gone',
          level: 'error',
          data: details,
        })
      })
      setupDesktopLoopbackCapture()
      void primeFixtureLibraryCache()
      createWindow()
      app.on('activate', () => {
        telemetryCounter('app', 'activate')
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows `open`.
        if (mainWindow === null) createWindow()
      })
    })
    .catch(console.log)

  app.on('will-quit', () => {
    if (persistWindowLayoutTimer !== null) {
      clearTimeout(persistWindowLayoutTimer)
      persistWindowLayoutTimer = null
    }
    flushPersistedWindowLayout()
    engine.stop()
    stopLighting3dUtilityWorker()
    telemetryCounter('app', 'will_quit')
    stopMainTelemetry()
  })
}

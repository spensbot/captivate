import { ipcMain, WebContents, dialog, desktopCapturer, app, screen } from 'electron'
import ipcChannels, {
  UserCommand,
  MainCommand,
} from '../../shared/ipc_channels'
import {
  initLighting3dUtilityWorker,
  postLighting3dTickViaUtilityWorker,
} from './lighting3dUtilityWorkerHost'
import ipcChannelsVisualizer from '../../visualizer/ipcChannels'
import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import * as midiConnection from './midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'
import { promises } from 'fs'
import type { VisualizerResource } from '../../visualizer/threejs/VisualizerManager'
import { VisualizerContainer } from './createVisualizerWindow'
import { DmxConnectionInfo } from 'shared/connection'
import type { Page } from '../../shared/pages'
import type {
  OpenPageWindowOptions,
  ScreenDisplayChoice,
} from '../../shared/screenDisplays'
import {
  getDefaultFixtureLibraryPath,
  readDefaultFixtureLibrary,
  saveDefaultFixtureLibrary,
} from '../fixtureLibraryStorage'
import {
  VisualizerNdiRuntimeDetection,
  NdiSourceList,
  VisualizerStreamConfig,
  VisualizerStreamingSettings,
  VisualizerStreamState,
  VisStreamHealth,
  VisualizerRelayRequest,
  VisualizerRelayStartResult,
} from 'shared/visualizerStreaming'
import { AudioEngineMetrics } from '../../shared/audioEngine'
import {
  ProjectMInstallResult,
  ProjectMPresetCatalog,
  ProjectMRuntimeDetection,
} from '../../shared/projectm'
import {
  ProjectMBridgeAudioChunk,
  ProjectMBridgeRenderRequest,
  ProjectMBridgeRenderResult,
  ProjectMBridgeSessionInitRequest,
  ProjectMBridgeSessionInitResult,
  ProjectMBridgeStatus,
} from '../../shared/projectmBridge'
import { discoverWledControllers } from './wled/wled_discovery'
import { probeWledControllerCapabilities } from './wled/wled_capabilities'
import type { DiagnosticsEvent } from '../../shared/diagnostics'
import { reportDiagnostic } from '../diagnostics'
import type { TelemetryMark } from '../../shared/telemetry'
import {
  exportTelemetrySnapshot,
  getTelemetrySnapshot,
  telemetryCounter,
  telemetryMark,
} from '../telemetry'
import {
  ingestStageLightMapFrame,
  getStageLightMapPreviewPayload,
} from './stageLightMapRuntime'
import {
  laserDacConnect,
  laserDacDisconnect,
  laserDacStatus,
  laserDacPushFrame,
} from './laserDacSession'
import type { LaserDacConnectResult } from '../../shared/laserDac'
import { normalizeLaserDacConnectRequest } from '../../shared/laserDac'
import path from 'path'
import {
  AppAboutInfo,
  AboutDependencyInfo,
  AboutLinkInfo,
} from '../../shared/about'
import type { RemoteControlSettings } from '../../shared/remoteControl'
import {
  applyRemoteControlSettings,
  getRemoteControlSettings,
  getRemoteControlStatus,
  initRemoteControlManager,
  notifyRemoteControlState,
  notifyRemoteDmxConnection,
  notifyRemoteMidiConnection,
  notifyRemoteTimeState,
  regenerateRemotePin,
  setRemoteControlIpcBridge,
} from './remoteControl/remoteControlManager'

interface Config {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // (kept local to IPC typing convenience)
  // type helper: handlers may be sync or async.
  // Using inline alias avoids refactoring all existing handlers.
  // eslint-disable-next-line @typescript-eslint/ban-types
  renderers: Set<WebContents>
  visualizerContainer: VisualizerContainer
  on_new_control_state: (
    new_state: CleanReduxState,
    sender: WebContents
  ) => void
  /** Optional: re-sync renderer `videoEnabled` with detached visualizer windows (e.g. after project load). */
  on_reconcile_video_enabled?: () => void
  on_user_command: (command: UserCommand) => void
  on_open_visualizer: () => void
  on_request_app_quit: () => void
  on_open_page_window: (page: Page, options?: OpenPageWindowOptions) => void
  on_audio_engine_metrics: (metrics: AudioEngineMetrics) => void
  get_control_state_snapshot?: () => CleanReduxState | null
  on_visualizer_stream_start: (
    config: VisualizerStreamConfig
  ) => VisualizerStreamState
  on_visualizer_stream_stop: () => VisualizerStreamState
  on_visualizer_stream_get_state: () => VisualizerStreamState
  on_visualizer_stream_health: (
    config: VisualizerStreamConfig
  ) => VisStreamHealth
  on_visualizer_stream_relay_start: (
    req: VisualizerRelayRequest
  ) => Promise<VisualizerRelayStartResult>
  on_visualizer_stream_relay_stop: (relayId: string) => void
  on_visualizer_stream_settings_get: () => VisualizerStreamingSettings
  on_visualizer_stream_settings_set: (
    patch: Partial<VisualizerStreamingSettings>
  ) => VisualizerStreamingSettings
  on_visualizer_stream_detect_ndi_runtime: () => VisualizerNdiRuntimeDetection
  on_visualizer_stream_ndi_list_sources: () => Promise<NdiSourceList>
  on_detect_projectm_runtime: () => ProjectMRuntimeDetection
  on_projectm_list_presets:
    () => ProjectMPresetCatalog | Promise<ProjectMPresetCatalog>
  on_projectm_list_presets_in_directory: (
    directory: string
  ) => ProjectMPresetCatalog | Promise<ProjectMPresetCatalog>
  on_projectm_bridge_status: () => ProjectMBridgeStatus
  on_projectm_install_binaries: () => Promise<ProjectMInstallResult>
  on_projectm_bridge_init_session: (
    request: ProjectMBridgeSessionInitRequest
  ) => ProjectMBridgeSessionInitResult | Promise<ProjectMBridgeSessionInitResult>
  on_projectm_bridge_push_audio: (chunk: ProjectMBridgeAudioChunk) => void | Promise<void>
  on_projectm_bridge_render: (
    request: ProjectMBridgeRenderRequest
  ) => ProjectMBridgeRenderResult | Promise<ProjectMBridgeRenderResult>
  on_projectm_bridge_shutdown_session: (sessionId: string) => void | Promise<void>
}

let _config: Config
let _staticHandlersRegistered = false

const lighting3dPreviewTargets = new Set<WebContents>()
let lighting3dRealtimeSeq = 0
let lighting3dLastTickSentMs = 0
/** Min interval between Lighting 3D preview IPC ticks (~60/s max). Lower = snappier beams, more CPU. */
const LIGHTING3D_TICK_MIN_MS = 17
let lighting3dLastBootstrapFingerprint = ''
let lighting3dBootstrapDebounceTimer: ReturnType<typeof setTimeout> | null =
  null
let lighting3dBootstrapPending: CleanReduxState | null = null

function lighting3dStructureFingerprint(snapshot: CleanReduxState): string {
  try {
    return JSON.stringify({
      dmx: snapshot.dmx,
      light: snapshot.control.light,
      mixer: snapshot.mixer,
    })
  } catch {
    return String(Math.random())
  }
}

function broadcastLighting3dOnly(channel: string, payload: unknown) {
  for (const wc of lighting3dPreviewTargets) {
    if (wc.isDestroyed()) {
      continue
    }
    try {
      wc.send(channel, payload)
    } catch {
      // ignore send failures during teardown
    }
  }
}

/** Call after sending an initial bootstrap so debounced updates do not immediately duplicate. */
export function seedLighting3dBootstrapDedupe(snapshot: CleanReduxState) {
  lighting3dLastBootstrapFingerprint = lighting3dStructureFingerprint(snapshot)
}

export function registerLighting3dPreviewPage(wc: WebContents) {
  lighting3dPreviewTargets.add(wc)
  wc.once('destroyed', () => {
    lighting3dPreviewTargets.delete(wc)
  })
}

function getScreenDisplayChoices(): ScreenDisplayChoice[] {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  return displays.map((d, index) => {
    const rawLabel = typeof d.label === 'string' ? d.label.trim() : ''
    const fallback = `Display ${index + 1}`
    const name = rawLabel.length > 0 ? rawLabel : fallback
    const suffix = d.id === primary.id ? ' — primary' : ''
    const label = `${name}${suffix} · ${d.workArea.width}×${d.workArea.height}`
    return {
      id: d.id,
      label,
      isPrimary: d.id === primary.id,
      workArea: {
        x: d.workArea.x,
        y: d.workArea.y,
        width: d.workArea.width,
        height: d.workArea.height,
      },
    }
  })
}

function scheduleLighting3dBootstrapFromControlState(snapshot: CleanReduxState) {
  if (lighting3dPreviewTargets.size === 0) {
    return
  }
  lighting3dBootstrapPending = snapshot
  if (lighting3dBootstrapDebounceTimer !== null) {
    return
  }
  lighting3dBootstrapDebounceTimer = setTimeout(() => {
    lighting3dBootstrapDebounceTimer = null
    const pending = lighting3dBootstrapPending
    lighting3dBootstrapPending = null
    if (pending === null) {
      return
    }
    const fp = lighting3dStructureFingerprint(pending)
    if (fp === lighting3dLastBootstrapFingerprint) {
      return
    }
    lighting3dLastBootstrapFingerprint = fp
    broadcastLighting3dOnly(
      ipcChannels.lighting3d_preview_bootstrap,
      pending
    )
  }, 380)
}

type PackageJsonShape = {
  name?: string
  productName?: string
  version?: string
  description?: string
  homepage?: string
  repository?:
    | string
    | {
        type?: string
        url?: string
      }
  dependencies?: Record<string, string>
}

const OSS_DEPENDENCY_CATALOG: Array<{
  key: string
  label: string
  url: string
  license: string
}> = [
  {
    key: 'electron',
    label: 'Electron',
    url: 'https://github.com/electron/electron',
    license: 'MIT',
  },
  {
    key: 'three',
    label: 'Three.js',
    url: 'https://github.com/mrdoob/three.js',
    license: 'MIT',
  },
  {
    key: 'react',
    label: 'React',
    url: 'https://github.com/facebook/react',
    license: 'MIT',
  },
  {
    key: 'react-dom',
    label: 'React DOM',
    url: 'https://github.com/facebook/react',
    license: 'MIT',
  },
  {
    key: '@reduxjs/toolkit',
    label: 'Redux Toolkit',
    url: 'https://github.com/reduxjs/redux-toolkit',
    license: 'MIT',
  },
  {
    key: 'styled-components',
    label: 'styled-components',
    url: 'https://github.com/styled-components/styled-components',
    license: 'MIT',
  },
  {
    key: '@mui/material',
    label: 'Material UI',
    url: 'https://github.com/mui/material-ui',
    license: 'MIT',
  },
  {
    key: 'ffmpeg-static',
    label: 'ffmpeg-static',
    url: 'https://github.com/eugeneware/ffmpeg-static',
    license: 'GPL-3.0-or-later',
  },
  {
    key: 'koffi',
    label: 'Koffi',
    url: 'https://github.com/Koromix/rygel/tree/master/src/koffi',
    license: 'MIT',
  },
]

function normalizeRepoUrl(repository: PackageJsonShape['repository']) {
  if (typeof repository === 'string') {
    return repository
  }
  if (repository && typeof repository.url === 'string') {
    return repository.url
  }
  return ''
}

function sanitizeRepoUrl(url: string) {
  if (url.length <= 0) {
    return ''
  }
  let sanitized = url.replace(/^git\+/, '')
  sanitized = sanitized.replace(/\.git$/i, '')
  return sanitized
}

async function readPackageJson(): Promise<PackageJsonShape | null> {
  const candidatePaths = [
    path.join(app.getAppPath(), 'package.json'),
    path.join(process.cwd(), 'package.json'),
    path.resolve(__dirname, '../../../package.json'),
  ]

  for (const packagePath of candidatePaths) {
    try {
      const serialized = await promises.readFile(packagePath, 'utf8')
      return JSON.parse(serialized) as PackageJsonShape
    } catch (_error) {
      // Keep trying fallback paths.
    }
  }

  return null
}

function buildDependencyCredits(
  dependencies: Record<string, string> | undefined
): AboutDependencyInfo[] {
  if (dependencies === undefined) {
    return []
  }
  return OSS_DEPENDENCY_CATALOG.map((item) => {
    const version = dependencies[item.key]
    if (version === undefined) {
      return null
    }
    return {
      name: item.label,
      version,
      url: item.url,
      license: item.license,
    } as AboutDependencyInfo
  }).filter((item): item is AboutDependencyInfo => item !== null)
}

function buildAboutLinks(pkg: PackageJsonShape): AboutLinkInfo[] {
  const home = typeof pkg.homepage === 'string' ? pkg.homepage : ''
  const repo = sanitizeRepoUrl(normalizeRepoUrl(pkg.repository))
  const fallbackRepo = 'https://github.com/spensbot/captivate'
  const repoUrl = repo.length > 0 ? repo : fallbackRepo

  return [
    {
      label: 'Website',
      url: home.length > 0 ? home : 'https://captivatesynth.com/',
    },
    {
      label: 'GitHub Repository',
      url: repoUrl,
    },
    {
      label: 'GitHub Issues',
      url: `${repoUrl}/issues`,
    },
    {
      label: 'GitHub Discussions',
      url: `${repoUrl}/discussions`,
    },
  ]
}

async function getAppAboutInfo(): Promise<AppAboutInfo> {
  const pkg = await readPackageJson()
  const appName = app.getName()
  const description = pkg?.description ?? 'Lighting and Visual Synth'
  const dependencies = buildDependencyCredits(pkg?.dependencies)

  return {
    appName,
    appVersion: app.getVersion(),
    description,
    runtime: {
      electron: process.versions.electron ?? 'unknown',
      chrome: process.versions.chrome ?? 'unknown',
      node: process.versions.node ?? 'unknown',
      v8: process.versions.v8 ?? 'unknown',
    },
    links: buildAboutLinks(pkg ?? {}),
    dependencies,
    credits: {
      originalCreator: 'Spenser Saling',
      contributors: ['Nick'],
    },
  }
}

function ensureStaticIpcHandlersRegistered() {
  if (_staticHandlersRegistered) {
    return
  }

  ipcMain.handle(
    ipcChannels.request_app_quit,
    () => {
      telemetryCounter('ipc', 'request_app_quit')
      _config.on_request_app_quit()
      return null
    }
  )

  ipcMain.handle(
    ipcChannels.load_file,
    async (_event, title: string, fileFilters: Electron.FileFilter[]) => {
      telemetryCounter('ipc', 'load_file')
      const dialogResult = await dialog.showOpenDialog({
        title: title,
        filters: fileFilters,
        properties: ['openFile'],
      })
      if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
        return await promises.readFile(dialogResult.filePaths[0], 'utf8')
      }
      return null
    }
  )

  ipcMain.handle(
    ipcChannels.save_file,
    async (
      _event,
      title: string,
      data: string,
      fileFilters: Electron.FileFilter[]
    ) => {
      telemetryCounter('ipc', 'save_file')
      const dialogResult = await dialog.showSaveDialog({
        title: title,
        filters: fileFilters,
        properties: ['createDirectory'],
      })
      if (!dialogResult.canceled && dialogResult.filePath !== undefined) {
        await promises.writeFile(dialogResult.filePath, data)
        return
      }
      return null
    }
  )

  ipcMain.handle(
    ipcChannels.read_text_file,
    async (_event, filePath: string) => {
      telemetryCounter('ipc', 'read_text_file')
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new Error('Invalid file path')
      }
      return await promises.readFile(filePath, 'utf8')
    }
  )

  ipcMain.handle(
    ipcChannels.get_local_filepaths,
    async (_event, title: string, fileFilters: Electron.FileFilter[]) => {
      telemetryCounter('ipc', 'get_local_filepaths')
      const dialogResult = await dialog.showOpenDialog({
        title: title,
        filters: fileFilters,
        properties: ['openFile', 'multiSelections'],
      })
      if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
        return dialogResult.filePaths
      }
      return []
    }
  )

  ipcMain.handle(
    ipcChannels.get_local_directories,
    async (_event, title: string) => {
      telemetryCounter('ipc', 'get_local_directories')
      const dialogResult = await dialog.showOpenDialog({
        title: typeof title === 'string' ? title : 'Select Folder',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
        return dialogResult.filePaths
      }
      return []
    }
  )

  ipcMain.handle(
    ipcChannels.load_fixture_library_default,
    async () => {
      telemetryCounter('ipc', 'load_fixture_library_default')
      return readDefaultFixtureLibrary()
    }
  )

  ipcMain.handle(
    ipcChannels.save_fixture_library_default,
    async (_event, serializedFixtureLibrary: string) => {
      telemetryCounter('ipc', 'save_fixture_library_default')
      return saveDefaultFixtureLibrary(serializedFixtureLibrary)
    }
  )

  ipcMain.handle(ipcChannels.get_fixture_library_default_path, async () => {
    telemetryCounter('ipc', 'get_fixture_library_default_path')
    return getDefaultFixtureLibraryPath()
  })

  ipcMain.handle(ipcChannels.get_desktop_audio_source_id, async () => {
    telemetryCounter('ipc', 'get_desktop_audio_source_id')
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 },
      })
      if (sources.length === 0) {
        return null
      }

      // Prefer entire display sources when available; fallback to first source.
      const preferred =
        sources.find((source) => /entire screen|screen/i.test(source.name)) ??
        sources[0]

      return preferred.id
    } catch (error) {
      console.error('Failed to get desktop audio source id', error)
      return null
    }
  })

  ipcMain.handle(
    ipcChannels.wled_discover_controllers,
    async (_event, timeoutMs?: number) => {
      telemetryCounter('ipc', 'wled_discover_controllers')
      try {
        return await discoverWledControllers(timeoutMs)
      } catch (error) {
        console.error('Failed to discover WLED controllers', error)
        return []
      }
    }
  )

  ipcMain.handle(
    ipcChannels.wled_probe_controller,
    async (_event, host: string) => {
      telemetryCounter('ipc', 'wled_probe_controller')
      try {
        return await probeWledControllerCapabilities(host)
      } catch (error) {
        console.error('Failed to probe WLED controller capabilities', error)
        return {
          host: typeof host === 'string' ? host.trim() : '',
          ip: null,
          reachable: false,
          firmware: null,
          ledCount: 0,
          maxSegments: 0,
          supportsRealtimeUdp: false,
          supportsPixel: false,
          supportsPixelRgb: false,
          supportsPixelRgbw: false,
          supportsPwm3: false,
          supportsPwm4: false,
          defaultOutputMode: 'auto',
          segments: [],
          buses: [],
          warnings: [
            error instanceof Error
              ? error.message
              : 'Capability probe failed unexpectedly.',
          ],
        }
      }
    }
  )

  _staticHandlersRegistered = true
}

function addRenderer(sender: WebContents) {
  _config.renderers.add(sender)
  sender.once('destroyed', () => {
    _config.renderers.delete(sender)
  })
}

function broadcast(channel: string, payload: any) {
  _config.renderers.forEach((renderer) => {
    if (!renderer.isDestroyed()) {
      renderer.send(channel, payload)
    }
  })
  if (channel === ipcChannels.dmx_connection_update) {
    notifyRemoteDmxConnection(payload)
  } else if (channel === ipcChannels.midi_connection_update) {
    notifyRemoteMidiConnection(payload)
  }
}

function broadcastExcept(channel: string, payload: any, sender: WebContents) {
  _config.renderers.forEach((renderer) => {
    if (!renderer.isDestroyed() && renderer.id !== sender.id) {
      if (
        channel === ipcChannels.new_control_state &&
        lighting3dPreviewTargets.has(renderer)
      ) {
        return
      }
      renderer.send(channel, payload)
    }
  })
}

export function ipcSetup(config: Config) {
  _config = config
  ensureStaticIpcHandlersRegistered()

  ipcMain.on(
    ipcChannels.new_control_state,
    (e, new_state: CleanReduxState) => {
      telemetryCounter('ipc', 'new_control_state')
      addRenderer(e.sender)
      _config.on_new_control_state(new_state, e.sender)
      broadcastExcept(ipcChannels.new_control_state, new_state, e.sender)
      notifyRemoteControlState(new_state)
      scheduleLighting3dBootstrapFromControlState(new_state)
    }
  )

  ipcMain.on(ipcChannels.reconcile_video_enabled, () => {
    _config.on_reconcile_video_enabled?.()
  })

  ipcMain.on(ipcChannels.dispatch_to_main, (e, action: PayloadAction<any>) => {
    telemetryCounter('ipc', 'dispatch_to_main')
    addRenderer(e.sender)
    broadcast(ipcChannels.dispatch, action)
  })

  ipcMain.on(ipcChannels.user_command, (_e, command: UserCommand) => {
    telemetryCounter('ipc', `user_command_${command.type}`)
    _config.on_user_command(command)
  })

  ipcMain.on(ipcChannels.open_visualizer, (_e) => {
    telemetryCounter('ipc', 'open_visualizer')
    _config.on_open_visualizer()
  })

  ipcMain.on(
    ipcChannels.open_page_window,
    (_e, page: unknown, opts?: unknown) => {
      if (typeof page !== 'string' || page.length === 0) {
        return
      }
      const p = page as Page
      let options: OpenPageWindowOptions | undefined
      if (opts !== undefined && opts !== null && typeof opts === 'object') {
        const id = Number((opts as OpenPageWindowOptions).displayId)
        if (Number.isFinite(id)) {
          options = { displayId: Math.trunc(id) }
        }
      }
      telemetryCounter('ipc', `open_page_window_${p}`)
      _config.on_open_page_window(p, options)
    }
  )

  ipcMain.on(
    ipcChannels.audio_engine_metrics,
    (_event, metrics: AudioEngineMetrics) => {
      telemetryCounter('ipc', 'audio_engine_metrics')
      _config.on_audio_engine_metrics(metrics)
    }
  )

  ipcMain.on(
    ipcChannels.diagnostics_event,
    (_event, payload: DiagnosticsEvent) => {
      telemetryCounter('ipc', 'diagnostics_event')
      reportDiagnostic({
        ...payload,
        source: payload?.source ?? 'renderer',
        area: payload?.area ?? 'unknown',
        event: payload?.event ?? 'event',
      })
    }
  )

  ipcMain.on(ipcChannels.telemetry_mark, (_event, mark: TelemetryMark) => {
    telemetryCounter('ipc', 'telemetry_mark')
    telemetryMark(mark)
  })

  ipcMain.on(
    ipcChannels.visualizer_stage_light_map,
    (_event, payload: { width: number; height: number; data: Uint8Array }) => {
      telemetryCounter('ipc', 'visualizer_stage_light_map')
      ingestStageLightMapFrame(payload)
    }
  )

  ipcMain.on(ipcChannels.laser_dac_push_frame, (_event, raw: unknown) => {
    telemetryCounter('ipc', 'laser_dac_push_frame')
    void laserDacPushFrame(raw)
  })

  ipcMain.handle(ipcChannels.list_screen_displays, () => {
    telemetryCounter('ipc', 'list_screen_displays')
    return getScreenDisplayChoices()
  })

  ipcMain.handle(ipcChannels.telemetry_get_snapshot, () => {
    telemetryCounter('ipc', 'telemetry_get_snapshot')
    return getTelemetrySnapshot()
  })

  ipcMain.handle(ipcChannels.telemetry_export_snapshot, async () => {
    telemetryCounter('ipc', 'telemetry_export_snapshot')
    return await exportTelemetrySnapshot()
  })

  ipcMain.handle(ipcChannels.app_about_info, async () => {
    telemetryCounter('ipc', 'app_about_info')
    return await getAppAboutInfo()
  })

  ipcMain.handle(ipcChannels.stage_light_map_preview_get, () => {
    telemetryCounter('ipc', 'stage_light_map_preview_get')
    return getStageLightMapPreviewPayload()
  })

  ipcMain.handle(ipcChannels.remote_control_get_status, async () => {
    return getRemoteControlStatus()
  })

  ipcMain.handle(
    ipcChannels.remote_control_apply_settings,
    async (_event, raw: unknown) => {
      const o =
        raw !== null && typeof raw === 'object'
          ? (raw as Partial<RemoteControlSettings>)
          : {}
      const current = getRemoteControlSettings()
      const next: RemoteControlSettings = {
        enabled: o.enabled === true,
        port:
          typeof o.port === 'number' && Number.isFinite(o.port)
            ? o.port
            : current.port,
        pin:
          typeof o.pin === 'string' && o.pin.trim().length >= 4
            ? o.pin.trim()
            : current.pin,
      }
      return applyRemoteControlSettings(next)
    }
  )

  ipcMain.handle(ipcChannels.remote_control_regenerate_pin, async () => {
    const pin = await regenerateRemotePin()
    return { pin, status: getRemoteControlStatus() }
  })

  ipcMain.handle(ipcChannels.laser_dac_connect, async (_event, raw: unknown) => {
    telemetryCounter('ipc', 'laser_dac_connect')
    const req = normalizeLaserDacConnectRequest(raw)
    if (req === null) {
      const bad: LaserDacConnectResult = {
        ok: false,
        message: 'Invalid laser DAC connect payload.',
      }
      return bad
    }
    return await laserDacConnect(req)
  })

  ipcMain.handle(ipcChannels.laser_dac_disconnect, async () => {
    telemetryCounter('ipc', 'laser_dac_disconnect')
    await laserDacDisconnect()
    return null
  })

  ipcMain.handle(ipcChannels.laser_dac_status, () => {
    telemetryCounter('ipc', 'laser_dac_status')
    return laserDacStatus()
  })

  ipcMain.handle(
    ipcChannels.visualizer_stream_start,
    (_event, config: VisualizerStreamConfig) => {
      telemetryCounter('ipc', 'visualizer_stream_start')
      return _config.on_visualizer_stream_start(config)
    }
  )

  ipcMain.handle(ipcChannels.visualizer_stream_stop, () => {
    telemetryCounter('ipc', 'visualizer_stream_stop')
    return _config.on_visualizer_stream_stop()
  })

  ipcMain.handle(ipcChannels.visualizer_stream_state, () => {
    telemetryCounter('ipc', 'visualizer_stream_state')
    return _config.on_visualizer_stream_get_state()
  })

  ipcMain.handle(
    ipcChannels.visualizer_stream_health,
    (_event, config: VisualizerStreamConfig) => {
      telemetryCounter('ipc', 'visualizer_stream_health')
      return _config.on_visualizer_stream_health(config)
    }
  )

  ipcMain.handle(
    ipcChannels.visualizer_stream_relay_start,
    (_event, req: VisualizerRelayRequest) => {
      telemetryCounter('ipc', 'visualizer_stream_relay_start')
      return _config.on_visualizer_stream_relay_start(req)
    }
  )

  ipcMain.handle(
    ipcChannels.visualizer_stream_relay_stop,
    (_event, relayId: string) => {
      telemetryCounter('ipc', 'visualizer_stream_relay_stop')
      return _config.on_visualizer_stream_relay_stop(relayId)
    }
  )

  ipcMain.handle(ipcChannels.visualizer_stream_settings_get, () => {
    telemetryCounter('ipc', 'visualizer_stream_settings_get')
    return _config.on_visualizer_stream_settings_get()
  })

  ipcMain.handle(
    ipcChannels.visualizer_stream_settings_set,
    (_event, patch: Partial<VisualizerStreamingSettings>) => {
      telemetryCounter('ipc', 'visualizer_stream_settings_set')
      return _config.on_visualizer_stream_settings_set(patch)
    }
  )

  ipcMain.handle(ipcChannels.visualizer_stream_detect_ndi_runtime, () => {
    telemetryCounter('ipc', 'visualizer_stream_detect_ndi_runtime')
    return _config.on_visualizer_stream_detect_ndi_runtime()
  })

  ipcMain.handle(ipcChannels.visualizer_stream_ndi_list_sources, () => {
    telemetryCounter('ipc', 'visualizer_stream_ndi_list_sources')
    return _config.on_visualizer_stream_ndi_list_sources()
  })

  ipcMain.handle(ipcChannels.detect_projectm_runtime, () => {
    telemetryCounter('ipc', 'detect_projectm_runtime')
    return _config.on_detect_projectm_runtime()
  })

  ipcMain.handle(ipcChannels.projectm_list_presets, () => {
    telemetryCounter('ipc', 'projectm_list_presets')
    return _config.on_projectm_list_presets()
  })

  ipcMain.handle(
    ipcChannels.projectm_list_presets_in_directory,
    (_event, directory: string) => {
      telemetryCounter('ipc', 'projectm_list_presets_in_directory')
      return _config.on_projectm_list_presets_in_directory(directory)
    }
  )

  ipcMain.handle(ipcChannels.projectm_bridge_status, () => {
    telemetryCounter('ipc', 'projectm_bridge_status')
    return _config.on_projectm_bridge_status()
  })

  ipcMain.handle(ipcChannels.projectm_install_binaries, async () => {
    telemetryCounter('ipc', 'projectm_install_binaries')
    return await _config.on_projectm_install_binaries()
  })

  ipcMain.handle(
    ipcChannels.projectm_bridge_init_session,
    (_event, request: ProjectMBridgeSessionInitRequest) => {
      telemetryCounter('ipc', 'projectm_bridge_init_session')
      return _config.on_projectm_bridge_init_session(request)
    }
  )

  ipcMain.handle(
    ipcChannels.projectm_bridge_push_audio,
    (_event, chunk: ProjectMBridgeAudioChunk) => {
      telemetryCounter('ipc', 'projectm_bridge_push_audio')
      _config.on_projectm_bridge_push_audio(chunk)
      return null
    }
  )

  ipcMain.handle(
    ipcChannels.projectm_bridge_render,
    (_event, request: ProjectMBridgeRenderRequest) => {
      telemetryCounter('ipc', 'projectm_bridge_render')
      return _config.on_projectm_bridge_render(request)
    }
  )

  ipcMain.handle(
    ipcChannels.projectm_bridge_shutdown_session,
    (_event, sessionId: string) => {
      telemetryCounter('ipc', 'projectm_bridge_shutdown_session')
      _config.on_projectm_bridge_shutdown_session(sessionId)
      return null
    }
  )

  initLighting3dUtilityWorker((tick) => {
    broadcastLighting3dOnly(
      ipcChannels.lighting3d_realtime_tick,
      tick
    )
  })

  const callbacks = {
    register_renderer: (renderer: WebContents) => {
      addRenderer(renderer)
    },
    send_dmx_connection_update: (payload: DmxConnectionInfo) =>
      broadcast(ipcChannels.dmx_connection_update, payload),
    send_midi_connection_update: (payload: midiConnection.UpdatePayload) =>
      broadcast(ipcChannels.midi_connection_update, payload),
    send_time_state: (time_state: RealtimeState, master: number) => {
      _config.renderers.forEach((renderer) => {
        if (renderer.isDestroyed()) {
          return
        }
        if (lighting3dPreviewTargets.has(renderer)) {
          return
        }
        renderer.send(ipcChannels.new_time_state, time_state)
      })
      notifyRemoteTimeState(time_state)
      if (lighting3dPreviewTargets.size === 0) {
        return
      }
      const now = performance.now()
      if (now - lighting3dLastTickSentMs < LIGHTING3D_TICK_MIN_MS) {
        return
      }
      lighting3dLastTickSentMs = now
      postLighting3dTickViaUtilityWorker(
        time_state,
        master,
        ++lighting3dRealtimeSeq
      )
    },
    send_dispatch: (action: PayloadAction<any>) =>
      broadcast(ipcChannels.dispatch, action),
    send_visualizer_state: (payload: VisualizerResource) => {
      const visualizer = _config.visualizerContainer.visualizer
      if (!visualizer || visualizer.isDestroyed()) return

      const webContents = visualizer.webContents
      if (webContents.isDestroyed()) return

      try {
        webContents.send(ipcChannelsVisualizer.new_visualizer_state, payload)
      } catch (err) {
        console.error('Failed to send visualizer state update', err)
      }
    },
    send_main_command: (command: MainCommand) => {
      broadcast(ipcChannels.main_command, command)
    },
  }

  setRemoteControlIpcBridge({
    broadcastDispatch: (action) =>
      callbacks.send_dispatch(action as PayloadAction<unknown>),
    broadcastUserCommand: (command) => _config.on_user_command(command),
    getControlState: () => _config.get_control_state_snapshot?.() ?? null,
  })

  return callbacks
}

export async function bootstrapRemoteControlIpc(): Promise<void> {
  await initRemoteControlManager()
}

export type IPC_Callbacks = ReturnType<typeof ipcSetup>

import ipc_channels, { UserCommand, MainCommand } from '../shared/ipc_channels'
import type { Lighting3dRealtimeTick } from '../shared/lighting3dPreviewTransport'
import { CleanReduxState } from './redux/store'
import { RealtimeState } from './redux/realtimeStore'
import * as midiConnection from '../main/engine/midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'
import { DmxConnectionInfo } from 'shared/connection'
import type { Page } from '../shared/pages'
import type {
  OpenPageWindowOptions,
  ScreenDisplayChoice,
} from '../shared/screenDisplays'
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
import {
  AudioEngineMetrics,
  normalizeAudioEngineMetrics,
} from '../shared/audioEngine'
import {
  ProjectMInstallResult,
  ProjectMPresetCatalog,
  ProjectMRuntimeDetection,
} from '../shared/projectm'
import {
  ProjectMBridgeAudioChunk,
  ProjectMBridgeRenderRequest,
  ProjectMBridgeRenderResult,
  ProjectMBridgeSessionInitRequest,
  ProjectMBridgeSessionInitResult,
  ProjectMBridgeStatus,
} from '../shared/projectmBridge'
import {
  WledControllerCapabilities,
  WledDiscoveredController,
} from 'shared/wledDiscovery'
import type { DiagnosticsEvent } from '../shared/diagnostics'
import type {
  TelemetryExportResult,
  TelemetryMark,
  TelemetrySnapshot,
} from '../shared/telemetry'
import { AppAboutInfo } from '../shared/about'
import type {
  LaserDacConnectRequest,
  LaserDacConnectResult,
  LaserDacPushFramePayload,
  LaserDacStatus,
} from '../shared/laserDac'
import {
  sendDispatchToHost,
  sendUserCommandToHost,
} from '../shared/hostTransport'

const PROJECTM_PRESET_SCAN_IPC_TIMEOUT_MS = 12000

interface Config {
  on_dmx_connection_update: (payload: DmxConnectionInfo) => void
  on_midi_connection_update: (payload: midiConnection.UpdatePayload) => void
  on_time_state: (time_state: RealtimeState) => void
  on_dispatch: (action: PayloadAction) => void
  on_main_command: (command: MainCommand) => void
  on_app_close_prompt: () => void
  on_detached_window_close_prompt: () => void
  on_control_state: (state: CleanReduxState) => void
  on_lighting3d_preview_bootstrap?: (state: CleanReduxState) => void
  on_lighting3d_realtime_tick?: (tick: Lighting3dRealtimeTick) => void
}

let _config: Config

const maybeWindow = typeof window !== 'undefined' ? (window as any) : undefined
// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer =
  maybeWindow?.electron?.ipcRenderer ??
  ({
    on: () => undefined,
    send: () => undefined,
    invoke: async () => {
      throw new Error('Electron IPC is unavailable in this environment.')
    },
  } as {
    on: (channel: string, handler: (...args: any[]) => void) => void
    send: (channel: string, ...args: any[]) => void
    invoke: (channel: string, ...args: any[]) => Promise<any>
  })

export function ipc_setup(config: Config) {
  _config = config

  ipcRenderer.on(
    ipc_channels.dmx_connection_update,
    (payload: DmxConnectionInfo) => _config.on_dmx_connection_update(payload)
  )

  ipcRenderer.on(
    ipc_channels.midi_connection_update,
    (payload: midiConnection.UpdatePayload) =>
      _config.on_midi_connection_update(payload)
  )

  ipcRenderer.on(ipc_channels.new_time_state, (realtimeState: RealtimeState) =>
    _config.on_time_state(realtimeState)
  )

  ipcRenderer.on(ipc_channels.dispatch, (action: PayloadAction<any>) =>
    _config.on_dispatch(action)
  )

  ipcRenderer.on(ipc_channels.main_command, (command: MainCommand) =>
    _config.on_main_command(command)
  )

  ipcRenderer.on(ipc_channels.app_close_prompt, () =>
    _config.on_app_close_prompt()
  )

  ipcRenderer.on(ipc_channels.detached_window_close_prompt, () =>
    _config.on_detached_window_close_prompt()
  )

  ipcRenderer.on(ipc_channels.new_control_state, (state: CleanReduxState) =>
    _config.on_control_state(state)
  )

  if (_config.on_lighting3d_preview_bootstrap !== undefined) {
    ipcRenderer.on(
      ipc_channels.lighting3d_preview_bootstrap,
      (state: CleanReduxState) =>
        _config.on_lighting3d_preview_bootstrap?.(state)
    )
  }

  if (_config.on_lighting3d_realtime_tick !== undefined) {
    ipcRenderer.on(
      ipc_channels.lighting3d_realtime_tick,
      (tick: Lighting3dRealtimeTick) =>
        _config.on_lighting3d_realtime_tick?.(tick)
    )
  }
}

export function send_control_state(cleanState: CleanReduxState) {
  ipcRenderer.send(ipc_channels.new_control_state, cleanState)
}
export function send_dispatch_to_main(action: PayloadAction<any>) {
  sendDispatchToHost(action)
}
export function send_user_command(command: UserCommand) {
  sendUserCommandToHost(command)
}
export function send_open_visualizer() {
  // Route legacy "open visualizer" actions to the dedicated visualizer page window.
  ipcRenderer.send(ipc_channels.open_page_window, 'Video')
}
export function send_open_page_window(
  page: Page,
  options?: OpenPageWindowOptions
) {
  ipcRenderer.send(ipc_channels.open_page_window, page, options ?? {})
}

export async function listScreenDisplays(): Promise<ScreenDisplayChoice[]> {
  const raw = await ipcRenderer.invoke(ipc_channels.list_screen_displays)
  return Array.isArray(raw) ? (raw as ScreenDisplayChoice[]) : []
}

export async function laserDacGetStatus(): Promise<LaserDacStatus | null> {
  try {
    return (await ipcRenderer.invoke(
      ipc_channels.laser_dac_status
    )) as LaserDacStatus
  } catch {
    return null
  }
}

export async function laserDacConnectRequest(
  req: LaserDacConnectRequest
): Promise<LaserDacConnectResult> {
  try {
    return (await ipcRenderer.invoke(
      ipc_channels.laser_dac_connect,
      req
    )) as LaserDacConnectResult
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function laserDacDisconnectRequest(
  sessionId?: string
): Promise<void> {
  try {
    await ipcRenderer.invoke(ipc_channels.laser_dac_disconnect, sessionId ?? null)
  } catch {
    /* non-Electron or IPC failure */
  }
}

export function sendLaserDacPushFrame(payload: LaserDacPushFramePayload): void {
  try {
    ipcRenderer.send(ipc_channels.laser_dac_push_frame, payload)
  } catch {
    /* ignore */
  }
}

/** Tell main to set `videoEnabled` from detached visualizer windows (e.g. after loading a project). */
export function send_reconcile_video_enabled() {
  ipcRenderer.send(ipc_channels.reconcile_video_enabled)
}

/** Keep the native Extras menu LED-sidebar checkbox aligned with `gui.ledSidebarEnabled`. */
export function send_sync_led_sidebar_menu(enabled: boolean) {
  ipcRenderer.send(ipc_channels.sync_led_sidebar_menu, enabled)
}
export async function requestAppQuit() {
  await ipcRenderer.invoke(ipc_channels.request_app_quit)
}

export async function requestWindowClose() {
  return (await ipcRenderer.invoke(
    ipc_channels.request_window_close
  )) as boolean
}

export async function queryVisualizerDetachedFullscreen(): Promise<boolean> {
  const { full } = (await ipcRenderer.invoke(
    ipc_channels.visualizer_detached_fullscreen,
    { query: true }
  )) as { full: boolean }
  return full
}

/** Omit `next` to toggle. Returns the new fullscreen state. */
export async function setVisualizerDetachedFullscreen(
  next?: boolean
): Promise<boolean> {
  const { full } = (await ipcRenderer.invoke(
    ipc_channels.visualizer_detached_fullscreen,
    next === undefined ? {} : { next }
  )) as { full: boolean }
  return full
}
export function send_audio_engine_metrics(metrics: Partial<AudioEngineMetrics>) {
  ipcRenderer.send(
    ipc_channels.audio_engine_metrics,
    normalizeAudioEngineMetrics(metrics)
  )
}

export function sendDiagnosticsEvent(event: DiagnosticsEvent) {
  ipcRenderer.send(ipc_channels.diagnostics_event, {
    ...event,
    ts: event.ts ?? Date.now(),
  })
}

export function sendTelemetryMark(mark: TelemetryMark) {
  ipcRenderer.send(ipc_channels.telemetry_mark, {
    ...mark,
    ts: mark.ts ?? Date.now(),
  })
}

export async function getTelemetrySnapshot() {
  return (await ipcRenderer.invoke(
    ipc_channels.telemetry_get_snapshot
  )) as TelemetrySnapshot
}

export async function exportTelemetrySnapshot() {
  return (await ipcRenderer.invoke(
    ipc_channels.telemetry_export_snapshot
  )) as TelemetryExportResult
}

export async function getAppAboutInfo() {
  return (await ipcRenderer.invoke(ipc_channels.app_about_info)) as AppAboutInfo
}

export async function getStageLightMapPreview(): Promise<{
  width: number
  height: number
  data: number[]
} | null> {
  return (await ipcRenderer.invoke(
    ipc_channels.stage_light_map_preview_get
  )) as {
    width: number
    height: number
    data: number[]
  } | null
}

export async function getLocalFilepaths(
  title: string,
  fileFilters: Electron.FileFilter[]
): Promise<string[]> {
  return ipcRenderer.invoke(
    ipc_channels.get_local_filepaths,
    title,
    fileFilters
  )
}

export async function getLocalDirectories(title: string): Promise<string[]> {
  return ipcRenderer.invoke(ipc_channels.get_local_directories, title)
}

export async function readTextFile(filePath: string): Promise<string> {
  return ipcRenderer.invoke(ipc_channels.read_text_file, filePath) as Promise<string>
}

export async function startVisualizerStream(config: VisualizerStreamConfig) {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_start,
    config
  )) as VisualizerStreamState
}

export async function stopVisualizerStream() {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_stop
  )) as VisualizerStreamState
}

export async function getVisualizerStreamState() {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_state
  )) as VisualizerStreamState
}

/** Ask main for FFmpeg + NDI health used in stream-out UI. */
export async function getVisStreamHealth(config: VisualizerStreamConfig) {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_health,
    config
  )) as VisStreamHealth
}

export async function startVisualizerRelay(req: VisualizerRelayRequest) {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_relay_start,
    req
  )) as VisualizerRelayStartResult
}

export async function stopVisualizerRelay(relayId: string) {
  await ipcRenderer.invoke(ipc_channels.visualizer_stream_relay_stop, relayId)
}

export async function getVisualizerStreamingSettings() {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_settings_get
  )) as VisualizerStreamingSettings
}

export async function saveVisualizerStreamingSettings(
  patch: Partial<VisualizerStreamingSettings>
) {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_settings_set,
    patch
  )) as VisualizerStreamingSettings
}

export async function detectVisualizerNdiRuntime() {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_detect_ndi_runtime
  )) as VisualizerNdiRuntimeDetection
}

/** NDI names on the LAN (FFmpeg find_sources). */
export async function visNdiList() {
  return (await ipcRenderer.invoke(
    ipc_channels.visualizer_stream_ndi_list_sources
  )) as NdiSourceList
}

export async function getDesktopAudioSourceId(): Promise<string | null> {
  return (await ipcRenderer.invoke(
    ipc_channels.get_desktop_audio_source_id
  )) as string | null
}

export async function getPageWindowMediaSourceId(page: Page): Promise<string | null> {
  return (await ipcRenderer.invoke(
    ipc_channels.get_page_window_media_source_id,
    page
  )) as string | null
}

export async function discoverWledControllers(timeoutMs?: number) {
  return (await ipcRenderer.invoke(
    ipc_channels.wled_discover_controllers,
    timeoutMs
  )) as WledDiscoveredController[]
}

export async function probeWledController(host: string) {
  return (await ipcRenderer.invoke(
    ipc_channels.wled_probe_controller,
    host
  )) as WledControllerCapabilities
}

export async function detectProjectMRuntime() {
  return (await ipcRenderer.invoke(
    ipc_channels.detect_projectm_runtime
  )) as ProjectMRuntimeDetection
}

export async function listProjectMPresets() {
  return (await invokeWithTimeout(
    ipc_channels.projectm_list_presets,
    PROJECTM_PRESET_SCAN_IPC_TIMEOUT_MS
  )) as ProjectMPresetCatalog
}

export async function listProjectMPresetsInDirectory(directory: string) {
  return (await invokeWithTimeout(
    ipc_channels.projectm_list_presets_in_directory,
    PROJECTM_PRESET_SCAN_IPC_TIMEOUT_MS,
    directory
  )) as ProjectMPresetCatalog
}

export async function getProjectMBridgeStatus() {
  return (await ipcRenderer.invoke(
    ipc_channels.projectm_bridge_status
  )) as ProjectMBridgeStatus
}

export async function installProjectMBinaries() {
  return (await ipcRenderer.invoke(
    ipc_channels.projectm_install_binaries
  )) as ProjectMInstallResult
}

export async function initProjectMBridgeSession(
  request: ProjectMBridgeSessionInitRequest
) {
  return (await ipcRenderer.invoke(
    ipc_channels.projectm_bridge_init_session,
    request
  )) as ProjectMBridgeSessionInitResult
}

export async function pushProjectMBridgeAudio(chunk: ProjectMBridgeAudioChunk) {
  await ipcRenderer.invoke(ipc_channels.projectm_bridge_push_audio, chunk)
}

export async function renderProjectMBridgeFrame(request: ProjectMBridgeRenderRequest) {
  return (await ipcRenderer.invoke(
    ipc_channels.projectm_bridge_render,
    request
  )) as ProjectMBridgeRenderResult
}

export async function shutdownProjectMBridgeSession(sessionId: string) {
  await ipcRenderer.invoke(ipc_channels.projectm_bridge_shutdown_session, sessionId)
}

async function invokeWithTimeout(
  channel: string,
  timeoutMs: number,
  ...args: any[]
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      ipcRenderer.invoke(channel, ...args),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `Operation timed out while waiting for ${channel} after ${Math.round(
                timeoutMs / 1000
              )}s.`
            )
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer !== null) {
      clearTimeout(timer)
    }
  }
}

export async function remoteControlGetStatus() {
  return ipcRenderer.invoke(ipc_channels.remote_control_get_status)
}

export async function remoteControlApplySettings(
  settings: import('../shared/remoteControl').RemoteControlSettings
) {
  return ipcRenderer.invoke(ipc_channels.remote_control_apply_settings, settings)
}

export async function remoteControlRegeneratePin() {
  return ipcRenderer.invoke(ipc_channels.remote_control_regenerate_pin)
}

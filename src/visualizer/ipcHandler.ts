import ipc_channels from './ipcChannels'
import { VisualizerResource } from './threejs/VisualizerManager'
import sharedIpcChannels from '../shared/ipc_channels'
import {
  VisualizerRelayRequest,
  VisualizerRelayStartResult,
} from '../shared/visualizerStreaming'
import {
  ProjectMBridgeAudioChunk,
  ProjectMBridgeRenderRequest,
  ProjectMBridgeRenderResult,
  ProjectMBridgeSessionInitRequest,
  ProjectMBridgeSessionInitResult,
  ProjectMBridgeStatus,
} from '../shared/projectmBridge'
import type { DiagnosticsEvent } from '../shared/diagnostics'
import type { TelemetryMark } from '../shared/telemetry'

interface Config {
  onNewVisualizerResource: (visualizerState: VisualizerResource) => void
}

let _config: Config

// Guard for cases where this module is bundled into a non-window runtime.
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

export function ipcSetup(config: Config) {
  _config = config

  ipcRenderer.on(
    ipc_channels.new_visualizer_state,
    (payload: VisualizerResource) => _config.onNewVisualizerResource(payload)
  )
}

export async function startVisualizerRelay(req: VisualizerRelayRequest) {
  return (await ipcRenderer.invoke(
    sharedIpcChannels.visualizer_stream_relay_start,
    req
  )) as VisualizerRelayStartResult
}

export async function stopVisualizerRelay(relayId: string) {
  await ipcRenderer.invoke(sharedIpcChannels.visualizer_stream_relay_stop, relayId)
}

export async function getProjectMBridgeStatus() {
  return (await ipcRenderer.invoke(
    sharedIpcChannels.projectm_bridge_status
  )) as ProjectMBridgeStatus
}

export async function initProjectMBridgeSession(
  request: ProjectMBridgeSessionInitRequest
) {
  return (await ipcRenderer.invoke(
    sharedIpcChannels.projectm_bridge_init_session,
    request
  )) as ProjectMBridgeSessionInitResult
}

export async function pushProjectMBridgeAudio(chunk: ProjectMBridgeAudioChunk) {
  await ipcRenderer.invoke(sharedIpcChannels.projectm_bridge_push_audio, chunk)
}

export async function renderProjectMBridgeFrame(request: ProjectMBridgeRenderRequest) {
  return (await ipcRenderer.invoke(
    sharedIpcChannels.projectm_bridge_render,
    request
  )) as ProjectMBridgeRenderResult
}

export async function shutdownProjectMBridgeSession(sessionId: string) {
  await ipcRenderer.invoke(sharedIpcChannels.projectm_bridge_shutdown_session, sessionId)
}

export function sendDiagnosticsEvent(event: DiagnosticsEvent) {
  ipcRenderer.send(sharedIpcChannels.diagnostics_event, {
    ...event,
    ts: event.ts ?? Date.now(),
  })
}

export function sendTelemetryMark(mark: TelemetryMark) {
  ipcRenderer.send(sharedIpcChannels.telemetry_mark, {
    ...mark,
    ts: mark.ts ?? Date.now(),
  })
}

export function sendStageLightMapFrame(payload: {
  width: number
  height: number
  data: Uint8Array
}) {
  ipcRenderer.send(sharedIpcChannels.visualizer_stage_light_map, payload)
}

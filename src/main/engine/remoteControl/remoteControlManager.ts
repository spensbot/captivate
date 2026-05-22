import type { PayloadAction } from '@reduxjs/toolkit'
import type { CleanReduxState } from '../../../renderer/redux/store'
import type { RealtimeState } from '../../../renderer/redux/realtimeStore'
import type { DmxConnectionInfo, MidiConnections } from '../../../shared/connection'
import {
  defaultRemoteControlSettings,
  generateRemotePin,
  type RemoteControlRuntimeStatus,
  type RemoteControlSettings,
} from '../../../shared/remoteControl'
import {
  loadRemoteControlSettings,
  saveRemoteControlSettings,
} from './remoteControlSettingsStore'
import {
  RemoteControlBridge,
  RemoteControlServer,
} from './remoteControlServer'

let server: RemoteControlServer | null = null
let settings: RemoteControlSettings = defaultRemoteControlSettings()
let ipcBridge: RemoteControlBridge | null = null

function createBridge(): RemoteControlBridge {
  return {
    broadcastDispatch: (action) => {
      ipcBridge?.broadcastDispatch(action)
    },
    broadcastUserCommand: (command) => {
      ipcBridge?.broadcastUserCommand(command)
    },
    getControlState: () => ipcBridge?.getControlState() ?? null,
  }
}

export function setRemoteControlIpcBridge(bridge: RemoteControlBridge): void {
  ipcBridge = bridge
}

export async function initRemoteControlManager(): Promise<RemoteControlSettings> {
  settings = await loadRemoteControlSettings()
  if (settings.enabled) {
    await applyRemoteControlSettings(settings)
  }
  return settings
}

export function getRemoteControlSettings(): RemoteControlSettings {
  return { ...settings }
}

export function getRemoteControlStatus(): RemoteControlRuntimeStatus {
  if (server) return server.getStatus()
  return {
    running: false,
    enabled: settings.enabled,
    port: settings.port,
    pin: settings.pin,
    clientCount: 0,
    urls: [],
  }
}

export async function applyRemoteControlSettings(
  next: RemoteControlSettings
): Promise<RemoteControlRuntimeStatus> {
  settings = await saveRemoteControlSettings(next)
  if (!settings.enabled) {
    await stopRemoteControlServer()
    return getRemoteControlStatus()
  }
  if (!server) {
    server = new RemoteControlServer(settings, createBridge())
  } else {
    server.updateSettings(settings)
  }
  return server.start()
}

export async function stopRemoteControlServer(): Promise<void> {
  if (server) {
    await server.stop()
  }
}

export async function regenerateRemotePin(): Promise<string> {
  settings.pin = generateRemotePin()
  settings = await saveRemoteControlSettings(settings)
  if (server) {
    server.updateSettings(settings)
  }
  return settings.pin
}

export function notifyRemoteControlState(state: CleanReduxState): void {
  server?.broadcastControlState(state)
}

export function notifyRemoteTimeState(state: RealtimeState): void {
  server?.broadcastTimeState(state)
}

export function notifyRemoteDmxConnection(payload: DmxConnectionInfo): void {
  server?.broadcastDmxConnection(payload)
}

export function notifyRemoteMidiConnection(payload: MidiConnections): void {
  server?.broadcastMidiConnection(payload)
}

export function notifyRemoteDispatch(action: PayloadAction<unknown>): void {
  server?.broadcastDispatch(action)
}

export async function shutdownRemoteControl(): Promise<void> {
  await stopRemoteControlServer()
  server = null
}

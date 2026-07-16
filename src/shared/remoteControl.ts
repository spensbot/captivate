import type { PayloadAction } from '@reduxjs/toolkit'
import type { CleanReduxState } from '../renderer/redux/store'
import type { RealtimeState } from '../renderer/redux/realtimeStore'
import type { DmxConnectionInfo } from './connection'
import type { UserCommand } from './ipc_channels'
import type { MidiConnections } from './connection'

export const REMOTE_CONTROL_DEFAULT_PORT = 8765
export const REMOTE_CONTROL_MIN_PORT = 1024
export const REMOTE_CONTROL_MAX_PORT = 65535

export type RemoteControlSettings = {
  enabled: boolean
  port: number
  /** Numeric PIN clients must send after connecting. */
  pin: string
}

export type RemoteControlRuntimeStatus = {
  running: boolean
  port: number
  pin: string
  enabled: boolean
  clientCount: number
  urls: string[]
  lastError?: string
}

export function defaultRemoteControlSettings(): RemoteControlSettings {
  return {
    enabled: false,
    port: REMOTE_CONTROL_DEFAULT_PORT,
    pin: generateRemotePin(),
  }
}

export function generateRemotePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function clampRemotePort(port: number): number {
  if (!Number.isFinite(port)) return REMOTE_CONTROL_DEFAULT_PORT
  return Math.min(
    REMOTE_CONTROL_MAX_PORT,
    Math.max(REMOTE_CONTROL_MIN_PORT, Math.round(port))
  )
}

/** Client → server */
export type RemoteClientMessage =
  | { type: 'auth'; pin: string }
  | { type: 'dispatch'; action: PayloadAction<unknown> }
  | { type: 'user_command'; command: UserCommand }
  | { type: 'ping' }

/** Server → client */
export type RemoteServerMessage =
  | { type: 'auth_ok' }
  | { type: 'auth_fail'; message: string }
  | { type: 'control_state'; state: CleanReduxState }
  | { type: 'time_state'; state: RealtimeState }
  | { type: 'dmx_connection_update'; payload: DmxConnectionInfo }
  | {
      type: 'midi_connection_update'
      payload: MidiConnections
    }
  | { type: 'dispatch'; action: PayloadAction<unknown> }
  | { type: 'status'; status: RemoteControlRuntimeStatus }
  | { type: 'pong' }

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
  'gui/setLaserToolMidiRequest',
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

const ALLOWED_USER_COMMANDS = new Set<UserCommand['type']>([
  'SetLinkEnabled',
  'IncrementTempo',
  'EnableStartStopSync',
  'SetIsPlaying',
  'SetBPM',
  'TapTempo',
])

export function isRemoteDispatchAllowed(action: unknown): boolean {
  if (!action || typeof action !== 'object') return false
  const type = (action as { type?: unknown }).type
  if (typeof type !== 'string' || type.length <= 0) return false
  if (type.startsWith('@@')) return false
  if (LOCAL_ONLY_ACTION_TYPES.has(type)) return false
  if (type.startsWith('laser/')) return false
  if (type.startsWith('dmx/')) return false
  if (type.startsWith('scenes/')) return true
  if (SHARED_GUI_ACTION_TYPES.has(type)) return true
  if (SHARED_MIXER_ACTION_TYPES.has(type)) return true
  return false
}

export function isRemoteUserCommandAllowed(
  command: UserCommand | null | undefined
): command is UserCommand {
  if (!command || typeof command !== 'object') return false
  const t = (command as { type?: unknown }).type
  return typeof t === 'string' && ALLOWED_USER_COMMANDS.has(t as UserCommand['type'])
}

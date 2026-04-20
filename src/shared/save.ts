import { LightScenes_t, VisualScenes_t } from 'shared/Scenes'
import { DmxState } from 'renderer/redux/dmxSlice'
import { DeviceState } from 'renderer/redux/deviceState'
import { MixerState } from 'renderer/redux/mixerSlice'
import type { Page } from './pages'
import type { VisualizerStreamingSettings } from './visualizerStreaming'

export interface ProfileGuiState {
  activePage?: Page
  blackout?: boolean
  ledEnabled?: boolean
  videoEnabled?: boolean
  fixturePlacementDepthEnabled?: boolean
  ledSidebarEnabled?: boolean
}

export interface SaveState {
  light?: LightScenes_t
  visual?: VisualScenes_t
  visualizerStreaming?: VisualizerStreamingSettings
  dmx?: DmxState
  device?: DeviceState
  gui?: ProfileGuiState
  mixer?: MixerState
}
export type SaveType = keyof SaveState
export type SaveConfig = { [key in SaveType]: boolean }
export const saveTypes: SaveType[] = [
  'dmx',
  'light',
  'visual',
  'visualizerStreaming',
  'device',
  'gui',
  'mixer',
]
export interface SaveInfo {
  state: SaveState
  config: SaveConfig
}

export const PROJECT_SAVE_SCHEMA = 'captivate.project'
export const PROJECT_SAVE_VERSION = 3

export interface VersionedProjectSave {
  schema: string
  version: number
  savedAt: number
  state: SaveState
}

export interface ParsedProjectSave {
  compatible: boolean
  save: SaveState | null
  reason: string | null
}

export function displaySaveType(saveType: SaveType) {
  switch (saveType) {
    case 'device':
      return 'Serial Device Settings (Midi & DMX)'
    case 'dmx':
      return 'DMX Settings'
    case 'light':
      return 'Light Scenes'
    case 'visual':
      return 'Visual Scenes'
    case 'visualizerStreaming':
      return 'Visualizer Streaming Defaults (FFmpeg / NDI Runtime)'
    case 'gui':
      return 'App UI Settings'
    case 'mixer':
      return 'DMX Mixer State'
  }
}

export function getSaveConfig(save: SaveState): SaveConfig {
  let config: Partial<SaveConfig> = {}
  for (const saveType of saveTypes) {
    config[saveType] = save[saveType] !== undefined
  }
  return config as SaveConfig
}

export function createVersionedProjectSave(state: SaveState): VersionedProjectSave {
  return {
    schema: PROJECT_SAVE_SCHEMA,
    version: PROJECT_SAVE_VERSION,
    savedAt: Date.now(),
    state,
  }
}

export function parseVersionedProjectSave(raw: unknown): ParsedProjectSave {
  if (raw === null || typeof raw !== 'object') {
    return {
      compatible: false,
      save: null,
      reason: 'Save file is not a valid object.',
    }
  }

  const source = raw as {
    schema?: unknown
    version?: unknown
    state?: unknown
  }

  if (
    typeof source.schema !== 'string' ||
    !Number.isFinite(Number(source.version))
  ) {
    return {
      compatible: false,
      save: null,
      reason:
        'Legacy save format detected. This version requires a new project start.',
    }
  }

  if (source.schema !== PROJECT_SAVE_SCHEMA) {
    return {
      compatible: false,
      save: null,
      reason: `Unsupported save schema "${source.schema}".`,
    }
  }

  if (Number(source.version) !== PROJECT_SAVE_VERSION) {
    return {
      compatible: false,
      save: null,
      reason: `Unsupported save version ${Number(source.version)} (expected ${PROJECT_SAVE_VERSION}).`,
    }
  }

  if (source.state === null || typeof source.state !== 'object') {
    return {
      compatible: false,
      save: null,
      reason: 'Save payload is missing state data.',
    }
  }

  return {
    compatible: true,
    save: source.state as SaveState,
    reason: null,
  }
}

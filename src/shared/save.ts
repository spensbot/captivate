import { LightScenes_t, VisualScenes_t } from 'shared/Scenes'
import { DmxState } from 'renderer/redux/dmxSlice'
import { DeviceState } from 'renderer/redux/deviceState'
import { MixerState } from 'renderer/redux/mixerSlice'
import type { Page } from './pages'
import type { VisualizerStreamingSettings } from './visualizerStreaming'
import { migrateLegacyFixturePersistedJson } from './dmxFixtures'
import type { LaserProjectState } from '../renderer/laser/laserProjectState'
import { migrateLaserProjectState } from '../renderer/laser/laserProjectState'

export interface ProfileGuiState {
  activePage?: Page
  blackout?: boolean
  ledEnabled?: boolean
  videoEnabled?: boolean
  fxtrDepthOn?: boolean
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
  laser?: LaserProjectState
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
  'laser',
]
export interface SaveInfo {
  state: SaveState
  config: SaveConfig
  /** Source `.cap` / legacy `.captivate` path when loading from disk. */
  filePath?: string
}

export const PROJECT_SAVE_SCHEMA = 'captivate.project'
export const PROJECT_SAVE_VERSION = 7
const MIN_SUPPORTED_PROJECT_SAVE_VERSION = 5

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
  /** Non-fatal transforms applied while parsing (for verbose persistence logs). */
  normalization?: string[]
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
    case 'laser':
      return 'Laser Engine (fixtures, zones, scenes)'
  }
}

/** Unwrap redux-undo `{ past, present, future }` blobs written by mistake. */
export function unwrapPersistedSlice<T>(value: unknown): T | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'object') {
    return undefined
  }
  const source = value as { present?: unknown }
  if (source.present !== undefined && source.present !== null) {
    return source.present as T
  }
  return value as T
}

/** Flatten mistaken `CleanReduxState`-shaped payloads into `SaveState`. */
function normalizeSaveStatePayload(raw: unknown): {
  state: SaveState
  normalization: string[]
} {
  const normalization: string[] = []
  const state = JSON.parse(JSON.stringify(raw)) as SaveState & {
    control?: {
      light?: LightScenes_t
      visual?: VisualScenes_t
      device?: DeviceState
    }
  }

  if (state.control !== undefined) {
    normalization.push('flatten_nested_control')
    if (state.light === undefined && state.control.light !== undefined) {
      state.light = state.control.light
      normalization.push('promote_control_light')
    }
    if (state.visual === undefined && state.control.visual !== undefined) {
      state.visual = state.control.visual
      normalization.push('promote_control_visual')
    }
    if (state.device === undefined && state.control.device !== undefined) {
      state.device = state.control.device
      normalization.push('promote_control_device')
    }
    delete (state as { control?: unknown }).control
  }

  const dmxRaw = state.dmx
  const dmx = unwrapPersistedSlice<DmxState>(dmxRaw)
  if (dmx !== undefined) {
    if (
      dmxRaw !== undefined &&
      typeof dmxRaw === 'object' &&
      dmxRaw !== null &&
      'present' in (dmxRaw as object)
    ) {
      normalization.push('unwrap_dmx_present')
    }
    state.dmx = dmx
  }

  const lightRaw = state.light
  const light = unwrapPersistedSlice<LightScenes_t>(lightRaw)
  if (light !== undefined) {
    if (
      lightRaw !== undefined &&
      typeof lightRaw === 'object' &&
      lightRaw !== null &&
      'present' in (lightRaw as object)
    ) {
      normalization.push('unwrap_light_present')
    }
    state.light = light
  }

  const visualRaw = state.visual
  const visual = unwrapPersistedSlice<VisualScenes_t>(visualRaw)
  if (visual !== undefined) {
    if (
      visualRaw !== undefined &&
      typeof visualRaw === 'object' &&
      visualRaw !== null &&
      'present' in (visualRaw as object)
    ) {
      normalization.push('unwrap_visual_present')
    }
    state.visual = visual
  }

  return { state, normalization }
}

export function summarizeProjectSave(state: SaveState): {
  lightScenes: number
  universeFixtures: number
  fixtureTypes: number
} {
  return {
    lightScenes: state.light?.ids?.length ?? 0,
    universeFixtures: state.dmx?.universe?.length ?? 0,
    fixtureTypes: state.dmx?.fixtureTypes?.length ?? 0,
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

  const version = Number(source.version)
  if (
    version < MIN_SUPPORTED_PROJECT_SAVE_VERSION ||
    version > PROJECT_SAVE_VERSION
  ) {
    return {
      compatible: false,
      save: null,
      reason: `Unsupported save version ${version} (expected ${MIN_SUPPORTED_PROJECT_SAVE_VERSION}–${PROJECT_SAVE_VERSION}).`,
    }
  }

  if (source.state === null || typeof source.state !== 'object') {
    return {
      compatible: false,
      save: null,
      reason: 'Save payload is missing state data.',
    }
  }

  const { state, normalization } = normalizeSaveStatePayload(source.state)
  if (state.dmx) {
    state.dmx = JSON.parse(
      migrateLegacyFixturePersistedJson(JSON.stringify(state.dmx))
    ) as DmxState
    normalization.push('migrate_legacy_dmx')
  }
  if (state.laser !== undefined) {
    state.laser = migrateLaserProjectState(state.laser)
    normalization.push('migrate_laser')
  }

  return {
    compatible: true,
    save: state,
    reason: null,
    normalization: normalization.length > 0 ? normalization : undefined,
  }
}

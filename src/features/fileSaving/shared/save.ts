import { LightScenes_t, VisualScenes_t } from 'features/scenes/shared/Scenes'
import { DmxState } from 'features/fixtures/redux/fixturesSlice'
import { DeviceState } from 'features/midi/redux'
import {
  fixLightScenes,
  fixVisualScenes,
  fixDmxState,
  fixDeviceState,
} from '../../shared/redux/fixState'

export interface SaveState {
  light?: LightScenes_t
  visual?: VisualScenes_t
  dmx?: DmxState
  device?: DeviceState
}
export type SaveType = keyof SaveState
export type SaveConfig = { [key in SaveType]: boolean }
export const saveTypes: SaveType[] = ['dmx', 'light', 'visual', 'device']
export interface SaveInfo {
  state: SaveState
  config: SaveConfig
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
  }
}

export function fixSaveState(state: SaveState) {
  state.light && fixLightScenes(state.light)
  state.visual && fixVisualScenes(state.visual)
  state.dmx && fixDmxState(state.dmx)
  state.device && fixDeviceState(state.device)

  return state
}

export function getSaveConfig(save: SaveState): SaveConfig {
  let config: Partial<SaveConfig> = {}
  for (const saveType of saveTypes) {
    config[saveType] = save[saveType] !== undefined
  }
  return config as SaveConfig
}

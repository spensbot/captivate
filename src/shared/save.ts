import { LightScenes_t, VisualScenes_t } from 'shared/Scenes'
import { DmxState } from 'renderer/redux/dmxSlice'
import { DeviceState } from 'renderer/redux/deviceState'

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

export function fixState(_state: SaveState) {}

export function getSaveConfig(save: SaveState): SaveConfig {
  let config: Partial<SaveConfig> = {}
  for (const saveType of saveTypes) {
    config[saveType] = save[saveType] !== undefined
  }
  return config as SaveConfig
}

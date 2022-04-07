type SaveState = {
  light?: LightScenes_t
  visual?: VisualScenes_t
  dmx?: DmxState
  device?: DeviceState
}
type SaveType = keyof SaveState
type SaveConfig = { [key in SaveType]: boolean }
const saveTypes: SaveType[] = ['dmx', 'light', 'visual', 'device']
function display(saveType: SaveType) {
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

function fixState(_state: SaveState) {}

function getConfig(save: SaveState): SaveConfig {
  let config: Partial<SaveConfig> = {}
  for (const saveType of saveTypes) {
    config[saveType] = save[saveType] !== undefined
  }
  return config as SaveConfig
}

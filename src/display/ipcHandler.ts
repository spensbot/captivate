import ipc_channels from './ipcChannels'
import { VisualizerState } from '../renderer/visualizer/VisualizerManager'

interface Config {
  onNewVisualizerState: (visualizerState: VisualizerState) => void
}

let _config: Config

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer = window.electron.ipcRenderer

export function ipcSetup(config: Config) {
  _config = config

  ipcRenderer.on(
    ipc_channels.new_visualizer_state,
    (payload: VisualizerState) => _config.onNewVisualizerState(payload)
  )
}

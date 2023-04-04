import ipc_channels from './ipcChannels'
import { VisualizerResource } from '../features/visualizer/threejs/VisualizerManager'

interface Config {
  onNewVisualizerResource: (visualizerState: VisualizerResource) => void
}

let _config: Config

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer = window.electron.ipcRenderer

export function ipcSetup(config: Config) {
  _config = config

  ipcRenderer.on(
    ipc_channels.new_visualizer_state,
    (payload: VisualizerResource) => _config.onNewVisualizerResource(payload)
  )
}

import { IpcRenderer } from 'electron'
import { createMutations } from './core/ipcMutations'
import { API } from 'features/shared/engine/emissions'

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer: IpcRenderer = window.electron.ipcRenderer

export const mutations = createMutations<API['renderer']['mutations']>(
  ipcRenderer,
  {
    new_control_state: true,
    open_visualizer: true,
    user_command: true,
  }
)

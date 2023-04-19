import { IpcRenderer } from 'electron'
import { createQueries } from './core/ipcMutations'
import { API } from 'features/shared/engine/emissions'

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer: IpcRenderer = window.electron.ipcRenderer

export const queries = createQueries<API['renderer']['queries']>(ipcRenderer, {
  get_local_filepaths: true,
  load_file: true,
  save_file: true,
})

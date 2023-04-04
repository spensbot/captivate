import ipc_channels from '../../features/shared/engine/ipc_channels'
import { IpcRenderer } from 'electron'

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer: IpcRenderer = window.electron.ipcRenderer

export async function getLocalFilepaths(
  title: string,
  fileFilters: Electron.FileFilter[]
): Promise<string[]> {
  return ipcRenderer.invoke(
    ipc_channels.get_local_filepaths,
    title,
    fileFilters
  )
}

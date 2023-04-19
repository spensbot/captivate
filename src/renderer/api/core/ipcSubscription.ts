import { IpcRenderer } from 'electron'
import ipc_channels from '../../../features/shared/engine/ipc_channels'

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer: IpcRenderer = window.electron.ipcRenderer

// TODO: not sure why we do this
let _subscribers: any

export const subscribeIpc = <
  _Emissions extends Partial<{
    [k in typeof ipc_channels[keyof typeof ipc_channels]]: [...any]
  }>
>(subscribers: {
  [k in keyof _Emissions]: (
    ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
  ) => void
}) => {
  _subscribers = subscribers
  for (const [key, callback] of Object.entries(
    _subscribers as typeof subscribers
  )) {
    ipcRenderer.on(key, (payload) => callback(payload))
  }
}

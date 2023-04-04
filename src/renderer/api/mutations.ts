import ipc_channels, {
  UserCommand,
} from '../../features/shared/engine/ipc_channels'
import { IpcRenderer } from 'electron'
import { CleanReduxState } from '../redux/store'

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer: IpcRenderer = window.electron.ipcRenderer

export function send_control_state(cleanState: CleanReduxState) {
  ipcRenderer.send(ipc_channels.new_control_state, cleanState)
}
export function send_user_command(command: UserCommand) {
  ipcRenderer.send(ipc_channels.user_command, command)
}
export function send_open_visualizer() {
  ipcRenderer.send(ipc_channels.open_visualizer)
}

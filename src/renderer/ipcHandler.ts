// import { ipcRenderer } from 'electron'
// const { ipcRenderer } = require('electron')
// const electron = window.require('electron')
// const ipcRenderer = electron.ipcRenderer
import ipc_channels, { UserCommand } from '../engine/ipc_channels'
import { CleanReduxState } from './redux/store'
import { RealtimeState } from './redux/realtimeStore'
import * as dmxConnection from '../main/engine/dmxConnection'
import * as midiConnection from '../main/engine/midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'

interface Config {
  on_dmx_connection_update: (payload: dmxConnection.UpdatePayload) => void
  on_midi_connection_update: (payload: midiConnection.UpdatePayload) => void
  on_time_state: (time_state: RealtimeState) => void
  on_dispatch: (action: PayloadAction) => void
}

let _config: Config

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer = window.electron.ipcRenderer

export function ipc_setup(config: Config) {
  _config = config

  ipcRenderer.on(
    ipc_channels.dmx_connection_update,
    (payload: dmxConnection.UpdatePayload) =>
      _config.on_dmx_connection_update(payload)
  )

  ipcRenderer.on(
    ipc_channels.midi_connection_update,
    (payload: midiConnection.UpdatePayload) =>
      _config.on_midi_connection_update(payload)
  )

  ipcRenderer.on(ipc_channels.new_time_state, (realtimeState: RealtimeState) =>
    _config.on_time_state(realtimeState)
  )

  ipcRenderer.on(ipc_channels.dispatch, (action: PayloadAction<any>) =>
    _config.on_dispatch(action)
  )

  return {
    send_control_state: (cleanState: CleanReduxState) => {
      ipcRenderer.send(ipc_channels.new_control_state, cleanState)
    },
    send_user_command: (command: UserCommand) => {
      ipcRenderer.send(ipc_channels.user_command, command)
    },
  }
}

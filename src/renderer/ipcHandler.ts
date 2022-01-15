// import { ipcRenderer } from 'electron'
// const { ipcRenderer } = require('electron')
// const electron = window.require('electron')
// const ipcRenderer = electron.ipcRenderer
import ipc_channels from '../engine/ipc_channels'
import { ReduxState } from './redux/store'
import { RealtimeState } from './redux/realtimeStore'
import * as dmxConnection from '../main/engine/dmxConnection'
import * as midiConnection from '../main/engine/midiConnection'

interface Config {
  on_dmx_connection_update: (payload: dmxConnection.UpdatePayload) => void
  on_midi_connection_update: (payload: midiConnection.UpdatePayload) => void
  on_midi_message: (message: midiConnection.MessagePayload) => void
  on_time_state: (time_state: RealtimeState) => void
}

let _config: Config

export function ipc_setup(config: Config) {
  _config = config

  window.electron.ipcRenderer.on(
    ipc_channels.dmx_connection_update,
    (payload: dmxConnection.UpdatePayload) =>
      _config.on_dmx_connection_update(payload)
  )

  window.electron.ipcRenderer.on(
    ipc_channels.midi_connection_update,
    (payload: midiConnection.UpdatePayload) =>
      _config.on_midi_connection_update(payload)
  )

  window.electron.ipcRenderer.on(
    ipc_channels.new_midi_message,
    (message: midiConnection.MessagePayload) => _config.on_midi_message(message)
  )

  window.electron.ipcRenderer.on(
    ipc_channels.new_time_state,
    (realtimeState: RealtimeState) => _config.on_time_state(realtimeState)
  )

  return {
    send_control_state: (state: ReduxState) => {
      window.electron.ipcRenderer.send(ipc_channels.new_control_state, state)
    },
  }
}

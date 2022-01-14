import { ipcRenderer } from 'electron'
import ipc_channels from '../engine/ipc_channels'
import { ReduxState } from './redux/store'
import * as dmxConnection from '../main/engine/dmxConnection'
import * as midiConnection from '../main/engine/midiConnection'
import { TimeState } from '../engine/TimeState'

interface Config {
  on_dmx_connection_update: (payload: dmxConnection.UpdatePayload) => void
  on_midi_connection_update: (payload: midiConnection.UpdatePayload) => void
  on_midi_message: (message: midiConnection.MessagePayload) => void
  on_time_state: (time_state: TimeState) => void
}

let _config: Config

export function ipc_setup(config: Config) {
  _config = config

  ipcRenderer.on(
    ipc_channels.dmx_connection_update,
    (e, payload: dmxConnection.UpdatePayload) =>
      _config.on_dmx_connection_update(payload)
  )

  ipcRenderer.on(
    ipc_channels.midi_connection_update,
    (e, payload: midiConnection.UpdatePayload) =>
      _config.on_midi_connection_update(payload)
  )

  ipcRenderer.on(
    ipc_channels.new_midi_message,
    (e, message: midiConnection.MessagePayload) =>
      _config.on_midi_message(message)
  )

  ipcRenderer.on(ipc_channels.new_time_state, (e, time_state: TimeState) =>
    _config.on_time_state(time_state)
  )
}

export function send_control_state(state: ReduxState) {
  ipcRenderer.send(ipc_channels.new_control_state, state)
}

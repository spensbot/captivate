import { ipcMain, WebContents } from 'electron'
import ipcChannels, { UserCommand } from '../../engine/ipc_channels'
import { ReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import * as dmxConnection from './dmxConnection'
import * as midiConnection from './midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'

interface Config {
  renderer: WebContents
  on_new_control_state: (new_state: ReduxState) => void
  on_user_command: (command: UserCommand) => void
}

let _config: Config

export function ipcSetup(config: Config) {
  _config = config

  ipcMain.on(ipcChannels.new_control_state, (_e, new_state: ReduxState) =>
    _config.on_new_control_state(new_state)
  )

  ipcMain.on(ipcChannels.user_command, (_e, command: UserCommand) => {
    _config.on_user_command(command)
  })

  return {
    send_dmx_connection_update: (payload: dmxConnection.UpdatePayload) =>
      _config.renderer.send(ipcChannels.dmx_connection_update, payload),
    send_midi_connection_update: (payload: midiConnection.UpdatePayload) =>
      _config.renderer.send(ipcChannels.midi_connection_update, payload),
    send_time_state: (time_state: RealtimeState) =>
      _config.renderer.send(ipcChannels.new_time_state, time_state),
    send_dispatch: (action: PayloadAction<any>) =>
      _config.renderer.send(ipcChannels.dispatch, action),
  }
}

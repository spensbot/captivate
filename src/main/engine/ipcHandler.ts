import { ipcMain, WebContents } from 'electron'
import ipcChannels, {
  UserCommand,
  MainCommand,
} from '../../features/shared/engine/ipc_channels'
import ipcChannelsVisualizer from '../../visualizer/ipcChannels'
import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import * as dmxConnection from 'features/dmx/engine/dmxConnection'
import * as midiConnection from 'features/midi/engine/midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'
import { VisualizerResource } from '../../features/visualizer/threejs/VisualizerManager'
import { VisualizerContainer } from '../../features/visualizer/engine/createVisualizerWindow'
import * as fileApi from 'features/fileSaving/engine/api'
interface Config {
  renderer: WebContents
  visualizerContainer: VisualizerContainer
  on_new_control_state: (new_state: CleanReduxState) => void
  on_user_command: (command: UserCommand) => void
  on_open_visualizer: () => void
}

let _config: Config

export function ipcSetup(config: Config) {
  _config = config

  ipcMain.on(ipcChannels.new_control_state, (_e, new_state: CleanReduxState) =>
    _config.on_new_control_state(new_state)
  )

  ipcMain.on(ipcChannels.user_command, (_e, command: UserCommand) => {
    _config.on_user_command(command)
  })

  ipcMain.on(ipcChannels.open_visualizer, (_e) => {
    _config.on_open_visualizer()
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
    send_visualizer_state: (payload: VisualizerResource) => {
      const visualizer = _config.visualizerContainer.visualizer
      if (visualizer) {
        visualizer.webContents.send(
          ipcChannelsVisualizer.new_visualizer_state,
          payload
        )
      }
    },
    send_main_command: (command: MainCommand) => {
      _config.renderer.send(ipcChannels.main_command, command)
    },
  }
}

export type IPC_Callbacks = ReturnType<typeof ipcSetup>

const handlers = [fileApi.load, fileApi.save, fileApi.getFilePaths]

handlers.forEach((handler) => {
  ipcMain.handle(handler.channel, handler.resolve)
})

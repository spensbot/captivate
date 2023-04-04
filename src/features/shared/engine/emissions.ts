import type {
  MainCommand,
  UserCommand,
} from 'features/shared/engine/ipc_channels'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RealtimeState } from 'renderer/redux/realtimeStore'
import type * as dmxConnection from 'features/dmx/engine/dmxConnection'
import type * as midiConnection from 'features/midi/engine/midiConnection'
import { CleanReduxState } from 'renderer/redux/store'
import { VisualizerResource } from 'features/visualizer/threejs/VisualizerManager'

export type API = {
  renderer: {
    subscriptions: {
      main_command: [command: MainCommand]
      dispatch: [action: PayloadAction<any>]
      new_time_state: [realtimeState: RealtimeState]
      midi_connection_update: [payload: midiConnection.UpdatePayload]
      dmx_connection_update: [payload: dmxConnection.UpdatePayload]
    }
    mutations: {
      new_control_state: [new_state: CleanReduxState]
      user_command: [command: UserCommand]
      open_visualizer: []
    }
    queries: {
      get_local_filepaths: [title: string, fileFilters: Electron.FileFilter[]]
      load_file: [title: string, fileFilters: Electron.FileFilter[]]
      save_file: [
        title: string,
        data: string,
        fileFilters: Electron.FileFilter[]
      ]
    }
  }

  visualizer: {
    subscriptions: {
      new_visualizer_state: [payload: VisualizerResource]
    }
  }
}

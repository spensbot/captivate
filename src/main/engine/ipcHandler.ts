import { ipcMain, WebContents, dialog } from 'electron'
import ipcChannels, {
  UserCommand,
  MainCommand,
} from '../../shared/ipc_channels'
import ipcChannelsVisualizer from '../../visualizer/ipcChannels'
import { CleanReduxState } from '../../renderer/redux/store'
import { RealtimeState } from '../../renderer/redux/realtimeStore'
import * as midiConnection from './midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'
import { promises } from 'fs'
import { VisualizerResource } from '../../visualizer/threejs/VisualizerManager'
import { VisualizerContainer } from './createVisualizerWindow'
import { DmxConnectionInfo } from 'shared/connection'
import type { Page } from '../../shared/pages'

interface Config {
  renderers: Set<WebContents>
  visualizerContainer: VisualizerContainer
  on_new_control_state: (
    new_state: CleanReduxState,
    sender: WebContents
  ) => void
  on_user_command: (command: UserCommand) => void
  on_open_visualizer: () => void
  on_open_page_window: (page: Page) => void
}

let _config: Config

function addRenderer(sender: WebContents) {
  _config.renderers.add(sender)
  sender.once('destroyed', () => {
    _config.renderers.delete(sender)
  })
}

function broadcast(channel: string, payload: any) {
  _config.renderers.forEach((renderer) => {
    if (!renderer.isDestroyed()) {
      renderer.send(channel, payload)
    }
  })
}

function broadcastExcept(channel: string, payload: any, sender: WebContents) {
  _config.renderers.forEach((renderer) => {
    if (!renderer.isDestroyed() && renderer.id !== sender.id) {
      renderer.send(channel, payload)
    }
  })
}

export function ipcSetup(config: Config) {
  _config = config

  ipcMain.on(
    ipcChannels.new_control_state,
    (e, new_state: CleanReduxState) => {
      addRenderer(e.sender)
      _config.on_new_control_state(new_state, e.sender)
      broadcastExcept(ipcChannels.new_control_state, new_state, e.sender)
    }
  )

  ipcMain.on(ipcChannels.user_command, (_e, command: UserCommand) => {
    _config.on_user_command(command)
  })

  ipcMain.on(ipcChannels.open_visualizer, (_e) => {
    _config.on_open_visualizer()
  })

  ipcMain.on(ipcChannels.open_page_window, (_e, page: Page) => {
    _config.on_open_page_window(page)
  })

  return {
    register_renderer: (renderer: WebContents) => {
      addRenderer(renderer)
    },
    send_dmx_connection_update: (payload: DmxConnectionInfo) =>
      broadcast(ipcChannels.dmx_connection_update, payload),
    send_midi_connection_update: (payload: midiConnection.UpdatePayload) =>
      broadcast(ipcChannels.midi_connection_update, payload),
    send_time_state: (time_state: RealtimeState) =>
      broadcast(ipcChannels.new_time_state, time_state),
    send_dispatch: (action: PayloadAction<any>) =>
      broadcast(ipcChannels.dispatch, action),
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
      broadcast(ipcChannels.main_command, command)
    },
  }
}

export type IPC_Callbacks = ReturnType<typeof ipcSetup>

ipcMain.handle(
  ipcChannels.load_file,
  async (_event, title: string, fileFilters: Electron.FileFilter[]) => {
    const dialogResult = await dialog.showOpenDialog({
      title: title,
      filters: fileFilters,
      properties: ['openFile'],
    })
    if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
      return await promises.readFile(dialogResult.filePaths[0], 'utf8')
    } else {
      throw new Error('User cancelled the file load')
    }
  }
)

ipcMain.handle(
  ipcChannels.save_file,
  async (
    _event,
    title: string,
    data: string,
    fileFilters: Electron.FileFilter[]
  ) => {
    const dialogResult = await dialog.showSaveDialog({
      title: title,
      filters: fileFilters,
      properties: ['createDirectory'],
    })
    if (!dialogResult.canceled && dialogResult.filePath !== undefined) {
      return await promises.writeFile(dialogResult.filePath, data)
    } else {
      throw new Error('User cancelled the file save')
    }
  }
)

ipcMain.handle(
  ipcChannels.get_local_filepaths,
  async (_event, title: string, fileFilters: Electron.FileFilter[]) => {
    const dialogResult = await dialog.showOpenDialog({
      title: title,
      filters: fileFilters,
      properties: ['openFile', 'multiSelections'],
    })
    if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
      return dialogResult.filePaths
    } else {
      throw new Error('User cancelled the file load')
    }
  }
)



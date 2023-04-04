import { IpcMain, WebContents } from 'electron'
import { VisualizerContainer } from 'features/visualizer/engine/createVisualizerWindow'
import { RealtimeState } from 'renderer/redux/realtimeStore'
import ipc_channels from '../../../features/shared/engine/ipc_channels'
import visualizerChannels from '../../../features/visualizer/shared/ipcChannels'

export type Context = {
  renderer: WebContents
  visualizerContainer: VisualizerContainer
  realtimeState: RealtimeState
  ipcMain: IpcMain
  new_control_state: (new_state: CleanReduxState) => void
}



export const createRendererPublishers = <
  _Emissions extends Partial<{
    [k in typeof ipc_channels[keyof typeof ipc_channels]]: [...any]
  }>
>(
  renderer: Electron.WebContents,
  config: { [k in keyof _Emissions]: true }
): {
  [k in keyof _Emissions]: (
    ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
  ) => void
} => {
  return (Object.keys(config) as (keyof _Emissions)[]).reduce(
    (previous, key) => {
      previous[key] = (...args) => renderer.send(key as string, ...args)
      return previous
    },
    {} as {
      [k in keyof _Emissions]: (
        ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
      ) => void
    }
  )
}

export const createVisualizerPublishers = <
  _Emissions extends Partial<{
    [k in typeof visualizerChannels[keyof typeof visualizerChannels]]: [...any]
  }>
>(
  visualizerContainer: VisualizerContainer,
  config: { [k in keyof _Emissions]: true }
): {
  [k in keyof _Emissions]: (
    ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
  ) => void
} => {
  return (Object.keys(config) as (keyof _Emissions)[]).reduce(
    (previous, key) => {
      previous[key] = (...args) => {
        const visualizer = visualizerContainer.visualizer
        if (visualizer) {
          visualizer.webContents.send(
            key as string,
            ...args
          )
        }
      }
      return previous
    },
    {} as {
      [k in keyof _Emissions]: (
        ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
      ) => void
    }
  )
}

import { IpcMainInvokeEvent } from 'electron'
import { API } from 'features/shared/engine/emissions'
import { CleanReduxState } from 'renderer/redux/store'

export const createQuery = <
  Channel extends keyof API['renderer']['queries']
>(config: {
  channel: Channel
  resolve: (
    context: Context,
    ...args: API['renderer']['queries'][Channel]
  ) => Promise<void> | any
}) => {
  return {
    channel: config.channel,
    resolve: (_event: IpcMainInvokeEvent, context: Context, ...args: any[]) => {
      return config.resolve(context, ...(args as any))
    },
  }
}

export const createMutation = <
  Channel extends keyof API['renderer']['mutations']
>(config: {
  channel: Channel
  resolve: (
    context: Context,
    ...args: API['renderer']['mutations'][Channel]
  ) => Promise<void> | any
}) => {
  return {
    channel: config.channel,
    resolve: (
      _event: Electron.IpcMainEvent,
      context: Context,
      ...args: any[]
    ) => {
      return config.resolve(context, ...(args as any))
    },
  }
}

export const createMutations = (
  handlers: {
    channel: string
    resolve: (
      _event: Electron.IpcMainEvent,
      context: Context,
      ...args: any[]
    ) => any
  }[]
) => {
  return (context: Context) => {
    handlers.forEach((handler) => {
      context.ipcMain.on(handler.channel, (_event, ...args) => {
        handler.resolve(_event, context, ...args)
      })
    })
  }
}

export const createQueries = (
  handlers: {
    channel: string
    resolve: (
      _event: Electron.IpcMainInvokeEvent,
      context: Context,
      ...args: any[]
    ) => any
  }[]
) => {
  return (context: Context) => {
    handlers.forEach((handler) => {
      context.ipcMain.handle(handler.channel, (_event, ...args) => {
        handler.resolve(_event, context, ...args)
      })
    })
  }
}

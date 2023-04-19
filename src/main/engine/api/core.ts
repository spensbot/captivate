import { IpcMain, WebContents } from 'electron'
import { VisualizerContainer } from 'features/visualizer/engine/createVisualizerWindow'
import ipc_channels from '../../../features/shared/engine/ipc_channels'
import visualizerChannels from '../../../features/visualizer/shared/ipcChannels'

export type Context = {
  renderer: WebContents
  visualizerContainer: VisualizerContainer
  realtimeManager: RealtimeManager
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
          visualizer.webContents.send(key as string, ...args)
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
import { RealtimeManager } from 'features/bpm/engine'

export const createQuery = <
  Channel extends keyof API['renderer']['queries']
>(config: {
  channel: Channel
  resolve: (
    context: Context,
    ...args: API['renderer']['queries'][Channel]['input']
  ) =>
    | Promise<API['renderer']['queries'][Channel]['output']>
    | API['renderer']['queries'][Channel]['output']
}) => {
  return {
    [config.channel]: (
      _event: IpcMainInvokeEvent,
      context: Context,
      ...args: any[]
    ) => {
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
    [config.channel]: (
      _event: Electron.IpcMainEvent,
      context: Context,
      ...args: any[]
    ) => {
      return config.resolve(context, ...(args as any))
    },
  }
}

export const createMutations = (handlers: {
  [k: string]: (
    _event: Electron.IpcMainEvent,
    context: Context,
    ...args: any[]
  ) => any
}) => {
  return (context: Context) => {
    const disposeableHandlers = Object.entries(handlers).map(
      ([channel, resolve]) => {
        const handler = (_event: Electron.IpcMainEvent, ...args: any[]) => {
          return resolve(_event, context, ...args)
        }
        context.ipcMain.on(channel, handler)
        return {
          channel,
          handler,
        }
      }
    )
    return {
      dispose: () => {
        disposeableHandlers.forEach(({ channel, handler }) => {
          context.ipcMain.removeListener(channel, handler)
        })
      },
    }
  }
}

export const createQueries = (handlers: {
  [k: string]: (
    _event: Electron.IpcMainInvokeEvent,
    context: Context,
    ...args: any[]
  ) => any
}) => {
  return (context: Context) => {
    const disposeableHandlers = Object.entries(handlers).map(
      ([channel, resolve]) => {
        const handler = (
          _event: Electron.IpcMainInvokeEvent,
          ...args: any[]
        ) => {
          return resolve(_event, context, ...args)
        }

        context.ipcMain.handle(channel, handler)
        return { channel, handler }
      }
    )
    return {
      dispose() {
        disposeableHandlers.forEach(({ channel }) => {
          context.ipcMain.removeHandler(channel)
        })
      },
    }
  }
}

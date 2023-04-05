import ipc_channels from 'features/shared/engine/ipc_channels'

export const createMutations = <
  _Emissions extends Partial<{
    [k in typeof ipc_channels[keyof typeof ipc_channels]]: [...any]
  }>
>(
  ipcRenderer: Electron.IpcRenderer,
  config: { [k in keyof _Emissions]: true }
): {
  [k in keyof _Emissions]: (
    ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
  ) => void
} => {
  return (Object.keys(config) as (keyof _Emissions)[]).reduce(
    (previous, key) => {
      previous[key] = (...args) => ipcRenderer.send(key as string, ...args)
      return previous
    },
    {} as {
      [k in keyof _Emissions]: (
        ...args: _Emissions[k] extends any[] ? _Emissions[k] : []
      ) => void
    }
  )
}

type GetInput<T> = T extends { input: infer U } ? U : []
type GetOutput<T> = T extends { output: infer U } ? U : void

export const createQueries = <
  _Emissions extends Partial<{
    [k: string]: {
      input: [...any]
      output: any
    }
  }>
>(
  ipcRenderer: Electron.IpcRenderer,
  config: { [k in keyof _Emissions]: true }
): {
  [k in keyof _Emissions]: (
    ...args: GetInput<_Emissions[k]>
  ) => Promise<GetOutput<_Emissions[k]>>
} => {
  return (Object.keys(config) as (keyof _Emissions)[]).reduce(
    (previous, key) => {
      previous[key] = (...args) => ipcRenderer.invoke(key as string, ...args)
      return previous
    },
    {} as {
      [k in keyof _Emissions]: (
        ...args: GetInput<_Emissions[k]>
      ) => Promise<GetOutput<_Emissions[k]>>
    }
  )
}

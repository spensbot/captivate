import { IpcMainInvokeEvent } from 'electron'

export const createHandler = (config: {
  channel: string
  resolve: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<void> | any
}) => {
  return config
}

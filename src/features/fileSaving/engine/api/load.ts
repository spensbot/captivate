import { dialog } from 'electron'
import ipcChannels from '../../../shared/engine/ipc_channels'
import { createHandler } from './core'
import fs from 'fs'
export default createHandler({
  channel: ipcChannels.load_file,
  resolve: async (
    _event,
    title: string,
    fileFilters: Electron.FileFilter[]
  ) => {
    const dialogResult = await dialog.showOpenDialog({
      title: title,
      filters: fileFilters,
      properties: ['openFile'],
    })
    if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
      return await fs.promises.readFile(dialogResult.filePaths[0], 'utf8')
    } else {
      throw new Error('User cancelled the file load')
    }
  },
})

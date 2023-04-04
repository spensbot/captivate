import { dialog } from 'electron'
import ipcChannels from '../../../../shared/ipc_channels'
import { createHandler } from './core'
import fs from 'fs'
export default createHandler({
  channel: ipcChannels.save_file,
  resolve: async (
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
      return await fs.promises.writeFile(dialogResult.filePath, data)
    } else {
      throw new Error('User cancelled the file save')
    }
  }
})

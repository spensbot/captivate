import { dialog } from 'electron'
import ipcChannels from '../../../shared/engine/ipc_channels'
import fs from 'fs'
import { createQuery } from 'main/engine/api/core'
export default createQuery({
  channel: ipcChannels.load_file,
  resolve: async (_, title, fileFilters) => {
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

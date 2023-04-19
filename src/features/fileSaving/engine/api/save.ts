import { dialog } from 'electron'
import ipcChannels from '../../../shared/engine/ipc_channels'
import fs from 'fs'
import { createQuery } from 'main/engine/api/core'
export default createQuery({
  channel: ipcChannels.save_file,
  resolve: async (_, title, data, fileFilters) => {
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
  },
})

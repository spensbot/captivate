import { dialog } from 'electron'
import ipcChannels from '../../../shared/engine/ipc_channels'
import { createQuery } from 'main/engine/api/core'
export default createQuery({
  channel: ipcChannels.get_local_filepaths,
  resolve: async (_, title, fileFilters) => {
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
  },
})

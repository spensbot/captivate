const { ipcMain } = require('electron')
const { dialog } = require('electron')
import fs, { promises } from 'fs'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'

const captivateFileFilter: Electron.FileFilter = { name: 'json', extensions: ['.json'] }

ipcMain.handle(LOAD_FILE, async (event, title: string, defaultPath: string | null) => {
  const dialogResult = await dialog.showOpenDialog({
    title: title,
    defaultPath: defaultPath || undefined,
    filters: [captivateFileFilter],
    properties: ['openFile']
  })
  if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
    return await promises.readFile(dialogResult.filePaths[0], 'utf8')
  } else {
    throw new Error('User cancelled the dialog')
  }
})

ipcMain.handle(SAVE_FILE, async (event, title: string, data: string, defaultPath: string | null) => {
  const dialogResult = await dialog.showSaveDialog({
    title: title,
    defaultPath: defaultPath || undefined,
    filters: [captivateFileFilter],
    properties: ['createDirectory']
  })
  if (!dialogResult.canceled && dialogResult.filePath !== undefined) {
    return await promises.writeFile(dialogResult.filePath, data)
  } else {
    throw new Error('User cancelled the dialog')
  }
})


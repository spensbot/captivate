const { ipcMain } = require('electron')
const { dialog } = require('electron')
import fs from 'fs'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'

const captivateFileFilter: Electron.FileFilter = { name: 'json', extensions: ['.json'] }

ipcMain.on(LOAD_FILE, (event, title: string, defaultPath: string) => {
  dialog.showOpenDialog({
    title: title,
    defaultPath: defaultPath,
    filters: [captivateFileFilter],
    properties: ['openFile']
  }).then(res => {
    if (res.canceled || res.filePaths.length < 1) {
      event.reply(LOAD_FILE, 'User cancelled the dialog', null)
    } else {
      fs.readFile(res.filePaths[0], (err, data) => {
        if (err) {
          event.reply(LOAD_FILE, err, null)
        } else {
          event.reply(LOAD_FILE, null, data)
        }
      })
    }
  }).catch(err => {
    event.reply(LOAD_FILE, err, null)
  })
})

ipcMain.on(SAVE_FILE, (event, title: string, defaultPath: string, data: string) => {
  dialog.showSaveDialog({
    title: title,
    defaultPath: defaultPath,
    filters: [captivateFileFilter],
    properties: ['createDirectory']
  }).then(res => {
    if (res.canceled || !res.filePath) {
      event.reply(SAVE_FILE, 'User cancelled the dialog')
    } else {
      fs.writeFile(res.filePath, data, err => {
        if (err) {
          event.reply(SAVE_FILE, err)
        } else {
          event.reply(SAVE_FILE, null)
        }
      })
    }
  }).catch(err => {
    event.reply(SAVE_FILE, err)
  })
})


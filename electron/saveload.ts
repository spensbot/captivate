const { ipcMain } = require('electron')
const { dialog } = require('electron')
const fs = require('fs')

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'

const captivateFileFilter: Electron.FileFilter = { name: 'json', extensions: ['.json'] }

ipcMain.on(LOAD_FILE, (event, title: string, path: string) => {
  dialog.showOpenDialog({
    title: title,
    defaultPath: path,
    filters: [captivateFileFilter],
    properties: ['openFile']
  }).then(res => {
    if (res.canceled || res.filePaths.length < 1) {
      event.reply(LOAD_FILE, 'User cancelled the dialog', null)
    } else {
      event.reply(LOAD_FILE, null, res.filePaths[0])
    }
  }).catch(err => {
    event.reply(LOAD_FILE, err, null)
  })
})

function saveFile(path: string, contents: string) {
  
}

ipcMain.on(SAVE_FILE, (event, title: string, path: string, contents: string) => {
  dialog.showSaveDialog({
    title: title,
    defaultPath: path,
    filters: [captivateFileFilter],
    properties: ['createDirectory']
  }).then(res => {
    if (res.canceled || !res.filePath) {
      event.reply(SAVE_FILE, 'User cancelled the dialog')
    } else {
      event.reply(SAVE_FILE, null)
    }
  }).catch(err => {
    event.reply(SAVE_FILE, err)
  })
})
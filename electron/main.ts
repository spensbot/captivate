import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as url from 'url'
import installExtension, { REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer'

import { ipcMain, dialog } from 'electron'
import fs from 'fs'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'

const captivateFileFilter: Electron.FileFilter = { name: 'json', extensions: ['.json'] }

let mainWindow: Electron.BrowserWindow | null

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

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: '#191622',
    webPreferences: {
      nodeIntegration: true
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4000')
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'renderer/index.html'),
        protocol: 'file:',
        slashes: true
      })
    )
  }

  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.on('test', (event, arg: string) => {
  console.log(arg)
  event.reply('test', arg + arg + " okie!")
})

ipcMain.addListener('test', (args) => {
  console.log(args)
})

ipcMain.handle('test', (event, args) => {
  console.log(args)
})

app.on('ready', createWindow)
  .whenReady()
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      installExtension(REACT_DEVELOPER_TOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err))
      installExtension(REDUX_DEVTOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err))
    }
  })

// This allows serialport to be imported via window.require('serialport')
// A workaround webpack breaking serialport
app.allowRendererProcessReuse = false

import '@babel/polyfill'
import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as url from 'url'
import installExtension, { REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer'
import './saveload' // Registers ipc handlers for save and load functions

let mainWindow: Electron.BrowserWindow | null

const devMode = process.env.NODE_ENV === 'development'

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    backgroundColor: '#191622',
    webPreferences: {
      nodeIntegration: true,
      webSecurity: devMode ? false : true,
      backgroundThrottling: false
    }
  })

  // mainWindow.loadFile('test.html')

  if (devMode) {
    mainWindow.loadURL('http://localhost:4000')
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'renderer/index.html'),
        protocol: 'file:',
        slashes: true
      })
    )
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)
  .whenReady()
  .then(() => {
    // if (devMode) {
    //   installExtension(REACT_DEVELOPER_TOOLS)
    //     .then((name) => console.log(`Added Extension:  ${name}`))
    //     .catch((err) => console.log('An error occurred: ', err))
    //   installExtension(REDUX_DEVTOOLS)
    //     .then((name) => console.log(`Added Extension:  ${name}`))
    //     .catch((err) => console.log('An error occurred: ', err))
    // }
  })

// This allows serialport to be imported via window.require('serialport')
// A workaround webpack breaking serialport
app.allowRendererProcessReuse = false

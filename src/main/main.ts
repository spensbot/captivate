/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path'
import { app, BrowserWindow, shell, dialog } from 'electron'
import MenuBuilder from './menu'
import { resolveHtmlPath } from './util'
import * as engine from './engine/engine'
import { VisualizerContainer } from './engine/createVisualizerWindow'
import { Page } from '../shared/pages'
import './prevent_sleep'

// Monkey-patch showErrorBox to avoid error modals at runtime
// See https://stackoverflow.com/questions/35620764/how-to-disable-alert-dialogs-when-errors-occur-in-atom-electron
dialog.showErrorBox = (title: string, content: string) => {
  console.error(`Top-level error: ${title}\n${content}`)
}

let mainWindow: BrowserWindow | null = null
const detachedWindows = new Set<BrowserWindow>()
let isClosing = false
let visualizerContainer: VisualizerContainer = {
  visualizer: null,
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

if (isDevelopment) {
  require('electron-debug')({ showDevTools: false })
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  // These add all sorts of weird console warnings. So turn them on when needed I guess
  const extensions: string[] = [] // ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log)
}

function createAppWindow({
  isMain,
  defaultPage,
}: {
  isMain: boolean
  defaultPage?: Page
}) {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths)
  }

  const window = new BrowserWindow({
    show: false,
    width: 1300,
    height: 900,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // These are disabled to allow Captivate to display local media
      // This should be safe since Captivate doesn't run anything remote
      webSecurity: false,
      nodeIntegration: false,
    },
  })

  const baseUrl = resolveHtmlPath('index.html')
  const pageQuery = defaultPage
    ? `${baseUrl.includes('?') ? '&' : '?'}page=${encodeURIComponent(defaultPage)}`
    : ''
  window.loadURL(`${baseUrl}${pageQuery}`)

  window.on('ready-to-show', () => {
    if (process.env.START_MINIMIZED) {
      window.minimize()
    } else {
      window.show()
    }
  })

  window.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    shell.openExternal(url)
  })

  if (!isMain) {
    detachedWindows.add(window)
    window.on('closed', () => {
      detachedWindows.delete(window)
    })
  }

  engine.getIpcCallbacks()?.register_renderer(window.webContents)

  if (isMain) {
    window.on('close', (e) => {
      if (!isClosing) {
        e.preventDefault()

        dialog
          .showMessageBox(window, {
            message: 'Stop the show?',
            buttons: ['Nevermind', 'Quit'],
            cancelId: 0,
            defaultId: 1,
          })
          .then(({ response }) => {
            if (response === 1) {
              isClosing = true
              window.close()
              engine.stop()
              mainWindow = null
              app.quit()
            }
          })
          .catch((err) => {
            console.error(`showMessageBox err: `, err)
          })
      }
    })
  }

  return window
}

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions()
  }

  mainWindow = createAppWindow({ isMain: true })

  const ipcCallbacks = engine.start(
    mainWindow.webContents,
    visualizerContainer,
    (page) => {
      createAppWindow({ isMain: false, defaultPage: page })
    }
  )

  const menuBuilder = new MenuBuilder(mainWindow, { ipcCallbacks })
  menuBuilder.buildMenu()

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line

  // Uncomment this next line if we ever want auto-updates again.
  // new AppUpdater()
}

/**
 * Add event listeners...
 */
// We instead quit the app when mainWindow is closed
// app.on('window-all-closed', () => {
//   // Respect the OSX convention of having the application in memory even
//   // after all windows have been closed
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

app
  .whenReady()
  .then(() => {
    createWindow()
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows `open`.
      if (mainWindow === null) createWindow()
    })
  })
  .catch(console.log)


import path from 'path'
import { app, BrowserWindow } from 'electron'
import { resolveHtmlPath } from './util'

export interface VisualizerContainer {
  visualizer: BrowserWindow | null
}

export default async (visualizerContainer: VisualizerContainer) => {
  if (visualizerContainer.visualizer) {
    console.warn('Tried to open a visualizer twice')
    return
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths)
  }

  visualizerContainer.visualizer = new BrowserWindow({
    show: false,
    width: 1300,
    height: 900,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'visualizer_preload.js'),
      webSecurity: false,
      nodeIntegration: false,
      devTools: false,
    },
  })

  visualizerContainer.visualizer.loadURL(resolveHtmlPath('index.html'))
  // visualizerContainer.visualizer.loadURL(`data:text/html;charset=utf-8,${html}`)

  visualizerContainer.visualizer.on('ready-to-show', () => {
    if (!visualizerContainer.visualizer) {
      throw new Error('"visualizer" is not defined')
    }
    visualizerContainer.visualizer.show()
  })

  visualizerContainer.visualizer.on('closed', () => {
    visualizerContainer.visualizer = null
  })
}

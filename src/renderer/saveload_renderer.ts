import { ipcRenderer } from 'electron'
import { ReduxStore, ReduxState, resetState } from './redux/store'
import fixState from './fixState'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'
const SELECT_FILES = 'select-files'
const CACHED_STATE_KEY = 'cached-state'
const AUTO_SAVE_INTERVAL = 1000 // ms

export const captivateFileFilters = {
  dmx: { name: 'captivate dmx', extensions: ['.cap_dmx'] },
  scenes: { name: 'captivate scenes', extensions: ['.cap_scenes'] },
}

const videoFileFilters: Electron.FileFilter[] = [
  { name: 'MP4', extensions: ['.mp4'] },
  { name: 'OGG', extensions: ['.ogg'] },
  { name: 'WebM', extensions: ['.webm'] },
]

function refreshLastSession(store: ReduxStore) {
  const cachedState = localStorage.getItem(CACHED_STATE_KEY)
  if (!!cachedState) {
    // const lastState: ReduxState = fixState( JSON.parse(cachedState) )
    const lastState: ReduxState = JSON.parse(cachedState)
    store.dispatch(resetState(lastState))
  }
}

function saveState(state: ReduxState) {
  if (!!state) {
    localStorage.setItem(CACHED_STATE_KEY, JSON.stringify(state))
  }
}

export const autoSave = (store: ReduxStore) => {
  // refreshLastSession(store)

  setInterval(() => {
    saveState(store.getState())
  }, AUTO_SAVE_INTERVAL)
}

// export async function loadFile(
//   title: string,
//   fileFilters: Electron.FileFilter[]
// ): Promise<string> {
//   return ipcRenderer.invoke(LOAD_FILE, title, fileFilters)
// }

// export async function saveFile(
//   title: string,
//   data: string,
//   fileFilters: Electron.FileFilter[]
// ): Promise<NodeJS.ErrnoException> {
//   return ipcRenderer.invoke(SAVE_FILE, title, data, fileFilters)
// }

// export async function selectVideoFiles() {
//   return ipcRenderer.invoke(SELECT_FILES, 'Video Select', videoFileFilters)
// }

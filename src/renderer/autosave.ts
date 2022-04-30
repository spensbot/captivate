import {
  ReduxStore,
  CleanReduxState,
  resetState,
  getCleanReduxState,
} from './redux/store'
import ipcChannels from '../shared/ipc_channels'

const CACHED_STATE_KEY = 'cached-state'
const AUTO_SAVE_INTERVAL = 1000 // ms

// Modify this function to fix any state changes between upgrades
export function fixState(state: CleanReduxState): CleanReduxState {
  for (let ftID of state.dmx.fixtureTypes) {
    let ft = state.dmx.fixtureTypesByID[ftID]
    if (ft.epicness !== undefined) {
      ft.intensity = ft.epicness
      delete ft.epicness
    }
  }

  for (let lsID of state.control.light.ids) {
    let ls = state.control.light.byId[lsID]
    if (ls.bombacity !== undefined) {
      ls.epicness = ls.bombacity
      delete ls.bombacity
    }
    if (ls.baseParams.epicness !== undefined) {
      ls.baseParams.intensity = ls.baseParams.epicness
      delete ls.baseParams.epicness
    }
    for (let ss of ls.splitScenes) {
      if (ss.baseParams.epicness !== undefined) {
        ss.baseParams.intensity = ss.baseParams.epicness
        delete ss.baseParams.epicness
      }
    }
  }

  return state
}

export const captivateFileFilters = {
  captivate: { name: 'Captivate', extensions: ['.captivate'] },
}

function refreshLastSession(store: ReduxStore) {
  const cachedState = localStorage.getItem(CACHED_STATE_KEY)
  if (!!cachedState) {
    // const lastState: ReduxState = fixState( JSON.parse(cachedState) )
    const lastState: CleanReduxState = fixState(JSON.parse(cachedState))
    store.dispatch(resetState(lastState))
  }
}

function saveState(state: CleanReduxState) {
  if (!!state) {
    localStorage.setItem(CACHED_STATE_KEY, JSON.stringify(state))
  }
}

export const autoSave = (store: ReduxStore) => {
  refreshLastSession(store)

  setInterval(() => {
    saveState(getCleanReduxState(store.getState()))
  }, AUTO_SAVE_INTERVAL)
}

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer = window.electron.ipcRenderer

export async function loadFile(
  title: string,
  fileFilters: Electron.FileFilter[]
): Promise<string> {
  return ipcRenderer.invoke(ipcChannels.load_file, title, fileFilters)
}

export async function saveFile(
  title: string,
  data: string,
  fileFilters: Electron.FileFilter[]
): Promise<NodeJS.ErrnoException> {
  return ipcRenderer.invoke(ipcChannels.save_file, title, data, fileFilters)
}

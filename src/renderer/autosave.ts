import {
  ReduxStore,
  CleanReduxState,
  resetState,
  getCleanReduxState,
} from './redux/store'
import ipcChannels from '../shared/ipc_channels'

// Modify this function to fix any breaking state changes between upgrades
export function fixState(state: CleanReduxState): CleanReduxState {
  // const v = state.control.visual
  // v.ids
  //   .map((id) => v.byId[id])
  //   .forEach((scene) => {
  //     scene.config = initLayerConfig(scene.config.type)
  //     for (let i = 0; i < scene.effectsConfig.length; i++) {
  //       scene.effectsConfig[i] = initEffectConfig(scene.effectsConfig[i].type)
  //     }
  //   })

  return state
}

export const captivateFileFilters = {
  captivate: { name: 'Captivate', extensions: ['.captivate'] },
}

export function refreshLastSession(store: ReduxStore) {
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

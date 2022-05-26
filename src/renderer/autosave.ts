import {
  ReduxStore,
  CleanReduxState,
  resetState,
  getCleanReduxState,
} from './redux/store'
import ipcChannels from '../shared/ipc_channels'
import AutoSavedVal from './AutoSavedVal'

let autoSavedVal: AutoSavedVal<CleanReduxState> | null = null

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

export const autoSave = (store: ReduxStore) => {
  autoSavedVal = new AutoSavedVal('state', () =>
    getCleanReduxState(store.getState())
  )

  let latest = autoSavedVal.loadLatest()
  if (latest !== null) {
    store.dispatch(resetState(latest))
  }
}

// @ts-ignore: Typescript doesn't recognize the globals set in "src/main/preload.js"
const ipcRenderer = window.electron.ipcRenderer

export const captivateFileFilters = {
  captivate: { name: 'Captivate', extensions: ['.captivate'] },
}

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

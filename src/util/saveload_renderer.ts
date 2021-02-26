import { ipcRenderer } from 'electron'
import { ReduxStore, ReduxState, resetState } from '../redux/store'
import { resetScenesState } from '../redux/scenesSlice'
import { resetDmxState } from '../redux/dmxSlice'
import { Middleware, PayloadAction } from '@reduxjs/toolkit'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'
const CACHED_STATE_KEY = 'cached-state'
const AUTO_SAVE_INTERVAL = 1000 // ms

function refreshLastSession(store: ReduxStore) {
  // const cachedState = localStorage.getItem(CACHED_STATE_KEY);
  // if (!!cachedState) {
  //   const lastState: ReduxState = JSON.parse(cachedState)
  //   store.dispatch(resetState(lastState))
  // }
}

function saveState(state: ReduxState) {
  if (!!state) {
    localStorage.setItem(CACHED_STATE_KEY, JSON.stringify(state));
  }
}

export const autoSave = (store: ReduxStore) => {
  refreshLastSession(store)

  setInterval(() => {
    saveState(store.getState())
  }, AUTO_SAVE_INTERVAL)
}

export async function loadFile(title: string, defaultPath: string | null): Promise<string> {
  return ipcRenderer.invoke(LOAD_FILE, title, defaultPath)
}

export async function saveFile(title: string, data: string, defaultPath: string | null): Promise<NodeJS.ErrnoException> {
  return ipcRenderer.invoke(SAVE_FILE, title, data, defaultPath)
}


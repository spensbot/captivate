import { ipcRenderer } from 'electron'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'

export async function loadFile(title: string, defaultPath: string | null): Promise<string> {
  return ipcRenderer.invoke(LOAD_FILE, title, defaultPath)
}

export async function saveFile(title: string, defaultPath: string | null): Promise<NodeJS.ErrnoException> {
  return ipcRenderer.invoke(SAVE_FILE, title, defaultPath)
}


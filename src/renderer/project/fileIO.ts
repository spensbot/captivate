import ipcChannels from '../../shared/ipc_channels'
import type { LoadedFilePayload } from '../../shared/fileDialog'

type FileIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

const maybeWindow =
  typeof window !== 'undefined'
    ? (window as Window & { electron?: { ipcRenderer?: FileIpcRenderer } })
    : undefined

function getFileIpcRenderer(): FileIpcRenderer {
  const ipcRenderer = maybeWindow?.electron?.ipcRenderer
  if (!ipcRenderer) {
    throw new Error(
      'File dialogs are unavailable outside the Captivate desktop app.'
    )
  }
  return ipcRenderer
}

export async function loadFile(
  title: string,
  fileFilters: Electron.FileFilter[],
  options?: { defaultPath?: string }
): Promise<LoadedFilePayload | null> {
  return getFileIpcRenderer().invoke(
    ipcChannels.load_file,
    title,
    fileFilters,
    options
  ) as Promise<LoadedFilePayload | null>
}

export async function saveFile(
  title: string,
  data: string,
  fileFilters: Electron.FileFilter[],
  options?: { defaultPath?: string }
): Promise<string | null> {
  return getFileIpcRenderer().invoke(
    ipcChannels.save_file,
    title,
    data,
    fileFilters,
    options
  ) as Promise<string | null>
}

export async function readTextFile(filePath: string): Promise<string> {
  return getFileIpcRenderer().invoke(
    ipcChannels.read_text_file,
    filePath
  ) as Promise<string>
}

export async function writeTextFile(filePath: string, data: string): Promise<string> {
  return getFileIpcRenderer().invoke(
    ipcChannels.write_text_file,
    filePath,
    data
  ) as Promise<string>
}

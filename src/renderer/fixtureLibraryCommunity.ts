import ipcChannels from '../shared/ipc_channels'
import type {
  FixtureLibrarySubmitInput,
  FixtureLibrarySubmitProgress,
  FixtureLibrarySubmitResult,
} from '../shared/fixtureLibrarySubmitTypes'

type FileIpcRenderer = {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(
    channel: string,
    listener: (progress: FixtureLibrarySubmitProgress) => void
  ): () => void
}

function getFileIpcRenderer(): FileIpcRenderer {
  const electron = (window as { electron?: { ipcRenderer?: FileIpcRenderer } })
    .electron
  if (electron?.ipcRenderer === undefined) {
    throw new Error('Electron IPC is not available.')
  }
  return electron.ipcRenderer
}

export function subscribeFixtureLibrarySubmitProgress(
  listener: (progress: FixtureLibrarySubmitProgress) => void
): () => void {
  const unsubscribe = getFileIpcRenderer().on(
    ipcChannels.fixture_library_submit_progress,
    listener
  )
  return typeof unsubscribe === 'function' ? unsubscribe : () => {}
}

export async function submitFixtureToCommunityLibrary(
  input: FixtureLibrarySubmitInput
): Promise<FixtureLibrarySubmitResult> {
  return getFileIpcRenderer().invoke(
    ipcChannels.submit_fixture_to_community_library,
    input
  ) as Promise<FixtureLibrarySubmitResult>
}

export type {
  FixtureLibrarySubmitInput,
  FixtureLibrarySubmitProgress,
  FixtureLibrarySubmitResult,
} from '../shared/fixtureLibrarySubmitTypes'

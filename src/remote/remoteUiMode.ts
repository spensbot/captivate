export type RemoteUiMode = 'desktop' | 'mobile'

const STORAGE_KEY = 'captivate.remote.uiMode'

export function loadRemoteUiMode(): RemoteUiMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'desktop' || raw === 'mobile') return raw
  } catch {
    /* ignore */
  }
  return null
}

export function saveRemoteUiMode(mode: RemoteUiMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

/** First visit: prefer mobile on phones / coarse pointers. */
export function detectDefaultRemoteUiMode(): RemoteUiMode {
  if (typeof window === 'undefined') return 'desktop'
  const narrow = window.matchMedia('(max-width: 768px)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  return narrow || coarse ? 'mobile' : 'desktop'
}

export function resolveInitialRemoteUiMode(): RemoteUiMode {
  return loadRemoteUiMode() ?? detectDefaultRemoteUiMode()
}

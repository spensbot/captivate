import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  if (typeof document === 'undefined') {
    return () => {}
  }
  const root = document.documentElement
  const observer = new MutationObserver(onStoreChange)
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-remote-ui-mode'],
    subtree: true,
  })
  return () => observer.disconnect()
}

function getSnapshot() {
  if (typeof document === 'undefined') {
    return false
  }
  return document.querySelector('[data-remote-ui-mode="mobile"]') !== null
}

/** True when the UI is inside the remote app's mobile layout (phone/tablet). */
export function useRemoteMobileLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

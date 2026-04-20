import { store } from '../redux/store'
import {
  hideAppDialog,
  pushStatusMessage,
  showAppDialog,
  type AppDialogState,
} from '../redux/guiSlice'

type DialogResolver = (accepted: boolean) => void

const resolvers = new Map<string, DialogResolver>()
const explicitResolutionIds = new Set<string>()
let observerInstalled = false

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveDialogById(id: string, accepted: boolean) {
  explicitResolutionIds.delete(id)
  const resolver = resolvers.get(id)
  if (resolver !== undefined) {
    resolvers.delete(id)
    resolver(accepted)
  }
}

function installDialogObserver() {
  if (observerInstalled) {
    return
  }
  observerInstalled = true
  let lastDialogId: string | null = store.getState().gui.appDialog?.id ?? null
  store.subscribe(() => {
    const nextDialogId = store.getState().gui.appDialog?.id ?? null
    if (lastDialogId !== null && nextDialogId !== lastDialogId) {
      if (explicitResolutionIds.has(lastDialogId)) {
        explicitResolutionIds.delete(lastDialogId)
        lastDialogId = nextDialogId
        return
      }
      // Dialog disappeared or was replaced outside resolveActiveAppDialog.
      resolveDialogById(lastDialogId, false)
    }
    lastDialogId = nextDialogId
  })
}

function openDialog(
  input: Omit<AppDialogState, 'id'>
): Promise<boolean> {
  installDialogObserver()
  const active = store.getState().gui.appDialog
  if (active !== null) {
    // Replace-in-place behavior should never orphan the previous promise.
    resolveDialogById(active.id, false)
  }

  const id = makeId()
  const payload: AppDialogState = {
    id,
    ...input,
  }
  store.dispatch(showAppDialog(payload))
  return new Promise<boolean>((resolve) => {
    resolvers.set(id, resolve)
  })
}

export function openAppConfirm(options: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}) {
  return openDialog({
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel ?? 'OK',
    cancelLabel: options.cancelLabel ?? 'Cancel',
    danger: options.danger === true,
  })
}

export async function openAppAlert(options: {
  title: string
  message: string
  confirmLabel?: string
  level?: 'info' | 'warn' | 'error'
  source?: string
}) {
  if (options.level !== undefined) {
    store.dispatch(
      pushStatusMessage({
        level: options.level,
        message: options.message,
        source: options.source,
      })
    )
  }
  await openDialog({
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel ?? 'OK',
    cancelLabel: '',
    danger: false,
  })
}

export function resolveActiveAppDialog(accepted: boolean) {
  const active = store.getState().gui.appDialog
  if (active === null) {
    store.dispatch(hideAppDialog())
    return
  }
  explicitResolutionIds.add(active.id)
  store.dispatch(hideAppDialog())
  resolveDialogById(active.id, accepted)
}

export function closeAllAppDialogs(accepted = false) {
  const active = store.getState().gui.appDialog
  if (active !== null) {
    explicitResolutionIds.add(active.id)
  }
  store.dispatch(hideAppDialog())

  if (active !== null) {
    const activeResolver = resolvers.get(active.id)
    if (activeResolver !== undefined) {
      resolvers.delete(active.id)
      activeResolver(accepted)
    }
  }

  if (resolvers.size > 0) {
    for (const resolver of resolvers.values()) {
      resolver(accepted)
    }
    resolvers.clear()
  }
}

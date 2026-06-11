export interface PersistenceBusyState {
  title: string
  message: string
  progress?: number
}

type PersistenceBusySubscriber = (state: PersistenceBusyState | null) => void

const subscribers = new Set<PersistenceBusySubscriber>()
let currentState: PersistenceBusyState | null = null

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function emit(state: PersistenceBusyState | null) {
  currentState = state
  subscribers.forEach((subscriber) => subscriber(state))
}

export function subscribePersistenceBusy(
  subscriber: PersistenceBusySubscriber
): () => void {
  subscribers.add(subscriber)
  subscriber(currentState)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function updatePersistenceBusy(
  patch: Partial<Pick<PersistenceBusyState, 'message' | 'progress'>>
) {
  if (currentState === null) {
    return
  }
  emit({
    ...currentState,
    message: patch.message ?? currentState.message,
    progress:
      typeof patch.progress === 'number'
        ? clamp01(patch.progress)
        : currentState.progress,
  })
}

export async function runPersistenceBusy<T>(
  initial: PersistenceBusyState,
  work: (
    update: (patch: Partial<Pick<PersistenceBusyState, 'message' | 'progress'>>) => void
  ) => Promise<T>
): Promise<T> {
  emit({
    ...initial,
    progress:
      typeof initial.progress === 'number'
        ? clamp01(initial.progress)
        : undefined,
  })
  try {
    return await work(updatePersistenceBusy)
  } finally {
    emit(null)
  }
}

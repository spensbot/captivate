import { useCallback, useEffect, useRef, useState } from 'react'

export interface BusyTaskInput {
  title: string
  message: string
  progress?: number
}

export interface BusyStartOptions {
  immediate?: boolean
  delayMs?: number
}

interface BusyTaskState extends BusyTaskInput {
  startedAtMs: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function formatBusyDuration(durationMs: number) {
  const ms = Math.max(0, Number.isFinite(durationMs) ? durationMs : 0)
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function useStandardBusy(delayMs = 280, tickMs = 200) {
  const [busy, setBusy] = useState<BusyTaskState | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const timerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const startBusy = useCallback((input: BusyTaskInput, options?: BusyStartOptions) => {
    const requestId = ++requestIdRef.current
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const resolvedDelayMs =
      options?.immediate === true
        ? 0
        : typeof options?.delayMs === 'number' && Number.isFinite(options.delayMs)
        ? Math.max(0, options.delayMs)
        : delayMs
    const applyBusy = () => {
      if (requestIdRef.current !== requestId) return
      setBusy({
        title: input.title,
        message: input.message,
        progress:
          typeof input.progress === 'number' ? clamp01(input.progress) : undefined,
        startedAtMs: Date.now(),
      })
    }
    if (resolvedDelayMs <= 0) {
      applyBusy()
      return requestId
    }
    timerRef.current = window.setTimeout(() => {
      applyBusy()
      timerRef.current = null
    }, resolvedDelayMs)
    return requestId
  }, [delayMs])

  const updateBusy = useCallback(
    (requestId: number, patch: Partial<Pick<BusyTaskInput, 'message' | 'progress'>>) => {
      if (requestIdRef.current !== requestId) return
      setBusy((current) => {
        if (current === null) return current
        return {
          ...current,
          message: patch.message ?? current.message,
          progress:
            typeof patch.progress === 'number'
              ? clamp01(patch.progress)
              : current.progress,
        }
      })
    },
    []
  )

  const stopBusy = useCallback((requestId?: number) => {
    if (requestId !== undefined && requestIdRef.current !== requestId) {
      return
    }
    requestIdRef.current += 1
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setBusy(null)
  }, [])

  useEffect(() => {
    if (busy === null) return
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, tickMs)
    return () => {
      window.clearInterval(interval)
    }
  }, [busy, tickMs])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const busyMessage =
    busy === null
      ? undefined
      : `${busy.message}\nElapsed: ${formatBusyDuration(
          Math.max(0, nowMs - busy.startedAtMs)
        )}`

  return {
    busy,
    busyMessage,
    startBusy,
    updateBusy,
    stopBusy,
  }
}

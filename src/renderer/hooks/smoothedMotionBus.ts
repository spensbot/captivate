export interface SmoothedMotionEntry {
  readTarget: () => number
  display: number
  apply: (display: number) => void
  tauMs: number
  lastApplied?: number
}

const entries = new Set<SmoothedMotionEntry>()
let rafId: number | null = null
let lastFrameMs = 0

const EPSILON = 0.0008

function applyEntryValue(entry: SmoothedMotionEntry, value: number) {
  if (
    entry.lastApplied !== undefined &&
    Math.abs(entry.lastApplied - value) <= EPSILON
  ) {
    entry.display = value
    return
  }
  entry.lastApplied = value
  entry.display = value
  entry.apply(value)
}

function tick(now: number) {
  const dt = Math.max(0, now - lastFrameMs)
  lastFrameMs = now

  let anyAnimating = false
  for (const entry of entries) {
    const target = entry.readTarget()
    const delta = target - entry.display
    if (Math.abs(delta) <= EPSILON) {
      applyEntryValue(entry, target)
      continue
    }

    anyAnimating = true
    const alpha = 1 - Math.exp(-dt / entry.tauMs)
    const next = entry.display + delta * alpha
    applyEntryValue(entry, next)
  }

  if (anyAnimating && entries.size > 0) {
    rafId = requestAnimationFrame(tick)
    return
  }

  rafId = null
}

function ensureLoop() {
  if (rafId !== null) {
    return
  }
  lastFrameMs = performance.now()
  rafId = requestAnimationFrame(tick)
}

export function registerSmoothedMotion(entry: SmoothedMotionEntry): () => void {
  entries.add(entry)
  ensureLoop()
  return () => {
    entries.delete(entry)
    if (entries.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
}

export function snapSmoothedMotionToTarget(entry: SmoothedMotionEntry) {
  applyEntryValue(entry, entry.readTarget())
}

export function wakeSmoothedMotionLoop() {
  ensureLoop()
}

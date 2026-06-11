import type { TimeState } from './TimeState'

export interface TimeExtrapolationAnchor {
  time: TimeState
  receivedAtMs: number
}

export function createTimeExtrapolationAnchor(
  time: TimeState,
  receivedAtMs: number = performance.now()
): TimeExtrapolationAnchor {
  return { time, receivedAtMs }
}

const MIN_DRIFT_RESYNC_MS = 52

function beatDriftThreshold(time: TimeState): number {
  const bpm = Number.isFinite(time.bpm) ? time.bpm : 120
  return Math.max(0.008, (bpm * MIN_DRIFT_RESYNC_MS) / 60000)
}

/** Resync to the engine without visible beat jumps (important at slow tempos). */
export function resyncTimeExtrapolationAnchor(
  previous: TimeExtrapolationAnchor,
  engineTime: TimeState,
  nowMs: number = performance.now()
): TimeExtrapolationAnchor {
  if (engineTime.isPlaying !== true) {
    return createTimeExtrapolationAnchor(engineTime, nowMs)
  }

  const transportChanged =
    engineTime.bpm !== previous.time.bpm ||
    engineTime.quantum !== previous.time.quantum ||
    engineTime.isPlaying !== previous.time.isPlaying

  if (transportChanged) {
    const displayed = extrapolateTimeState(previous, nowMs)
    return createTimeExtrapolationAnchor(
      {
        ...engineTime,
        beats: displayed.beats,
        phase: displayed.phase,
      },
      nowMs
    )
  }

  const displayed = extrapolateTimeState(previous, nowMs)
  const drift = Math.abs(engineTime.beats - displayed.beats)
  if (drift < beatDriftThreshold(engineTime)) {
    return previous
  }

  return createTimeExtrapolationAnchor(engineTime, nowMs)
}

/** Advance beat clock between engine IPC ticks for smooth UI animation. */
export function extrapolateTimeState(
  anchor: TimeExtrapolationAnchor,
  nowMs: number = performance.now()
): TimeState {
  const { time, receivedAtMs } = anchor
  if (time.isPlaying !== true) {
    return time
  }

  const elapsedMs = Math.max(0, nowMs - receivedAtMs)
  if (elapsedMs <= 0.0001) {
    return time
  }

  const bpm = Number.isFinite(time.bpm) ? time.bpm : 120
  const beatDelta = (bpm * elapsedMs) / 60000
  const beats = time.beats + beatDelta
  const quantum = time.quantum > 0 ? time.quantum : 4
  const phase = ((beats % quantum) + quantum) % quantum

  return {
    ...time,
    beats,
    phase,
    dt: elapsedMs,
  }
}

const TIME_VISUAL_EPSILON = 0.00008

export function timeStatesVisuallyEqual(a: TimeState, b: TimeState): boolean {
  return (
    a.isPlaying === b.isPlaying &&
    Math.abs(a.beats - b.beats) <= TIME_VISUAL_EPSILON &&
    Math.abs(a.phase - b.phase) <= TIME_VISUAL_EPSILON &&
    a.bpm === b.bpm &&
    a.quantum === b.quantum
  )
}

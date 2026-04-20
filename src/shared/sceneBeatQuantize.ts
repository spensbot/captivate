import type { TimeState } from './TimeState'

const DEFAULT_BPM = 120

/**
 * Next integer beat strictly after `beats` (or one beat ahead if already on a
 * whole beat), for scheduling scene changes on downbeats.
 */
export function nextBeatBoundaryStrict(beats: number): number {
  const b = Number.isFinite(beats) ? beats : 0
  const epsilon = 1e-7
  const n = Math.ceil(b - epsilon)
  return n <= b ? n + 1 : n
}

/** Milliseconds until the next quantized beat from `time.beats` at `time.bpm`. */
export function msUntilNextBeatBoundary(
  time: Pick<TimeState, 'beats' | 'bpm'>
): number {
  const bpm = Number.isFinite(time.bpm) && time.bpm > 0 ? time.bpm : DEFAULT_BPM
  const beats = Number.isFinite(time.beats) ? time.beats : 0
  const target = nextBeatBoundaryStrict(beats)
  const deltaBeats = Math.max(0, target - beats)
  return Math.max(0, (deltaBeats / bpm) * 60000)
}

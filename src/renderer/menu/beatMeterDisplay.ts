import type { TimeState } from '../../shared/TimeState'
import { ENGINE_REALTIME_POLL_INTERVAL_MS } from '../../shared/engineRealtimeRate'

type BeatMeterUpdater = (phase: number, quantum: number) => void

let readEngineTime: (() => TimeState) | null = null
let updater: BeatMeterUpdater | null = null
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollIntervalMs = ENGINE_REALTIME_POLL_INTERVAL_MS

let lastPhase = Number.NaN
let lastQuantum = -1

function clearPollTimer() {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function scheduleNextPoll() {
  clearPollTimer()
  if (readEngineTime === null) {
    return
  }
  pollTimer = setTimeout(runPollTick, pollIntervalMs)
}

/** Apply engine-authoritative transport time; update DOM only when phase/quantum changed. */
export function syncBeatMeterFromEngine(time: TimeState): void {
  if (updater === null) {
    return
  }

  const quantum = time.quantum > 0 ? time.quantum : 4
  if (time.phase === lastPhase && quantum === lastQuantum) {
    return
  }

  lastPhase = time.phase
  lastQuantum = quantum
  updater(time.phase, quantum)
}

function runPollTick() {
  pollTimer = null
  if (readEngineTime === null) {
    return
  }

  const time = readEngineTime()
  if (time.isPlaying === true) {
    syncBeatMeterFromEngine(time)
  }
  scheduleNextPoll()
}

export function registerBeatMeterUpdater(
  nextUpdater: BeatMeterUpdater,
  _quantum: number
): () => void {
  updater = nextUpdater
  lastPhase = Number.NaN
  lastQuantum = -1
  if (readEngineTime !== null) {
    flushBeatMeterEngineSync()
  }

  return () => {
    if (updater === nextUpdater) {
      updater = null
    }
  }
}

export function startBeatMeterEngineSync(readTime: () => TimeState) {
  clearPollTimer()
  readEngineTime = readTime
  pollIntervalMs = ENGINE_REALTIME_POLL_INTERVAL_MS
  lastPhase = Number.NaN
  lastQuantum = -1
  runPollTick()
}

export function stopBeatMeterEngineSync() {
  clearPollTimer()
  readEngineTime = null
}

export function flushBeatMeterEngineSync() {
  if (readEngineTime === null) {
    return
  }
  syncBeatMeterFromEngine(readEngineTime())
}

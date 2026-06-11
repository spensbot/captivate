import {
  getDmxOutputPollIntervalMs,
  type DmxOutputRateDeviceState,
} from '../../shared/dmxOutputRate'
import { syncDmxMixerOutputs } from './dmxMixerOutputBus'

type RealtimeDmxSnapshot = {
  dmxOutByUniverse: number[][]
}

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollIntervalMs = 1000 / 44
let readSnapshot: (() => RealtimeDmxSnapshot) | null = null
let readDeviceState: (() => DmxOutputRateDeviceState) | null = null

function clearPollTimer() {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function scheduleNextPoll() {
  clearPollTimer()
  if (readSnapshot === null) {
    return
  }
  pollTimer = setTimeout(runPollTick, pollIntervalMs)
}

function runPollTick() {
  pollTimer = null
  if (readSnapshot === null) {
    return
  }

  if (readDeviceState !== null) {
    const nextIntervalMs = getDmxOutputPollIntervalMs(readDeviceState())
    if (nextIntervalMs !== pollIntervalMs) {
      pollIntervalMs = nextIntervalMs
    }
  }

  syncDmxMixerOutputs(readSnapshot().dmxOutByUniverse)
  scheduleNextPoll()
}

export function startDmxMixerOutputSync(options: {
  readSnapshot: () => RealtimeDmxSnapshot
  readDeviceState: () => DmxOutputRateDeviceState
}) {
  clearPollTimer()
  readSnapshot = options.readSnapshot
  readDeviceState = options.readDeviceState
  pollIntervalMs = getDmxOutputPollIntervalMs(options.readDeviceState())
  runPollTick()
}

export function stopDmxMixerOutputSync() {
  clearPollTimer()
  readSnapshot = null
  readDeviceState = null
}

export function flushDmxMixerOutputSync() {
  if (readSnapshot === null) {
    return
  }
  syncDmxMixerOutputs(readSnapshot().dmxOutByUniverse)
}

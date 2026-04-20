import { initModulation, DefaultParam, Modulation } from './params'
import { Lfo, GetValue, GetRamp } from './oscillator'
import { clampNormalized } from '../math/util'
import { defaultOutputParams } from './params'
import {
  AudioEngineMetrics,
  getAudioBandLevel,
  initAudioBandConfig,
  initAudioEngineMetrics,
  normalizeAudioBandConfig,
} from './audioEngine'
import { LfoShape } from './oscillator'

export interface Modulator {
  lfo: Lfo
  splitModulations: Modulation[]
}

/** How modulation combines with the manual (base) set-point for a parameter. */
export type ModManualAnchor = 'center' | 'bottom' | 'top'

interface LightSceneLike {
  splitScenes: Array<{
    baseParams: Modulation
    modManualAnchors?: Partial<Record<string, ModManualAnchor>>
  }>
  modulators: Modulator[]
}

export function initModulator(splitCount: number): Modulator {
  const lfo = GetRamp()
  const defaultBand = initAudioBandConfig()
  lfo.audioBandLowHz = defaultBand.lowHz
  lfo.audioBandHighHz = defaultBand.highHz
  lfo.audioThreshold = 0.02
  lfo.audioMax = 0.6
  lfo.audioAttack = 0.35
  lfo.audioDecay = 0.55
  lfo.audioEnergySmoothing = 0.65
  lfo.audioBandSmoothing = 0

  return {
    lfo,
    splitModulations: Array(splitCount)
      .fill(0)
      .map(() => initModulation()),
  }
}

interface ModSnapshot {
  modulation: Modulation
  lfoVal: number
}

function clampOutputParamValue(param: DefaultParam | string, value: number): number {
  if (param === 'moverMode') {
    // Mover mode is discrete 0..2 (Follow/Tandem/Mirror), not normalized 0..1.
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(2, value))
  }
  if (param === 'moverFloorLock') {
    if (!Number.isFinite(value)) return 1
    return value >= 0.5 ? 1 : 0
  }

  return clampNormalized(value)
}

export function getOutputParams(
  beats: number,
  scene: LightSceneLike,
  splitIndex: number,
  allParamKeys: string[],
  audioInput: AudioEngineMetrics = initAudioEngineMetrics()
) {
  const splitScene = scene.splitScenes[splitIndex]
  const baseParams = splitScene.baseParams
  const modManualAnchors = splitScene.modManualAnchors
  const outputParams: Modulation = {
    ...defaultOutputParams(),
    ...baseParams,
  }

  const snapshots: ModSnapshot[] = scene.modulators.map((modulator) => ({
    modulation: modulator.splitModulations[splitIndex],
    lfoVal: getModulatorLfoValue(modulator.lfo, beats, audioInput),
  }))

  allParamKeys.forEach((param) => {
    const baseParam =
      baseParams[param] !== undefined ? baseParams[param] : outputParams[param]
    const anchor = modManualAnchors?.[param] ?? 'center'
    const outputParam = getOutputParam(baseParam, param, snapshots, anchor)
    if (outputParam !== undefined) {
      outputParams[param] = outputParam
    }
  })

  return outputParams
}

export function getModulatorLfoValue(
  lfo: Lfo,
  beats: number,
  audioInput: AudioEngineMetrics
) {
  if (lfo.shape === LfoShape.AudioBand) {
    if (audioInput.enabled !== true) {
      const state = getAudioLfoState(lfo, beats)
      state.initialized = false
      state.peak = 0
      state.valley = 0
      state.smoothed = 0
      state.bandPostSmoothed = 0
      state.bandPostInitialized = false
      state.lastBeat = Number.isFinite(beats) ? beats : state.lastBeat
      return 0
    }

    const band = normalizeAudioBandConfig({
      lowHz: lfo.audioBandLowHz,
      highHz: lfo.audioBandHighHz,
    })
    const raw = getAudioBandLevel(audioInput, {
      ...band,
      gain: 1,
    })
    return getAudioBandLevelSmoothed(raw, lfo, beats)
  }

  if (lfo.shape === LfoShape.AudioEnergy) {
    if (audioInput.enabled !== true) {
      const state = getAudioLfoState(lfo, beats)
      state.initialized = false
      state.smoothed = 0
      state.lastBeat = Number.isFinite(beats) ? beats : state.lastBeat
      return 0
    }
    return getAudioEnergyLevelSmoothed(clamp01(audioInput.energyLevel), lfo, beats)
  }

  return GetValue(lfo, beats)
}

interface AudioLfoRuntimeState {
  lastBeat: number
  initialized: boolean
  peak: number
  valley: number
  smoothed: number
  bandPostSmoothed: number
  bandPostInitialized: boolean
}

const audioLfoState = new WeakMap<Lfo, AudioLfoRuntimeState>()

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function alphaFromBeats(dtBeats: number, tauBeats: number) {
  if (!Number.isFinite(dtBeats) || dtBeats <= 0) return 0
  return 1 - Math.exp(-dtBeats / Math.max(0.001, tauBeats))
}

function getAudioLfoState(lfo: Lfo, beats: number): AudioLfoRuntimeState {
  const existing = audioLfoState.get(lfo)
  if (existing !== undefined) {
    return existing
  }

  const created: AudioLfoRuntimeState = {
    lastBeat: Number.isFinite(beats) ? beats : 0,
    initialized: false,
    peak: 0,
    valley: 0,
    smoothed: 0,
    bandPostSmoothed: 0,
    bandPostInitialized: false,
  }
  audioLfoState.set(lfo, created)
  return created
}

function getAudioBandSmoothedValue(raw: number, lfo: Lfo, dtBeats: number) {
  const state = getAudioLfoState(lfo, 0)
  if (!state.initialized) {
    state.initialized = true
    state.smoothed = raw
    return clamp01(state.smoothed)
  }

  const attack = clamp01(lfo.audioAttack)
  const decay = clamp01(lfo.audioDecay)
  const attackTauBeats = 0.08 + attack * 1.0
  const decayTauBeats = 0.12 + decay * 1.8
  const alpha =
    raw >= state.smoothed
      ? alphaFromBeats(dtBeats, attackTauBeats)
      : alphaFromBeats(dtBeats, decayTauBeats)
  state.smoothed += (raw - state.smoothed) * alpha
  state.smoothed = clamp01(state.smoothed)
  return state.smoothed
}

function getAudioLfoThresholdAndMax(lfo: Lfo) {
  const threshold = Math.min(0.99, clamp01(lfo.audioThreshold))
  let maxLevel = clamp01(lfo.audioMax)
  maxLevel = Math.max(threshold + 0.01, maxLevel)
  maxLevel = Math.min(1, maxLevel)
  if (maxLevel <= threshold) {
    maxLevel = Math.min(1, threshold + 0.01)
  }
  return { threshold, maxLevel }
}

function applyAudioLfoThreshold(raw: number, lfo: Lfo) {
  const safeRaw = clamp01(raw)
  const { threshold, maxLevel } = getAudioLfoThresholdAndMax(lfo)
  if (safeRaw <= threshold) return 0
  return clamp01((safeRaw - threshold) / Math.max(0.01, maxLevel - threshold))
}

function getAudioBandLevelSmoothed(raw: number, lfo: Lfo, beats: number) {
  const state = getAudioLfoState(lfo, beats)
  const beatNow = Number.isFinite(beats) ? beats : state.lastBeat
  const dtBeatsRaw = beatNow - state.lastBeat
  const dtBeats = Math.max(0, Math.min(4, dtBeatsRaw))
  if (!Number.isFinite(dtBeatsRaw) || dtBeatsRaw < -0.001) {
    state.initialized = false
    state.bandPostInitialized = false
  }
  const envelope = getAudioBandSmoothedValue(clamp01(raw), lfo, dtBeats)

  const smoothAmt = clamp01(lfo.audioBandSmoothing ?? 0)
  let post = envelope
  if (smoothAmt > 0.0005) {
    const tauBeats = 0.0001 + smoothAmt * 5.2
    const alpha = alphaFromBeats(dtBeats, tauBeats)
    if (!state.bandPostInitialized) {
      state.bandPostSmoothed = envelope
      state.bandPostInitialized = true
    } else {
      state.bandPostSmoothed += (envelope - state.bandPostSmoothed) * alpha
    }
    state.bandPostSmoothed = clamp01(state.bandPostSmoothed)
    post = state.bandPostSmoothed
  } else {
    state.bandPostSmoothed = envelope
    state.bandPostInitialized = true
  }

  const output = applyAudioLfoThreshold(post, lfo)
  state.lastBeat = beatNow
  return output
}

function getAudioEnergyLevelSmoothed(raw: number, lfo: Lfo, beats: number) {
  const state = getAudioLfoState(lfo, beats)
  const beatNow = Number.isFinite(beats) ? beats : state.lastBeat
  const dtBeatsRaw = beatNow - state.lastBeat
  const dtBeats = Math.max(0, Math.min(4, dtBeatsRaw))
  if (!Number.isFinite(dtBeatsRaw) || dtBeatsRaw < -0.001) {
    state.initialized = false
  }

  if (!state.initialized) {
    state.initialized = true
    state.smoothed = raw
    state.lastBeat = beatNow
    return clamp01(state.smoothed)
  }

  const smoothing = clamp01(lfo.audioEnergySmoothing)
  const tauBeats = 0.035 + smoothing * 5.2
  const alpha = alphaFromBeats(dtBeats, tauBeats)
  const downward = raw + 0.002 < state.smoothed
  const dropGap = state.smoothed - raw
  const dropBoost =
    downward && dropGap > 0.045 ? Math.min(0.35, dropGap * 1.1) : 0
  const alphaUse = Math.min(1, alpha + dropBoost)
  state.smoothed += (raw - state.smoothed) * alphaUse
  state.smoothed = clamp01(state.smoothed)
  state.lastBeat = beatNow
  return applyAudioLfoThreshold(state.smoothed, lfo)
}

function modDeltaForManualAnchor(
  anchor: ModManualAnchor,
  manualBase: number,
  modAmount: number,
  lfoVal: number
): number {
  const Mm = modAmount * 2 - 1
  if (Math.abs(Mm) < 1e-9) {
    return 0
  }
  const B = clamp01(manualBase)
  const L = clamp01(lfoVal)

  if (anchor === 'bottom') {
    // Manual is the floor: LFO 0 → stay at base; LFO 1 → push toward 1 (e.g. Audio Energy).
    const pos = Math.max(0, Mm)
    const neg = Math.max(0, -Mm)
    return pos * L * (1 - B) + neg * (1 - L) * (-B)
  }
  if (anchor === 'top') {
    // Manual is the ceiling: LFO 0 → stay at base; LFO 1 → pull toward 0.
    const pos = Math.max(0, Mm)
    const neg = Math.max(0, -Mm)
    return pos * (-L) * B + neg * (1 - L) * (1 - B)
  }
  const lfoValMapped = L * 2 - 1
  return (Mm * lfoValMapped) / 2
}

function getOutputParam(
  baseParam: number | undefined,
  param: DefaultParam | string,
  snapshots: ModSnapshot[],
  modManualAnchor: ModManualAnchor = 'center'
) {
  if (baseParam === undefined) return undefined
  const manualBase = baseParam
  return clampOutputParamValue(
    param,
    snapshots.reduce((sum, { modulation, lfoVal }) => {
      const modAmount = modulation[param]
      if (modAmount === undefined) {
        return sum
      } else {
        return (
          sum +
          modDeltaForManualAnchor(modManualAnchor, manualBase, modAmount, lfoVal)
        )
      }
    }, baseParam)
  )
}

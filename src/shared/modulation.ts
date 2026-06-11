import { initModulation, DefaultParam, Modulation } from './params'
import { Lfo, GetValue, GetRamp } from './oscillator'
import { clampNormalized } from '../math/util'
import { defaultOutputParams } from './params'
import {
  AudioEngineMetrics,
  getAudioBandCutoffSliderBounds,
  getAudioBandLevel,
  initAudioBandConfig,
  initAudioEngineMetrics,
  normalizeAudioBandConfig,
} from './audioEngine'
import { AUDIO_BAND_MAX_LEVEL_UI } from './lfoShapeSlider'
import { LfoShape } from './oscillator'

export interface Modulator {
  lfo: Lfo
  splitModulations: Modulation[]
  /**
   * LFO→LFO inter-modulation (not tied to lighting splits). Keys: `intermod:lfo:{target}:{prop}`.
   * Legacy scenes may still have these keys under `splitModulations[*]` until `fixLightScenes` migrates them.
   */
  lfoInterModulation?: Modulation
}

/** How modulation combines with the manual (base) set-point for a parameter. */
export type ModManualAnchor = 'center' | 'bottom' | 'top'

/**
 * Applied per split only: shapes the 0–1 LFO driver **after** LFO/inter-mod synthesis,
 * before the modulation matrix combines with base params.
 */
export interface SplitModShaping {
  /** Mirror LFO contribution around center (0↔1). */
  invertModulation?: boolean
  /** Advance/delay all modulators on this split in beat time (fractions of a beat). */
  phaseOffsetBeats?: number
  /**
   * Stair-step the shaped LFO into N discrete levels (bit-crush style).
   * Omit or values &lt; 2 = smooth output. Capped at {@link SPLIT_MOD_MAX_STAIR_STEPS}.
   */
  modulationStairSteps?: number
}

/** Maximum quantize levels for split modulation shaping (UI + engine). */
export const SPLIT_MOD_MAX_STAIR_STEPS = 32

/** Persist only meaningful keys; omit empty shaping block. */
export function normSplitShapingForStore(
  raw: SplitModShaping | undefined
): SplitModShaping | undefined {
  if (!raw) return undefined
  const out: SplitModShaping = {}
  if (raw.invertModulation === true) {
    out.invertModulation = true
  }
  if (Number.isFinite(raw.phaseOffsetBeats) && raw.phaseOffsetBeats !== 0) {
    out.phaseOffsetBeats = raw.phaseOffsetBeats
  }
  if (
    raw.modulationStairSteps !== undefined &&
    Number.isFinite(raw.modulationStairSteps) &&
    raw.modulationStairSteps >= 2
  ) {
    out.modulationStairSteps = Math.min(
      SPLIT_MOD_MAX_STAIR_STEPS,
      Math.max(2, Math.round(raw.modulationStairSteps))
    )
  }
  return Object.keys(out).length > 0 ? out : undefined
}

interface LightSceneLike {
  splitScenes: Array<{
    baseParams: Modulation
    modManualAnchors?: Partial<Record<string, ModManualAnchor>>
    splitModShaping?: SplitModShaping
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
    lfoInterModulation: {},
  }
}

interface ModSnapshot {
  modulation: Modulation
  lfoVal: number
}

const INTER_MOD_PREFIX = 'intermod:lfo:'

/** LFO wave/shape parameters that can be inter-modulated (must match modulator UI). */
export const INTER_MOD_TARGET_PROPS = [
  'period',
  'phaseShift',
  'flip',
  'skew',
  'sinePeakWidth',
  'rampCurve',
  'squareDuty',
  'sawFlatten',
  'noiseSeed',
  'noiseSmoothing',
  'audioBandLowHz',
  'audioBandHighHz',
  'audioThreshold',
  'audioMax',
  'audioAttack',
  'audioDecay',
  'audioEnergySmoothing',
  'audioBandSmoothing',
] as const

export type InterModTargetProp = (typeof INTER_MOD_TARGET_PROPS)[number]

const INTER_MOD_PROPS = new Set<string>(INTER_MOD_TARGET_PROPS)

const WAVE_INTER_MOD_PROPS: InterModTargetProp[] = [
  'period',
  'phaseShift',
  'flip',
  'skew',
]

/** Inter-mod params exposed for a target LFO shape (matches ModulatorControl shape sliders + wave controls). */
export function interModPropsForShape(shape: LfoShape): InterModTargetProp[] {
  switch (shape) {
    case LfoShape.Sin:
      return [...WAVE_INTER_MOD_PROPS, 'sinePeakWidth']
    case LfoShape.Ramp:
      return [...WAVE_INTER_MOD_PROPS, 'rampCurve']
    case LfoShape.Square:
      return [...WAVE_INTER_MOD_PROPS, 'squareDuty']
    case LfoShape.Saw:
      return [...WAVE_INTER_MOD_PROPS, 'sawFlatten']
    case LfoShape.Noise:
      return [...WAVE_INTER_MOD_PROPS, 'noiseSeed', 'noiseSmoothing']
    case LfoShape.AudioBand:
      return [
        'skew',
        'audioBandLowHz',
        'audioBandHighHz',
        'audioThreshold',
        'audioMax',
        'audioAttack',
        'audioDecay',
        'audioBandSmoothing',
      ]
    case LfoShape.AudioEnergy:
      return ['skew', 'audioThreshold', 'audioMax', 'audioEnergySmoothing']
    default:
      return WAVE_INTER_MOD_PROPS
  }
}

export function isInterModPropValidForShape(
  shape: LfoShape,
  prop: string
): prop is InterModTargetProp {
  return interModPropsForShape(shape).includes(prop as InterModTargetProp)
}

type InterModTarget = {
  targetIndex: number
  prop: string
}

function parseInterModKey(key: string): InterModTarget | null {
  if (!key.startsWith(INTER_MOD_PREFIX)) return null
  const remainder = key.slice(INTER_MOD_PREFIX.length)
  const [targetRaw, prop] = remainder.split(':')
  const targetIndex = Number(targetRaw)
  if (!Number.isInteger(targetIndex) || targetIndex < 0) return null
  if (typeof prop !== 'string' || !INTER_MOD_PROPS.has(prop)) return null
  return { targetIndex, prop }
}

/** For each target LFO index, which wave/prop keys receive inter-mod (global LFO graph). */
export function intermodPropsIncoming(scene: LightSceneLike): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>()
  for (const modulator of scene.modulators) {
    const im = modulator.lfoInterModulation ?? {}
    for (const [key, amount] of Object.entries(im)) {
      if (typeof amount !== 'number' || !Number.isFinite(amount)) continue
      const t = parseInterModKey(key)
      if (t === null) continue
      let set = map.get(t.targetIndex)
      if (set === undefined) {
        set = new Set()
        map.set(t.targetIndex, set)
      }
      set.add(t.prop)
    }
  }
  return map
}

export function modOutgoingIntermod(
  scene: LightSceneLike,
  sourceModIndex: number
): boolean {
  const im = scene.modulators[sourceModIndex]?.lfoInterModulation
  if (im === undefined) return false
  return Object.keys(im).some((k) => k.startsWith(INTER_MOD_PREFIX))
}

/** Inter-mod matrix keys on this modulator that have an amount. */
export function activeInterModParamKeys(
  lfoInterModulation: Modulation | undefined | null
): string[] {
  if (lfoInterModulation === null || lfoInterModulation === undefined) return []
  const out: string[] = []
  for (const [key, val] of Object.entries(lfoInterModulation)) {
    if (!key.startsWith(INTER_MOD_PREFIX)) continue
    if (typeof val !== 'number' || !Number.isFinite(val)) continue
    if (parseInterModKey(key) === null) continue
    out.push(key)
  }
  out.sort((a, b) => a.localeCompare(b, 'en'))
  return out
}

/** Distinct target LFO indices this source modulates (inter-mod routes only). */
export function intermodOutgoingTargets(
  scene: LightSceneLike,
  sourceIndex: number
): number[] {
  const n = scene.modulators.length
  const im = scene.modulators[sourceIndex]?.lfoInterModulation
  if (im === undefined) return []
  const set = new Set<number>()
  for (const [key, val] of Object.entries(im)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) continue
    const t = parseInterModKey(key)
    if (t === null) continue
    if (t.targetIndex === sourceIndex) continue
    if (t.targetIndex < 0 || t.targetIndex >= n) continue
    set.add(t.targetIndex)
  }
  return Array.from(set).sort((a, b) => a - b)
}

/** Distinct source LFO indices that modulate this target. */
export function intermodIncomingSources(
  scene: LightSceneLike,
  targetIndex: number
): number[] {
  const n = scene.modulators.length
  if (targetIndex < 0 || targetIndex >= n) return []
  const set = new Set<number>()
  for (let s = 0; s < n; s++) {
    if (s === targetIndex) continue
    const im = scene.modulators[s]?.lfoInterModulation
    if (im === undefined) continue
    for (const [key, val] of Object.entries(im)) {
      if (typeof val !== 'number' || !Number.isFinite(val)) continue
      const t = parseInterModKey(key)
      if (t === null) continue
      if (t.targetIndex === targetIndex) {
        set.add(s)
        break
      }
    }
  }
  return Array.from(set).sort((a, b) => a - b)
}

const INTERMOD_SOURCE_COLOR_SLOTS = 16

/**
 * Stable accent color for an LFO when it acts as an inter-mod **source**. Used for that
 * LFO’s single left-edge strip and for the matching stripes on each target’s right edge.
 */
export function intermodSourceAccentColor(sourceIndex: number): string {
  const slot = sourceIndex % INTERMOD_SOURCE_COLOR_SLOTS
  const hue = ((slot * 37 + sourceIndex * 23) % 360 + 360) % 360
  const sat = 64 + (slot % 4) * 8
  const light = 48 + (slot % 3) * 7
  return `hsla(${hue}, ${sat}%, ${light}%, 0.9)`
}

function cloneLfo(lfo: Lfo): Lfo {
  return { ...lfo }
}

/** Map inter-mod delta (±0.5 at full depth) across the band slider like a 0–1 param. */
function applyInterModDeltaToBandHz(
  currentHz: number,
  defaultHz: number,
  minHz: number,
  maxHz: number,
  delta: number
): number {
  const span = maxHz - minHz
  if (span <= 0) {
    return Number.isFinite(currentHz) ? currentHz : defaultHz
  }
  const safeCurrent = Number.isFinite(currentHz) ? currentHz : defaultHz
  const norm = (safeCurrent - minHz) / span
  const nextNorm = Math.min(1, Math.max(0, norm + delta))
  return minHz + nextNorm * span
}

type AudioBandCutoffBounds = ReturnType<typeof getAudioBandCutoffSliderBounds>

function applyInterModToLfoProp(
  targetLfo: Lfo,
  targetShape: LfoShape,
  prop: string,
  delta: number,
  bandBounds: AudioBandCutoffBounds
) {
  if (prop === 'period') {
    const basePeriod = Math.max(0.125, Number(targetLfo.period) || 4)
    const ratio = Math.pow(2, delta * 2)
    targetLfo.period = Math.min(64, Math.max(0.125, basePeriod * ratio))
    return
  }

  if (prop === 'audioBandLowHz') {
    targetLfo.audioBandLowHz = applyInterModDeltaToBandHz(
      targetLfo.audioBandLowHz,
      240,
      bandBounds.lowCutMinHz,
      bandBounds.lowCutMaxHz,
      delta
    )
    return
  }

  if (prop === 'audioBandHighHz') {
    targetLfo.audioBandHighHz = applyInterModDeltaToBandHz(
      targetLfo.audioBandHighHz,
      1600,
      bandBounds.highCutMinHz,
      bandBounds.highCutMaxHz,
      delta
    )
    return
  }

  if (prop === 'audioMax') {
    const next = clamp01((Number(targetLfo.audioMax) || 0.6) + delta)
    const maxLevel =
      targetShape === LfoShape.AudioBand ? AUDIO_BAND_MAX_LEVEL_UI : 1
    targetLfo.audioMax = Math.min(
      maxLevel,
      Math.max(targetLfo.audioThreshold + 0.01, next)
    )
    return
  }

  const current = Number((targetLfo as unknown as Record<string, number>)[prop])
  const next = clamp01((Number.isFinite(current) ? current : 0.5) + delta)
  ;(targetLfo as unknown as Record<string, number>)[prop] = next
}

function clampOutputParamValue(param: DefaultParam | string, value: number): number {
  if (param === 'moverMode') {
    // Mover mode is discrete 0..2 (Follow/Tandem/Mirror), not normalized 0..1.
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(2, value))
  }
  if (param === 'moverFloorLock') {
    if (!Number.isFinite(value)) return 0
    return value >= 0.5 ? 1 : 0
  }

  return clampNormalized(value)
}

function applySplitModShapingToLfoVal(
  lfoVal: number,
  shaping: SplitModShaping | undefined
): number {
  let v = clampNormalized(lfoVal)
  if (!shaping) {
    return v
  }
  if (shaping.invertModulation === true) {
    v = 1 - v
  }
  const steps = shaping.modulationStairSteps
  if (steps !== undefined && Number.isFinite(steps) && steps >= 2) {
    const n = Math.min(SPLIT_MOD_MAX_STAIR_STEPS, Math.max(2, Math.round(steps)))
    v = Math.round(v * (n - 1)) / (n - 1)
  }
  return clampNormalized(v)
}

/**
 * LFO definitions after applying `intermod:lfo:*` routes for one split (same rules as the
 * DMX engine). Source LFO values use the split's phase-offset clock when present.
 */
export function effectiveLfosAtSplit(
  scene: LightSceneLike,
  splitIndex: number,
  beats: number,
  audioInput: AudioEngineMetrics
): Lfo[] {
  const splitScene = scene.splitScenes[splitIndex]
  const phaseOff = splitScene?.splitModShaping?.phaseOffsetBeats
  const effectiveBeats =
    beats + (Number.isFinite(phaseOff) ? Number(phaseOff) : 0)

  const sourceLfoValues = scene.modulators.map((modulator, sourceIndex) =>
    getModulatorLfoValue(modulator.lfo, effectiveBeats, audioInput, sourceIndex)
  )
  const effectiveLfos = scene.modulators.map((modulator) => cloneLfo(modulator.lfo))
  const bandBounds = getAudioBandCutoffSliderBounds(audioInput.nyquistHz)

  scene.modulators.forEach((modulator, sourceIndex) => {
    const sourceLfoVal = sourceLfoValues[sourceIndex]
    const im = modulator.lfoInterModulation ?? {}
    for (const [key, amount] of Object.entries(im)) {
      if (!Number.isFinite(amount)) continue
      const amountNorm = Number(amount)
      const target = parseInterModKey(key)
      if (target === null) continue
      if (target.targetIndex >= effectiveLfos.length) continue
      if (target.targetIndex === sourceIndex) continue

      const delta =
        ((amountNorm - 0.5) * 2 * ((sourceLfoVal - 0.5) * 2)) / 2
      const targetLfo = effectiveLfos[target.targetIndex]
      const targetShape = scene.modulators[target.targetIndex]?.lfo.shape ?? LfoShape.Sin
      if (!isInterModPropValidForShape(targetShape, target.prop)) {
        continue
      }
      applyInterModToLfoProp(targetLfo, targetShape, target.prop, delta, bandBounds)
    }
  })

  effectiveLfos.forEach((lfo, index) => {
    if (scene.modulators[index]?.lfo.shape === LfoShape.AudioBand) {
      enforceAudioBandCutoffGap(lfo, bandBounds)
    }
  })

  return effectiveLfos
}

const AUDIO_BAND_MIN_GAP_HZ = 20

function enforceAudioBandCutoffGap(
  lfo: Lfo,
  bandBounds: AudioBandCutoffBounds
) {
  lfo.audioBandLowHz = Math.min(
    bandBounds.lowCutMaxHz,
    Math.max(bandBounds.lowCutMinHz, lfo.audioBandLowHz)
  )
  lfo.audioBandHighHz = Math.min(
    bandBounds.highCutMaxHz,
    Math.max(bandBounds.highCutMinHz, lfo.audioBandHighHz)
  )
  if (lfo.audioBandHighHz < lfo.audioBandLowHz + AUDIO_BAND_MIN_GAP_HZ) {
    lfo.audioBandHighHz = Math.min(
      bandBounds.highCutMaxHz,
      lfo.audioBandLowHz + AUDIO_BAND_MIN_GAP_HZ
    )
  }
  if (lfo.audioBandLowHz > lfo.audioBandHighHz - AUDIO_BAND_MIN_GAP_HZ) {
    lfo.audioBandLowHz = Math.max(
      bandBounds.lowCutMinHz,
      lfo.audioBandHighHz - AUDIO_BAND_MIN_GAP_HZ
    )
  }
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
  const shaping = splitScene.splitModShaping
  const phaseOff = shaping?.phaseOffsetBeats ?? 0
  const effectiveBeats = beats + (Number.isFinite(phaseOff) ? phaseOff : 0)

  const outputParams: Modulation = {
    ...defaultOutputParams(),
    ...baseParams,
  }

  const effectiveLfos = effectiveLfosAtSplit(scene, splitIndex, beats, audioInput)

  const snapshots: ModSnapshot[] = scene.modulators.map((modulator, index) => {
    let lfoVal = getModulatorLfoValue(
      effectiveLfos[index],
      effectiveBeats,
      audioInput,
      index
    )
    lfoVal = applySplitModShapingToLfoVal(lfoVal, shaping)
    return {
      modulation: modulator.splitModulations[splitIndex],
      lfoVal,
    }
  })

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
  audioInput: AudioEngineMetrics,
  modulatorIndex?: number
) {
  if (lfo.shape === LfoShape.AudioBand) {
    if (audioInput.enabled !== true) {
      const state = getAudioLfoState(lfo, beats, modulatorIndex)
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
    return getAudioBandLevelSmoothed(raw, lfo, beats, modulatorIndex)
  }

  if (lfo.shape === LfoShape.AudioEnergy) {
    if (audioInput.enabled !== true) {
      const state = getAudioLfoState(lfo, beats, modulatorIndex)
      state.initialized = false
      state.smoothed = 0
      state.lastBeat = Number.isFinite(beats) ? beats : state.lastBeat
      return 0
    }
    return getAudioEnergyLevelSmoothed(
      clamp01(audioInput.energyLevel),
      lfo,
      beats,
      modulatorIndex
    )
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
/** Stable across `cloneLfo()` copies (used by engine + UI); keys modulator index. */
const audioLfoStateByModulatorIndex = new Map<number, AudioLfoRuntimeState>()

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function alphaFromBeats(dtBeats: number, tauBeats: number) {
  if (!Number.isFinite(dtBeats) || dtBeats <= 0) return 0
  return 1 - Math.exp(-dtBeats / Math.max(0.001, tauBeats))
}

function getAudioLfoState(
  lfo: Lfo,
  beats: number,
  modulatorIndex?: number
): AudioLfoRuntimeState {
  if (modulatorIndex !== undefined) {
    const existing = audioLfoStateByModulatorIndex.get(modulatorIndex)
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
    audioLfoStateByModulatorIndex.set(modulatorIndex, created)
    return created
  }

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

function getAudioBandSmoothedValue(
  raw: number,
  lfo: Lfo,
  dtBeats: number,
  state: AudioLfoRuntimeState
) {
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
  return clamp01(state.smoothed)
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

function getAudioBandLevelSmoothed(
  raw: number,
  lfo: Lfo,
  beats: number,
  modulatorIndex?: number
) {
  const state = getAudioLfoState(lfo, beats, modulatorIndex)
  const beatNow = Number.isFinite(beats) ? beats : state.lastBeat
  const dtBeatsRaw = beatNow - state.lastBeat
  const dtBeats = Math.max(0, Math.min(4, dtBeatsRaw))
  if (!Number.isFinite(dtBeatsRaw) || dtBeatsRaw < -0.001) {
    state.initialized = false
    state.bandPostInitialized = false
  }
  const envelope = getAudioBandSmoothedValue(clamp01(raw), lfo, dtBeats, state)

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

function getAudioEnergyLevelSmoothed(
  raw: number,
  lfo: Lfo,
  beats: number,
  modulatorIndex?: number
) {
  const state = getAudioLfoState(lfo, beats, modulatorIndex)
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
    return applyAudioLfoThreshold(clamp01(state.smoothed), lfo)
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

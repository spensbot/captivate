export const AUDIO_MIN_BAND_HZ = 20
export const AUDIO_MAX_BAND_HZ = 20000
export const AUDIO_MIN_GAIN = 0
export const AUDIO_MAX_GAIN = 4
export const AUDIO_INPUT_DEVICE_DESKTOP = '__desktop_loopback__'
export const AUDIO_MIN_BEAT_INTERVAL_MS = 120
export const AUDIO_MAX_BEAT_INTERVAL_MS = 800
export const AUDIO_MIN_BPM_SMOOTHING = 0.05
export const AUDIO_MAX_BPM_SMOOTHING = 0.95
export const AUDIO_MIN_ENERGY_SMOOTHING = 0.05
export const AUDIO_MAX_ENERGY_SMOOTHING = 0.95
export const AUDIO_BPM_RANGE_MIN = 60
export const AUDIO_BPM_RANGE_MAX = 200

export type AudioBpmRangePresetId =
  | 'off'
  | 'downtempo'
  | 'hiphop'
  | 'house'
  | 'techno'
  | 'dnb'
  | 'hardstyle'
  | 'custom'

export interface AudioBpmRangeBounds {
  min: number
  max: number
}

export const AUDIO_BPM_RANGE_PRESET_OPTIONS: ReadonlyArray<{
  id: AudioBpmRangePresetId
  label: string
  shortLabel: string
  bounds: AudioBpmRangeBounds | null
}> = [
  { id: 'off', label: 'All tempos', shortLabel: 'All', bounds: null },
  { id: 'downtempo', label: 'Downtempo (80–100)', shortLabel: '80–100', bounds: { min: 80, max: 100 } },
  { id: 'hiphop', label: 'Hip-hop (80–105)', shortLabel: '80–105', bounds: { min: 80, max: 105 } },
  { id: 'house', label: 'House (118–132)', shortLabel: '118–132', bounds: { min: 118, max: 132 } },
  { id: 'techno', label: 'Techno (125–140)', shortLabel: '125–140', bounds: { min: 125, max: 140 } },
  { id: 'dnb', label: 'DnB (168–178)', shortLabel: '168–178', bounds: { min: 168, max: 178 } },
  { id: 'hardstyle', label: 'Hardstyle (148–158)', shortLabel: '148–158', bounds: { min: 148, max: 158 } },
  { id: 'custom', label: 'Custom range', shortLabel: 'Custom', bounds: null },
]

export function normalizeAudioBpmRangePresetId(
  value: unknown
): AudioBpmRangePresetId {
  const id = typeof value === 'string' ? value.trim() : ''
  return AUDIO_BPM_RANGE_PRESET_OPTIONS.some((option) => option.id === id)
    ? (id as AudioBpmRangePresetId)
    : 'off'
}

export function normalizeAudioBpmRangeCustomBounds(
  minRaw: unknown,
  maxRaw: unknown
): AudioBpmRangeBounds {
  let min = clamp(
    Number.isFinite(Number(minRaw)) ? Number(minRaw) : 120,
    AUDIO_BPM_RANGE_MIN,
    AUDIO_BPM_RANGE_MAX
  )
  let max = clamp(
    Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : 130,
    AUDIO_BPM_RANGE_MIN,
    AUDIO_BPM_RANGE_MAX
  )
  if (min > max) {
    const swap = min
    min = max
    max = swap
  }
  if (max - min < 4) {
    max = Math.min(AUDIO_BPM_RANGE_MAX, min + 4)
  }
  return { min, max }
}

export function resolveAudioBpmRangeLock(
  settings: Pick<
    AudioInputSettings,
    'audioBpmRangePreset' | 'audioBpmRangeCustomMin' | 'audioBpmRangeCustomMax'
  >
): AudioBpmRangeBounds | null {
  const preset = normalizeAudioBpmRangePresetId(settings.audioBpmRangePreset)
  if (preset === 'off') {
    return null
  }
  if (preset === 'custom') {
    return normalizeAudioBpmRangeCustomBounds(
      settings.audioBpmRangeCustomMin,
      settings.audioBpmRangeCustomMax
    )
  }
  const option = AUDIO_BPM_RANGE_PRESET_OPTIONS.find((entry) => entry.id === preset)
  return option?.bounds ?? null
}

export function formatAudioBpmRangeLabel(
  settings: Pick<
    AudioInputSettings,
    'audioBpmRangePreset' | 'audioBpmRangeCustomMin' | 'audioBpmRangeCustomMax'
  >
): string {
  const preset = normalizeAudioBpmRangePresetId(settings.audioBpmRangePreset)
  if (preset === 'off') {
    return 'All'
  }
  if (preset === 'custom') {
    const bounds = normalizeAudioBpmRangeCustomBounds(
      settings.audioBpmRangeCustomMin,
      settings.audioBpmRangeCustomMax
    )
    return `${Math.round(bounds.min)}–${Math.round(bounds.max)}`
  }
  const option = AUDIO_BPM_RANGE_PRESET_OPTIONS.find((entry) => entry.id === preset)
  return option?.shortLabel ?? 'All'
}

/** Widest label shown on the status-bar BPM range dropdown button. */
export function audioBpmRangeWidestButtonLabel(): string {
  const labels = [
    ...AUDIO_BPM_RANGE_PRESET_OPTIONS.map((option) => option.shortLabel),
    `${AUDIO_BPM_RANGE_MAX}–${AUDIO_BPM_RANGE_MAX}`,
  ]
  return labels.reduce((widest, label) =>
    label.length > widest.length ? label : widest
  )
}

export function clampBpmToAudioRange(
  bpm: number,
  range: AudioBpmRangeBounds
): number {
  return clamp(bpm, range.min, range.max)
}

/** Resolve half/double-time candidates, optionally constrained to a known BPM window. */
export function pickTempoBpmWithRangeLock(
  rawBpm: number,
  range: AudioBpmRangeBounds | null,
  referenceHint?: number | null
): number | null {
  if (!Number.isFinite(rawBpm) || rawBpm <= 0) {
    return null
  }

  const harmonics = [1, 0.5, 2, 0.25, 4]
  let candidates = harmonics
    .map((scale) => rawBpm * scale)
    .filter((value) => value >= 45 && value <= 220)

  if (candidates.length <= 0) {
    return null
  }

  const rangeCenter =
    range !== null ? (range.min + range.max) * 0.5 : null
  let reference =
    referenceHint !== null &&
    referenceHint !== undefined &&
    Number.isFinite(referenceHint) &&
    referenceHint >= 45 &&
    referenceHint <= 220
      ? referenceHint
      : rangeCenter ?? 120

  if (range !== null) {
    const inRange = candidates.filter(
      (value) => value >= range.min && value <= range.max
    )
    if (inRange.length > 0) {
      candidates = inRange
    } else {
      candidates = harmonics
        .map((scale) => clampBpmToAudioRange(rawBpm * scale, range))
        .filter((value, index, list) => list.indexOf(value) === index)
    }
    if (
      reference < range.min ||
      reference > range.max ||
      referenceHint === null ||
      referenceHint === undefined
    ) {
      reference = rangeCenter ?? reference
    }
  }

  let best = candidates[0]!
  let bestDelta = Math.abs(best - reference)
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i]!
    const delta = Math.abs(candidate - reference)
    if (delta < bestDelta) {
      best = candidate
      bestDelta = delta
    }
  }
  return best
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function lerpValue(from: number, to: number, t: number) {
  return from + (to - from) * clamp01(t)
}

/**
 * Maps tempo to an energy contribution (0–1).
 * ~70 ballad/ambient → low, ~120 pop/house → mid, ~140+ techno/DnB → high.
 */
export function bpmToEnergyContribution(bpm: number): number {
  const clamped = clamp(bpm, 55, 200)
  const normalized =
    Math.log(clamped / 55) / Math.log(200 / 55)
  return clamp01(0.04 + Math.pow(clamp01(normalized), 0.82) * 0.9)
}

export interface PerceivedEnergyInput {
  /** Loudness after adaptive normalization (0–1). */
  normalizedLoudness: number
  /** Instant / short / long loudness envelopes for trend detection. */
  loudnessInstant: number
  loudnessShort: number
  loudnessLong: number
  lowLoudness: number
  midLoudness: number
  highLoudness: number
  lowBaseline: number
  highBaseline: number
  lowOnset: number
  beatOnset: number
  bpm: number | null
  bpmConfidence: number
  /** Current BPM / recent peak BPM (1 = no drop). */
  bpmDropRatio: number
  /** Mid+high onset share — hi-hat heavy vs kick/bass heavy. */
  rhythmShare: number
  beatPulse: number
  fastBreakdown?: boolean
  /** 0 = bass-weighted, 1 = rhythm/bright-weighted; 0.5 = default mix. */
  rhythmEmphasis?: number
}

/**
 * Expands small 0–1 magnitudes (typical byte-FFT band averages) into a usable meter range.
 */
export function expandAudioMagnitude(linear: number, knee = 2.4): number {
  const v = clamp01(linear)
  if (v <= 0) return 0
  return clamp01(1 - Math.exp(-v * knee))
}

/** Bass/kick body vs thin bright-only material (hi-hat breakdowns). */
export function computeSpectralFullness(input: {
  lowLoudness: number
  midLoudness: number
  highLoudness: number
  lowBaseline: number
  highBaseline: number
  rhythmShare: number
}): number {
  const low = clamp01(input.lowLoudness)
  const mid = clamp01(input.midLoudness)
  const high = clamp01(input.highLoudness)
  const lowBase = Math.max(0.012, input.lowBaseline)
  const highBase = Math.max(0.012, input.highBaseline)
  const rhythmShare = clamp01(input.rhythmShare)

  const bodyMix = clamp01(low * 0.58 + mid * 0.3 + high * 0.12)
  const relativeBass = clamp01(low / lowBase)
  const bassPresent = clamp01((relativeBass - 0.42) / 0.58)
  const subWeight = clamp01(low / Math.max(0.04, low + mid * 0.55 + high * 0.35))

  const highVsLow = high / Math.max(0.02, low + high * 0.15)
  const brightOnly =
    rhythmShare > 0.52 &&
    relativeBass < 0.62 &&
    highVsLow > 0.72 &&
    high > highBase * 0.82

  let fullness = clamp01(bodyMix * 0.42 + bassPresent * 0.38 + subWeight * 0.2)
  if (brightOnly) {
    const hatPenalty = clamp01((rhythmShare - 0.48) / 0.42)
    fullness *= lerpValue(0.22, 0.48, 1 - hatPenalty)
  }
  return fullness
}

/** Percussive drive from kick/bass onsets — sustained rhythm, not per-beat needle kicks. */
export function computeRhythmicDrive(input: {
  lowOnset: number
  beatOnset: number
  rhythmShare: number
  lowLoudness: number
  lowBaseline: number
}): number {
  const lowOnset = clamp01(input.lowOnset * 3.8)
  const beatOnset = clamp01(input.beatOnset * 2.6)
  const rhythmShare = clamp01(input.rhythmShare)
  const relativeBass = clamp01(input.lowLoudness / Math.max(0.012, input.lowBaseline))

  const kickDrive = clamp01(lowOnset * 0.62 + beatOnset * 0.38)
  const hatOnly =
    rhythmShare > 0.55 && relativeBass < 0.55 && lowOnset < 0.14
  if (hatOnly) {
    return clamp01(kickDrive * lerpValue(0.18, 0.42, rhythmShare))
  }
  return clamp01(kickDrive * lerpValue(0.55, 1, relativeBass))
}

/**
 * Musical energy estimate from loudness, spectrum, rhythm, and tempo.
 * This is the analysis target — intentionally richer than the published meter output.
 */
export function computeMusicalEnergyEstimate(input: PerceivedEnergyInput): number {
  const loudness = clamp01(input.normalizedLoudness)
  const instant = clamp01(input.loudnessInstant)
  const short = clamp01(input.loudnessShort)
  const long = clamp01(input.loudnessLong)
  const conf = clamp01(input.bpmConfidence)
  const rhythmShare = clamp01(input.rhythmShare)
  const beatPulse = clamp01(input.beatPulse)
  const fastBreakdown = input.fastBreakdown === true
  const bpmDropRatio = clamp01(input.bpmDropRatio)
  const rhythmEmphasis = clamp01(
    input.rhythmEmphasis != null && Number.isFinite(input.rhythmEmphasis)
      ? input.rhythmEmphasis
      : 0.5
  )
  const bassEmphasis = 1 - rhythmEmphasis

  const loudnessGate = clamp01((loudness - 0.035) / 0.2)

  const fullness = computeSpectralFullness({
    lowLoudness: input.lowLoudness,
    midLoudness: input.midLoudness,
    highLoudness: input.highLoudness,
    lowBaseline: input.lowBaseline,
    highBaseline: input.highBaseline,
    rhythmShare,
  })
  const rhythmDrive = computeRhythmicDrive({
    lowOnset: input.lowOnset,
    beatOnset: input.beatOnset,
    rhythmShare,
    lowLoudness: input.lowLoudness,
    lowBaseline: input.lowBaseline,
  })

  const rawBpm =
    input.bpm !== null && Number.isFinite(input.bpm) && input.bpm > 0
      ? input.bpm
      : null
  const bpmContribution =
    rawBpm === null ? 0 : bpmToEnergyContribution(rawBpm)
  const tempoFactor =
    rawBpm === null ? 0 : lerpValue(0, bpmContribution, conf) * loudnessGate

  const fullnessW = lerpValue(0.36, 0.24, rhythmEmphasis)
  const rhythmW = lerpValue(0.4, 0.52, rhythmEmphasis)
  const tempoW = 0.2
  let intensity = clamp01(
    fullness * fullnessW + rhythmDrive * rhythmW + tempoFactor * tempoW
  )
  intensity *= lerpValue(0.18, 1, loudnessGate)

  if (bpmDropRatio < 0.86 && loudness < 0.32) {
    const tempoDrop = clamp01((0.86 - bpmDropRatio) / 0.42)
    intensity *= lerpValue(1, 0.48, tempoDrop * conf)
  }
  if (fastBreakdown) {
    intensity *= 0.5
  }

  let energy = loudness * lerpValue(0.24, 1.04, intensity)

  const buildTrend = clamp01((short - long) / 0.14)
  const risingInstant = clamp01((instant - short) / 0.12)
  const buildBoost =
    buildTrend * lerpValue(0.06, 0.14, 1 - rhythmEmphasis) * loudnessGate +
    risingInstant * 0.05
  energy += buildBoost
  energy -= clamp01((long - short) / 0.11) * lerpValue(0.045, 0.1, bassEmphasis)

  const hitAccent =
    beatPulse * lerpValue(0.022, 0.045, rhythmEmphasis) +
    clamp01(input.lowOnset * 3.2) * lerpValue(0.035, 0.018, rhythmEmphasis)
  energy += hitAccent

  if (fastBreakdown) {
    energy = Math.min(energy, loudness * lerpValue(0.5, 0.68, intensity))
  }

  if (loudness < 0.05 && short < 0.07) {
    energy *= clamp01(loudness / 0.05)
  }

  return clamp01(energy)
}

/** @deprecated Use {@link computeMusicalEnergyEstimate}. */
export const computePerceivedEnergyLevel = computeMusicalEnergyEstimate

export interface AdaptiveEnergyNormalizerState {
  floorEma: number
  peakHold: number
}

export function initAdaptiveEnergyNormalizerState(): AdaptiveEnergyNormalizerState {
  return { floorEma: 0, peakHold: 0 }
}

export interface StepAdaptiveEnergyNormalizerParams {
  compositeEnergy: number
  floorAlpha: number
  peakReleaseAlpha: number
  energyDynamics: number
  fastBreakdown: boolean
}

/**
 * Maps running loudness to 0–1 for the energy meter. Peak-hold reference + quiet floor;
 * uses ratio-to-peak so sustained loud material reaches the top of the meter.
 */
export function stepAdaptiveEnergyNormalizer(
  state: AdaptiveEnergyNormalizerState,
  params: StepAdaptiveEnergyNormalizerParams
): { state: AdaptiveEnergyNormalizerState; normalizedEnergy: number } {
  const composite = clamp01(params.compositeEnergy)
  const dynamics = clamp01(params.energyDynamics)
  let { floorEma, peakHold } = state

  if (floorEma <= 0 && peakHold <= 0) {
    floorEma = composite
    peakHold = Math.max(composite, 0.04)
  } else {
    if (composite < floorEma) {
      floorEma += (composite - floorEma) * Math.min(1, params.floorAlpha * 1.55)
    } else {
      floorEma +=
        (composite - floorEma) *
        params.floorAlpha *
        lerpValue(0.012, 0.035, dynamics)
    }

    if (composite >= peakHold) {
      peakHold = composite
    } else {
      let releaseAlpha = params.peakReleaseAlpha
      if (params.fastBreakdown) {
        releaseAlpha = Math.min(1, releaseAlpha * 2.8)
      }
      peakHold += (composite - peakHold) * releaseAlpha
    }
  }

  const referencePeak = Math.max(peakHold, 0.04)
  const quietFloor = Math.max(0, floorEma - lerpValue(0.016, 0.007, dynamics))
  const minSpan = lerpValue(0.026, 0.016, dynamics)
  const span = Math.max(minSpan, referencePeak - quietFloor)
  const linear = clamp01((composite - quietFloor) / span)
  const gamma = lerpValue(0.82, 0.68, dynamics)
  const normalizedEnergy = clamp01(Math.pow(linear, gamma))

  return {
    state: { floorEma, peakHold },
    normalizedEnergy,
  }
}

function alphaFromTauSec(dtSec: number, tauSec: number): number {
  if (!Number.isFinite(dtSec) || dtSec <= 0) return 0
  return 1 - Math.exp(-dtSec / Math.max(0.01, tauSec))
}

export interface StableEnergyLevelState {
  /** Published steady energy level (0–1). */
  output: number
  /** Slow tracker of the musical estimate for gradual section drift. */
  sectionTarget: number
}

export function initStableEnergyLevelState(): StableEnergyLevelState {
  return { output: 0, sectionTarget: 0 }
}

export interface StepStableEnergyLevelParams {
  /** Rich musical estimate from beat, rhythm, spectrum, and loudness analysis. */
  musicalEstimate: number
  dtSec: number
  barSec: number
  energySmoothing: number
  fastBreakdown: boolean
}

/**
 * Converts a musical energy estimate into a steady published level.
 * Smooth enough to ignore beat-to-beat jitter, but still tracks quiet vs loud sections.
 */
export function stepStableEnergyLevel(
  state: StableEnergyLevelState,
  params: StepStableEnergyLevelParams
): { state: StableEnergyLevelState; energyLevel: number } {
  const target = clamp01(params.musicalEstimate)
  const blend = clamp01(params.energySmoothing)
  const barSec = Math.max(0.15, params.barSec)
  let { output, sectionTarget } = state

  if (output <= 0 && sectionTarget <= 0 && target <= 0) {
    return { state: { output: 0, sectionTarget: 0 }, energyLevel: 0 }
  }

  if (output <= 0 && sectionTarget <= 0) {
    output = target
    sectionTarget = target
    return { state: { output, sectionTarget }, energyLevel: output }
  }

  const sectionTau = barSec * lerpValue(2.4, 1, blend)
  sectionTarget += (target - sectionTarget) * alphaFromTauSec(params.dtSec, sectionTau)

  const suddenDrop =
    params.fastBreakdown ||
    target < sectionTarget - lerpValue(0.08, 0.05, blend) ||
    (target < 0.07 && output > 0.11)
  const suddenRise =
    target > sectionTarget + lerpValue(0.09, 0.055, blend) &&
    target > output + lerpValue(0.07, 0.045, blend)

  let goal = sectionTarget
  let followTau = barSec * lerpValue(1.3, 0.6, blend)

  if (suddenDrop) {
    goal = target
    followTau = barSec * lerpValue(0.32, 0.18, blend)
  } else if (suddenRise) {
    goal = target
    followTau = barSec * lerpValue(0.45, 0.25, blend)
  }

  const alpha = alphaFromTauSec(params.dtSec, followTau)
  const stepAlpha = suddenDrop ? Math.min(1, alpha * 2.5) : alpha
  output = clamp01(output + (goal - output) * stepAlpha)

  return { state: { output, sectionTarget }, energyLevel: output }
}

/** Tempo used for energy: detected when confident, otherwise Link/session BPM. */
export function resolveEnergyTempoBpm(
  detectedBpm: number | null,
  detectedConfidence: number,
  linkBpm: number | null,
  linkEnabled: boolean
): number {
  const conf = clamp01(detectedConfidence)
  if (
    detectedBpm !== null &&
    Number.isFinite(detectedBpm) &&
    detectedBpm >= 45 &&
    conf >= 0.28
  ) {
    return clamp(detectedBpm, 55, 200)
  }
  if (
    linkEnabled &&
    linkBpm !== null &&
    Number.isFinite(linkBpm) &&
    linkBpm >= 45
  ) {
    return clamp(linkBpm, 55, 200)
  }
  if (detectedBpm !== null && Number.isFinite(detectedBpm) && detectedBpm >= 45) {
    return clamp(detectedBpm, 55, 200)
  }
  if (linkBpm !== null && Number.isFinite(linkBpm) && linkBpm >= 45) {
    return clamp(linkBpm, 55, 200)
  }
  return 120
}

export interface AudioInputSettings {
  enabled: boolean
  deviceId: string
  inputGain: number
  /** Software AGC on top of manual input gain (pre-gain level tracking). */
  autoGainControl: boolean
  useBeatClock: boolean
  /** Known BPM window for audio beat detection (audio beat clock only). */
  audioBpmRangePreset: AudioBpmRangePresetId
  audioBpmRangeCustomMin: number
  audioBpmRangeCustomMax: number
  beatSensitivity: number
  beatMinIntervalMs: number
  bpmSmoothing: number
  /** How quickly the energy meter follows musical changes (higher = faster). */
  energySmoothing: number
  /** Dynamic range of the energy meter (lower = punchier, higher = smoother). */
  energyDynamics: number
  /** 0 = bass-heavy energy, 1 = rhythm/bright-heavy energy. */
  energyRhythmBias: number
  /** User tap-teach hint for beat/BPM learning (renderer; cleared on project load). */
  beatTapHintBpm: number | null
  /** Wall-clock ms when `beatTapHintBpm` was set (from `Date.now()`). */
  beatTapHintAtMs: number
}

export function initAudioInputSettings(): AudioInputSettings {
  return {
    enabled: false,
    deviceId: '',
    inputGain: 1,
    autoGainControl: false,
    useBeatClock: false,
    audioBpmRangePreset: 'off',
    audioBpmRangeCustomMin: 120,
    audioBpmRangeCustomMax: 130,
    beatSensitivity: 0.45,
    beatMinIntervalMs: 260,
    bpmSmoothing: 0.12,
    energySmoothing: 0.48,
    energyDynamics: 0.62,
    energyRhythmBias: 0.5,
    beatTapHintBpm: null,
    beatTapHintAtMs: 0,
  }
}

export function normalizeAudioInputSettings(
  raw: Partial<AudioInputSettings> | undefined
): AudioInputSettings {
  const defaults = initAudioInputSettings()
  const source = raw ?? {}
  return {
    enabled: source.enabled === true,
    deviceId: typeof source.deviceId === 'string' ? source.deviceId.trim() : '',
    inputGain: clamp(
      Number.isFinite(source.inputGain) ? Number(source.inputGain) : defaults.inputGain,
      AUDIO_MIN_GAIN,
      AUDIO_MAX_GAIN
    ),
    autoGainControl: source.autoGainControl === true,
    useBeatClock: source.useBeatClock === true,
    audioBpmRangePreset: normalizeAudioBpmRangePresetId(source.audioBpmRangePreset),
    ...(() => {
      const customBounds = normalizeAudioBpmRangeCustomBounds(
        source.audioBpmRangeCustomMin,
        source.audioBpmRangeCustomMax
      )
      return {
        audioBpmRangeCustomMin: customBounds.min,
        audioBpmRangeCustomMax: customBounds.max,
      }
    })(),
    beatSensitivity: clamp01(
      Number.isFinite(source.beatSensitivity)
        ? Number(source.beatSensitivity)
        : defaults.beatSensitivity
    ),
    beatMinIntervalMs: Math.round(
      clamp(
        Number.isFinite(source.beatMinIntervalMs)
          ? Number(source.beatMinIntervalMs)
          : defaults.beatMinIntervalMs,
        AUDIO_MIN_BEAT_INTERVAL_MS,
        AUDIO_MAX_BEAT_INTERVAL_MS
      )
    ),
    bpmSmoothing: clamp(
      Number.isFinite(source.bpmSmoothing)
        ? Number(source.bpmSmoothing)
        : defaults.bpmSmoothing,
      AUDIO_MIN_BPM_SMOOTHING,
      AUDIO_MAX_BPM_SMOOTHING
    ),
    energySmoothing: clamp(
      Number.isFinite(source.energySmoothing)
        ? Number(source.energySmoothing)
        : defaults.energySmoothing,
      AUDIO_MIN_ENERGY_SMOOTHING,
      AUDIO_MAX_ENERGY_SMOOTHING
    ),
    energyDynamics: clamp01(
      Number.isFinite(source.energyDynamics)
        ? Number(source.energyDynamics)
        : defaults.energyDynamics
    ),
    energyRhythmBias: clamp01(
      Number.isFinite(source.energyRhythmBias)
        ? Number(source.energyRhythmBias)
        : defaults.energyRhythmBias
    ),
    beatTapHintBpm:
      source.beatTapHintBpm != null &&
      Number.isFinite(source.beatTapHintBpm) &&
      source.beatTapHintBpm >= 45 &&
      source.beatTapHintBpm <= 220
        ? source.beatTapHintBpm
        : null,
    beatTapHintAtMs:
      source.beatTapHintAtMs != null &&
      Number.isFinite(source.beatTapHintAtMs) &&
      source.beatTapHintAtMs > 0
        ? source.beatTapHintAtMs
        : 0,
  }
}

export interface AudioEngineMetrics {
  enabled: boolean
  inputLevel: number
  energyLevel: number
  beatPulse: number
  beatDetected: boolean
  detectedBpm: number | null
  detectedBpmConfidence: number
  spectrum: number[]
  nyquistHz: number
  updatedAtMs: number
}

export function initAudioEngineMetrics(): AudioEngineMetrics {
  return {
    enabled: false,
    inputLevel: 0,
    energyLevel: 0,
    beatPulse: 0,
    beatDetected: false,
    detectedBpm: null,
    detectedBpmConfidence: 0,
    spectrum: [],
    nyquistHz: 24000,
    updatedAtMs: 0,
  }
}

export function normalizeAudioEngineMetrics(
  raw: Partial<AudioEngineMetrics> | undefined
): AudioEngineMetrics {
  const defaults = initAudioEngineMetrics()
  const source = raw ?? {}
  const detectedBpm = Number(source.detectedBpm)
  const detectedBpmConfidence = Number(source.detectedBpmConfidence)
  const spectrum = Array.isArray(source.spectrum)
    ? source.spectrum
        .map((value) => clamp01(Number(value)))
        .slice(0, 1024)
    : defaults.spectrum

  return {
    enabled: source.enabled === true,
    inputLevel: clamp01(Number(source.inputLevel)),
    energyLevel: clamp01(Number(source.energyLevel)),
    beatPulse: clamp01(Number(source.beatPulse)),
    beatDetected: source.beatDetected === true,
    detectedBpm:
      Number.isFinite(detectedBpm) && detectedBpm > 0 ? detectedBpm : null,
    detectedBpmConfidence: clamp01(detectedBpmConfidence),
    spectrum,
    nyquistHz: clamp(
      Number(source.nyquistHz),
      1000,
      AUDIO_MAX_BAND_HZ
    ),
    updatedAtMs: Number.isFinite(source.updatedAtMs)
      ? Number(source.updatedAtMs)
      : defaults.updatedAtMs,
  }
}

export interface AudioBandConfig {
  lowHz: number
  highHz: number
  gain: number
}

/** Cutoff slider bounds shown on Audio Band LFO shape controls (matches modulator UI). */
export function getAudioBandCutoffSliderBounds(nyquistHz: number) {
  const nyquistCapHz = Math.max(
    AUDIO_MIN_BAND_HZ + 40,
    Math.min(
      AUDIO_MAX_BAND_HZ,
      Number.isFinite(nyquistHz) ? Math.round(nyquistHz) : AUDIO_MAX_BAND_HZ
    )
  )
  const lowCutMinHz = AUDIO_MIN_BAND_HZ
  const lowCutMaxHz = Math.max(
    lowCutMinHz + 20,
    Math.min(12000, nyquistCapHz - 20)
  )
  const highCutMinHz = Math.max(40, AUDIO_MIN_BAND_HZ + 20)
  const highCutMaxHz = nyquistCapHz
  return { lowCutMinHz, lowCutMaxHz, highCutMinHz, highCutMaxHz }
}

export function initAudioBandConfig(): AudioBandConfig {
  return {
    lowHz: 120,
    highHz: 2000,
    gain: 1,
  }
}

export function normalizeAudioBandConfig(
  raw: Partial<AudioBandConfig> | undefined
): AudioBandConfig {
  const defaults = initAudioBandConfig()
  const lowHz = clamp(
    Number.isFinite(raw?.lowHz) ? Number(raw?.lowHz) : defaults.lowHz,
    AUDIO_MIN_BAND_HZ,
    AUDIO_MAX_BAND_HZ
  )
  const highHz = clamp(
    Number.isFinite(raw?.highHz) ? Number(raw?.highHz) : defaults.highHz,
    AUDIO_MIN_BAND_HZ,
    AUDIO_MAX_BAND_HZ
  )
  return {
    lowHz: Math.min(lowHz, highHz),
    highHz: Math.max(lowHz, highHz),
    gain: clamp(
      Number.isFinite(raw?.gain) ? Number(raw?.gain) : defaults.gain,
      AUDIO_MIN_GAIN,
      AUDIO_MAX_GAIN
    ),
  }
}

export function getAudioBandLevel(
  audio: AudioEngineMetrics,
  band: AudioBandConfig
): number {
  const stats = measureAudioBand(audio, band)
  if (stats === null) {
    return 0
  }
  return clamp01(stats.average * normalizeAudioBandConfig(band).gain)
}

/** Peak + average blend with perceptual expansion — for energy metering. */
export function getAudioBandLoudness(
  audio: AudioEngineMetrics,
  band: AudioBandConfig
): number {
  const stats = measureAudioBand(audio, band)
  if (stats === null) {
    return 0
  }
  const normalizedBand = normalizeAudioBandConfig(band)
  const linear = clamp01(
    (stats.average * 0.32 + stats.peak * 0.68) * normalizedBand.gain * 1.85
  )
  return expandAudioMagnitude(linear, 2.15)
}

export function computeMusicLoudnessCore(params: {
  inputLevel: number
  broad: number
  mid: number
  low: number
  high: number
  flux?: number
}): number {
  const weighted = clamp01(
    params.inputLevel * 0.36 +
      params.broad * 0.3 +
      params.mid * 0.16 +
      params.low * 0.1 +
      params.high * 0.08 +
      (params.flux ?? 0) * 0.05
  )
  return expandAudioMagnitude(weighted, 2.75)
}

function measureAudioBand(
  audio: AudioEngineMetrics,
  band: AudioBandConfig
): { average: number; peak: number } | null {
  if (!audio.enabled || audio.spectrum.length === 0 || audio.nyquistHz <= 0) {
    return null
  }

  const normalizedBand = normalizeAudioBandConfig(band)
  const length = audio.spectrum.length
  const binFrequency = audio.nyquistHz / Math.max(1, length - 1)

  const lowIndex = Math.max(
    0,
    Math.min(length - 1, Math.floor(normalizedBand.lowHz / binFrequency))
  )
  const highIndex = Math.max(
    lowIndex,
    Math.min(length - 1, Math.ceil(normalizedBand.highHz / binFrequency))
  )

  let sum = 0
  let peak = 0
  let count = 0
  for (let i = lowIndex; i <= highIndex; i++) {
    const value = audio.spectrum[i] ?? 0
    sum += value
    if (value > peak) peak = value
    count++
  }

  if (count <= 0) {
    return null
  }

  return { average: sum / count, peak }
}

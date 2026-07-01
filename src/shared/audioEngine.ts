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

/** Percussive drive from kick/bass onsets and beat pulse — not just level. */
export function computeRhythmicDrive(input: {
  lowOnset: number
  beatOnset: number
  beatPulse: number
  rhythmShare: number
  lowLoudness: number
  lowBaseline: number
}): number {
  const lowOnset = clamp01(input.lowOnset * 3.8)
  const beatOnset = clamp01(input.beatOnset * 2.6)
  const beatPulse = clamp01(input.beatPulse)
  const rhythmShare = clamp01(input.rhythmShare)
  const relativeBass = clamp01(input.lowLoudness / Math.max(0.012, input.lowBaseline))

  const kickDrive = clamp01(lowOnset * 0.52 + beatOnset * 0.28 + beatPulse * 0.2)
  const hatOnly =
    rhythmShare > 0.55 && relativeBass < 0.55 && lowOnset < 0.14
  if (hatOnly) {
    return clamp01(kickDrive * lerpValue(0.18, 0.42, rhythmShare))
  }
  return clamp01(kickDrive * lerpValue(0.55, 1, relativeBass))
}

/**
 * Musical energy: loudness is the floor, but spectral body, rhythm, tempo, and
 * section trends shape drops, hi-hat-only passages, build-ups, and hits.
 */
export function computePerceivedEnergyLevel(input: PerceivedEnergyInput): number {
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
    beatPulse,
    rhythmShare,
    lowLoudness: input.lowLoudness,
    lowBaseline: input.lowBaseline,
  })

  const rawBpm =
    input.bpm !== null && Number.isFinite(input.bpm) && input.bpm > 0
      ? input.bpm
      : null
  const bpmContribution =
    rawBpm === null ? 0.46 : bpmToEnergyContribution(rawBpm)
  const tempoFactor = lerpValue(0.5, bpmContribution, conf)

  const fullnessW = lerpValue(0.4, 0.28, rhythmEmphasis)
  const rhythmW = lerpValue(0.34, 0.46, rhythmEmphasis)
  const tempoW = 0.26
  let musicalShape = clamp01(
    fullness * fullnessW + rhythmDrive * rhythmW + tempoFactor * tempoW
  )

  if (bpmDropRatio < 0.86 && loudness < 0.42) {
    const tempoDrop = clamp01((0.86 - bpmDropRatio) / 0.42)
    musicalShape *= lerpValue(1, 0.42, tempoDrop * conf)
  }
  if (fastBreakdown) {
    musicalShape *= 0.58
  }

  const floor = lerpValue(0.32, 0.24, bassEmphasis)
  let energy = loudness * lerpValue(floor, 1, musicalShape)

  const buildTrend = clamp01((short - long) / 0.14)
  const risingInstant = clamp01((instant - short) / 0.12)
  const buildBoost =
    buildTrend * lerpValue(0.06, 0.14, 1 - rhythmEmphasis) +
    risingInstant * 0.05
  energy += buildBoost

  const hitAccent =
    beatPulse * lerpValue(0.05, 0.1, rhythmEmphasis) +
    clamp01(input.lowOnset * 3.2) * lerpValue(0.08, 0.04, rhythmEmphasis)
  energy += hitAccent

  if (fastBreakdown) {
    energy = Math.min(energy, loudness * lerpValue(0.62, 0.78, musicalShape))
  }

  return clamp01(energy)
}

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
    peakHold = Math.max(composite, 0.05)
  } else {
    if (composite < floorEma) {
      floorEma += (composite - floorEma) * params.floorAlpha
    } else {
      floorEma += (composite - floorEma) * params.floorAlpha * lerpValue(0.02, 0.06, dynamics)
    }

    if (composite >= peakHold) {
      peakHold = composite
    } else {
      let releaseAlpha = params.peakReleaseAlpha
      if (params.fastBreakdown) {
        releaseAlpha = Math.min(1, releaseAlpha * 2.5)
      }
      peakHold += (composite - peakHold) * releaseAlpha
    }
  }

  const referencePeak = Math.max(peakHold, 0.045)
  const quietFloor = Math.max(0, floorEma - lerpValue(0.018, 0.008, dynamics))
  const span = Math.max(lerpValue(0.055, 0.035, dynamics), referencePeak - quietFloor)
  const linear = clamp01((composite - quietFloor) / span)
  const ratio = composite / referencePeak
  const ratioCurve = clamp01(1 - Math.exp(-ratio * lerpValue(2.2, 2.8, 1 - dynamics)))
  const normalizedEnergy = clamp01(linear * 0.4 + ratioCurve * 0.6)

  return {
    state: { floorEma, peakHold },
    normalizedEnergy,
  }
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
    beatSensitivity: 0.45,
    beatMinIntervalMs: 260,
    bpmSmoothing: 0.12,
    energySmoothing: 0.5,
    energyDynamics: 0.45,
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
